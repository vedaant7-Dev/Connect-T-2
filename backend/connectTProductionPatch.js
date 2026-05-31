/*
 * Connect-T production safety patch
 *
 * Loaded before backend/server.js. It adds compatibility routes used by the
 * mobile app and hardens high-risk flows without rewriting the large server.
 */

const otpSessions = new Map();
let pool = null;
let routesInstalled = false;

function normalizeMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function mobileSql(column) {
  return `RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${column},''), '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', ''), 10)`;
}

function normalizeWardCode(value) {
  if (!value) return null;
  const match = String(value).trim().toUpperCase().match(/(\d{1,2})\s*([ABC])/);
  if (!match) return null;
  return `${Number(match[1])}${match[2]}`;
}

function normalizeStatus(value) {
  return ["pending", "approved", "rejected"].includes(value) ? value : "pending";
}

function makeNagarsevakId() {
  return `NS${Date.now()}`;
}

function makeOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function makeAccessId() {
  return `SA${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function makeAccessCode() {
  return `SA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function sendJson(res, status, payload) {
  if (res.headersSent) return;
  return res.status(status).json(payload);
}

function getPool() {
  if (!pool) throw new Error("Database pool is not ready");
  return pool;
}

function cleanOtpSessions() {
  const now = Date.now();
  for (const [token, session] of otpSessions.entries()) {
    if (!session || session.expiresAt <= now) otpSessions.delete(token);
  }
}

async function sendFast2Sms(mobile, otp) {
  const apiKey = String(process.env.FAST2SMS_API_KEY || "").trim();
  if (!apiKey) return { skipped: true };

  const smsRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      route: "q",
      message: `Your Connect T OTP is ${otp}. Valid for 5 minutes. Do not share with anyone.`,
      language: "english",
      flash: "0",
      numbers: mobile,
    }),
  });

  const data = await smsRes.json().catch(() => ({}));
  if (!smsRes.ok || data?.return === false) {
    throw new Error(data?.message?.[0] || data?.message || "SMS provider failed");
  }

  return data;
}

async function ensureSuperAdminAccessTable(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS super_admin_access_codes (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    access_code VARCHAR(40) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_by VARCHAR(80) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_super_admin_mobile_code (mobile, access_code),
    KEY idx_super_admin_access_status (status),
    KEY idx_super_admin_access_mobile (mobile)
  )`);
}

async function sendOtpAlias(req, res) {
  try {
    const mobile = normalizeMobile(req.body?.phone || req.body?.mobile);

    if (mobile.length !== 10) {
      return sendJson(res, 400, { success: false, error: "Valid 10 digit mobile number is required" });
    }

    cleanOtpSessions();
    const otp = makeOtp();
    const sessionToken = `otp_${mobile}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await sendFast2Sms(mobile, otp);

    otpSessions.set(sessionToken, {
      mobile,
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    const response = {
      success: true,
      sessionToken,
      message: "OTP sent successfully",
    };

    if (process.env.NODE_ENV !== "production" && !process.env.FAST2SMS_API_KEY) {
      response.devOtp = otp;
    }

    return sendJson(res, 200, response);
  } catch (err) {
    return sendJson(res, 500, { success: false, error: err.message || "Failed to send OTP" });
  }
}

async function verifyOtpAlias(req, res) {
  try {
    const otp = String(req.body?.otp || "").trim();
    const sessionToken = String(req.body?.sessionToken || req.body?.session_token || "").trim();

    cleanOtpSessions();
    const session = otpSessions.get(sessionToken);
    const valid = !!session && otp === session.otp;

    if (!valid) {
      return sendJson(res, 400, { valid: false, success: false, error: "Invalid or expired OTP" });
    }

    otpSessions.delete(sessionToken);
    return sendJson(res, 200, { valid: true, success: true, mobile: session.mobile });
  } catch (err) {
    return sendJson(res, 500, { valid: false, success: false, error: err.message });
  }
}

async function complaintsList(req, res) {
  try {
    const db = getPool();
    const { ward, ward_code, assigned_officer_id, status, category, user_id } = req.query;
    const cleanUserMobile = normalizeMobile(req.query.user_mobile);
    let sql = "SELECT * FROM complaints WHERE 1=1";
    const params = [];

    if (ward) {
      sql += " AND ward = ?";
      params.push(ward);
    }

    if (ward_code) {
      sql += " AND UPPER(ward_code) = UPPER(?)";
      params.push(ward_code);
    }

    if (assigned_officer_id) {
      sql += " AND assigned_officer_id = ?";
      params.push(assigned_officer_id);
    }

    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }

    if (category) {
      sql += " AND category = ?";
      params.push(category);
    }

    if (user_id) {
      sql += " AND user_id = ?";
      params.push(user_id);
    }

    if (cleanUserMobile) {
      sql += ` AND ${mobileSql("user_mobile")} = ?`;
      params.push(cleanUserMobile);
    }

    sql += " ORDER BY created_at DESC";
    const [rows] = await db.query(sql, params);
    return sendJson(res, 200, { success: true, complaints: rows });
  } catch (err) {
    return sendJson(res, 500, { success: false, error: err.message });
  }
}

async function nagarsevakWardCheck(req, res) {
  try {
    const db = getPool();
    const ward = String(req.query.ward || "").trim();
    const wardCode = normalizeWardCode(req.query.ward_code || req.query.ward || ward);

    if (!ward && !wardCode) {
      return sendJson(res, 400, {
        success: false,
        available: false,
        message: "ward is required",
      });
    }

    const [rows] = await db.query(
      `SELECT id
       FROM users
       WHERE role = 'nagarsevak'
         AND approval_status = 'approved'
         AND (ward = ? OR ward_code = ?)
       LIMIT 1`,
      [ward, wardCode],
    );

    return sendJson(res, 200, {
      success: true,
      available: rows.length === 0,
    });
  } catch (err) {
    return sendJson(res, 500, {
      success: false,
      available: false,
      message: err.message,
    });
  }
}

async function nagarsevakRegister(req, res) {
  try {
    const db = getPool();
    const mobile = normalizeMobile(req.body.mobile);
    const name = String(req.body.name || "").trim();
    const ward = String(req.body.ward || "").trim();
    const wardCode = normalizeWardCode(req.body.wardCode || req.body.ward_code || ward);

    if (!name || mobile.length !== 10) {
      return sendJson(res, 400, {
        success: false,
        message: "Name and valid mobile number are required",
      });
    }

    if (!ward) {
      return sendJson(res, 400, {
        success: false,
        message: "Ward is required",
      });
    }

    const [existingMobile] = await db.query(
      `SELECT id, approval_status
       FROM users
       WHERE ${mobileSql("mobile")} = ? AND role = 'nagarsevak'
       LIMIT 1`,
      [mobile],
    );

    if (existingMobile.length) {
      const status = normalizeStatus(existingMobile[0].approval_status);
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
         AND (ward = ? OR ward_code = ?)
       LIMIT 1`,
      [ward, wardCode],
    );

    if (approvedWard.length) {
      return sendJson(res, 409, {
        success: false,
        message: "WARD_TAKEN",
      });
    }

    const id = req.body.id || makeNagarsevakId();

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
        req.body.address || null,
        id,
        req.body.officeAddress || req.body.office_address || null,
        req.body.residenceAddress || req.body.residence_address || null,
        req.body.officeTimings || req.body.office_timings || null,
        req.body.contactName || req.body.contact_name || null,
        req.body.contactNumber || req.body.contact_number || mobile,
        req.body.profilePhoto || req.body.profile_photo || null,
      ],
    );

    return sendJson(res, 201, {
      success: true,
      message: "Nagarsevak registration submitted for approval",
      officerId: id,
      approvalStatus: "pending",
    });
  } catch (err) {
    return sendJson(res, 500, { success: false, message: err.message });
  }
}

async function listSuperAdminAccessCodes(req, res) {
  try {
    const db = getPool();
    await ensureSuperAdminAccessTable(db);
    const [rows] = await db.query(
      `SELECT id, name, mobile, access_code AS accessCode, status, created_by AS createdBy, created_at AS createdAt, updated_at AS updatedAt
       FROM super_admin_access_codes
       ORDER BY created_at DESC`,
    );
    return sendJson(res, 200, { success: true, accessCodes: rows });
  } catch (err) {
    return sendJson(res, 500, { success: false, error: err.message, message: err.message });
  }
}

async function createSuperAdminAccessCode(req, res) {
  try {
    const db = getPool();
    await ensureSuperAdminAccessTable(db);
    const name = String(req.body?.name || "").trim();
    const mobile = normalizeMobile(req.body?.mobile);
    const createdBy = String(req.body?.createdBy || req.body?.created_by || "main_super_admin").trim();

    if (!name || mobile.length !== 10) {
      return sendJson(res, 400, { success: false, message: "Name and valid mobile are required" });
    }

    const id = makeAccessId();
    const accessCode = makeAccessCode();

    await db.query(
      `INSERT INTO super_admin_access_codes (id, name, mobile, access_code, status, created_by)
       VALUES (?, ?, ?, ?, 'active', ?)`,
      [id, name, mobile, accessCode, createdBy || null],
    );

    return sendJson(res, 201, {
      success: true,
      access: { id, name, mobile, accessCode, status: "active", createdBy },
    });
  } catch (err) {
    return sendJson(res, 500, { success: false, error: err.message, message: err.message });
  }
}

async function updateSuperAdminAccessCode(req, res) {
  try {
    const db = getPool();
    await ensureSuperAdminAccessTable(db);
    const id = String(req.params?.id || "").trim();
    const status = String(req.body?.status || "").trim() === "revoked" ? "revoked" : "active";

    if (!id) return sendJson(res, 400, { success: false, message: "Access id is required" });

    const [result] = await db.query(
      "UPDATE super_admin_access_codes SET status = ? WHERE id = ?",
      [status, id],
    );

    return sendJson(res, 200, { success: true, updated: result.affectedRows || 0, status });
  } catch (err) {
    return sendJson(res, 500, { success: false, error: err.message, message: err.message });
  }
}

async function superAdminAccessLogin(req, res) {
  try {
    const db = getPool();
    await ensureSuperAdminAccessTable(db);
    const mobile = normalizeMobile(req.body?.mobile);
    const accessCode = String(req.body?.accessCode || req.body?.access_code || "").trim().toUpperCase();

    if (mobile.length !== 10 || !accessCode) {
      return sendJson(res, 400, { success: false, message: "Mobile and unique access ID are required" });
    }

    const [rows] = await db.query(
      `SELECT id, name, mobile, access_code, status
       FROM super_admin_access_codes
       WHERE ${mobileSql("mobile")} = ? AND UPPER(access_code) = ?
       LIMIT 1`,
      [mobile, accessCode],
    );

    if (!rows.length) {
      return sendJson(res, 401, { success: false, message: "Invalid mobile number or unique access ID" });
    }

    const row = rows[0];
    if (String(row.status || "").toLowerCase() !== "active") {
      return sendJson(res, 403, { success: false, message: "This unique access ID is revoked" });
    }

    return sendJson(res, 200, {
      success: true,
      user: {
        id: row.id,
        name: row.name,
        mobile,
        role: "super_admin",
        isSuperAdmin: true,
        accessCode: row.access_code,
      },
    });
  } catch (err) {
    return sendJson(res, 500, { success: false, error: err.message, message: err.message });
  }
}

async function deleteJobMessage(req, res) {
  try {
    const db = getPool();
    const messageId = String(req.params.id || "").trim();
    const userId = String(req.query.userId || req.body?.userId || req.body?.senderId || "").trim();
    const mode = String(req.query.mode || req.body?.mode || "delete").trim();

    if (!messageId || !userId) {
      return sendJson(res, 400, { success: false, error: "message id and userId are required" });
    }

    const [rows] = await db.query("SELECT * FROM job_portal_messages WHERE id = ? LIMIT 1", [messageId]);
    if (!rows.length) return sendJson(res, 404, { success: false, error: "Message not found" });

    const message = rows[0];
    if (mode === "unsend") {
      if (message.sender_id !== userId) {
        return sendJson(res, 403, { success: false, error: "Only sender can unsend this message" });
      }
      if (message.read_at) {
        return sendJson(res, 409, { success: false, error: "Seen messages cannot be unsent" });
      }
      await db.query("DELETE FROM job_portal_messages WHERE id = ?", [messageId]);
      return sendJson(res, 200, { success: true, mode: "unsend" });
    }

    await db.query(
      "UPDATE job_portal_messages SET message = '[deleted]' WHERE id = ? AND (sender_id = ? OR receiver_id = ?)",
      [messageId, userId, userId],
    );
    return sendJson(res, 200, { success: true, mode: "delete" });
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
  console.warn("[ConnectTPatch] mysql patch disabled:", err.message);
}

try {
  const express = require("express");
  const originalGet = express.application.get;
  const originalPost = express.application.post;
  const originalPatch = express.application.patch;
  const originalDelete = express.application.delete;

  function installCompatibilityRoutes(app) {
    if (routesInstalled) return;
    routesInstalled = true;
    originalPost.call(app, "/api/send-otp", sendOtpAlias);
    originalPost.call(app, "/api/verify-otp", verifyOtpAlias);
    originalGet.call(app, "/api/super-admin/access-codes", listSuperAdminAccessCodes);
    originalPost.call(app, "/api/super-admin/access-codes", createSuperAdminAccessCode);
    originalPatch.call(app, "/api/super-admin/access-codes/:id", updateSuperAdminAccessCode);
    originalPost.call(app, "/api/auth/super-admin-access-login", superAdminAccessLogin);
    originalDelete.call(app, "/api/job-portal/messages/:id", deleteJobMessage);
  }

  express.application.get = function patchedGet(path, ...handlers) {
    installCompatibilityRoutes(this);

    if (path === "/api/complaints") {
      originalGet.call(this, path, complaintsList);
    }

    if (path === "/api/auth/ward-check") {
      originalGet.call(this, path, nagarsevakWardCheck);
    }

    return originalGet.call(this, path, ...handlers);
  };

  express.application.post = function patchedPost(path, ...handlers) {
    installCompatibilityRoutes(this);

    if (path === "/api/auth/nagarsevak-register") {
      originalPost.call(this, path, nagarsevakRegister);
    }

    return originalPost.call(this, path, ...handlers);
  };

  express.application.patch = function patchedPatch(path, ...handlers) {
    installCompatibilityRoutes(this);
    return originalPatch.call(this, path, ...handlers);
  };

  console.log("[ConnectTPatch] OTP, complaint filter, Nagarsevak safety and Super Admin access patch active");
} catch (err) {
  console.warn("[ConnectTPatch] express patch disabled:", err.message);
}
