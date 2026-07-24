"use strict";

const crypto = require("crypto");

const { verifyRequestToken } = require("./authSecurity");
const { isPrivilegedRoleActive } = require("./roleAuthorization");
const { validateCoordinates } = require("./validation");

const COMPLAINT_CATEGORIES = new Set([
  "roads",
  "water",
  "electricity",
  "garbage",
  "drainage",
  "streetlight",
  "encroachment",
  "other",
]);

let pool = null;
let installed = false;
let schemaReady = null;

function sendJson(res, status, payload) {
  if (res.headersSent) return res;
  return res.status(status).json(payload);
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function normalizeWardCode(value) {
  const match = String(value || "").trim().match(/(?:ward\s*)?(\d{1,2})/i);
  if (!match) return null;
  const number = Number(match[1]);
  return number >= 1 && number <= 29 ? String(number) : null;
}

function isAllowedComplaintCategory(value) {
  return COMPLAINT_CATEGORIES.has(String(value || "").trim().toLowerCase());
}

function makeComplaintId() {
  return `complaint_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

async function ensureSchema() {
  if (!pool) throw new Error("Database pool is unavailable");
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    const [columns] = await pool.query(
      `SELECT COUNT(*) AS count FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'complaints' AND column_name = 'client_request_id'`,
    );
    if (!Number(columns?.[0]?.count || 0)) {
      await pool.query("ALTER TABLE complaints ADD COLUMN client_request_id VARCHAR(80) NULL AFTER id");
    }

    const [indexes] = await pool.query(
      `SELECT COUNT(*) AS count FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = 'complaints' AND index_name = 'uniq_complaints_client_request'`,
    );
    if (!Number(indexes?.[0]?.count || 0)) {
      await pool.query("ALTER TABLE complaints ADD UNIQUE KEY uniq_complaints_client_request (client_request_id)");
    }
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });

  return schemaReady;
}

async function currentUser(req) {
  const auth = verifyRequestToken(req);
  if (!auth?.sub || auth.scope === "job_portal") return null;

  const [rows] = await pool.query(
    `SELECT id, name, mobile, role, ward, ward_code, is_super_admin, approval_status,
            address, age, email, dob, profile_photo
     FROM users WHERE id = ? LIMIT 1`,
    [auth.sub],
  );
  const user = rows[0] || null;
  if (!user) return null;

  if (["nagarsevak", "super_admin"].includes(user.role)) {
    const active = await isPrivilegedRoleActive(pool, {
      mobile: user.mobile,
      role: user.role,
      userId: user.id,
    });
    if (!active) return null;
  }

  return user;
}

async function officerForWard(wardCode) {
  const [rows] = await pool.query(
    `SELECT id FROM users
     WHERE role = 'nagarsevak' AND approval_status = 'approved'
       AND (ward_code = ? OR ward = ?)
     ORDER BY created_at ASC LIMIT 1`,
    [wardCode, `Ward ${wardCode}`],
  );
  return rows[0]?.id || null;
}

async function findExistingComplaint(requestId, userId, userMobile, executor = pool) {
  const [rows] = await executor.query(
    `SELECT id, photo_url, ward_code, assigned_officer_id FROM complaints
     WHERE client_request_id = ? AND (user_id = ? OR user_mobile = ?) LIMIT 1`,
    [requestId, userId, userMobile],
  );
  return rows[0] || null;
}

function duplicatePayload(row) {
  return {
    success: true,
    duplicate: true,
    complaintId: row.id,
    photo_url: row.photo_url || null,
    ward_code: row.ward_code,
    assigned_officer_id: row.assigned_officer_id,
  };
}

async function createJsonComplaint(req, res) {
  try {
    if (!pool) throw new Error("Database pool is unavailable");
    await ensureSchema();

    const user = await currentUser(req);
    if (!user) {
      return sendJson(res, 401, {
        success: false,
        code: "SESSION_INVALID",
        message: "Please log in again before submitting a complaint.",
      });
    }

    const isSuperAdmin = user.role === "super_admin" || !!user.is_super_admin;
    const isApprovedOfficer = user.role === "nagarsevak" && String(user.approval_status || "") === "approved";
    if (user.role !== "citizen" && !isSuperAdmin && !isApprovedOfficer) {
      return sendJson(res, 403, {
        success: false,
        code: "COMPLAINT_ROLE_FORBIDDEN",
        message: "This account cannot submit complaints.",
      });
    }

    const title = cleanText(req.body?.title, 255);
    const description = cleanText(req.body?.description, 10000);
    const category = cleanText(req.body?.category || "other", 80).toLowerCase() || "other";
    const location = cleanText(req.body?.location, 2000);
    const requestId = cleanText(req.body?.client_request_id || req.body?.id, 80);

    if (!title || !description || !location) {
      return sendJson(res, 400, {
        success: false,
        code: "COMPLAINT_FIELDS_REQUIRED",
        message: "Title, description and location are required.",
      });
    }
    if (!isAllowedComplaintCategory(category)) {
      return sendJson(res, 400, {
        success: false,
        code: "INVALID_COMPLAINT_CATEGORY",
        message: "Select a valid complaint category.",
      });
    }
    if (!/^[A-Za-z0-9_-]{12,80}$/.test(requestId)) {
      return sendJson(res, 400, {
        success: false,
        code: "INVALID_REQUEST_ID",
        message: "The complaint request could not be verified. Please try again.",
      });
    }

    const userMobile = normalizeMobile(user.mobile);
    const existing = await findExistingComplaint(requestId, user.id, userMobile);
    if (existing) return sendJson(res, 200, duplicatePayload(existing));

    const wardCode = isSuperAdmin
      ? normalizeWardCode(req.body?.ward_code || req.body?.ward)
      : normalizeWardCode(user.ward_code || user.ward);
    if (!wardCode) {
      return sendJson(res, 400, {
        success: false,
        code: "WARD_REQUIRED",
        message: "Select a valid ward from Ward 1 to Ward 29.",
      });
    }

    const coordinates = validateCoordinates(
      req.body?.latitude,
      req.body?.longitude,
      req.body?.location_accuracy,
    );
    if (!coordinates.valid) {
      return sendJson(res, 400, {
        success: false,
        code: "INVALID_LOCATION",
        message: coordinates.message,
      });
    }

    const complaintId = makeComplaintId();
    const assignedOfficerId = await officerForWard(wardCode);
    const connection = await pool.getConnection();
    let duplicateAfterRace = null;

    try {
      await connection.beginTransaction();
      await connection.query(
        `INSERT INTO complaints
         (id, client_request_id, title, description, category, photo_url, location,
          latitude, longitude, location_accuracy, ward, ward_code, assigned_officer_id,
          user_id, user_name, user_mobile, user_address, user_age, user_email, user_dob, user_profile_photo)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          complaintId,
          requestId,
          title,
          description,
          category,
          location,
          coordinates.latitude,
          coordinates.longitude,
          coordinates.accuracy,
          `Ward ${wardCode}`,
          wardCode,
          assignedOfficerId,
          user.id,
          user.name,
          userMobile,
          user.address || null,
          user.age || null,
          user.email || null,
          user.dob || null,
          user.profile_photo || null,
        ],
      );
      await connection.query(
        `INSERT INTO complaint_status_updates (complaint_id, status, note, updated_by)
         VALUES (?, 'submitted', 'Complaint submitted', ?)`,
        [complaintId, user.name || "Citizen"],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      if (error?.code === "ER_DUP_ENTRY") {
        duplicateAfterRace = await findExistingComplaint(requestId, user.id, userMobile, connection);
      }
      if (!duplicateAfterRace) throw error;
    } finally {
      connection.release();
    }

    if (duplicateAfterRace) return sendJson(res, 200, duplicatePayload(duplicateAfterRace));

    return sendJson(res, 201, {
      success: true,
      complaintId,
      photo_url: null,
      ward_code: wardCode,
      assigned_officer_id: assignedOfficerId,
    });
  } catch (error) {
    console.warn("[ComplaintJsonPatch] submission failed", error?.code || error?.name || "submission_error");
    return sendJson(res, Number(error?.status || 500), {
      success: false,
      code: "COMPLAINT_SUBMISSION_FAILED",
      message: "The complaint could not be submitted right now. Please try again.",
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
} catch (error) {
  console.warn("[ComplaintJsonPatch] database hook disabled", error.message);
}

try {
  const express = require("express");
  const originalPost = express.application.post;

  function install(app) {
    if (installed) return;
    installed = true;
    originalPost.call(app, "/api/complaints", (req, res, next) => {
      if (req.is("multipart/form-data") || req.body?.photo_url) return next();
      return createJsonComplaint(req, res);
    });
    console.log("[ComplaintJsonPatch] authenticated idempotent JSON complaint submission active");
  }

  express.application.post = function patchedPost(routePath, ...handlers) {
    install(this);
    return originalPost.call(this, routePath, ...handlers);
  };
} catch (error) {
  console.warn("[ComplaintJsonPatch] route hook disabled", error.message);
}

module.exports = {
  createJsonComplaint,
  isAllowedComplaintCategory,
  normalizeWardCode,
};
