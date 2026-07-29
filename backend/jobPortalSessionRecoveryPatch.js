/*
 * Returning-user Job Portal session recovery and instant role switching.
 *
 * Citizens can move between Job Seeker and Employer at any time. Each role keeps
 * its own profile data, and switching never requires Super Admin approval.
 */

"use strict";

const crypto = require("crypto");
const { signToken, verifyRequestToken } = require("./authSecurity");

let pool = null;
let installed = false;

function cleanPhone(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function cleanText(value, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength);
}

function makeId(role) {
  const prefix = role === "employer" ? "emp" : "seek";
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

function randomColor() {
  const colors = ["#C2410C", "#EA580C", "#F97316", "#FB923C", "#B45309", "#92400E"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function sendJson(res, status, payload) {
  if (res.headersSent) return;
  return res.status(status).json(payload);
}

function userPayload(row) {
  if (!row) return null;
  return {
    id: row.id,
    role: row.role,
    name: row.name,
    dob: row.dob,
    phone: cleanPhone(row.phone),
    email: row.email,
    avatarColor: row.avatar_color,
    profilePhoto: row.profile_photo,
    qualification: row.qualification,
    skills: row.skills,
    about: row.about,
    currentStatus: row.current_status,
    experience: row.experience,
    location: row.location,
    languages: row.languages,
    currentCompany: row.current_company,
    currentRole: row.current_role,
    previousCompany: row.previous_company,
    previousRole: row.previous_role,
    collegeName: row.college_name,
    fieldOfStudy: row.field_of_study,
    company: row.company,
    contactPerson: row.contact_person,
    gstNo: row.gst_no,
    industry: row.industry,
    website: row.website,
    companyDescription: row.company_description,
    companyType: row.company_type,
    companySize: row.company_size,
    yearEstablished: row.year_established,
    address: row.address,
    pincode: row.pincode,
    whatsapp: row.whatsapp,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensureLockSchema(db) {
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

async function saveActiveRole(db, phone, profile) {
  await db.query(
    `INSERT INTO job_portal_role_locks (phone, active_user_id, role)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE active_user_id = VALUES(active_user_id), role = VALUES(role), updated_at = CURRENT_TIMESTAMP`,
    [phone, profile.id, profile.role],
  );
}

async function findOrCreateRoleProfile(db, civicUser, phone, role) {
  let [profileRows] = await db.query(
    "SELECT * FROM job_portal_users WHERE phone = ? AND role = ? ORDER BY updated_at DESC, created_at DESC LIMIT 1",
    [phone, role],
  );
  if (profileRows.length) return profileRows[0];

  const id = makeId(role);
  const name = cleanText(civicUser.name, 160) || "Connect T Citizen";
  const location = cleanText(civicUser.address, 190) || null;

  await db.query(
    `INSERT INTO job_portal_users
     (id, role, name, dob, phone, email, avatar_color, profile_photo, current_status,
      location, company, contact_person, address, whatsapp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
    [
      id,
      role,
      name,
      civicUser.dob || null,
      phone,
      civicUser.email || null,
      randomColor(),
      civicUser.profile_photo || null,
      role === "seeker" ? "unemployed" : null,
      location,
      null,
      role === "employer" ? name : null,
      location,
      role === "employer" ? phone : null,
    ],
  );

  [profileRows] = await db.query(
    "SELECT * FROM job_portal_users WHERE phone = ? AND role = ? ORDER BY updated_at DESC, created_at DESC LIMIT 1",
    [phone, role],
  );
  return profileRows[0] || null;
}

async function session(req, res) {
  try {
    if (!pool) throw new Error("Database pool is not ready");
    await ensureLockSchema(pool);

    const auth = verifyRequestToken(req);
    if (!auth?.sub || auth.scope === "job_portal") {
      return sendJson(res, 401, { success: false, message: "Please log in to Connect T first." });
    }

    const [civicRows] = await pool.query(
      "SELECT id, name, mobile, dob, email, address, profile_photo, role FROM users WHERE id = ? LIMIT 1",
      [auth.sub],
    );
    const civicUser = civicRows[0];
    if (!civicUser || civicUser.role !== "citizen") {
      return sendJson(res, 403, { success: false, message: "Job Portal is available from a citizen account." });
    }

    const phone = cleanPhone(civicUser.mobile);
    if (phone.length !== 10) {
      return sendJson(res, 400, { success: false, message: "Your Connect T mobile number is not valid." });
    }

    const requestedRole = cleanText(req.body?.role, 20);
    if (requestedRole && !["seeker", "employer"].includes(requestedRole)) {
      return sendJson(res, 400, { success: false, message: "Choose Job Seeker or Employer." });
    }

    let profile = null;

    if (requestedRole) {
      profile = await findOrCreateRoleProfile(pool, civicUser, phone, requestedRole);
      if (!profile) throw new Error("Requested role profile could not be created");
      await saveActiveRole(pool, phone, profile);
    } else {
      const [lockRows] = await pool.query(
        "SELECT active_user_id, role FROM job_portal_role_locks WHERE phone = ? LIMIT 1",
        [phone],
      );

      if (lockRows.length) {
        const [profileRows] = await pool.query(
          "SELECT * FROM job_portal_users WHERE id = ? AND phone = ? LIMIT 1",
          [lockRows[0].active_user_id, phone],
        );
        profile = profileRows[0] || null;
      }

      if (!profile) {
        const [profileRows] = await pool.query(
          "SELECT * FROM job_portal_users WHERE phone = ? ORDER BY updated_at DESC, created_at DESC LIMIT 1",
          [phone],
        );
        profile = profileRows[0] || null;
        if (profile) await saveActiveRole(pool, phone, profile);
      }
    }

    if (!profile) {
      return sendJson(res, 404, {
        success: false,
        code: "JOB_PROFILE_REQUIRED",
        message: "Choose how you want to use the Job Portal.",
      });
    }

    const user = userPayload(profile);
    return sendJson(res, 200, {
      success: true,
      roleLocked: false,
      roleSwitchingEnabled: true,
      user,
      token: signToken({ sub: user.id, mobile: user.phone, role: user.role, scope: "job_portal" }),
    });
  } catch (err) {
    console.warn("[JobPortalSessionRecovery] session failed:", err.message);
    return sendJson(res, 500, { success: false, message: "Job Portal could not be opened right now." });
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
  console.warn("[JobPortalSessionRecovery] mysql patch disabled:", err.message);
}

try {
  const express = require("express");
  const originalPost = express.application.post;

  function install(app) {
    if (installed) return;
    installed = true;
    originalPost.call(app, "/api/job-portal/session", session);
  }

  express.application.post = function patchedPost(path, ...handlers) {
    install(this);
    return originalPost.call(this, path, ...handlers);
  };

  console.log("[JobPortalSessionRecovery] instant seeker/employer switching active");
} catch (err) {
  console.warn("[JobPortalSessionRecovery] express patch disabled:", err.message);
}

module.exports = { session, findOrCreateRoleProfile };
