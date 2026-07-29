"use strict";
const { verifyRequestToken } = require("./authSecurity");
const { isPrivilegedRoleActive } = require("./roleAuthorization");
let pool = null;
let installed = false;
function sendJson(res, status, payload) { if (res.headersSent) return res; return res.status(status).json(payload); }
function clean(value, max = 500) { return String(value ?? "").trim().slice(0, max); }
function wardKey(value) { return clean(value, 160).toLowerCase().replace(/\s+/g, " "); }
function present(row) { return { id: row.id, ward: row.ward, wardCode: row.ward_code, utilityType: row.utility_type, title: row.title, status: row.status, hoursPerDay: row.hours_per_day, scheduleText: row.schedule_text, description: row.description, helpline: row.helpline, source: row.source, postedById: row.posted_by_id, postedByName: row.posted_by_name, createdAt: row.created_at, updatedAt: row.updated_at }; }
function isSuperAdmin(user) { return !!user && (user.role === "super_admin" || !!user.is_super_admin); }
async function currentUser(req) { const auth = verifyRequestToken(req); if (!auth?.sub || auth.scope === "job_portal") return null; const [rows] = await pool.query("SELECT id, mobile, role, ward, is_super_admin FROM users WHERE id = ? LIMIT 1", [auth.sub]); const user = rows[0] || null; if (!user) return null; if (["nagarsevak", "super_admin"].includes(user.role)) { const active = await isPrivilegedRoleActive(pool, { userId: user.id, mobile: user.mobile, role: user.role }); if (!active) return null; } return user; }
async function load(id, executor = pool, lock = false) { const [rows] = await executor.query(`SELECT * FROM utility_statuses WHERE id = ? LIMIT 1${lock ? " FOR UPDATE" : ""}`, [id]); return rows[0] || null; }
function canManage(user, row) { return isSuperAdmin(user) || (user?.role === "nagarsevak" && String(row.posted_by_id || "") === String(user.id) && wardKey(row.ward) === wardKey(user.ward)); }
async function updateStatus(req, res) {
  try {
    if (!pool) throw new Error("Database pool unavailable"); const user = await currentUser(req); if (!user) return sendJson(res, 401, { success: false, message: "Please log in again." });
    const id = clean(req.params?.id, 80); const existing = await load(id); if (!existing || !existing.is_active) return sendJson(res, 404, { success: false, message: "Active utility status not found." });
    if (!canManage(user, existing)) return sendJson(res, 403, { success: false, message: "You can update only utility statuses posted from your account." });
    const status = clean(req.body?.status ?? existing.status, 60).toLowerCase(); if (!["normal", "reduced", "maintenance", "outage"].includes(status)) return sendJson(res, 400, { success: false, message: "Choose Normal, Reduced, Maintenance or Outage." });
    const title = clean(req.body?.title ?? existing.title, 190); const hours = clean(req.body?.hoursPerDay ?? req.body?.hours_per_day ?? existing.hours_per_day, 40) || null; const schedule = clean(req.body?.scheduleText ?? req.body?.schedule_text ?? existing.schedule_text, 500) || null; const description = clean(req.body?.description ?? existing.description, 3000) || null; const helpline = clean(req.body?.helpline ?? existing.helpline, 160) || null; const source = clean(req.body?.source ?? existing.source, 190) || null;
    if (!title || !schedule || !description) return sendJson(res, 400, { success: false, message: "Time and public message are required." });
    await pool.query("UPDATE utility_statuses SET title = ?, status = ?, hours_per_day = ?, schedule_text = ?, description = ?, helpline = ?, source = ?, is_active = 1 WHERE id = ?", [title, status, hours, schedule, description, helpline, source, id]);
    return sendJson(res, 200, { success: true, status: present(await load(id)) });
  } catch (error) { console.warn("[UtilityStatusActionsPatch] update failed", error?.code || error?.name || "utility_update_error"); return sendJson(res, 500, { success: false, message: "The utility status could not be updated right now." }); }
}
async function deleteStatus(req, res) {
  try {
    if (!pool) throw new Error("Database pool unavailable"); const user = await currentUser(req); if (!user) return sendJson(res, 401, { success: false, message: "Please log in again." });
    const id = clean(req.params?.id, 80); const existing = await load(id); if (!existing || !existing.is_active) return sendJson(res, 404, { success: false, message: "Active utility status not found." });
    if (!canManage(user, existing)) return sendJson(res, 403, { success: false, message: "You can delete only utility statuses posted from your account." });
    await pool.query("UPDATE utility_statuses SET is_active = 0 WHERE id = ?", [id]); return sendJson(res, 200, { success: true, statusId: id, deleted: true });
  } catch (error) { console.warn("[UtilityStatusActionsPatch] delete failed", error?.code || error?.name || "utility_delete_error"); return sendJson(res, 500, { success: false, message: "The utility status could not be deleted right now." }); }
}
try { const mysql = require("mysql2/promise"); const originalCreatePool = mysql.createPool; mysql.createPool = function patchedCreatePool(...args) { pool = originalCreatePool.apply(this, args); return pool; }; } catch (error) { console.warn("[UtilityStatusActionsPatch] database hook disabled", error.message); }
try { const express = require("express"); const originalPatch = express.application.patch; const originalDelete = express.application.delete; function install(app) { if (installed) return; installed = true; originalPatch.call(app, "/api/utility-status/:id", updateStatus); originalDelete.call(app, "/api/utility-status/:id", deleteStatus); console.log("[UtilityStatusActionsPatch] owner-bound edit and delete active"); } express.application.patch = function patchedPatch(path, ...handlers) { install(this); return originalPatch.call(this, path, ...handlers); }; express.application.delete = function patchedDelete(path, ...handlers) { install(this); return originalDelete.call(this, path, ...handlers); }; } catch (error) { console.warn("[UtilityStatusActionsPatch] route hook disabled", error.message); }
module.exports = { updateStatus, deleteStatus };
