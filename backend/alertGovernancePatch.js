"use strict";

const { verifyRequestToken } = require("./authSecurity");
const { isPrivilegedRoleActive } = require("./roleAuthorization");

let pool = null;
let installed = false;

function sendJson(res, status, payload) {
  if (res.headersSent) return res;
  return res.status(status).json(payload);
}

function cleanText(value, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeWardCode(value) {
  const match = String(value || "").trim().match(/(?:ward\s*)?(\d{1,2})/i);
  if (!match) return null;
  const number = Number(match[1]);
  return number >= 1 && number <= 29 ? String(number) : null;
}

function isGlobalAudience(value) {
  const audience = cleanText(value, 80).toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  return ["all", "all citizen", "all citizens", "all ward", "all wards", "global"].includes(audience);
}

function isGlobalAlert(row) {
  const audience = cleanText(row?.target_audience, 80);
  return !normalizeWardCode(row?.ward) || isGlobalAudience(audience);
}

function sameWard(row, user) {
  const alertWard = normalizeWardCode(row?.ward);
  const userWard = normalizeWardCode(user?.ward_code || user?.ward);
  return !!alertWard && !!userWard && alertWard === userWard;
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

function parseOptionalDate(value) {
  const text = cleanText(value, 80);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function validateTiming(body, existing = null) {
  const requestedStatus = cleanText(body?.status ?? existing?.status ?? "published", 30).toLowerCase();
  const publishAt = parseOptionalDate(body?.publish_at ?? body?.publishAt ?? existing?.publish_at);
  const expiresAt = parseOptionalDate(body?.expires_at ?? body?.expiresAt ?? existing?.expires_at);

  if (publishAt === undefined || expiresAt === undefined) {
    return "Enter valid publish and expiry dates.";
  }
  if (requestedStatus === "scheduled" && (!publishAt || publishAt.getTime() <= Date.now())) {
    return "Scheduled updates require a future publish date and time.";
  }
  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    return "The alert expiry must be a future date and time.";
  }
  const effectivePublish = requestedStatus === "scheduled" && publishAt ? publishAt.getTime() : Date.now();
  if (expiresAt && expiresAt.getTime() <= effectivePublish) {
    return "The expiry must be later than the publish time.";
  }
  return "";
}

function validateMedia(body) {
  const mediaUri = String(body?.media_uri || body?.mediaUri || "");
  if (!mediaUri.startsWith("data:")) return "";
  const match = mediaUri.match(/^data:([^;]+);base64,/i);
  if (!match) return "The selected attachment format is invalid.";
  const mime = match[1].toLowerCase();
  const actualType = mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : "";
  if (!actualType) return "Only supported image or video attachments can be published.";
  const requestedType = cleanText(body?.media_type || body?.mediaType, 30).toLowerCase();
  if (requestedType && requestedType !== actualType) return "The attachment type does not match the selected file.";
  body.media_type = actualType;
  return "";
}

function canonicalizeAudience(body, user) {
  if (isSuperAdmin(user)) {
    const requestedAudience = body?.target_audience ?? body?.targetAudience;
    const wardCode = normalizeWardCode(body?.ward);
    const global = isGlobalAudience(requestedAudience) || (!cleanText(requestedAudience, 80) && !wardCode);
    if (global) {
      body.target_audience = "All citizens";
      body.ward = null;
      return "";
    }
    if (!wardCode) return "Select a valid ward from Ward 1 to Ward 29.";
    body.target_audience = "Ward residents";
    body.ward = `Ward ${wardCode}`;
    return "";
  }

  const wardCode = normalizeWardCode(user?.ward_code || user?.ward);
  if (!wardCode) return "This Nagarsevak account does not have a valid assigned ward.";
  body.target_audience = "Ward residents";
  body.ward = `Ward ${wardCode}`;
  return "";
}

async function guardCreate(req, res, next) {
  try {
    const user = await currentUser(req);
    if (!user) return sendJson(res, 401, { success: false, code: "SESSION_INVALID", message: "Please log in again before publishing." });
    if (!isSuperAdmin(user) && !isApprovedOfficer(user)) {
      return sendJson(res, 403, { success: false, code: "ALERT_PUBLISH_FORBIDDEN", message: "Only an approved Nagarsevak or Super Admin can publish alerts and news." });
    }

    const id = cleanText(req.body?.id, 80);
    if (id && !/^[A-Za-z0-9_-]{12,80}$/.test(id)) {
      return sendJson(res, 400, { success: false, code: "INVALID_ALERT_REQUEST_ID", message: "The publish request could not be verified. Please try again." });
    }
    if (id) {
      const [rows] = await pool.query("SELECT * FROM alerts WHERE id = ? LIMIT 1", [id]);
      if (rows.length) {
        if (String(rows[0].posted_by_id || "") !== String(user.id)) {
          return sendJson(res, 409, { success: false, code: "ALERT_REQUEST_CONFLICT", message: "This publish request conflicts with an existing update. Please try again." });
        }
        return sendJson(res, 200, {
          success: true,
          duplicate: true,
          alertId: id,
          alert: rows[0],
        });
      }
    }

    const audienceError = canonicalizeAudience(req.body, user);
    if (audienceError) return sendJson(res, 400, { success: false, message: audienceError });
    const timingError = validateTiming(req.body);
    if (timingError) return sendJson(res, 400, { success: false, message: timingError });
    const mediaError = validateMedia(req.body);
    if (mediaError) return sendJson(res, 400, { success: false, message: mediaError });

    req.alertPublisher = user;
    return next();
  } catch (error) {
    console.warn("[AlertGovernancePatch] create guard failed", error?.code || error?.name || "alert_guard_error");
    return sendJson(res, 500, { success: false, message: "This update could not be verified right now." });
  }
}

async function guardUpdate(req, res, next) {
  try {
    if (req.body?.action === "archive") return next();
    const user = await currentUser(req);
    if (!user) return sendJson(res, 401, { success: false, message: "Please log in again." });
    const id = cleanText(req.params?.id, 80);
    const [rows] = await pool.query("SELECT * FROM alerts WHERE id = ? AND is_active = 1 LIMIT 1", [id]);
    const existing = rows[0];
    if (!existing) return sendJson(res, 404, { success: false, message: "Alert or news post not found." });
    if (!isSuperAdmin(user) && String(existing.posted_by_id || "") !== String(user.id)) {
      return sendJson(res, 403, { success: false, message: "You can update only posts created from your account." });
    }

    const audienceError = canonicalizeAudience(req.body, user);
    if (audienceError) return sendJson(res, 400, { success: false, message: audienceError });
    const timingError = validateTiming(req.body, existing);
    if (timingError) return sendJson(res, 400, { success: false, message: timingError });
    const mediaError = validateMedia(req.body);
    if (mediaError) return sendJson(res, 400, { success: false, message: mediaError });
    return next();
  } catch (error) {
    console.warn("[AlertGovernancePatch] update guard failed", error?.code || error?.name || "alert_guard_error");
    return sendJson(res, 500, { success: false, message: "This update could not be verified right now." });
  }
}

async function guardRead(req, res, next) {
  try {
    const user = await currentUser(req);
    if (!user) return sendJson(res, 401, { success: false, message: "Please log in again." });
    const id = cleanText(req.params?.id, 80);
    const [rows] = await pool.query(
      "SELECT id, posted_by_id, target_audience, ward, status, is_active, archived_at FROM alerts WHERE id = ? LIMIT 1",
      [id],
    );
    const alert = rows[0];
    if (!alert || !alert.is_active || alert.archived_at || alert.status !== "published") {
      return sendJson(res, 404, { success: false, message: "Alert or news post not found for this account." });
    }

    const visible = isSuperAdmin(user)
      || (isApprovedOfficer(user) && (String(alert.posted_by_id || "") === String(user.id) || isGlobalAlert(alert) || sameWard(alert, user)))
      || (user.role === "citizen" && (isGlobalAlert(alert) || sameWard(alert, user)));
    if (!visible) return sendJson(res, 404, { success: false, message: "Alert or news post not found for this account." });
    return next();
  } catch (error) {
    console.warn("[AlertGovernancePatch] read guard failed", error?.code || error?.name || "alert_guard_error");
    return sendJson(res, 500, { success: false, message: "Read access could not be verified right now." });
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
  console.warn("[AlertGovernancePatch] database hook disabled", error.message);
}

try {
  const express = require("express");
  const originalPost = express.application.post;
  const originalPatch = express.application.patch;

  function install(app) {
    if (installed) return;
    installed = true;
    originalPost.call(app, "/api/alerts", guardCreate);
    originalPatch.call(app, "/api/alerts/:id", guardUpdate);
    originalPost.call(app, "/api/alerts/:id/read", guardRead);
    console.log("[AlertGovernancePatch] canonical audience and ownership guards active");
  }

  express.application.post = function patchedPost(path, ...handlers) {
    install(this);
    return originalPost.call(this, path, ...handlers);
  };
  express.application.patch = function patchedPatch(path, ...handlers) {
    install(this);
    return originalPatch.call(this, path, ...handlers);
  };
} catch (error) {
  console.warn("[AlertGovernancePatch] route hook disabled", error.message);
}

module.exports = {
  isGlobalAudience,
  normalizeWardCode,
  validateTiming,
};
