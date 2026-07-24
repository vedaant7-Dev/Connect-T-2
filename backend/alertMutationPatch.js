"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const { verifyRequestToken } = require("./authSecurity");
const { isPrivilegedRoleActive } = require("./roleAuthorization");
const { saveDataUri, UPLOAD_DIR } = require("./mediaStorage");

const ALERT_TYPES = new Set(["alert", "news", "emergency"]);
const PRIORITIES = new Set(["normal", "important", "urgent", "high"]);
const LANGUAGES = new Set(["en", "mr", "hi"]);
const STATUSES = new Set(["draft", "scheduled", "published"]);
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

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

function hasOwn(value, key) {
  return !!value && Object.prototype.hasOwnProperty.call(value, key);
}

function normalizeWardCode(value) {
  const match = String(value || "").trim().match(/(?:ward\s*)?(\d{1,2})/i);
  if (!match) return null;
  const number = Number(match[1]);
  return number >= 1 && number <= 29 ? String(number) : null;
}

function makeId() {
  return `alert_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

function isSuperAdmin(user) {
  return !!user && (user.role === "super_admin" || !!user.is_super_admin);
}

function isApprovedOfficer(user) {
  return !!user && user.role === "nagarsevak" && String(user.approval_status || "") === "approved";
}

async function currentUser(req) {
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
  if (!(await columnExists(table, column))) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function ensureIndex(table, indexName, definition) {
  if (!(await indexExists(table, indexName))) {
    await pool.query(`ALTER TABLE ${table} ADD ${definition}`);
  }
}

async function ensureSchema() {
  if (!pool) throw new Error("Database pool is unavailable");
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
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });

  return schemaReady;
}

function parseDate(value, label) {
  const text = cleanText(value, 80);
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`Enter a valid ${label}.`);
    error.status = 400;
    throw error;
  }
  return date;
}

function mysqlDate(date) {
  return date ? date.toISOString().slice(0, 19).replace("T", " ") : null;
}

function validateCore({ title, body, type, priority, language, status, publishAt, expiresAt, targetAudience, ward }) {
  if (title.length < 3 || body.length < 5) throw Object.assign(new Error("Enter a clear title and detailed message."), { status: 400 });
  if (!ALERT_TYPES.has(type)) throw Object.assign(new Error("Choose Alert, News or Emergency."), { status: 400 });
  if (!PRIORITIES.has(priority)) throw Object.assign(new Error("Choose a valid priority."), { status: 400 });
  if (!LANGUAGES.has(language)) throw Object.assign(new Error("Choose English, Marathi or Hindi."), { status: 400 });
  if (!STATUSES.has(status)) throw Object.assign(new Error("Choose a valid publishing status."), { status: 400 });
  if (status === "scheduled" && (!publishAt || publishAt.getTime() <= Date.now())) {
    throw Object.assign(new Error("Scheduled updates require a future publish date and time."), { status: 400 });
  }
  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    throw Object.assign(new Error("The alert expiry must be a future date and time."), { status: 400 });
  }
  const effectivePublish = status === "scheduled" && publishAt ? publishAt.getTime() : Date.now();
  if (expiresAt && expiresAt.getTime() <= effectivePublish) {
    throw Object.assign(new Error("The expiry must be later than the publish time."), { status: 400 });
  }
  if (targetAudience === "Ward residents" && !normalizeWardCode(ward)) {
    throw Object.assign(new Error("Select a valid ward from Ward 1 to Ward 29."), { status: 400 });
  }
}

function managedMediaPath(mediaUri) {
  const value = String(mediaUri || "");
  if (!value.includes("/uploads/alert_")) return null;
  try {
    const pathname = new URL(value, "https://connect-t.invalid").pathname;
    const fileName = path.basename(pathname);
    if (!/^alert_\d+_[a-f0-9]+\.(?:jpg|png|webp|mp4|webm|mov)$/i.test(fileName)) return null;
    return path.join(UPLOAD_DIR, fileName);
  } catch {
    return null;
  }
}

async function removeManagedMedia(mediaUri) {
  const filePath = managedMediaPath(mediaUri);
  if (filePath) await fs.promises.unlink(filePath).catch(() => undefined);
}

async function resolveMedia(req, existing = null) {
  const mediaProvided = hasOwn(req.body, "media_uri") || hasOwn(req.body, "mediaUri");
  if (!mediaProvided) {
    return {
      provided: false,
      uri: existing?.media_uri || null,
      type: existing?.media_type || null,
      fileName: existing?.media_file_name || null,
      mimeType: existing?.media_mime_type || null,
      duration: existing?.media_duration || null,
      newlyStored: false,
    };
  }

  const rawMedia = req.body?.media_uri ?? req.body?.mediaUri;
  if (!rawMedia) {
    return { provided: true, uri: null, type: null, fileName: null, mimeType: null, duration: null, newlyStored: false };
  }
  if (String(rawMedia) === String(existing?.media_uri || "")) {
    return {
      provided: true,
      uri: existing.media_uri,
      type: existing.media_type,
      fileName: existing.media_file_name,
      mimeType: existing.media_mime_type,
      duration: existing.media_duration,
      newlyStored: false,
    };
  }
  if (!String(rawMedia).startsWith("data:")) {
    throw Object.assign(new Error("Upload the attachment from this device instead of using an external URL."), { status: 400 });
  }

  const requestedType = cleanText(req.body?.media_type || req.body?.mediaType, 30).toLowerCase();
  if (!['image', 'video'].includes(requestedType)) {
    throw Object.assign(new Error("Choose a valid attachment type."), { status: 400 });
  }
  const allowedMimeTypes = requestedType === "image" ? IMAGE_TYPES : VIDEO_TYPES;
  const uri = await saveDataUri(rawMedia, "alert", req, { allowedMimeTypes });
  return {
    provided: true,
    uri,
    type: requestedType,
    fileName: cleanText(req.body?.media_file_name || req.body?.mediaFileName, 255) || null,
    mimeType: cleanText(req.body?.media_mime_type || req.body?.mediaMimeType, 120) || null,
    duration: Number(req.body?.media_duration || req.body?.mediaDuration || 0) || null,
    newlyStored: true,
  };
}

function normalizedStatus(body, existing = null) {
  const requested = cleanText(body?.status ?? existing?.status ?? "published", 30).toLowerCase();
  return STATUSES.has(requested) ? requested : "published";
}

async function createAlert(req, res) {
  let media = null;
  try {
    await ensureSchema();
    const user = req.alertPublisher || await currentUser(req);
    if (!user) return sendJson(res, 401, { success: false, code: "SESSION_INVALID", message: "Please log in again before publishing." });
    if (!isSuperAdmin(user) && !isApprovedOfficer(user)) {
      return sendJson(res, 403, { success: false, code: "ALERT_PUBLISH_FORBIDDEN", message: "Only an approved Nagarsevak or Super Admin can publish alerts and news." });
    }

    const id = cleanText(req.body?.id, 80) || makeId();
    const title = cleanText(req.body?.title, 255);
    const body = cleanText(req.body?.body, 10000);
    const type = cleanText(req.body?.type || "alert", 30).toLowerCase();
    const priority = cleanText(req.body?.priority || "normal", 30).toLowerCase();
    const language = cleanText(req.body?.language || "en", 10).toLowerCase();
    const status = normalizedStatus(req.body);
    const publishAt = parseDate(req.body?.publish_at || req.body?.publishAt, "publish date and time");
    const expiresAt = parseDate(req.body?.expires_at || req.body?.expiresAt, "expiry date and time");
    const targetAudience = cleanText(req.body?.target_audience || req.body?.targetAudience || "All citizens", 80);
    const ward = cleanText(req.body?.ward, 80) || null;
    validateCore({ title, body, type, priority, language, status, publishAt, expiresAt, targetAudience, ward });

    media = await resolveMedia(req);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        `INSERT INTO alerts
         (id, title, body, type, category, priority, language, status, publish_at,
          location, valid_until, expires_at, target_audience, media_uri, media_type,
          media_file_name, media_mime_type, media_duration, posted_by, posted_by_id, ward, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          id,
          title,
          body,
          type,
          cleanText(req.body?.category, 80) || null,
          priority,
          language,
          status,
          status === "published" && !publishAt ? mysqlDate(new Date()) : mysqlDate(publishAt),
          cleanText(req.body?.location, 255) || ward || null,
          cleanText(req.body?.valid_until || req.body?.validUntil, 80) || null,
          expiresAt ? expiresAt.toISOString() : null,
          targetAudience,
          media.uri,
          media.type,
          media.fileName,
          media.mimeType,
          media.duration,
          cleanText(user.name, 120) || "Connect-T",
          String(user.id),
          ward,
        ],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const [rows] = await pool.query("SELECT * FROM alerts WHERE id = ? LIMIT 1", [id]);
    return sendJson(res, 201, { success: true, alertId: id, alert: rows[0] || null });
  } catch (error) {
    if (media?.newlyStored) await removeManagedMedia(media.uri);
    const status = Number(error?.status || 500);
    console.warn("[AlertMutationPatch] create failed", error?.code || error?.name || "alert_error");
    return sendJson(res, status, {
      success: false,
      message: status >= 500 ? "This alert or news update could not be published right now." : error.message,
    });
  }
}

async function updateAlert(req, res) {
  let media = null;
  let existing = null;
  try {
    await ensureSchema();
    const user = await currentUser(req);
    if (!user) return sendJson(res, 401, { success: false, message: "Please log in again." });
    if (!isSuperAdmin(user) && !isApprovedOfficer(user)) {
      return sendJson(res, 403, { success: false, message: "You do not have permission to update alerts or news." });
    }

    const id = cleanText(req.params?.id, 80);
    const [rows] = await pool.query("SELECT * FROM alerts WHERE id = ? AND is_active = 1 LIMIT 1", [id]);
    existing = rows[0] || null;
    if (!existing) return sendJson(res, 404, { success: false, message: "Alert or news post not found." });
    if (!isSuperAdmin(user) && String(existing.posted_by_id || "") !== String(user.id)) {
      return sendJson(res, 403, { success: false, message: "You can update only posts created from your account." });
    }

    if (req.body?.action === "archive") {
      await pool.query("UPDATE alerts SET status = 'archived', is_active = 0, archived_at = NOW() WHERE id = ?", [id]);
      return sendJson(res, 200, { success: true, alertId: id, status: "archived" });
    }

    const title = cleanText(req.body?.title ?? existing.title, 255);
    const body = cleanText(req.body?.body ?? existing.body, 10000);
    const type = cleanText(req.body?.type ?? existing.type, 30).toLowerCase();
    const priority = cleanText(req.body?.priority ?? existing.priority, 30).toLowerCase();
    const language = cleanText(req.body?.language ?? existing.language, 10).toLowerCase();
    const status = normalizedStatus(req.body, existing);
    const publishAt = parseDate(req.body?.publish_at ?? req.body?.publishAt ?? existing.publish_at, "publish date and time");
    const expiresAt = parseDate(req.body?.expires_at ?? req.body?.expiresAt ?? existing.expires_at, "expiry date and time");
    const targetAudience = cleanText(req.body?.target_audience ?? req.body?.targetAudience ?? existing.target_audience, 80);
    const ward = cleanText(req.body?.ward ?? existing.ward, 80) || null;
    validateCore({ title, body, type, priority, language, status, publishAt, expiresAt, targetAudience, ward });

    media = await resolveMedia(req, existing);
    await pool.query(
      `UPDATE alerts SET title = ?, body = ?, type = ?, category = ?, priority = ?, language = ?, status = ?,
       publish_at = ?, expires_at = ?, valid_until = ?, target_audience = ?, ward = ?, location = ?,
       media_uri = ?, media_type = ?, media_file_name = ?, media_mime_type = ?, media_duration = ?
       WHERE id = ?`,
      [
        title,
        body,
        type,
        cleanText(req.body?.category ?? existing.category, 80) || null,
        priority,
        language,
        status,
        status === "published" && !publishAt ? mysqlDate(new Date()) : mysqlDate(publishAt),
        expiresAt ? expiresAt.toISOString() : null,
        cleanText(req.body?.valid_until ?? req.body?.validUntil ?? existing.valid_until, 80) || null,
        targetAudience,
        ward,
        cleanText(req.body?.location ?? existing.location, 255) || ward || null,
        media.uri,
        media.type,
        media.fileName,
        media.mimeType,
        media.duration,
        id,
      ],
    );

    if (media.provided && String(existing.media_uri || "") !== String(media.uri || "")) {
      await removeManagedMedia(existing.media_uri);
    }
    const [updated] = await pool.query("SELECT * FROM alerts WHERE id = ? LIMIT 1", [id]);
    return sendJson(res, 200, { success: true, alert: updated[0] || null });
  } catch (error) {
    if (media?.newlyStored) await removeManagedMedia(media.uri);
    const status = Number(error?.status || 500);
    console.warn("[AlertMutationPatch] update failed", error?.code || error?.name || "alert_error");
    return sendJson(res, status, {
      success: false,
      message: status >= 500 ? "This post could not be updated right now." : error.message,
    });
  }
}

async function archiveAlert(req, res) {
  req.body = { ...(req.body || {}), action: "archive" };
  return updateAlert(req, res);
}

try {
  const mysql = require("mysql2/promise");
  const originalCreatePool = mysql.createPool;
  mysql.createPool = function patchedCreatePool(...args) {
    pool = originalCreatePool.apply(this, args);
    return pool;
  };
} catch (error) {
  console.warn("[AlertMutationPatch] database hook disabled", error.message);
}

try {
  const express = require("express");
  const originalPost = express.application.post;
  const originalPatch = express.application.patch;
  const originalDelete = express.application.delete;

  function install(app) {
    if (installed) return;
    installed = true;
    originalPost.call(app, "/api/alerts", createAlert);
    originalPatch.call(app, "/api/alerts/:id", updateAlert);
    originalDelete.call(app, "/api/alerts/:id", archiveAlert);
    console.log("[AlertMutationPatch] transaction-safe alert mutations active");
  }

  express.application.post = function patchedPost(routePath, ...handlers) {
    install(this);
    return originalPost.call(this, routePath, ...handlers);
  };
  express.application.patch = function patchedPatch(routePath, ...handlers) {
    install(this);
    return originalPatch.call(this, routePath, ...handlers);
  };
  express.application.delete = function patchedDelete(routePath, ...handlers) {
    install(this);
    return originalDelete.call(this, routePath, ...handlers);
  };
} catch (error) {
  console.warn("[AlertMutationPatch] route hook disabled", error.message);
}

module.exports = {
  managedMediaPath,
  removeManagedMedia,
  resolveMedia,
};
