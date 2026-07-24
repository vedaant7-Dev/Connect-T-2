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
  const raw = cleanText(value, 80).toLowerCase();
  if (!raw || ["all", "all wards", "all citizens"].includes(raw)) return null;
  const match = raw.match(/(?:ward\s*)?(\d{1,2})/i);
  if (!match) return undefined;
  const number = Number(match[1]);
  return number >= 1 && number <= 29 ? String(number) : undefined;
}

function parseSchedule(value) {
  const text = cleanText(value, 80);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date;
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

async function guardCreate(req, res, next) {
  try {
    const user = await currentUser(req);
    if (!user) return sendJson(res, 401, { success: false, code: "SESSION_INVALID", message: "Please log in again before creating a broadcast." });
    if (!isSuperAdmin(user) && !isApprovedOfficer(user)) {
      return sendJson(res, 403, { success: false, code: "BROADCAST_FORBIDDEN", message: "You do not have permission to create broadcasts." });
    }

    const idempotencyKey = cleanText(req.body?.idempotencyKey || req.body?.idempotency_key, 100);
    if (!idempotencyKey || !/^[A-Za-z0-9_-]{12,100}$/.test(idempotencyKey)) {
      return sendJson(res, 400, { success: false, code: "INVALID_IDEMPOTENCY_KEY", message: "The broadcast request could not be verified. Please try again." });
    }

    const [existingRows] = await pool.query(
      "SELECT created_by FROM broadcasts WHERE idempotency_key = ? LIMIT 1",
      [idempotencyKey],
    );
    if (existingRows.length && String(existingRows[0].created_by || "") !== String(user.id)) {
      return sendJson(res, 409, {
        success: false,
        code: "BROADCAST_REQUEST_CONFLICT",
        message: "This broadcast request conflicts with an existing message. Please try again.",
      });
    }

    const requestedAudience = cleanText(req.body?.audienceRole || req.body?.audience_role || "all", 30).toLowerCase();
    if (!["all", "citizen", "nagarsevak", "seeker", "employer"].includes(requestedAudience)) {
      return sendJson(res, 400, { success: false, message: "Choose a valid audience." });
    }

    const scheduleValue = req.body?.scheduledAt || req.body?.scheduled_at;
    const schedule = parseSchedule(scheduleValue);
    if (schedule === undefined) {
      return sendJson(res, 400, { success: false, message: "Enter a valid schedule date and time." });
    }
    if (schedule && schedule.getTime() <= Date.now()) {
      return sendJson(res, 400, { success: false, message: "Scheduled broadcasts require a future date and time." });
    }

    if (isSuperAdmin(user)) {
      const wardCode = normalizeWardCode(req.body?.ward);
      if (wardCode === undefined) {
        return sendJson(res, 400, { success: false, message: "Select a valid ward from Ward 1 to Ward 29, or choose All Wards." });
      }
      req.body.audienceRole = requestedAudience;
      req.body.audience_role = requestedAudience;
      req.body.ward = wardCode ? `Ward ${wardCode}` : null;
    } else {
      const wardCode = normalizeWardCode(user.ward_code || user.ward);
      if (!wardCode) {
        return sendJson(res, 400, { success: false, message: "This Nagarsevak account does not have a valid assigned ward." });
      }
      req.body.audienceRole = "citizen";
      req.body.audience_role = "citizen";
      req.body.ward = `Ward ${wardCode}`;
    }

    return next();
  } catch (error) {
    console.warn("[BroadcastGovernancePatch] create guard failed", error?.code || error?.name || "broadcast_guard_error");
    return sendJson(res, 500, { success: false, message: "This broadcast could not be verified right now." });
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
  console.warn("[BroadcastGovernancePatch] database hook disabled", error.message);
}

try {
  const express = require("express");
  const originalPost = express.application.post;

  function install(app) {
    if (installed) return;
    installed = true;
    originalPost.call(app, "/api/broadcasts", guardCreate);
    console.log("[BroadcastGovernancePatch] ward, schedule, and idempotency ownership guards active");
  }

  express.application.post = function patchedPost(path, ...handlers) {
    install(this);
    return originalPost.call(this, path, ...handlers);
  };
} catch (error) {
  console.warn("[BroadcastGovernancePatch] route hook disabled", error.message);
}

module.exports = {
  normalizeWardCode,
  parseSchedule,
};
