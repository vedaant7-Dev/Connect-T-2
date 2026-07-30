"use strict";

/*
 * Unified Connect-T / Job Portal authentication.
 *
 * Citizens sign in once through the main Connect-T OTP flow. Every Job Portal
 * request then uses that same Civic bearer token. The server resolves the
 * citizen's currently selected Job Seeker or Employer profile internally, so
 * the client never creates, stores, refreshes, or bridges a second session.
 */

const { signToken, verifyRequestToken, normalizeMobile } = require("./authSecurity");

const DIRECT_CIVIC_PATHS = new Set(["/session", "/onboarding", "/switch-role"]);
let pool = null;
let wrapped = false;

function stripJobTokenFromResponse(res) {
  if (res.__connectTUnifiedJobResponse) return;
  res.__connectTUnifiedJobResponse = true;
  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      const next = { ...payload };
      delete next.token;
      next.authMode = "unified_civic";
      return originalJson(next);
    }
    return originalJson(payload);
  };
}

async function ensureActiveRoleSchema(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS job_portal_role_locks (
    phone VARCHAR(20) PRIMARY KEY,
    active_user_id VARCHAR(64) NOT NULL,
    role VARCHAR(20) NOT NULL,
    locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_jp_role_lock_user (active_user_id),
    KEY idx_jp_role_lock_role (role)
  )`);
}

async function civicUserForAuth(db, auth) {
  if (!auth?.sub || auth.scope === "job_portal") return null;
  const [rows] = await db.query(
    "SELECT id, name, mobile, role, is_super_admin FROM users WHERE id = ? LIMIT 1",
    [auth.sub],
  );
  return rows[0] || null;
}

async function activeJobProfile(db, civicUser) {
  const phone = normalizeMobile(civicUser?.mobile);
  if (phone.length !== 10) return null;
  await ensureActiveRoleSchema(db);

  const [selectedRows] = await db.query(
    `SELECT j.id, j.role, j.phone
       FROM job_portal_role_locks a
       JOIN job_portal_users j ON j.id = a.active_user_id
      WHERE a.phone = ? AND j.phone = ?
      LIMIT 1`,
    [phone, phone],
  );
  if (selectedRows.length) return selectedRows[0];

  const [recentRows] = await db.query(
    `SELECT id, role, phone
       FROM job_portal_users
      WHERE phone = ?
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1`,
    [phone],
  );
  const profile = recentRows[0] || null;
  if (profile) {
    await db.query(
      `INSERT INTO job_portal_role_locks (phone, active_user_id, role)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE active_user_id = VALUES(active_user_id),
         role = VALUES(role), updated_at = CURRENT_TIMESTAMP`,
      [phone, profile.id, profile.role],
    );
  }
  return profile;
}

function replaceAuthorization(req, profile) {
  const internalToken = signToken({
    sub: profile.id,
    mobile: normalizeMobile(profile.phone),
    role: profile.role,
    scope: "job_portal",
  }, 5 * 60);
  req.headers.authorization = `Bearer ${internalToken}`;
}

try {
  const mysql = require("mysql2/promise");
  const originalCreatePool = mysql.createPool;
  mysql.createPool = function patchedCreatePool(...args) {
    pool = originalCreatePool.apply(this, args);
    return pool;
  };
} catch (error) {
  console.warn("[JobPortalUnifiedCivicAuth] database hook disabled:", error.message);
}

try {
  const express = require("express");
  const originalUse = express.application.use;

  express.application.use = function patchedUse(path, ...handlers) {
    if (!wrapped && path === "/api/job-portal" && typeof handlers[0] === "function") {
      wrapped = true;
      const legacyAuthorization = handlers[0];

      handlers[0] = async function unifiedCivicAuthorization(req, res, next) {
        stripJobTokenFromResponse(res);

        try {
          const method = String(req.method || "").toUpperCase();
          const routePath = String(req.path || "");
          const auth = verifyRequestToken(req);
          const civicUser = pool ? await civicUserForAuth(pool, auth) : null;

          if (!civicUser) {
            return legacyAuthorization(req, res, next);
          }

          if (civicUser.role === "super_admin" || civicUser.is_super_admin) {
            return legacyAuthorization(req, res, next);
          }

          if (civicUser.role !== "citizen") {
            return res.status(403).json({
              success: false,
              error: "Job Portal is available from a citizen account.",
            });
          }

          // These routes directly use the already verified Civic identity. They
          // create/update/select a role but never issue a second client session.
          if (method === "POST" && DIRECT_CIVIC_PATHS.has(routePath)) {
            return next();
          }

          const profile = await activeJobProfile(pool, civicUser);

          // Jobs can be browsed before a role profile is created.
          if (!profile && method === "GET" && routePath === "/jobs") {
            return next();
          }

          if (!profile) {
            return res.status(409).json({
              success: false,
              code: "JOB_PROFILE_REQUIRED",
              error: "Choose Job Seeker or Employer to continue.",
            });
          }

          // Existing route authorization remains useful for ownership checks.
          // It receives a short-lived server-internal identity, never a second
          // token stored by the app.
          replaceAuthorization(req, profile);
          return legacyAuthorization(req, res, next);
        } catch (error) {
          console.warn("[JobPortalUnifiedCivicAuth] authorization failed:", error.message);
          return res.status(500).json({
            success: false,
            error: "Job Portal could not be opened right now.",
          });
        }
      };

      console.log("[JobPortalUnifiedCivicAuth] one Connect-T login active");
    }

    return originalUse.call(this, path, ...handlers);
  };
} catch (error) {
  console.warn("[JobPortalUnifiedCivicAuth] middleware hook disabled:", error.message);
}

module.exports = { DIRECT_CIVIC_PATHS, activeJobProfile };
