"use strict";
const { verifyRequestToken } = require("./authSecurity");
const { isPrivilegedRoleActive } = require("./roleAuthorization");
const { removeManagedMedia } = require("./mediaStorage");
let pool = null;
let installed = false;
function sendJson(res, status, payload) { if (res.headersSent) return res; return res.status(status).json(payload); }
function cleanText(value, max = 100) { return String(value || "").trim().slice(0, max); }
function isSuperAdmin(user) { return !!user && (user.role === "super_admin" || !!user.is_super_admin); }
async function currentUser(req) {
  const auth = verifyRequestToken(req); if (!auth?.sub || auth.scope === "job_portal") return null;
  const [rows] = await pool.query("SELECT id, mobile, role, ward, ward_code, ward_number, is_super_admin FROM users WHERE id = ? LIMIT 1", [auth.sub]);
  const user = rows[0] || null; if (!user) return null;
  if (["nagarsevak", "super_admin"].includes(user.role)) { const active = await isPrivilegedRoleActive(pool, { userId: user.id, mobile: user.mobile, role: user.role }); if (!active) return null; }
  return user;
}
async function loadBroadcast(id, executor = pool, lock = false) { const [rows] = await executor.query(`SELECT * FROM broadcasts WHERE id = ? LIMIT 1${lock ? " FOR UPDATE" : ""}`, [id]); return rows[0] || null; }
function canManage(user, row) { return isSuperAdmin(user) || String(row.created_by || "") === String(user?.id || ""); }
async function updateAction(req, res, next) {
  const action = cleanText(req.body?.action, 30).toLowerCase();
  if (action === "archive") return sendJson(res, 410, { success: false, code: "BROADCAST_ARCHIVE_REMOVED", message: "Archive has been replaced by Pause and Delete." });
  if (!["pause", "resume", "edit"].includes(action)) return next();
  try {
    if (!pool) throw new Error("Database pool unavailable");
    const user = await currentUser(req); if (!user) return sendJson(res, 401, { success: false, code: "SESSION_INVALID", message: "Please log in again." });
    const id = cleanText(req.params?.id, 80); const existing = await loadBroadcast(id);
    if (!existing) return sendJson(res, 404, { success: false, message: "Broadcast not found." });
    if (!canManage(user, existing)) return sendJson(res, 403, { success: false, message: "You can manage only broadcasts created from your account." });

    if (action === "edit") {
      const title = cleanText(req.body?.title, 180);
      const body = cleanText(req.body?.body, 5000);
      if (title.length < 3 || body.length < 5) return sendJson(res, 400, { success: false, message: "A clear title and complete message are required." });

      const allowedCategories = new Set(["announcement", "news", "emergency", "information", "notice"]);
      const allowedLanguages = new Set(["en", "mr", "hi"]);
      const allowedAudiences = new Set(["all", "citizen", "nagarsevak", "seeker", "employer"]);
      const category = allowedCategories.has(String(req.body?.category || "")) ? String(req.body.category) : String(existing.category || "announcement");
      const language = allowedLanguages.has(String(req.body?.language || "")) ? String(req.body.language) : String(existing.language || "en");
      let audienceRole = allowedAudiences.has(String(req.body?.audienceRole || "")) ? String(req.body.audienceRole) : String(existing.audience_role || "all");
      let ward = cleanText(req.body?.ward, 120) || existing.ward || null;

      if (!isSuperAdmin(user)) {
        audienceRole = "citizen";
        ward = user.ward || (user.ward_code ? `Ward ${user.ward_code}` : user.ward_number ? `Ward ${user.ward_number}` : existing.ward || null);
      }

      const scheduledRaw = req.body?.scheduledAt;
      let scheduledAt = null;
      if (scheduledRaw) {
        const parsed = new Date(scheduledRaw);
        if (!Number.isFinite(parsed.getTime())) return sendJson(res, 400, { success: false, message: "Choose a valid schedule date and time." });
        scheduledAt = parsed;
      }
      const nextStatus = existing.status === "paused" ? "paused" : scheduledAt && scheduledAt.getTime() > Date.now() ? "scheduled" : "sent";
      await pool.query(
        `UPDATE broadcasts
            SET title = ?, body = ?, category = ?, language = ?, audience_role = ?, ward = ?,
                scheduled_at = ?, status = ?,
                sent_at = CASE WHEN ? = 'sent' THEN COALESCE(sent_at, NOW()) ELSE sent_at END
          WHERE id = ?`,
        [title, body, category, language, audienceRole, ward, scheduledAt, nextStatus, nextStatus, id],
      );
      return sendJson(res, 200, { success: true, broadcast: await loadBroadcast(id) });
    }

    if (action === "pause") {
      if (existing.status === "paused") return sendJson(res, 200, { success: true, broadcast: existing });
      if (!["sent", "scheduled"].includes(String(existing.status))) return sendJson(res, 409, { success: false, message: "Only sent or scheduled broadcasts can be paused." });
      await pool.query("UPDATE broadcasts SET status = 'paused' WHERE id = ?", [id]);
    } else {
      if (existing.status !== "paused") return sendJson(res, 409, { success: false, message: "Only paused broadcasts can be resumed." });
      const scheduledAt = existing.scheduled_at ? new Date(existing.scheduled_at) : null;
      const nextStatus = scheduledAt && Number.isFinite(scheduledAt.getTime()) && scheduledAt.getTime() > Date.now() ? "scheduled" : "sent";
      await pool.query("UPDATE broadcasts SET status = ?, sent_at = CASE WHEN ? = 'sent' THEN COALESCE(sent_at, NOW()) ELSE sent_at END WHERE id = ?", [nextStatus, nextStatus, id]);
    }
    return sendJson(res, 200, { success: true, broadcast: await loadBroadcast(id) });
  } catch (error) {
    console.warn("[BroadcastActionsPatch] update failed", error?.code || error?.name || "broadcast_action_error");
    return sendJson(res, 500, { success: false, message: "The broadcast could not be changed right now." });
  }
}
async function deleteBroadcast(req, res) {
  let mediaUri = null;
  try {
    if (!pool) throw new Error("Database pool unavailable");
    const user = await currentUser(req); if (!user) return sendJson(res, 401, { success: false, code: "SESSION_INVALID", message: "Please log in again." });
    const id = cleanText(req.params?.id, 80); const connection = await pool.getConnection();
    try {
      await connection.beginTransaction(); const existing = await loadBroadcast(id, connection, true);
      if (!existing) { await connection.rollback(); return sendJson(res, 404, { success: false, message: "Broadcast not found." }); }
      if (!canManage(user, existing)) { await connection.rollback(); return sendJson(res, 403, { success: false, message: "You can delete only broadcasts created from your account." }); }
      mediaUri = existing.media_uri || null;
      await connection.query("DELETE FROM broadcast_receipts WHERE broadcast_id = ?", [id]);
      await connection.query("DELETE FROM broadcasts WHERE id = ?", [id]);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    if (mediaUri) await removeManagedMedia(mediaUri, "broadcast").catch((error) => console.warn("[BroadcastActionsPatch] media cleanup warning", error?.code || "cleanup_error"));
    return sendJson(res, 200, { success: true, broadcastId: id, deleted: true });
  } catch (error) {
    console.warn("[BroadcastActionsPatch] delete failed", error?.code || error?.name || "broadcast_delete_error");
    return sendJson(res, 500, { success: false, message: "The broadcast could not be deleted right now." });
  }
}
try { const mysql = require("mysql2/promise"); const originalCreatePool = mysql.createPool; mysql.createPool = function patchedCreatePool(...args) { pool = originalCreatePool.apply(this, args); return pool; }; } catch (error) { console.warn("[BroadcastActionsPatch] database hook disabled", error.message); }
try {
  const express = require("express"); const originalPatch = express.application.patch; const originalDelete = express.application.delete;
  function install(app) { if (installed) return; installed = true; originalPatch.call(app, "/api/broadcasts/:id", updateAction); originalDelete.call(app, "/api/broadcasts/:id", deleteBroadcast); console.log("[BroadcastActionsPatch] edit, pause, resume and delete actions active"); }
  express.application.patch = function patchedPatch(path, ...handlers) { install(this); return originalPatch.call(this, path, ...handlers); };
  express.application.delete = function patchedDelete(path, ...handlers) { install(this); return originalDelete.call(this, path, ...handlers); };
} catch (error) { console.warn("[BroadcastActionsPatch] route hook disabled", error.message); }
module.exports = { updateAction, deleteBroadcast };
