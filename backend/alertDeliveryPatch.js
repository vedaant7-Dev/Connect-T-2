"use strict";

const crypto = require("crypto");
const { verifyRequestToken } = require("./authSecurity");
const { saveDataUri } = require("./mediaStorage");
const { isPrivilegedRoleActive } = require("./roleAuthorization");

let pool = null;
let installed = false;
let schemaReady = null;

function sendJson(res, status, payload) {
  if (res.headersSent) return res;
  return res.status(status).json(payload);
}

function cleanText(value, maxLength = 500) {
  const text = String(value || "").trim();
  return text ? text.slice(0, maxLength) : "";
}

function normalizeWard(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw || raw === "all wards" || raw === "all" || raw === "all citizens") return "";
  const match = raw.match(/(?:ward\s*)?([0-9]{1,2}[a-z]?)/i);
  return match ? match[1].toLowerCase() : raw.replace(/\s+/g, "");
}

function isGlobalAlert(row) {
  const ward = normalizeWard(row?.ward);
  const audience = String(row?.target_audience || row?.targetAudience || "").toLowerCase();
  return !ward || audience.includes("all citizen") || audience.includes("all ward");
}

function canCitizenSee(row, user) {
  if (isGlobalAlert(row)) return true;
  return normalizeWard(row?.ward) === normalizeWard(user?.ward || user?.ward_code || user?.wardCode);
}

function makeId() {
  return `alert_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

async function columnExists(table, column) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column],
  );
  return Number(rows?.[0]?.count || 0) > 0;
}

async function indexExists(table, indexName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
    [table, indexName],
  );
  return Number(rows?.[0]?.count || 0) > 0;
}

async function ensureColumn(table, column, definition) {
  if (!(await columnExists(table, column))) await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

async function ensureIndex(table, indexName, definition) {
  if (!(await indexExists(table, indexName))) await pool.query(`ALTER TABLE ${table} ADD ${definition}`);
}

async function ensureSchema() {
  if (!pool) throw new Error("Database pool is not ready");
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS alerts (
      id VARCHAR(80) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      type VARCHAR(30) NOT NULL DEFAULT 'alert',
      category VARCHAR(80) NULL,
      priority VARCHAR(30) NULL DEFAULT 'normal',
      language VARCHAR(10) NOT NULL DEFAULT 'en',
      status VARCHAR(30) NOT NULL DEFAULT 'published',
      publish_at DATETIME NULL,
      archived_at DATETIME NULL,
      location VARCHAR(255) NULL,
      valid_until VARCHAR(80) NULL,
      expires_at VARCHAR(80) NULL,
      target_audience VARCHAR(80) NULL,
      media_uri TEXT NULL,
      media_type VARCHAR(30) NULL,
      media_file_name VARCHAR(255) NULL,
      media_mime_type VARCHAR(120) NULL,
      media_duration INT NULL,
      posted_by VARCHAR(120) NOT NULL DEFAULT 'Connect-T',
      posted_by_id VARCHAR(80) NULL,
      ward VARCHAR(80) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_alerts_active_status (is_active, status),
      KEY idx_alerts_ward (ward),
      KEY idx_alerts_publish (status, publish_at),
      KEY idx_alerts_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await ensureColumn("alerts", "language", "VARCHAR(10) NOT NULL DEFAULT 'en' AFTER priority");
    await ensureColumn("alerts", "status", "VARCHAR(30) NOT NULL DEFAULT 'published' AFTER language");
    await ensureColumn("alerts", "publish_at", "DATETIME NULL AFTER status");
    await ensureColumn("alerts", "archived_at", "DATETIME NULL AFTER publish_at");
    await ensureIndex("alerts", "idx_alerts_active_status", "KEY idx_alerts_active_status (is_active, status)");
    await ensureIndex("alerts", "idx_alerts_publish", "KEY idx_alerts_publish (status, publish_at)");

    await pool.query(`CREATE TABLE IF NOT EXISTS alert_receipts (
      alert_id VARCHAR(80) NOT NULL,
      user_id VARCHAR(80) NOT NULL,
      delivered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      read_at DATETIME NULL,
      PRIMARY KEY (alert_id, user_id),
      KEY idx_alert_receipts_user_read (user_id, read_at),
      KEY idx_alert_receipts_alert (alert_id)
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

function isApprovedOfficer(user) {
  return !!user && user.role === "nagarsevak" && String(user.approval_status || "") === "approved";
}

function ownsAlert(row, user) {
  return String(row?.posted_by_id || "") === String(user?.id || "");
}

async function promoteScheduledAlerts() {
  await pool.query(
    `UPDATE alerts SET status = 'published'
     WHERE is_active = 1 AND status = 'scheduled' AND publish_at IS NOT NULL AND publish_at <= NOW()`,
  );
}

function parsePagination(query) {
  const page = Math.max(1, Math.min(10000, Number(query?.page || 1) || 1));
  const limit = Math.max(1, Math.min(100, Number(query?.limit || 50) || 50));
  return { page, limit };
}

async function markDelivered(rows, user) {
  if (!user || user.role !== "citizen" || !rows.length) return;
  const values = rows.map((row) => [row.id, user.id]);
  await pool.query(
    `INSERT IGNORE INTO alert_receipts (alert_id, user_id) VALUES ${values.map(() => "(?, ?)").join(", ")}`,
    values.flat(),
  );
}

async function listAlerts(req, res) {
  try {
    await ensureSchema();
    await promoteScheduledAlerts();
    const user = await civicUser(req);
    if (!user) return sendJson(res, 401, { success: false, code: "SESSION_INVALID", message: "Please log in to Connect-T first." });

    const params = [user.id, new Date().toISOString()];
    let sql = `SELECT a.*, r.delivered_at, r.read_at,
        (SELECT COUNT(*) FROM alert_receipts ar WHERE ar.alert_id = a.id) AS delivered_count,
        (SELECT COUNT(*) FROM alert_receipts ar WHERE ar.alert_id = a.id AND ar.read_at IS NOT NULL) AS read_count
      FROM alerts a
      LEFT JOIN alert_receipts r ON r.alert_id = a.id AND r.user_id = ?
      WHERE a.is_active = 1 AND a.archived_at IS NULL
        AND (a.expires_at IS NULL OR a.expires_at = '' OR a.expires_at > ?)`;
    const requestedType = cleanText(req.query?.type, 30);
    if (requestedType) {
      sql += " AND a.type = ?";
      params.push(requestedType);
    }
    sql += " ORDER BY COALESCE(a.publish_at, a.created_at) DESC, a.created_at DESC LIMIT 500";

    const [rows] = await pool.query(sql, params);
    const visible = rows.filter((row) => {
      const published = row.status === "published";
      if (isSuperAdmin(user)) return true;
      if (isApprovedOfficer(user)) return ownsAlert(row, user) || (published && (isGlobalAlert(row) || canCitizenSee(row, user)));
      return published && canCitizenSee(row, user);
    });

    const { page, limit } = parsePagination(req.query);
    const offset = (page - 1) * limit;
    const paginated = visible.slice(offset, offset + limit);
    await markDelivered(paginated, user);

    return sendJson(res, 200, {
      success: true,
      alerts: paginated.map((row) => ({
        ...row,
        is_read: !!row.read_at,
        delivered_count: Number(row.delivered_count || 0),
        read_count: Number(row.read_count || 0),
      })),
      pagination: {
        page,
        limit,
        total: visible.length,
        totalPages: Math.max(1, Math.ceil(visible.length / limit)),
      },
    });
  } catch (error) {
    console.warn("[AlertDeliveryPatch] list failed", error?.code || error?.name || "alert_error");
    return sendJson(res, 500, { success: false, message: "Alerts and news could not be loaded right now." });
  }
}

function parseFutureDate(value, fieldLabel) {
  const text = cleanText(value, 80);
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`Enter a valid ${fieldLabel}.`);
    error.status = 400;
    throw error;
  }
  return date;
}

async function createAlert(req, res) {
  try {
    await ensureSchema();
    const user = await civicUser(req);
    if (!user) return sendJson(res, 401, { success: false, code: "SESSION_INVALID", message: "Please log in to Connect-T first." });
    if (!isSuperAdmin(user) && !isApprovedOfficer(user)) {
      return sendJson(res, 403, { success: false, code: "ALERT_PUBLISH_FORBIDDEN", message: "Only an approved Nagarsevak or Super Admin can publish alerts and news." });
    }

    const title = cleanText(req.body?.title, 255);
    const body = cleanText(req.body?.body, 10000);
    const type = cleanText(req.body?.type || "alert", 30).toLowerCase();
    const priority = cleanText(req.body?.priority || "normal", 30).toLowerCase();
    const language = cleanText(req.body?.language || "en", 10).toLowerCase();
    if (title.length < 3 || body.length < 5) return sendJson(res, 400, { success: false, message: "Enter a clear title and detailed message." });
    if (!["alert", "news", "emergency"].includes(type)) return sendJson(res, 400, { success: false, message: "Choose Alert, News or Emergency." });
    if (!["normal", "important", "urgent", "high"].includes(priority)) return sendJson(res, 400, { success: false, message: "Choose a valid priority." });
    if (!["en", "mr", "hi"].includes(language)) return sendJson(res, 400, { success: false, message: "Choose English, Marathi or Hindi." });

    const expiresAt = parseFutureDate(req.body?.expires_at || req.body?.expiresAt, "expiry date and time");
    if (expiresAt && expiresAt.getTime() <= Date.now()) return sendJson(res, 400, { success: false, message: "The alert expiry must be a future date and time." });
    const publishAt = parseFutureDate(req.body?.publish_at || req.body?.publishAt, "publish date and time");
    const requestedStatus = cleanText(req.body?.status || "published", 30).toLowerCase();
    let status = requestedStatus === "draft" ? "draft" : "published";
    if (requestedStatus === "scheduled" || (publishAt && publishAt.getTime() > Date.now())) status = "scheduled";

    const requestedAudience = cleanText(req.body?.target_audience || req.body?.targetAudience, 80);
    const globalAudience = isSuperAdmin(user) && /all/i.test(requestedAudience || "");
    const ward = isSuperAdmin(user)
      ? (globalAudience ? null : cleanText(req.body?.ward, 80) || null)
      : cleanText(user.ward || user.ward_code, 80) || null;
    const targetAudience = ward ? "Ward residents" : "All citizens";
    const mediaType = cleanText(req.body?.media_type || req.body?.mediaType, 30);
    if (mediaType && !["image", "video"].includes(mediaType)) return sendJson(res, 400, { success: false, message: "Unsupported alert attachment type." });
    const mediaUri = await saveDataUri(req.body?.media_uri || req.body?.mediaUri, "alert", req);
    const id = cleanText(req.body?.id, 80) || makeId();

    try {
      await pool.query(
        `INSERT INTO alerts
         (id, title, body, type, category, priority, language, status, publish_at,
          location, valid_until, expires_at, target_audience, media_uri, media_type,
          media_file_name, media_mime_type, media_duration, posted_by, posted_by_id, ward, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          id, title, body, type, cleanText(req.body?.category, 80) || null, priority, language, status,
          publishAt ? publishAt.toISOString().slice(0, 19).replace("T", " ") : status === "published" ? new Date().toISOString().slice(0, 19).replace("T", " ") : null,
          cleanText(req.body?.location, 255) || ward || null,
          cleanText(req.body?.valid_until || req.body?.validUntil, 80) || null,
          expiresAt ? expiresAt.toISOString() : null,
          targetAudience,
          mediaUri || null,
          mediaType || null,
          cleanText(req.body?.media_file_name || req.body?.mediaFileName, 255) || null,
          cleanText(req.body?.media_mime_type || req.body?.mediaMimeType, 120) || null,
          Number(req.body?.media_duration || req.body?.mediaDuration || 0) || null,
          cleanText(user.name, 120) || "Connect-T",
          String(user.id),
          ward,
        ],
      );
    } catch (error) {
      if (error?.code !== "ER_DUP_ENTRY") throw error;
      const [existing] = await pool.query("SELECT * FROM alerts WHERE id = ? LIMIT 1", [id]);
      return sendJson(res, 200, { success: true, duplicate: true, alertId: id, alert: existing[0] || null });
    }

    const [rows] = await pool.query("SELECT * FROM alerts WHERE id = ? LIMIT 1", [id]);
    return sendJson(res, 201, { success: true, alertId: id, alert: rows[0] || null });
  } catch (error) {
    const status = Number(error?.status || 500);
    console.warn("[AlertDeliveryPatch] create failed", error?.code || error?.name || "alert_error");
    return sendJson(res, status, { success: false, message: status >= 500 ? "This alert or news update could not be published right now." : error.message });
  }
}

async function updateAlert(req, res) {
  try {
    await ensureSchema();
    const user = await civicUser(req);
    if (!user) return sendJson(res, 401, { success: false, message: "Please log in again." });
    if (!isSuperAdmin(user) && !isApprovedOfficer(user)) return sendJson(res, 403, { success: false, message: "You do not have permission to update alerts or news." });

    const id = cleanText(req.params?.id, 80);
    const [rows] = await pool.query("SELECT * FROM alerts WHERE id = ? AND is_active = 1 LIMIT 1", [id]);
    const existing = rows[0];
    if (!existing) return sendJson(res, 404, { success: false, message: "Alert or news post not found." });
    if (!isSuperAdmin(user) && !ownsAlert(existing, user)) return sendJson(res, 403, { success: false, message: "You can update only posts created from your account." });

    if (req.body?.action === "archive") {
      await pool.query("UPDATE alerts SET status = 'archived', is_active = 0, archived_at = NOW() WHERE id = ?", [id]);
      return sendJson(res, 200, { success: true, alertId: id, status: "archived" });
    }

    const title = cleanText(req.body?.title ?? existing.title, 255);
    const body = cleanText(req.body?.body ?? existing.body, 10000);
    const type = cleanText(req.body?.type ?? existing.type, 30).toLowerCase();
    const priority = cleanText(req.body?.priority ?? existing.priority, 30).toLowerCase();
    const language = cleanText(req.body?.language ?? existing.language, 10).toLowerCase();
    if (title.length < 3 || body.length < 5 || !["alert", "news", "emergency"].includes(type) || !["normal", "important", "urgent", "high"].includes(priority) || !["en", "mr", "hi"].includes(language)) {
      return sendJson(res, 400, { success: false, message: "Enter valid post details." });
    }

    const publishAt = parseFutureDate(req.body?.publish_at || req.body?.publishAt || existing.publish_at, "publish date and time");
    const expiresAt = parseFutureDate(req.body?.expires_at || req.body?.expiresAt || existing.expires_at, "expiry date and time");
    const requestedStatus = cleanText(req.body?.status || existing.status, 30).toLowerCase();
    let status = requestedStatus === "draft" ? "draft" : "published";
    if (requestedStatus === "scheduled" || (publishAt && publishAt.getTime() > Date.now())) status = "scheduled";
    const requestedAudience = cleanText(req.body?.target_audience || req.body?.targetAudience || existing.target_audience, 80);
    const globalAudience = isSuperAdmin(user) && /all/i.test(requestedAudience || "");
    const ward = isSuperAdmin(user)
      ? (globalAudience ? null : cleanText(req.body?.ward ?? existing.ward, 80) || null)
      : cleanText(user.ward || user.ward_code, 80) || null;

    await pool.query(
      `UPDATE alerts SET title = ?, body = ?, type = ?, category = ?, priority = ?, language = ?, status = ?,
       publish_at = ?, expires_at = ?, target_audience = ?, ward = ?, location = ? WHERE id = ?`,
      [
        title, body, type, cleanText(req.body?.category ?? existing.category, 80) || null, priority, language, status,
        publishAt ? publishAt.toISOString().slice(0, 19).replace("T", " ") : status === "published" ? new Date().toISOString().slice(0, 19).replace("T", " ") : null,
        expiresAt ? expiresAt.toISOString() : null,
        ward ? "Ward residents" : "All citizens",
        ward,
        cleanText(req.body?.location ?? existing.location, 255) || ward || null,
        id,
      ],
    );
    const [updated] = await pool.query("SELECT * FROM alerts WHERE id = ? LIMIT 1", [id]);
    return sendJson(res, 200, { success: true, alert: updated[0] || null });
  } catch (error) {
    const status = Number(error?.status || 500);
    console.warn("[AlertDeliveryPatch] update failed", error?.code || error?.name || "alert_error");
    return sendJson(res, status, { success: false, message: status >= 500 ? "This post could not be updated right now." : error.message });
  }
}

async function deleteAlert(req, res) {
  req.body = { ...(req.body || {}), action: "archive" };
  return updateAlert(req, res);
}

async function markRead(req, res) {
  try {
    await ensureSchema();
    const user = await civicUser(req);
    if (!user) return sendJson(res, 401, { success: false, message: "Please log in again." });
    const id = cleanText(req.params?.id, 80);
    const [rows] = await pool.query("SELECT * FROM alerts WHERE id = ? AND is_active = 1 AND status = 'published' LIMIT 1", [id]);
    if (!rows.length || (!isSuperAdmin(user) && !isApprovedOfficer(user) && !canCitizenSee(rows[0], user))) {
      return sendJson(res, 404, { success: false, message: "Alert or news post not found for this account." });
    }
    await pool.query(
      `INSERT INTO alert_receipts (alert_id, user_id, delivered_at, read_at)
       VALUES (?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE read_at = COALESCE(read_at, NOW())`,
      [id, user.id],
    );
    return sendJson(res, 200, { success: true, alertId: id, read: true });
  } catch (error) {
    console.warn("[AlertDeliveryPatch] read failed", error?.code || error?.name || "alert_error");
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
  console.warn("[AlertDeliveryPatch] mysql patch disabled", error.message);
}

try {
  const express = require("express");
  const originalGet = express.application.get;
  const originalPost = express.application.post;
  const originalPatch = express.application.patch;
  const originalDelete = express.application.delete;

  function install(app) {
    if (installed) return;
    installed = true;
    originalGet.call(app, "/api/alerts", listAlerts);
    originalPost.call(app, "/api/alerts", createAlert);
    originalPatch.call(app, "/api/alerts/:id", updateAlert);
    originalPost.call(app, "/api/alerts/:id/read", markRead);
    originalDelete.call(app, "/api/alerts/:id", deleteAlert);
    console.log("[AlertDeliveryPatch] complete multi-role alert lifecycle active");
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
  express.application.delete = function patchedDelete(path, ...handlers) {
    install(this);
    return originalDelete.call(this, path, ...handlers);
  };
} catch (error) {
  console.warn("[AlertDeliveryPatch] express patch disabled", error.message);
}

module.exports = {
  canCitizenSee,
  isGlobalAlert,
  normalizeWard,
};
