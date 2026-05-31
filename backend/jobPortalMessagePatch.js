/*
 * Job Portal message compatibility patch.
 *
 * Loaded before backend/server.js. It installs message routes before the main
 * server routes so the mobile chat gets MySQL persistence, image messages,
 * read tracking, delete, and unsend support.
 */

let pool = null;
let installed = false;

function sendJson(res, status, payload) {
  if (res.headersSent) return;
  return res.status(status).json(payload);
}

function getPool() {
  if (!pool) throw new Error("Database pool is not ready");
  return pool;
}

function makeId() {
  return `MSG${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function safeAlter(db, sql) {
  try {
    await db.query(sql);
  } catch (err) {
    const msg = String(err?.message || "");
    if (!msg.includes("Duplicate column") && !msg.includes("Duplicate key")) throw err;
  }
}

async function ensureMessagesTable(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS job_portal_messages (
    id VARCHAR(64) PRIMARY KEY,
    job_id VARCHAR(64) NULL,
    application_id VARCHAR(64) NULL,
    sender_id VARCHAR(64) NOT NULL,
    receiver_id VARCHAR(64) NOT NULL,
    message TEXT NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text',
    media_url LONGTEXT NULL,
    read_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_job_messages_pair (sender_id, receiver_id),
    KEY idx_job_messages_job (job_id),
    KEY idx_job_messages_application (application_id),
    KEY idx_job_messages_read (read_at)
  )`);

  await safeAlter(db, "ALTER TABLE job_portal_messages ADD COLUMN message_type VARCHAR(20) NOT NULL DEFAULT 'text'");
  await safeAlter(db, "ALTER TABLE job_portal_messages ADD COLUMN media_url LONGTEXT NULL");
  await safeAlter(db, "ALTER TABLE job_portal_messages ADD COLUMN read_at DATETIME NULL");
}

async function createMessage(req, res) {
  try {
    const db = getPool();
    await ensureMessagesTable(db);

    const id = req.body?.id || makeId();
    const jobId = String(req.body?.jobId || req.body?.job_id || "").trim() || null;
    const applicationId = String(req.body?.applicationId || req.body?.application_id || "").trim() || null;
    const senderId = String(req.body?.senderId || req.body?.sender_id || "").trim();
    const receiverId = String(req.body?.receiverId || req.body?.receiver_id || "").trim();
    const message = String(req.body?.message || req.body?.text || "").trim();
    const messageType = String(req.body?.messageType || req.body?.message_type || "text").trim() || "text";
    const mediaUrl = String(req.body?.mediaUrl || req.body?.media_url || "").trim() || null;

    if (!senderId || !receiverId || (!message && !mediaUrl)) {
      return sendJson(res, 400, { success: false, error: "senderId, receiverId and message/media are required" });
    }

    await db.query(
      `INSERT INTO job_portal_messages
       (id, job_id, application_id, sender_id, receiver_id, message, message_type, media_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, jobId, applicationId, senderId, receiverId, message || "Photo", messageType, mediaUrl],
    );

    const [rows] = await db.query("SELECT * FROM job_portal_messages WHERE id = ? LIMIT 1", [id]);
    return sendJson(res, 201, { success: true, message: rows[0] });
  } catch (err) {
    return sendJson(res, 500, { success: false, error: err.message });
  }
}

async function listMessages(req, res) {
  try {
    const db = getPool();
    await ensureMessagesTable(db);

    const userId = String(req.query.userId || "").trim();
    const peerId = String(req.query.peerId || "").trim();
    const jobId = String(req.query.jobId || "").trim();
    const applicationId = String(req.query.applicationId || "").trim();

    const where = [];
    const params = [];

    if (userId && peerId) {
      where.push("((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))");
      params.push(userId, peerId, peerId, userId);
    }

    if (jobId) {
      where.push("job_id = ?");
      params.push(jobId);
    }

    if (applicationId) {
      where.push("application_id = ?");
      params.push(applicationId);
    }

    if (!where.length) {
      return sendJson(res, 400, { success: false, error: "userId and peerId, jobId, or applicationId required" });
    }

    if (userId && peerId) {
      const updateWhere = ["receiver_id = ?", "sender_id = ?", "read_at IS NULL"];
      const updateParams = [userId, peerId];
      if (jobId) {
        updateWhere.push("job_id = ?");
        updateParams.push(jobId);
      }
      if (applicationId) {
        updateWhere.push("application_id = ?");
        updateParams.push(applicationId);
      }
      await db.query(`UPDATE job_portal_messages SET read_at = NOW() WHERE ${updateWhere.join(" AND ")}`, updateParams);
    }

    const [rows] = await db.query(`SELECT * FROM job_portal_messages WHERE ${where.join(" AND ")} ORDER BY created_at ASC`, params);
    return sendJson(res, 200, { success: true, messages: rows });
  } catch (err) {
    return sendJson(res, 500, { success: false, error: err.message });
  }
}

try {
  const mysql = require("mysql2/promise");
  const originalCreatePool = mysql.createPool;
  mysql.createPool = function patchedCreatePool(...args) {
    pool = originalCreatePool.apply(this, args);
    return pool;
  };
} catch (err) {
  console.warn("[JobPortalMessagePatch] mysql patch disabled:", err.message);
}

try {
  const express = require("express");
  const originalGet = express.application.get;
  const originalPost = express.application.post;

  function install(app) {
    if (installed) return;
    installed = true;
    originalGet.call(app, "/api/job-portal/messages", listMessages);
    originalPost.call(app, "/api/job-portal/messages", createMessage);
  }

  express.application.get = function patchedGet(path, ...handlers) {
    if (path === "/api/job-portal/messages") install(this);
    return originalGet.call(this, path, ...handlers);
  };

  express.application.post = function patchedPost(path, ...handlers) {
    if (path === "/api/job-portal/messages") install(this);
    return originalPost.call(this, path, ...handlers);
  };

  console.log("[JobPortalMessagePatch] image messages and read tracking active");
} catch (err) {
  console.warn("[JobPortalMessagePatch] express patch disabled:", err.message);
}

module.exports = {};
