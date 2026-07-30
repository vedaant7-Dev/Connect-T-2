"use strict";

const crypto = require("crypto");
const { verifyRequestToken } = require("./authSecurity");
const { isPrivilegedRoleActive } = require("./roleAuthorization");

let pool = null;
let middlewareInstalled = false;
let routesInstalled = false;
let schemaPromise = null;

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const CHANNEL_ID = "connectt-updates";

function clean(value, max = 5000) {
  return String(value ?? "").trim().slice(0, max);
}

function notificationId() {
  return `ntf_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

function normalizeWard(value) {
  return clean(value, 120).toLowerCase().replace(/^ward\s*/i, "").replace(/[^a-z0-9]/g, "");
}

function validExpoToken(value) {
  return /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(clean(value, 255));
}

async function ensureSchema() {
  if (!pool) throw new Error("Database pool unavailable");
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS notification_devices (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id VARCHAR(100) NOT NULL,
      expo_push_token VARCHAR(255) NOT NULL,
      platform VARCHAR(20) NOT NULL DEFAULT 'android',
      app_version VARCHAR(40) NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_notification_device_token (expo_push_token),
      KEY idx_notification_devices_user (user_id, active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await pool.query(`CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(100) NOT NULL,
      recipient_user_id VARCHAR(100) NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(180) NOT NULL,
      body TEXT NOT NULL,
      data_json TEXT NULL,
      dedupe_key VARCHAR(190) NOT NULL,
      read_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_notification_recipient_dedupe (recipient_user_id, dedupe_key),
      KEY idx_notifications_recipient (recipient_user_id, read_at, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  })().catch((error) => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

async function currentUser(req) {
  const auth = verifyRequestToken(req);
  if (!auth?.sub || auth.scope === "job_portal") return null;
  const [rows] = await pool.query(
    `SELECT id, name, mobile, role, ward, ward_code, ward_number, is_super_admin
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

async function allUsers() {
  const [rows] = await pool.query(
    `SELECT id, role, ward, ward_code, ward_number, approval_status, is_super_admin
       FROM users`,
  );
  return rows;
}

function userWardMatches(user, ward, wardCode) {
  const target = normalizeWard(wardCode || ward);
  if (!target) return true;
  return [user.ward_code, user.ward_number, user.ward]
    .map(normalizeWard)
    .filter(Boolean)
    .some((candidate) => candidate === target);
}

async function sendExpoMessages(messages) {
  if (!messages.length || typeof fetch !== "function") return;
  for (let offset = 0; offset < messages.length; offset += 100) {
    const chunk = messages.slice(offset, offset + 100);
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk.map((entry) => entry.message)),
      });
      const result = await response.json().catch(() => ({}));
      const tickets = Array.isArray(result?.data) ? result.data : result?.data ? [result.data] : [];
      for (let index = 0; index < tickets.length; index += 1) {
        const ticket = tickets[index];
        if (ticket?.status === "error" && ticket?.details?.error === "DeviceNotRegistered") {
          await pool.query("UPDATE notification_devices SET active = 0 WHERE expo_push_token = ?", [chunk[index]?.token]);
        }
      }
    } catch (error) {
      console.warn("[Notifications] Expo delivery failed", error?.message || error);
    }
  }
}

async function deliver(userIds, notification) {
  await ensureSchema();
  const uniqueUsers = [...new Set((userIds || []).map(String).filter(Boolean))];
  if (!uniqueUsers.length) return;

  const insertedUsers = [];
  for (const userId of uniqueUsers) {
    const [result] = await pool.query(
      `INSERT IGNORE INTO notifications
       (id, recipient_user_id, type, title, body, data_json, dedupe_key)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        notificationId(),
        userId,
        clean(notification.type, 50) || "update",
        clean(notification.title, 180) || "Connect-T Update",
        clean(notification.body, 2000),
        JSON.stringify(notification.data || {}),
        clean(notification.dedupeKey, 190),
      ],
    );
    if (result.affectedRows) insertedUsers.push(userId);
  }
  if (!insertedUsers.length) return;

  const placeholders = insertedUsers.map(() => "?").join(",");
  const [devices] = await pool.query(
    `SELECT expo_push_token FROM notification_devices
      WHERE active = 1 AND user_id IN (${placeholders})`,
    insertedUsers,
  );
  const messages = devices
    .filter((row) => validExpoToken(row.expo_push_token))
    .map((row) => ({
      token: row.expo_push_token,
      message: {
        to: row.expo_push_token,
        sound: "default",
        channelId: CHANNEL_ID,
        priority: "high",
        title: clean(notification.title, 180),
        body: clean(notification.body, 500),
        data: notification.data || {},
      },
    }));
  await sendExpoMessages(messages);
}

async function complaintCreated(payload) {
  const complaintId = clean(payload?.complaintId || payload?.complaint?.id, 100);
  if (!complaintId) return;
  const [rows] = await pool.query(
    `SELECT id, title, category, ward, ward_code, assigned_officer_id
       FROM complaints WHERE id = ? LIMIT 1`,
    [complaintId],
  );
  const complaint = rows[0];
  if (!complaint) return;
  const users = await allUsers();
  const recipients = users
    .filter((user) => {
      if (user.is_super_admin || user.role === "super_admin") return true;
      if (user.role !== "nagarsevak" || !["approved", null, undefined].includes(user.approval_status)) return false;
      if (complaint.assigned_officer_id && String(user.id) === String(complaint.assigned_officer_id)) return true;
      return userWardMatches(user, complaint.ward, complaint.ward_code);
    })
    .map((user) => user.id);
  await deliver(recipients, {
    type: "complaint_new",
    title: "New Complaint Received",
    body: `${clean(complaint.title, 120) || "A new complaint"} · ${clean(complaint.ward, 80) || "Your ward"}`,
    dedupeKey: `complaint-new:${complaintId}`,
    data: { type: "complaint_new", complaintId, route: `/complaint/${complaintId}` },
  });
}

async function complaintStatusChanged(complaintId, requestBody) {
  const [rows] = await pool.query(
    `SELECT id, title, status, user_id, user_mobile
       FROM complaints WHERE id = ? LIMIT 1`,
    [complaintId],
  );
  const complaint = rows[0];
  if (!complaint) return;
  let recipients = [];
  if (complaint.user_id) recipients = [complaint.user_id];
  else if (complaint.user_mobile) {
    const mobile = clean(complaint.user_mobile, 30).replace(/\D/g, "").slice(-10);
    const [users] = await pool.query("SELECT id FROM users WHERE RIGHT(REPLACE(REPLACE(mobile, '+', ''), ' ', ''), 10) = ?", [mobile]);
    recipients = users.map((user) => user.id);
  }
  const status = clean(requestBody?.status || complaint.status, 50);
  const labels = { assigned: "Assigned", in_progress: "In Progress", resolved: "Resolved", rejected: "Rejected", submitted: "New Complaint" };
  await deliver(recipients, {
    type: "complaint_status",
    title: `Complaint ${labels[status] || "Updated"}`,
    body: clean(complaint.title, 150) || "Your complaint status has changed.",
    dedupeKey: `complaint-status:${complaintId}:${status}`,
    data: { type: "complaint_status", complaintId, status, route: `/complaint/${complaintId}` },
  });
}

async function broadcastCreated(payload, requestBody) {
  const item = payload?.broadcast || payload || {};
  const broadcastId = clean(item.id || payload?.broadcastId, 100);
  const status = clean(item.status || requestBody?.status || "sent", 30);
  if (!broadcastId || status === "scheduled" || status === "draft" || status === "paused") return;
  const audience = clean(item.audienceRole || item.audience_role || requestBody?.audienceRole || requestBody?.audience_role || "all", 30);
  const ward = item.ward || requestBody?.ward || "";
  const users = await allUsers();
  const recipients = users
    .filter((user) => {
      if (audience === "citizen" && user.role !== "citizen") return false;
      if (audience === "nagarsevak" && !["nagarsevak", "super_admin"].includes(user.role)) return false;
      if (audience === "all" && !["citizen", "nagarsevak", "super_admin"].includes(user.role)) return false;
      if (["seeker", "employer"].includes(audience) && user.role !== "citizen") return false;
      return userWardMatches(user, ward, "");
    })
    .map((user) => user.id);
  await deliver(recipients, {
    type: "broadcast",
    title: clean(item.title || requestBody?.title, 180) || "Official Connect-T Update",
    body: clean(item.body || requestBody?.body, 500) || "A new official update has been posted.",
    dedupeKey: `broadcast:${broadcastId}`,
    data: { type: "broadcast", broadcastId, category: item.category || requestBody?.category, route: "/(tabs)/feed" },
  });
}

async function alertCreated(payload, requestBody) {
  const item = payload?.alert || payload || {};
  const alertId = clean(item.id || payload?.alertId, 100);
  if (!alertId) return;
  const ward = item.ward || requestBody?.ward || "";
  const users = await allUsers();
  const recipients = users.filter((user) => user.role === "citizen" && userWardMatches(user, ward, "")).map((user) => user.id);
  await deliver(recipients, {
    type: "news",
    title: clean(item.title || requestBody?.title, 180) || "New Ward Update",
    body: clean(item.body || requestBody?.body || item.message || requestBody?.message, 500) || "A new update has been posted.",
    dedupeKey: `alert:${alertId}`,
    data: { type: "news", alertId, route: "/(tabs)/feed" },
  });
}

async function utilityUpdated(payload, requestBody) {
  const ward = requestBody?.ward || payload?.ward || "";
  const key = clean(payload?.id || requestBody?.utilityType || requestBody?.utility_type || Date.now(), 100);
  const users = await allUsers();
  const recipients = users.filter((user) => user.role === "citizen" && userWardMatches(user, ward, requestBody?.wardCode || requestBody?.ward_code)).map((user) => user.id);
  await deliver(recipients, {
    type: "utility",
    title: clean(requestBody?.title, 180) || "Ward Utility Update",
    body: clean(requestBody?.description || requestBody?.message, 500) || "A utility status update has been posted for your ward.",
    dedupeKey: `utility:${key}:${clean(requestBody?.status, 30)}`,
    data: { type: "utility", route: "/(tabs)/index" },
  });
}

async function afterSuccessfulResponse(req, payload) {
  const path = String(req.path || "");
  if (req.method === "POST" && path === "/api/complaints") return complaintCreated(payload);
  const statusMatch = req.method === "PATCH" && path.match(/^\/api\/complaints\/([^/]+)\/status$/);
  if (statusMatch) return complaintStatusChanged(decodeURIComponent(statusMatch[1]), req.body || {});
  if (req.method === "POST" && path === "/api/broadcasts") return broadcastCreated(payload, req.body || {});
  if (req.method === "POST" && ["/api/alerts", "/api/alert"].includes(path)) return alertCreated(payload, req.body || {});
  if (req.method === "POST" && /utility-status/i.test(path)) return utilityUpdated(payload, req.body || {});
}

function captureMiddleware(req, res, next) {
  const path = String(req.path || req.url || "").split("?")[0];
  const relevant =
    (req.method === "POST" && ["/api/complaints", "/api/broadcasts", "/api/alerts", "/api/alert"].includes(path)) ||
    (req.method === "PATCH" && /^\/api\/complaints\/[^/]+\/status$/.test(path)) ||
    (req.method === "POST" && /utility-status/i.test(path));
  if (!relevant) return next();
  let responsePayload = null;
  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    responsePayload = payload;
    return originalJson(payload);
  };
  res.once("finish", () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      setImmediate(() => afterSuccessfulResponse(req, responsePayload).catch((error) => console.warn("[Notifications] event delivery failed", error?.message || error)));
    }
  });
  return next();
}

async function registerDevice(req, res) {
  try {
    await ensureSchema();
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ success: false, message: "Please log in again." });
    const token = clean(req.body?.expoPushToken, 255);
    if (!validExpoToken(token)) return res.status(400).json({ success: false, message: "A valid Expo push token is required." });
    await pool.query(
      `INSERT INTO notification_devices (user_id, expo_push_token, platform, app_version, active, last_seen_at)
       VALUES (?, ?, ?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), platform = VALUES(platform), app_version = VALUES(app_version), active = 1, last_seen_at = NOW()`,
      [user.id, token, clean(req.body?.platform, 20) || "android", clean(req.body?.appVersion, 40) || null],
    );
    return res.json({ success: true, registered: true });
  } catch (error) {
    console.warn("[Notifications] registration failed", error?.message || error);
    return res.status(500).json({ success: false, message: "Notifications could not be enabled right now." });
  }
}

async function listNotifications(req, res) {
  try {
    await ensureSchema();
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ success: false, message: "Please log in again." });
    const limit = Math.min(Math.max(Number(req.query?.limit || 50), 1), 100);
    const [rows] = await pool.query(
      `SELECT id, type, title, body, data_json, read_at, created_at
         FROM notifications WHERE recipient_user_id = ?
         ORDER BY created_at DESC LIMIT ?`,
      [user.id, limit],
    );
    return res.json({
      success: true,
      notifications: rows.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        body: row.body,
        data: (() => { try { return JSON.parse(row.data_json || "{}"); } catch { return {}; } })(),
        readAt: row.read_at,
        createdAt: row.created_at,
      })),
      unreadCount: rows.filter((row) => !row.read_at).length,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Notifications could not be loaded right now." });
  }
}

async function markRead(req, res) {
  try {
    await ensureSchema();
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ success: false, message: "Please log in again." });
    await pool.query("UPDATE notifications SET read_at = COALESCE(read_at, NOW()) WHERE id = ? AND recipient_user_id = ?", [clean(req.params?.id, 100), user.id]);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ success: false, message: "Notification could not be updated." });
  }
}

async function markAllRead(req, res) {
  try {
    await ensureSchema();
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ success: false, message: "Please log in again." });
    await pool.query("UPDATE notifications SET read_at = COALESCE(read_at, NOW()) WHERE recipient_user_id = ?", [user.id]);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ success: false, message: "Notifications could not be updated." });
  }
}

try {
  const mysql = require("mysql2/promise");
  const originalCreatePool = mysql.createPool;
  mysql.createPool = function notificationAwareCreatePool(...args) {
    pool = originalCreatePool.apply(this, args);
    return pool;
  };
} catch (error) {
  console.warn("[Notifications] database hook unavailable", error?.message || error);
}

try {
  const express = require("express");
  const originalUse = express.application.use;
  const originalGet = express.application.get;
  const originalPost = express.application.post;
  const originalPatch = express.application.patch;

  function ensureMiddleware(app) {
    if (middlewareInstalled) return;
    middlewareInstalled = true;
    originalUse.call(app, captureMiddleware);
  }

  function ensureRoutes(app) {
    if (routesInstalled) return;
    routesInstalled = true;
    originalPost.call(app, "/api/notifications/register", registerDevice);
    originalGet.call(app, "/api/notifications", listNotifications);
    originalPatch.call(app, "/api/notifications/:id/read", markRead);
    originalPost.call(app, "/api/notifications/read-all", markAllRead);
    console.log("[Notifications] production notification routes active");
  }

  express.application.use = function notificationAwareUse(...args) {
    ensureMiddleware(this);
    return originalUse.apply(this, args);
  };
  express.application.get = function notificationAwareGet(path, ...handlers) {
    ensureRoutes(this);
    return originalGet.call(this, path, ...handlers);
  };
  express.application.post = function notificationAwarePost(path, ...handlers) {
    ensureRoutes(this);
    return originalPost.call(this, path, ...handlers);
  };
  express.application.patch = function notificationAwarePatch(path, ...handlers) {
    ensureRoutes(this);
    return originalPatch.call(this, path, ...handlers);
  };
} catch (error) {
  console.warn("[Notifications] Express hook unavailable", error?.message || error);
}

module.exports = { ensureSchema, deliver };
