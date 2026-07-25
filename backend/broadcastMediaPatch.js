"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const { verifyRequestToken } = require("./authSecurity");
const { hasExpectedSignature, UPLOAD_DIR } = require("./mediaStorage");
const { isPrivilegedRoleActive } = require("./roleAuthorization");

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/quicktime"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_DURATION_SECONDS = 5 * 60;

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

function normalizeWard(value) {
  const raw = cleanText(value, 80).toLowerCase();
  if (!raw || raw === "all" || raw === "all wards" || raw === "all citizens") return "";
  const match = raw.match(/(?:ward\s*)?(\d{1,2})/i);
  if (!match) return "";
  const ward = Number(match[1]);
  return ward >= 1 && ward <= 29 ? String(ward) : "";
}

function mysqlDate(date) {
  return date ? date.toISOString().slice(0, 19).replace("T", " ") : null;
}

function parseSchedule(value) {
  const text = cleanText(value, 80);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function publicBaseUrl(req) {
  return String(process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

function isSuperAdmin(user) {
  return !!user && (user.role === "super_admin" || !!user.is_super_admin);
}

function isApprovedNagarsevak(user) {
  return !!user && user.role === "nagarsevak" && String(user.approval_status || "") === "approved";
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

async function columnExists(table, column) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column],
  );
  return Number(rows?.[0]?.count || 0) > 0;
}

async function ensureColumn(column, definition) {
  if (!(await columnExists("broadcasts", column))) {
    await pool.query(`ALTER TABLE broadcasts ADD COLUMN ${column} ${definition}`);
  }
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
      media_uri TEXT NULL,
      media_type VARCHAR(20) NULL,
      media_file_name VARCHAR(255) NULL,
      media_mime_type VARCHAR(120) NULL,
      media_size_bytes BIGINT NULL,
      media_duration_seconds INT NULL,
      external_push_status VARCHAR(40) NOT NULL DEFAULT 'not_configured',
      external_push_message VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_broadcast_idempotency (idempotency_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await ensureColumn("media_uri", "TEXT NULL AFTER created_by_name");
    await ensureColumn("media_type", "VARCHAR(20) NULL AFTER media_uri");
    await ensureColumn("media_file_name", "VARCHAR(255) NULL AFTER media_type");
    await ensureColumn("media_mime_type", "VARCHAR(120) NULL AFTER media_file_name");
    await ensureColumn("media_size_bytes", "BIGINT NULL AFTER media_mime_type");
    await ensureColumn("media_duration_seconds", "INT NULL AFTER media_size_bytes");
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

function readUInt64(buffer, offset) {
  if (offset < 0 || offset + 8 > buffer.length) return 0;
  const value = buffer.readBigUInt64BE(offset);
  return value > BigInt(Number.MAX_SAFE_INTEGER) ? 0 : Number(value);
}

function mp4DurationSeconds(buffer) {
  let index = 0;
  while (index + 4 <= buffer.length) {
    const typeIndex = buffer.indexOf("mvhd", index, "ascii");
    if (typeIndex < 0) break;
    if (typeIndex + 40 <= buffer.length) {
      const version = buffer[typeIndex + 4];
      const timescaleOffset = version === 1 ? typeIndex + 24 : typeIndex + 16;
      const durationOffset = version === 1 ? typeIndex + 28 : typeIndex + 20;
      const timescale = buffer.readUInt32BE(timescaleOffset);
      const duration = version === 1 ? readUInt64(buffer, durationOffset) : buffer.readUInt32BE(durationOffset);
      if (timescale > 0 && duration > 0) return duration / timescale;
    }
    index = typeIndex + 4;
  }
  return null;
}

function mediaExtension(mime) {
  return {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
  }[mime];
}

function validateMedia(file) {
  if (!file) return null;
  const mime = String(file.mimetype || "").toLowerCase();
  const isImage = IMAGE_MIME_TYPES.has(mime);
  const isVideo = VIDEO_MIME_TYPES.has(mime);
  if (!isImage && !isVideo) {
    throw Object.assign(new Error("Choose a JPEG, PNG, WebP, MP4 or MOV file."), { status: 415, code: "BROADCAST_MEDIA_TYPE_UNSUPPORTED" });
  }
  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (!file.buffer?.length || file.buffer.length > maxBytes) {
    throw Object.assign(new Error(isVideo ? "Video must be smaller than 50MB." : "Image must be smaller than 10MB."), { status: 413, code: "BROADCAST_MEDIA_TOO_LARGE" });
  }
  if (!hasExpectedSignature(file.buffer, mime)) {
    throw Object.assign(new Error("The selected file content does not match its file type."), { status: 415, code: "BROADCAST_MEDIA_SIGNATURE_INVALID" });
  }
  let duration = null;
  if (isVideo) {
    duration = mp4DurationSeconds(file.buffer);
    if (!duration || !Number.isFinite(duration)) {
      throw Object.assign(new Error("The video duration could not be verified. Choose a standard MP4 or MOV video."), { status: 422, code: "BROADCAST_VIDEO_DURATION_UNKNOWN" });
    }
    if (duration > MAX_VIDEO_DURATION_SECONDS + 0.5) {
      throw Object.assign(new Error("Video duration cannot exceed 5 minutes."), { status: 422, code: "BROADCAST_VIDEO_TOO_LONG" });
    }
  }
  return {
    mime,
    type: isVideo ? "video" : "image",
    extension: mediaExtension(mime),
    size: file.buffer.length,
    duration: duration ? Math.ceil(duration) : null,
    originalName: cleanText(file.originalname, 255) || `broadcast.${mediaExtension(mime)}`,
  };
}

async function saveMedia(file, metadata, req) {
  if (!file || !metadata) return null;
  const fileName = `broadcast_${Date.now()}_${crypto.randomBytes(8).toString("hex")}.${metadata.extension}`;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const filePath = path.join(UPLOAD_DIR, fileName);
  await fs.promises.writeFile(filePath, file.buffer, { flag: "wx" });
  return { filePath, uri: `${publicBaseUrl(req)}/uploads/${fileName}` };
}

async function createBroadcast(req, res) {
  let storedMedia = null;
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
    if (!idempotencyKey || !/^[A-Za-z0-9_-]{12,100}$/.test(idempotencyKey)) return sendJson(res, 400, { success: false, code: "INVALID_IDEMPOTENCY_KEY", message: "The broadcast request could not be verified. Please try again." });
    if (!["announcement", "emergency", "information", "notice"].includes(category)) return sendJson(res, 400, { success: false, message: "Choose a valid broadcast category." });
    if (!["en", "mr", "hi"].includes(language)) return sendJson(res, 400, { success: false, message: "Choose English, Marathi or Hindi." });
    if (!["all", "citizen", "nagarsevak", "seeker", "employer"].includes(requestedAudience)) return sendJson(res, 400, { success: false, message: "Choose a valid audience." });
    if (schedule === undefined) return sendJson(res, 400, { success: false, message: "Enter a valid schedule date and time." });
    if (schedule && schedule.getTime() <= Date.now()) return sendJson(res, 400, { success: false, message: "Scheduled broadcasts require a future date and time." });

    const [duplicateRows] = await pool.query("SELECT * FROM broadcasts WHERE idempotency_key = ? LIMIT 1", [idempotencyKey]);
    if (duplicateRows[0]) return sendJson(res, 200, { success: true, duplicate: true, broadcast: duplicateRows[0] });

    const media = validateMedia(req.file);
    const audienceRole = isSuperAdmin(user) ? requestedAudience : "citizen";
    const requestedWard = normalizeWard(req.body?.ward);
    const ward = isSuperAdmin(user) ? (requestedWard ? `Ward ${requestedWard}` : null) : (user.ward || (user.ward_code ? `Ward ${user.ward_code}` : null));
    if (!isSuperAdmin(user) && !ward) return sendJson(res, 400, { success: false, message: "A Nagarsevak broadcast requires an assigned ward." });

    if (media) storedMedia = await saveMedia(req.file, media, req);
    const status = schedule ? "scheduled" : "sent";
    const id = makeId("broadcast");
    const pushMessage = "External push provider and device-token registration are not configured. In-app delivery remains active.";

    await pool.query(
      `INSERT INTO broadcasts
       (id, idempotency_key, title, body, category, language, audience_role, ward, status,
        scheduled_at, sent_at, created_by, created_by_name, media_uri, media_type, media_file_name,
        media_mime_type, media_size_bytes, media_duration_seconds, external_push_status, external_push_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_configured', ?)`,
      [
        id, idempotencyKey, title, body, category, language, audienceRole, ward, status,
        mysqlDate(schedule), status === "sent" ? mysqlDate(new Date()) : null,
        user.id, cleanText(user.name, 160) || "Connect-T",
        storedMedia?.uri || null, media?.type || null, media?.originalName || null,
        media?.mime || null, media?.size || null, media?.duration || null, pushMessage,
      ],
    );

    const [rows] = await pool.query("SELECT * FROM broadcasts WHERE id = ? LIMIT 1", [id]);
    return sendJson(res, 201, {
      success: true,
      broadcast: rows[0] || null,
      delivery: { inApp: status, externalPush: "not_configured", message: pushMessage },
    });
  } catch (error) {
    if (storedMedia?.filePath) await fs.promises.unlink(storedMedia.filePath).catch(() => undefined);
    const status = Number(error?.status || 500);
    if (status < 500) return sendJson(res, status, { success: false, code: error?.code, message: error.message });
    console.warn("[BroadcastMediaPatch] create failed", error?.code || error?.name || "broadcast_error");
    return sendJson(res, 500, { success: false, message: "The broadcast could not be created right now." });
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: MAX_VIDEO_BYTES },
}).single("media");

function uploadMiddleware(req, res, next) {
  upload(req, res, (error) => {
    if (!error) return next();
    if (error.code === "LIMIT_FILE_SIZE") return sendJson(res, 413, { success: false, code: "BROADCAST_MEDIA_TOO_LARGE", message: "Broadcast media must be smaller than 50MB." });
    return sendJson(res, 400, { success: false, code: "BROADCAST_MEDIA_UPLOAD_INVALID", message: "The selected media could not be processed." });
  });
}

try {
  const mysql = require("mysql2/promise");
  const originalCreatePool = mysql.createPool;
  mysql.createPool = function patchedCreatePool(...args) {
    pool = originalCreatePool.apply(this, args);
    return pool;
  };
} catch (error) {
  console.warn("[BroadcastMediaPatch] database hook disabled", error.message);
}

try {
  const express = require("express");
  const originalGet = express.application.get;
  const originalPost = express.application.post;

  function install(app) {
    if (installed) return;
    installed = true;
    originalGet.call(app, "/api/broadcasts/capabilities", async (_req, res) => sendJson(res, 200, {
      success: true,
      routeVersion: "broadcast-media-v1",
      media: {
        images: { mimeTypes: Array.from(IMAGE_MIME_TYPES), maxBytes: MAX_IMAGE_BYTES },
        videos: { mimeTypes: Array.from(VIDEO_MIME_TYPES), maxBytes: MAX_VIDEO_BYTES, maxDurationSeconds: MAX_VIDEO_DURATION_SECONDS },
      },
    }));
    originalPost.call(app, "/api/broadcasts", uploadMiddleware, createBroadcast);
    console.log("[BroadcastMediaPatch] broadcast media and route diagnostics active");
  }

  express.application.get = function patchedGet(path, ...handlers) {
    install(this);
    return originalGet.call(this, path, ...handlers);
  };
  express.application.post = function patchedPost(path, ...handlers) {
    install(this);
    return originalPost.call(this, path, ...handlers);
  };
} catch (error) {
  console.warn("[BroadcastMediaPatch] route hook disabled", error.message);
}

module.exports = {
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_DURATION_SECONDS,
  mp4DurationSeconds,
  normalizeWard,
  validateMedia,
};
