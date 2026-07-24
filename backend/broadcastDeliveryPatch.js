"use strict";

const crypto = require("crypto");
const { verifyRequestToken } = require("./authSecurity");
const { isPrivilegedRoleActive } = require("./roleAuthorization");

let pool = null;
let installed = false;
let schemaReady = null;

function sendJson(res, status, payload) {
  if (res.headersSent) return res;
  return res.status(status).json(payload);
}

function cleanText(value, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function normalizeWard(value) {
  const raw = cleanText(value, 80).toLowerCase();
  if (!raw || raw === "all" || raw === "all wards" || raw === "all citizens") return "";
  const match = raw.match(/(?:ward\s*)?(\d{1,2})/i);
  return match ? String(Number(match[1])) : raw.replace(/\s+/g, "");
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

async function ensureSchema() {
  if (!pool) throw new Error("Database pool is unavailable");
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS broadcasts (
      id VARCHAR(80) PRIMARY KEY,
      idempotency_key VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      category VARCHAR(60) NOT NULL DEFAULT 'announcement',
      language VARCHAR(10) NOT NULL DEFAULT 'en',
      audience_role VARCHAR(30) NOT NULL DEFAULT 'all',
      ward VARCHAR(80) NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'sent',
      scheduled_at DATETIME NULL,
      sent_at DATETIME NULL,
      archived_at DATETIME NULL,
      created_by VARCHAR(80) NOT NULL,
      created_by_name VARCHAR(160) NOT NULL,
      external_push_status VARCHAR(40) NOT NULL DEFAULT 'not_configured',
      external_push_message VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_broadcast_idempotency (idempotency_key),
      KEY idx_broadcast_status_schedule (status, scheduled_at),
      KEY idx_broadcast_audience (audience_role),
      KEY idx_broadcast_ward (ward),
      KEY idx_broadcast_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await pool.query(`CREATE TABLE IF NOT EXISTS broadcast_receipts (
      broadcast_id VARCHAR(80) NOT NULL,
      user_id VARCHAR(80) NOT NULL,
      delivered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      read_at DATETIME NULL,
      PRIMARY KEY (broadcast_id, user_id),
      KEY idx_broadcast_receipt_user_read (user_id, read_at),
      KEY idx_broadcast_receipt_broadcast (broadcast_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

async function civicUser(req) {
  const auth = verifyRequestToken(req);
  if (!auth?.sub || auth.scope === "job_portal") return null;
  const [rows] = await pool.query(
    `SELECT id, name, mobile, role, ward, ward_code, is_super_admin, approval_status
     FROM users WHERE id = ? LIMIT 1`,
    [auth.sub],
  );
  const user = rows[0] || null;
  if (!user) return null;
  if (["nagarsevak", "super_admin"].includes(user.role)) {
    const active = await isPrivilegedRoleActive(pool, {
      userId: user.id,
      mobile: user.mobile,
      role: user.role,
    });
    if (!active) return null;
  }
  return user;
}

function isSuperAdmin(user) {
  return !!user && (user.role === "super_admin" || !!user.is_super_admin);
}

function isApprovedNagarsevak(user) {
  return !!user && user.role === "nagarsevak" && String(user.approval_status || "") === "approved";
}

async function jobRoleForUser(user) {
  if (!user?.mobile) return null;
  const [rows] = await pool.query(
    `SELECT role FROM job_portal_users WHERE phone = ? ORDER BY updated_at DESC LIMIT 1`,
    [normalizeMobile(user.mobile)],
  );
  return rows[0]?.role === "employer" ? "employer" : rows[0]?.role === "seeker" ? "seeker" : null;
}

function wardMatches(row, user) {
  const rowWard = normalizeWard(row?.ward);
  if (!rowWard) return true;
  return rowWard === normalizeWard(user?.ward_code || user?.ward);
}

function audienceMatches(audience, user, jobRole) {
  const target = String(audience || "all").toLowerCase();
  if (target === "all") return true;
  if (target === "citizen") return user?.role === "citizen";
  if (target === "nagarsevak") return user?.role === "nagarsevak";
  if (target === "super_admin") return isSuperAdmin(user);
  if (target === "seeker" || target === "employer") return jobRole === target;
  return false;
}

async function promoteDueBroadcasts() {
  await pool.query(
    `UPDATE broadcasts SET status = 'sent', sent_at = COALESCE(sent_at, NOW())
     WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= NOW() AND archived_at IS NULL`,
  );
}

async function visibleBroadcasts(user) {
  await promoteDueBroadcasts();
  const [rows] = await pool.query(
    `SELECT b.*, r.delivered_at, r.read_at,
      (SELECT COUNT(*) FROM broadcast_receipts rr WHERE rr.broadcast_id = b.id) AS delivered_count,
      (SELECT COUNT(*) FROM broadcast_receipts rr WHERE rr.broadcast_id = b.id AND rr.read_at IS NOT NULL) AS read_count
     FROM broadcasts b
     LEFT JOIN broadcast_receipts r ON r.broadcast_id = b.id AND r.user_id = ?
     WHERE b.archived_at IS NULL
       AND (b.status = 'sent' OR b.created_by = ?)
     ORDER BY COALESCE(b.sent_at, b.scheduled_at, b.created_at) DESC`,
    [user.id, user.id],
  );

  if (isSuperAdmin(user)) return rows;
  const jobRole = await jobRoleForUser(user);
  if (isApprovedNagarsevak(user)) {
    return rows.filter((row) =>
      String(row.created_by) === String(user.id) ||
      (row.status === "sent" && wardMatches(row, user) && audienceMatches(row.audience_role, user, jobRole)),
    );
  }
  return rows.filter((row) => row.status === "sent" && wardMatches(row, user) && audienceMatches(row.audience_role, user, jobRole));
}

async function listBroadcasts(req, res) {
  try {
    await ensureSchema();
    const user = await civicUser(req);
    if (!user) return sendJson(res, 401, { success: false, code: "SESSION_INVALID", message: "Please log in again to view broadcasts." });
    const broadcasts = await visibleBroadcasts(user);

    if (!isSuperAdmin(user) && !isApprovedNagarsevak(user) && broadcasts.length) {
      const values = broadcasts.map((row) => [row.id, user.id]);
      await pool.query(
        `INSERT IGNORE INTO broadcast_receipts (broadcast_id, user_id) VALUES ${values.map(() => "(?, ?)").join(", ")}`,
        values.flat(),
      );
    }

    return sendJson(res, 200, {
      success: true,
      broadcasts: broadcasts.map((row) => ({
        ...row,
        is_read: !!row.read_at,
        pushConfigured: row.external_push_status !== "not_configured",
      })),
    });
  } catch (error) {
    console.warn("[BroadcastDeliveryPatch] list failed", error?.code || error?.name || "broadcast_error");
    return sendJson(res, 500, { success: false, message: "Broadcasts could not be loaded right now." });
  }
}

function parseSchedule(value) {
  const text = cleanText(value, 80);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function createBroadcast(req, res) {
  try {
    await ensureSchema();
    const user = await civicUser(req);
    if (!user) return sendJson(res, 401, { success: false, code: "SESSION_INVALID", message: "Please log in again before creating a broadcast." });
    if (!isSuperAdmin(user) && !isApprovedNagarsevak(user)) {
      return sendJson(res, 403, { success: false, code: "BROADCAST_FORBIDDEN", message: "You do not have permission to create broadcasts." });
    }

    const title = cleanText(req.body?.title, 255);
    const body = cleanText(req.body?.body, 10000);
    const category = cleanText(req.body?.category || "announcement", 60).toLowerCase();
    const language = cleanText(req.body?.language || "en", 10).toLowerCase();
    const requestedAudience = cleanText(req.body?.audienceRole || req.body?.audience_role || "all", 30).toLowerCase();
    const idempotencyKey = cleanText(req.body?.idempotencyKey || req.body?.idempotency_key, 100);
    const schedule = parseSchedule(req.body?.scheduledAt || req.body?.scheduled_at);

    if (title.length < 3 || body.length < 5) return sendJson(res, 400, { success: false, message: "Enter a clear title and message." });
    if (!idempotencyKey || !/^[A-Za-z0-9_-]{12,100}$/.test(idempotencyKey)) {
      return sendJson(res, 400, { success: false, code: "INVALID_IDEMPOTENCY_KEY", message: "The broadcast request could not be verified. Please try again." });
    }
    if (!["announcement", "emergency", "information", "notice"].includes(category)) {
      return sendJson(res, 400, { success: false, message: "Choose a valid broadcast category." });
    }
    if (!["en", "mr", "hi"].includes(language)) {
      return sendJson(res, 400, { success: false, message: "Choose English, Marathi or Hindi." });
    }
    if (!["all", "citizen", "nagarsevak", "seeker", "employer"].includes(requestedAudience)) {
      return sendJson(res, 400, { success: false, message: "Choose a valid audience." });
    }
    if (schedule === undefined) return sendJson(res, 400, { success: false, message: "Enter a valid schedule date and time." });

    const audienceRole = isSuperAdmin(user) ? requestedAudience : "citizen";
    const requestedWard = normalizeWard(req.body?.ward);
    const ward = isSuperAdmin(user) ? (requestedWard ? `Ward ${requestedWard}` : null) : (user.ward || (user.ward_code ? `Ward ${user.ward_code}` : null));
    if (!isSuperAdmin(user) && !ward) return sendJson(res, 400, { success: false, message: "A Nagarsevak broadcast requires an assigned ward." });

    const status = schedule && schedule.getTime() > Date.now() ? "scheduled" : "sent";
    const id = makeId("broadcast");
    const pushMessage = "External push provider and device-token registration are not configured. In-app delivery remains active.";

    try {
      await pool.query(
        `INSERT INTO broadcasts
         (id, idempotency_key, title, body, category, language, audience_role, ward, status,
          scheduled_at, sent_at, created_by, created_by_name, external_push_status, external_push_message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_configured', ?)`,
        [
          id,
          idempotencyKey,
          title,
          body,
          category,
          language,
          audienceRole,
          ward,
          status,
          schedule ? schedule.toISOString().slice(0, 19).replace("T", " ") : null,
          status === "sent" ? new Date().toISOString().slice(0, 19).replace("T", " ") : null,
          user.id,
          cleanText(user.name, 160) || "Connect-T",
          pushMessage,
        ],
      );
    } catch (error) {
      if (error?.code !== "ER_DUP_ENTRY") throw error;
      const [existing] = await pool.query("SELECT * FROM broadcasts WHERE idempotency_key = ? LIMIT 1", [idempotencyKey]);
      return sendJson(res, 200, { success: true, duplicate: true, broadcast: existing[0] || null });
    }

    const [rows] = await pool.query("SELECT * FROM broadcasts WHERE id = ? LIMIT 1", [id]);
    return sendJson(res, 201, {
      success: true,
      broadcast: rows[0] || null,
      delivery: {
        inApp: status,
        externalPush: "not_configured",
        message: pushMessage,
      },
    });
  } catch (error) {
    console.warn("[BroadcastDeliveryPatch] create failed", error?.code || error?.name || "broadcast_error");
    return sendJson(res, 500, { success: false, message: "The broadcast could not be created right now." });
  }
}

async function updateBroadcast(req, res) {
  try {
    await ensureSchema();
    const user = await civicUser(req);
    if (!user) return sendJson(res, 401, { success: false, message: "Please log in again." });
    const id = cleanText(req.params?.id, 80);
    const [rows] = await pool.query("SELECT * FROM broadcasts WHERE id = ? LIMIT 1", [id]);
    const existing = rows[0];
    if (!existing) return sendJson(res, 404, { success: false, message: "Broadcast not found." });
    const owns = String(existing.created_by) === String(user.id);
    if (!isSuperAdmin(user) && !owns) return sendJson(res, 403, { success: false, message: "You can update only broadcasts created from your account." });

    if (req.body?.action === "archive") {
      await pool.query("UPDATE broadcasts SET status = 'archived', archived_at = NOW() WHERE id = ?", [id]);
      return sendJson(res, 200, { success: true, broadcastId: id, status: "archived" });
    }
    if (!["scheduled", "draft"].includes(existing.status)) {
      return sendJson(res, 409, { success: false, message: "A sent broadcast cannot be edited. Archive it and create a corrected broadcast." });
    }

    const title = cleanText(req.body?.title ?? existing.title, 255);
    const body = cleanText(req.body?.body ?? existing.body, 10000);
    const schedule = parseSchedule(req.body?.scheduledAt ?? existing.scheduled_at);
    if (title.length < 3 || body.length < 5 || schedule === undefined) {
      return sendJson(res, 400, { success: false, message: "Enter valid broadcast details." });
    }
    const status = schedule && schedule.getTime() > Date.now() ? "scheduled" : "sent";
    await pool.query(
      `UPDATE broadcasts SET title = ?, body = ?, scheduled_at = ?, status = ?, sent_at = CASE WHEN ? = 'sent' THEN COALESCE(sent_at, NOW()) ELSE NULL END WHERE id = ?`,
      [title, body, schedule ? schedule.toISOString().slice(0, 19).replace("T", " ") : null, status, status, id],
    );
    const [updated] = await pool.query("SELECT * FROM broadcasts WHERE id = ? LIMIT 1", [id]);
    return sendJson(res, 200, { success: true, broadcast: updated[0] || null });
  } catch (error) {
    console.warn("[BroadcastDeliveryPatch] update failed", error?.code || error?.name || "broadcast_error");
    return sendJson(res, 500, { success: false, message: "The broadcast could not be updated right now." });
  }
}

async function markRead(req, res) {
  try {
    await ensureSchema();
    const user = await civicUser(req);
    if (!user) return sendJson(res, 401, { success: false, message: "Please log in again." });
    const id = cleanText(req.params?.id, 80);
    const visible = await visibleBroadcasts(user);
    if (!visible.some((row) => String(row.id) === id)) {
      return sendJson(res, 404, { success: false, message: "Broadcast not found for this account." });
    }
    await pool.query(
      `INSERT INTO broadcast_receipts (broadcast_id, user_id, delivered_at, read_at)
       VALUES (?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE read_at = COALESCE(read_at, NOW())`,
      [id, user.id],
    );
    return sendJson(res, 200, { success: true, broadcastId: id, read: true });
  } catch (error) {
    console.warn("[BroadcastDeliveryPatch] read receipt failed", error?.code || error?.name || "broadcast_error");
    return sendJson(res, 500, { success: false, message: "Read status could not be updated." });
  }
}

try {
  const mysql = require("mysql2/promise");
  const originalCreatePool = mysql.createPool;
  mysql.createPool = function patchedCreatePool(...args) {
    pool = originalCreatePool.apply(this, args);
    return pool;
  };
} catch (error) {
  console.warn("[BroadcastDeliveryPatch] database hook disabled", error.message);
}

try {
  const express = require("express");
  const originalGet = express.application.get;
  const originalPost = express.application.post;
  const originalPatch = express.application.patch;

  function install(app) {
    if (installed) return;
    installed = true;
    originalGet.call(app, "/api/broadcasts", listBroadcasts);
    originalPost.call(app, "/api/broadcasts", createBroadcast);
    originalPatch.call(app, "/api/broadcasts/:id", updateBroadcast);
    originalPost.call(app, "/api/broadcasts/:id/read", markRead);
    console.log("[BroadcastDeliveryPatch] auditable in-app broadcasts active");
  }

  express.application.get = function patchedGet(path, ...handlers) {
    install(this);
    return originalGet.call(this, path, ...handlers);
  };
  express.application.post = function patchedPost(path, ...handlers) {
    install(this);
    return originalPost.call(this, path, ...handlers);
  };
  express.application.patch = function patchedPatch(path, ...handlers) {
    install(this);
    return originalPatch.call(this, path, ...handlers);
  };
} catch (error) {
  console.warn("[BroadcastDeliveryPatch] route hook disabled", error.message);
}

module.exports = {
  audienceMatches,
  normalizeWard,
  wardMatches,
};
