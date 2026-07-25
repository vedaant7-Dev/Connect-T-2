/*
 * Job Portal message compatibility patch.
 *
 * Loaded before backend/server.js. It installs message routes before the main
 * server routes so the mobile chat gets MySQL persistence, image messages,
 * read tracking, delete, and unsend support.
 */

"use strict";

let pool = null;
let installed = false;

const crypto = require("crypto");
const { removeManagedMedia, saveDataUri } = require("./mediaStorage");
const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

function sendJson(res, status, payload) {
  if (res.headersSent) return;
  return res.status(status).json(payload);
}

function getPool() {
  if (!pool) throw new Error("Database pool is not ready");
  return pool;
}

function makeId() {
  return `MSG${Date.now()}${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
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

function validImageDataUri(value) {
  return /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(String(value || ""));
}

async function createMessage(req, res) {
  let savedMediaUrl = null;
  let inserted = false;
  try {
    const db = getPool();
    await ensureMessagesTable(db);

    // Identity and job-pair authorization are enforced by authorizeJobPortal
    // before this route. Generate IDs and message type server-side so clients
    // cannot spoof or collide with an existing message.
    const id = makeId();
    const jobId = String(req.body?.jobId || req.body?.job_id || "").trim() || null;
    const applicationId = String(req.body?.applicationId || req.body?.application_id || "").trim() || null;
    const senderId = String(req.body?.senderId || req.body?.sender_id || "").trim();
    const receiverId = String(req.body?.receiverId || req.body?.receiver_id || "").trim();
    const message = String(req.body?.message || req.body?.text || "").trim();
    const rawMedia = String(req.body?.mediaUrl || req.body?.media_url || "").trim();
    const hasMedia = rawMedia.length > 0;

    if (!senderId || !receiverId || (!message && !hasMedia)) {
      return sendJson(res, 400, { success: false, error: "senderId, receiverId and message/media are required" });
    }
    if (message.length > 500) {
      return sendJson(res, 400, { success: false, error: "Message must be 500 characters or fewer." });
    }
    if (hasMedia && !validImageDataUri(rawMedia)) {
      return sendJson(res, 415, {
        success: false,
        code: "UNSUPPORTED_MESSAGE_MEDIA",
        error: "Choose a JPEG, PNG or WebP image from your device.",
      });
    }

    const [people] = await db.query(
      "SELECT id, role FROM job_portal_users WHERE id IN (?, ?)",
      [senderId, receiverId],
    );
    const sender = people.find((person) => String(person.id) === senderId);
    const receiver = people.find((person) => String(person.id) === receiverId);
    if (!sender || !receiver || sender.role === receiver.role || !["seeker", "employer"].includes(sender.role) || !["seeker", "employer"].includes(receiver.role)) {
      return sendJson(res, 403, { success: false, error: "Chat is available only between a job seeker and employer." });
    }

    if (sender.role === "seeker") {
      const [replyRows] = await db.query(
        `SELECT id, created_at FROM job_portal_messages
         WHERE job_id <=> ? AND sender_id = ? AND receiver_id = ?
         ORDER BY created_at DESC, id DESC LIMIT 1`,
        [jobId, receiverId, senderId],
      );
      const lastReply = replyRows[0] || null;
      let countSql = `SELECT COUNT(*) AS sent_count FROM job_portal_messages
                      WHERE job_id <=> ? AND sender_id = ? AND receiver_id = ?`;
      const countParams = [jobId, senderId, receiverId];
      if (lastReply) {
        countSql += " AND (created_at > ? OR (created_at = ? AND id > ?))";
        countParams.push(lastReply.created_at, lastReply.created_at, lastReply.id);
      }
      const [countRows] = await db.query(countSql, countParams);
      if (Number(countRows[0]?.sent_count || 0) >= 2) {
        return sendJson(res, 429, {
          success: false,
          code: "SEEKER_MESSAGE_LIMIT",
          error: "You can send two messages while waiting. You can message again after the employer replies.",
        });
      }
    }

    // Persist media only after every role, relationship and rate-limit check.
    savedMediaUrl = hasMedia
      ? await saveDataUri(rawMedia, "job_message", req, { allowedMimeTypes: IMAGE_MIME_TYPES })
      : null;
    const messageType = savedMediaUrl ? "image" : "text";

    await db.query(
      `INSERT INTO job_portal_messages
       (id, job_id, application_id, sender_id, receiver_id, message, message_type, media_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, jobId, applicationId, senderId, receiverId, message || "Photo", messageType, savedMediaUrl],
    );
    inserted = true;

    const [rows] = await db.query("SELECT * FROM job_portal_messages WHERE id = ? LIMIT 1", [id]);
    return sendJson(res, 201, {
      success: true,
      message: rows[0] || {
        id,
        job_id: jobId,
        application_id: applicationId,
        sender_id: senderId,
        receiver_id: receiverId,
        message: message || "Photo",
        message_type: messageType,
        media_url: savedMediaUrl,
      },
    });
  } catch (err) {
    if (savedMediaUrl && !inserted) {
      await removeManagedMedia(savedMediaUrl, "job_message").catch(() => undefined);
    }
    console.warn("[JobPortalMessagePatch] message create failed", err?.code || err?.name || "message_error");
    return sendJson(res, 500, { success: false, error: "Message could not be sent right now." });
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

    if (!userId) {
      return sendJson(res, 400, { success: false, error: "userId is required" });
    }

    if (peerId) {
      where.push("((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))");
      params.push(userId, peerId, peerId, userId);
    } else {
      where.push("(sender_id = ? OR receiver_id = ?)");
      params.push(userId, userId);
    }

    if (jobId) {
      where.push("job_id = ?");
      params.push(jobId);
    }

    if (applicationId) {
      where.push("application_id = ?");
      params.push(applicationId);
    }

    if (peerId) {
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
    console.warn("[JobPortalMessagePatch] message list failed", err?.code || err?.name || "message_error");
    return sendJson(res, 500, { success: false, error: "Messages could not be loaded right now." });
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

  console.log("[JobPortalMessagePatch] authorized image messages and read tracking active");
} catch (err) {
  console.warn("[JobPortalMessagePatch] express patch disabled:", err.message);
}

module.exports = {
  createMessage,
  listMessages,
  validImageDataUri,
};
