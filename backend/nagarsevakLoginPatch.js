/*
 * Nagarsevak compatibility patch.
 *
 * Loaded before backend/server.js. It guarantees Nagarsevak login, register,
 * and ward-check routes exist and keeps the ward workflow practical for
 * production review: only approved officers reserve a ward. Pending/rejected
 * test registrations do not incorrectly make a ward look taken.
 */

let pool = null;
let installed = false;

function normalizeMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function normalizeWardCode(value) {
  if (!value) return null;
  const match = String(value).trim().toUpperCase().match(/(\d{1,2})\s*([ABC])/);
  if (!match) return null;
  return `${Number(match[1])}${match[2]}`;
}

function normalizeApproval(value) {
  const status = String(value || "").toLowerCase();
  if (status === "approved" || status === "pending" || status === "rejected") return status;
  return "pending";
}

function makeNagarsevakId() {
  return `NS${Date.now()}`;
}

function sendJson(res, status, payload) {
  if (res.headersSent) return;
  return res.status(status).json(payload);
}

function getPool() {
  if (!pool) throw new Error("Database pool is not ready");
  return pool;
}

function mobileSql(column) {
  return `RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${column},''), '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', ''), 10)`;
}

async function wardCheck(req, res) {
  try {
    const db = getPool();
    const ward = String(req.query?.ward || "").trim();
    const wardCode = normalizeWardCode(req.query?.ward_code || req.query?.wardCode || ward);

    if (!ward && !wardCode) {
      return sendJson(res, 200, { success: true, available: true });
    }

    const [rows] = await db.query(
      `SELECT id
       FROM users
       WHERE role = 'nagarsevak'
         AND approval_status = 'approved'
         AND (
           (? <> '' AND ward = ?)
           OR (? IS NOT NULL AND UPPER(ward_code) = UPPER(?))
         )
       LIMIT 1`,
      [ward, ward, wardCode, wardCode],
    );

    return sendJson(res, 200, {
      success: true,
      available: rows.length === 0,
      wardCode,
    });
  } catch (err) {
    return sendJson(res, 200, {
      success: true,
      available: true,
      warning: err.message || "WARD_CHECK_SKIPPED",
    });
  }
}

async function nagarsevakRegister(req, res) {
  try {
    const db = getPool();
    const mobile = normalizeMobile(req.body?.mobile || req.body?.phone);
    const name = String(req.body?.name || "").trim();
    const ward = String(req.body?.ward || "").trim();
    const wardCode = normalizeWardCode(req.body?.wardCode || req.body?.ward_code || ward);

    if (!name || name.length < 2 || mobile.length !== 10) {
      return sendJson(res, 400, {
        success: false,
        message: "Name and valid mobile number are required",
      });
    }

    if (!ward) {
      return sendJson(res, 400, { success: false, message: "Ward is required" });
    }

    const [existingMobile] = await db.query(
      `SELECT id, approval_status
       FROM users
       WHERE role = 'nagarsevak'
         AND ${mobileSql("mobile")} = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [mobile],
    );

    if (existingMobile.length) {
      const status = normalizeApproval(existingMobile[0].approval_status);
      return sendJson(res, 409, {
        success: false,
        message: status === "pending" ? "ALREADY_PENDING" : "Officer already registered",
        approvalStatus: status,
      });
    }

    const [approvedWard] = await db.query(
      `SELECT id
       FROM users
       WHERE role = 'nagarsevak'
         AND approval_status = 'approved'
         AND (
           ward = ?
           OR UPPER(ward_code) = UPPER(?)
         )
       LIMIT 1`,
      [ward, wardCode],
    );

    if (approvedWard.length) {
      return sendJson(res, 409, { success: false, message: "WARD_TAKEN" });
    }

    const id = req.body?.id || makeNagarsevakId();

    await db.query(
      `INSERT INTO users
       (id, name, mobile, role, ward, ward_code, ward_number, is_super_admin,
        approval_status, address, nagarsevak_id, office_address,
        residence_address, office_timings, contact_name, contact_number,
        profile_photo)
       VALUES (?, ?, ?, 'nagarsevak', ?, ?, ?, 0,
        'pending', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        mobile,
        ward,
        wardCode || null,
        wardCode ? wardCode.replace(/[A-Z]/g, "") : null,
        req.body?.address || null,
        id,
        req.body?.officeAddress || req.body?.office_address || null,
        req.body?.residenceAddress || req.body?.residence_address || req.body?.address || null,
        req.body?.officeTimings || req.body?.office_timings || null,
        req.body?.contactName || req.body?.contact_name || name,
        normalizeMobile(req.body?.contactNumber || req.body?.contact_number || mobile),
        req.body?.profilePhoto || req.body?.profile_photo || null,
      ],
    );

    return sendJson(res, 201, {
      success: true,
      message: "Nagarsevak registration submitted for approval",
      officerId: id,
      approvalStatus: "pending",
      wardCode,
    });
  } catch (err) {
    return sendJson(res, 500, {
      success: false,
      message: err.message || "REGISTRATION_FAILED",
    });
  }
}

async function nagarsevakLogin(req, res) {
  try {
    const db = getPool();
    const mobile = normalizeMobile(req.body?.mobile || req.body?.phone);

    if (mobile.length !== 10) {
      return sendJson(res, 400, {
        success: false,
        message: "INVALID_MOBILE",
      });
    }

    const [rows] = await db.query(
      `SELECT *
       FROM users
       WHERE role = 'nagarsevak'
         AND ${mobileSql("mobile")} = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [mobile],
    );

    if (!rows.length) {
      return sendJson(res, 200, {
        success: false,
        message: "NOT_FOUND",
        notFound: true,
      });
    }

    const row = rows[0];
    const approval = normalizeApproval(row.approval_status);

    if (approval === "pending") {
      return sendJson(res, 200, {
        success: false,
        message: "PENDING",
        approvalStatus: "pending",
      });
    }

    if (approval === "rejected") {
      return sendJson(res, 200, {
        success: false,
        message: "REJECTED",
        approvalStatus: "rejected",
      });
    }

    return sendJson(res, 200, {
      success: true,
      user: {
        id: String(row.id || row.nagarsevak_id || mobile),
        name: row.name || "Nagarsevak",
        mobile,
        role: "nagarsevak",
        ward: row.ward || "",
        wardCode: row.ward_code || row.wardCode || null,
        wardNumber: row.ward_number || null,
        address: row.address || row.office_address || row.residence_address || "",
        profilePhoto: row.profile_photo || null,
        isSuperAdmin: !!row.is_super_admin,
        approvalStatus: "approved",
        nagarsevakId: row.nagarsevak_id || row.id || null,
        officeAddress: row.office_address || "",
        residenceAddress: row.residence_address || "",
        officeTimings: row.office_timings || "",
        contactName: row.contact_name || row.name || "",
        contactNumber: normalizeMobile(row.contact_number || row.mobile),
      },
    });
  } catch (err) {
    return sendJson(res, 500, {
      success: false,
      message: err.message || "LOGIN_FAILED",
    });
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
  console.warn("[NagarsevakPatch] mysql patch disabled:", err.message);
}

try {
  const express = require("express");
  const originalGet = express.application.get;
  const originalPost = express.application.post;

  function install(app) {
    if (installed) return;
    installed = true;
    originalGet.call(app, "/api/auth/ward-check", wardCheck);
    originalPost.call(app, "/api/auth/nagarsevak-register", nagarsevakRegister);
    originalPost.call(app, "/api/auth/nagarsevak-login", nagarsevakLogin);
  }

  express.application.get = function patchedGet(path, ...handlers) {
    if (path === "/api/auth/ward-check") install(this);
    return originalGet.call(this, path, ...handlers);
  };

  express.application.post = function patchedPost(path, ...handlers) {
    if (path === "/api/auth/nagarsevak-login" || path === "/api/auth/nagarsevak-register") install(this);
    return originalPost.call(this, path, ...handlers);
  };

  console.log("[NagarsevakPatch] login/register/ward-check compatibility routes active");
} catch (err) {
  console.warn("[NagarsevakPatch] express patch disabled:", err.message);
}

module.exports = {};
