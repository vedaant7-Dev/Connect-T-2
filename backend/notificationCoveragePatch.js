"use strict";

const { deliver } = require("./notificationSystemPatch");

let pool = null;
let middlewareInstalled = false;
let scheduledTimerStarted = false;

function clean(value, max = 5000) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizeWard(value) {
  return clean(value, 120).toLowerCase().replace(/^ward\s*/i, "").replace(/[^a-z0-9]/g, "");
}

function isSuperAdmin(user) {
  return !!user && (user.role === "super_admin" || !!user.is_super_admin);
}

function isApprovedNagarsevak(user) {
  return !!user && user.role === "nagarsevak" && String(user.approval_status || "").toLowerCase() === "approved";
}

function userWardMatches(user, ward, wardCode) {
  const target = normalizeWard(wardCode || ward);
  if (!target) return true;
  return [user.ward_code, user.ward_number, user.ward]
    .map(normalizeWard)
    .filter(Boolean)
    .some((candidate) => candidate === target);
}

async function allUsers() {
  const [rows] = await pool.query(
    `SELECT id, role, ward, ward_code, ward_number, approval_status, is_super_admin
       FROM users`,
  );
  return rows;
}

async function complaintOwnerIds(complaint) {
  if (complaint.user_id) return [String(complaint.user_id)];
  const mobile = clean(complaint.user_mobile, 30).replace(/\D/g, "").slice(-10);
  if (!mobile) return [];
  const [rows] = await pool.query(
    "SELECT id FROM users WHERE RIGHT(REPLACE(REPLACE(mobile, '+', ''), ' ', ''), 10) = ?",
    [mobile],
  );
  return rows.map((row) => String(row.id));
}

async function complaintRecipients(complaint) {
  const users = await allUsers();
  const recipients = new Set(await complaintOwnerIds(complaint));
  for (const user of users) {
    if (isSuperAdmin(user)) recipients.add(String(user.id));
    if (!isApprovedNagarsevak(user)) continue;
    if (complaint.assigned_officer_id && String(user.id) === String(complaint.assigned_officer_id)) {
      recipients.add(String(user.id));
      continue;
    }
    if (userWardMatches(user, complaint.ward, complaint.ward_code)) recipients.add(String(user.id));
  }
  return [...recipients];
}

async function notifyComplaintCreated(payload) {
  const complaintId = clean(payload?.complaintId || payload?.complaint?.id, 100);
  if (!complaintId) return;
  const [rows] = await pool.query(
    `SELECT id, title, status, ward, ward_code, assigned_officer_id, user_id, user_mobile
       FROM complaints WHERE id = ? LIMIT 1`,
    [complaintId],
  );
  const complaint = rows[0];
  if (!complaint) return;
  await deliver(await complaintRecipients(complaint), {
    type: "complaint_new",
    title: "New Complaint Received",
    body: `${clean(complaint.title, 120) || "A new complaint"} · ${clean(complaint.ward, 80) || "Ward update"}`,
    dedupeKey: `complaint-new:${complaintId}`,
    data: { type: "complaint_new", complaintId, route: `/complaint/${complaintId}` },
  });
}

async function notifyComplaintStatus(complaintId, requestBody) {
  const [rows] = await pool.query(
    `SELECT id, title, status, ward, ward_code, assigned_officer_id, user_id, user_mobile
       FROM complaints WHERE id = ? LIMIT 1`,
    [complaintId],
  );
  const complaint = rows[0];
  if (!complaint) return;
  const status = clean(requestBody?.status || complaint.status, 50);
  const labels = {
    assigned: "Assigned",
    in_progress: "In Progress",
    resolved: "Resolved",
    rejected: "Rejected",
    submitted: "New Complaint",
  };
  await deliver(await complaintRecipients(complaint), {
    type: "complaint_status",
    title: `Complaint ${labels[status] || "Updated"}`,
    body: clean(complaint.title, 150) || "A complaint status has changed.",
    dedupeKey: `complaint-status:${complaintId}:${status}`,
    data: { type: "complaint_status", complaintId, status, route: `/complaint/${complaintId}` },
  });
}

async function notifyCommunityPost(payload, requestBody) {
  const item = payload?.post || payload || {};
  const postId = clean(item.id || payload?.postId, 100);
  if (!postId) return;
  const postType = clean(item.post_type || item.postType || requestBody?.post_type || requestBody?.postType || "message", 30).toLowerCase();
  const authorName = clean(item.author_name || item.authorName || "Community member", 120);
  const title = clean(item.title || requestBody?.title, 180);
  const content = clean(item.content || requestBody?.content, 500);
  const typeLabel = { message: "Message", update: "Update", notice: "Notice", information: "Information" }[postType] || "Post";
  const users = await allUsers();
  const superAdmins = users.filter(isSuperAdmin).map((user) => user.id);
  const nagarsevaks = users.filter(isApprovedNagarsevak).map((user) => user.id);
  const notification = {
    type: "community",
    title: title || `New Community ${typeLabel}`,
    body: content ? `${authorName}: ${content}` : `${authorName} posted a new ${typeLabel.toLowerCase()}.`,
    dedupeKey: `community:${postId}`,
  };
  await Promise.all([
    deliver(superAdmins, {
      ...notification,
      data: { type: "community", communityPostId: postId, postType, route: "/super-admin/community" },
    }),
    deliver(nagarsevaks, {
      ...notification,
      data: { type: "community", communityPostId: postId, postType, route: "/(tabs)/community" },
    }),
  ]);
}

function broadcastMatches(user, audience, ward) {
  if (isSuperAdmin(user)) return true;
  if (audience === "citizen") return user.role === "citizen" && userWardMatches(user, ward, "");
  if (audience === "nagarsevak") return isApprovedNagarsevak(user) && userWardMatches(user, ward, "");
  if (audience === "all") return (user.role === "citizen" || isApprovedNagarsevak(user)) && userWardMatches(user, ward, "");
  if (["seeker", "employer"].includes(audience)) return user.role === "citizen" && userWardMatches(user, ward, "");
  return false;
}

async function notifyBroadcast(payload, requestBody = {}) {
  const item = payload?.broadcast || payload || {};
  const broadcastId = clean(item.id || payload?.broadcastId, 100);
  const status = clean(item.status || requestBody?.status || "sent", 30).toLowerCase();
  if (!broadcastId || status !== "sent") return;
  const audience = clean(item.audienceRole || item.audience_role || requestBody?.audienceRole || requestBody?.audience_role || "all", 30).toLowerCase();
  const ward = item.ward || requestBody?.ward || "";
  const users = await allUsers();
  const recipients = users.filter((user) => broadcastMatches(user, audience, ward)).map((user) => user.id);
  await deliver(recipients, {
    type: "broadcast",
    title: clean(item.title || requestBody?.title, 180) || "Official Connect-T Update",
    body: clean(item.body || requestBody?.body, 500) || "A new official update has been posted.",
    dedupeKey: `broadcast:${broadcastId}`,
    data: { type: "broadcast", broadcastId, category: item.category || requestBody?.category, route: "/(tabs)/feed" },
  });
}

async function sweepScheduledBroadcasts() {
  if (!pool) return;
  try {
    await pool.query(
      `UPDATE broadcasts SET status = 'sent', sent_at = COALESCE(sent_at, NOW())
       WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= NOW() AND archived_at IS NULL`,
    );
    const [rows] = await pool.query(
      `SELECT id, title, body, category, audience_role, ward, status
         FROM broadcasts
        WHERE status = 'sent' AND sent_at >= DATE_SUB(NOW(), INTERVAL 3 MINUTE)
        ORDER BY sent_at ASC LIMIT 100`,
    );
    for (const row of rows) await notifyBroadcast({ broadcast: row });
  } catch (error) {
    if (!["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(error?.code)) {
      console.warn("[NotificationCoverage] scheduled broadcast sweep failed", error?.code || error?.message || error);
    }
  }
}

function startScheduledSweep() {
  if (scheduledTimerStarted) return;
  scheduledTimerStarted = true;
  const timer = setInterval(() => void sweepScheduledBroadcasts(), 60_000);
  if (typeof timer.unref === "function") timer.unref();
  setTimeout(() => void sweepScheduledBroadcasts(), 15_000).unref?.();
}

async function afterSuccessfulResponse(req, payload) {
  const routePath = String(req.path || req.url || "").split("?")[0];
  if (req.method === "POST" && routePath === "/api/nagarsevak-community/posts") return notifyCommunityPost(payload, req.body || {});
  if (req.method === "POST" && routePath === "/api/complaints") return notifyComplaintCreated(payload);
  const complaintMatch = req.method === "PATCH" && routePath.match(/^\/api\/complaints\/([^/]+)\/status$/);
  if (complaintMatch) return notifyComplaintStatus(decodeURIComponent(complaintMatch[1]), req.body || {});
  if (req.method === "POST" && routePath === "/api/broadcasts") return notifyBroadcast(payload, req.body || {});
  if (req.method === "PATCH" && /^\/api\/broadcasts\/[^/]+$/.test(routePath) && payload?.broadcast?.status === "sent") {
    return notifyBroadcast(payload, req.body || {});
  }
}

function captureMiddleware(req, res, next) {
  const routePath = String(req.path || req.url || "").split("?")[0];
  const relevant =
    (req.method === "POST" && ["/api/nagarsevak-community/posts", "/api/complaints", "/api/broadcasts"].includes(routePath)) ||
    (req.method === "PATCH" && (/^\/api\/complaints\/[^/]+\/status$/.test(routePath) || /^\/api\/broadcasts\/[^/]+$/.test(routePath)));
  if (!relevant) return next();
  let responsePayload = null;
  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    responsePayload = payload;
    return originalJson(payload);
  };
  res.once("finish", () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      setImmediate(() => afterSuccessfulResponse(req, responsePayload).catch((error) => {
        console.warn("[NotificationCoverage] event delivery failed", error?.code || error?.message || error);
      }));
    }
  });
  return next();
}

try {
  const mysql = require("mysql2/promise");
  const originalCreatePool = mysql.createPool;
  mysql.createPool = function notificationCoverageCreatePool(...args) {
    pool = originalCreatePool.apply(this, args);
    startScheduledSweep();
    return pool;
  };
} catch (error) {
  console.warn("[NotificationCoverage] database hook unavailable", error?.message || error);
}

try {
  const express = require("express");
  const originalUse = express.application.use;
  express.application.use = function notificationCoverageUse(...args) {
    if (!middlewareInstalled) {
      middlewareInstalled = true;
      originalUse.call(this, captureMiddleware);
      console.log("[NotificationCoverage] Community, broadcast and complaint push coverage active");
    }
    return originalUse.apply(this, args);
  };
} catch (error) {
  console.warn("[NotificationCoverage] Express hook unavailable", error?.message || error);
}

module.exports = {
  notifyCommunityPost,
  notifyComplaintCreated,
  notifyComplaintStatus,
  notifyBroadcast,
  sweepScheduledBroadcasts,
};
