"use strict";

/*
 * Unified Job Portal role selection.
 *
 * There is no standalone Job Portal login or client session. A citizen uses the
 * main Connect-T login and selects either the Job Seeker or Employer profile.
 */

const crypto = require("crypto");
const { verifyRequestToken } = require("./authSecurity");

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
  return res.status(status).json({ ...payload, authMode: "unified_civic" });
}

async function resolveCivicUser(db, auth) {
  if (!auth?.sub) return null;
  if (auth.scope !== "job_portal") {
    const [rows] = await db.query(
      "SELECT id, name, mobile, dob, email, address, profile_photo, role FROM users WHERE id = ? LIMIT 1",
      [auth.sub],
    );
    return rows[0] || null;
  }

  let phone = cleanPhone(auth.mobile);
  if (phone.length !== 10) {
    const [jobRows] = await db.query("SELECT phone FROM job_portal_users WHERE id = ? LIMIT 1", [auth.sub]);
    phone = cleanPhone(jobRows[0]?.phone);
  }
  if (phone.length !== 10) return null;

  const [rows] = await db.query(
    `SELECT id, name, mobile, dob, email, address, profile_photo, role
       FROM users
      WHERE role = 'citizen'
        AND RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(mobile, ''), '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', ''), 10) = ?
      ORDER BY created_at ASC LIMIT 1`,
    [phone],
  );
  return rows[0] || null;
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

async function ensureActiveRoleSchema(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS job_portal_active_roles (
    phone VARCHAR(20) PRIMARY KEY,
    active_user_id VARCHAR(64) NOT NULL,
    role VARCHAR(20) NOT NULL,
    selected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_jp_active_user (active_user_id),
    KEY idx_jp_active_role (role)
  )`);

  // Preserve existing selections while retiring the old lock workflow.
  try {
    await db.query(`INSERT INTO job_portal_active_roles (phone, active_user_id, role, updated_at)
      SELECT phone, active_user_id, role, updated_at FROM job_portal_role_locks
      ON DUPLICATE KEY UPDATE active_user_id = VALUES(active_user_id),
        role = VALUES(role), updated_at = VALUES(updated_at)`);
  } catch {
    // Older databases may never have created the retired table.
  }
}

async function saveActiveRole(db, phone, profile) {
  await db.query(
    `INSERT INTO job_portal_active_roles (phone, active_user_id, role)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE active_user_id = VALUES(active_user_id),
       role = VALUES(role), selected_at = CURRENT_TIMESTAMP,
       updated_at = CURRENT_TIMESTAMP`,
    [phone, profile.id, profile.role],
  );
}

async function findOrCreateRoleProfile(db, civicUser, phone, role, data = {}) {
  let [profileRows] = await db.query(
    "SELECT * FROM job_portal_users WHERE phone = ? AND role = ? ORDER BY updated_at DESC, created_at DESC LIMIT 1",
    [phone, role],
  );
  if (profileRows.length) return profileRows[0];

  const id = makeId(role);
  const name = cleanText(data.name || civicUser.name, 160) || "Connect T Citizen";
  const location = cleanText(data.location || data.address || civicUser.address, 190) || null;
  const company = role === "employer" ? (cleanText(data.company, 190) || `${name}'s Business`) : null;
  const contactPerson = role === "employer" ? (cleanText(data.contactPerson, 160) || name) : null;

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
      company,
      contactPerson,
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

async function activeProfile(req, res) {
  try {
    if (!pool) throw new Error("Database pool is not ready");
    await ensureActiveRoleSchema(pool);

    const auth = verifyRequestToken(req);
    const civicUser = await resolveCivicUser(pool, auth);
    if (!civicUser || civicUser.role !== "citizen") {
      return sendJson(res, 401, { success: false, error: "Connect-T citizen login required." });
    }

    const phone = cleanPhone(civicUser.mobile);
    const requestedRole = cleanText(req.body?.role, 20);
    if (requestedRole && !["seeker", "employer"].includes(requestedRole)) {
      return sendJson(res, 400, { success: false, error: "Choose Job Seeker or Employer." });
    }

    let profile = null;
    if (requestedRole) {
      profile = await findOrCreateRoleProfile(pool, civicUser, phone, requestedRole, req.body || {});
      if (profile) await saveActiveRole(pool, phone, profile);
    } else {
      const [activeRows] = await pool.query(
        `SELECT j.* FROM job_portal_active_roles a
         JOIN job_portal_users j ON j.id = a.active_user_id
         WHERE a.phone = ? AND j.phone = ? LIMIT 1`,
        [phone, phone],
      );
      profile = activeRows[0] || null;

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
        error: "Choose how you want to use the Job Portal.",
      });
    }

    return sendJson(res, 200, {
      success: true,
      roleSwitchingEnabled: true,
      user: userPayload(profile),
    });
  } catch (error) {
    console.warn("[JobPortalUnifiedRole] active profile failed:", error.message);
    return sendJson(res, 500, { success: false, error: "Job Portal could not be opened right now." });
  }
}

async function switchRole(req, res) {
  try {
    if (!pool) throw new Error("Database pool is not ready");
    await ensureActiveRoleSchema(pool);

    const auth = verifyRequestToken(req);
    const civicUser = await resolveCivicUser(pool, auth);
    if (!civicUser || civicUser.role !== "citizen") {
      return sendJson(res, 401, { success: false, error: "Connect-T citizen login required." });
    }

    const requestedRole = cleanText(req.body?.role, 20);
    if (!["seeker", "employer"].includes(requestedRole)) {
      return sendJson(res, 400, { success: false, error: "Choose Job Seeker or Employer." });
    }

    const phone = cleanPhone(civicUser.mobile);
    const profile = await findOrCreateRoleProfile(pool, civicUser, phone, requestedRole, req.body || {});
    if (!profile) throw new Error("Requested role profile could not be created");
    await saveActiveRole(pool, phone, profile);

    return sendJson(res, 200, {
      success: true,
      roleSwitchingEnabled: true,
      user: userPayload(profile),
    });
  } catch (error) {
    console.warn("[JobPortalUnifiedRole] role switch failed:", error.message);
    return sendJson(res, 500, { success: false, error: "Job Portal role could not be switched right now." });
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
  console.warn("[JobPortalUnifiedRole] database hook disabled:", error.message);
}

try {
  const express = require("express");
  const originalPost = express.application.post;

  function install(app) {
    if (installed) return;
    installed = true;
    originalPost.call(app, "/api/job-portal/active-profile", activeProfile);
    originalPost.call(app, "/api/job-portal/switch-role", switchRole);
  }

  express.application.post = function patchedPost(path, ...handlers) {
    install(this);
    return originalPost.call(this, path, ...handlers);
  };

  console.log("[JobPortalUnifiedRole] direct seeker/employer selection active");
} catch (error) {
  console.warn("[JobPortalUnifiedRole] route hook disabled:", error.message);
}

module.exports = {
  activeProfile,
  switchRole,
  findOrCreateRoleProfile,
  resolveCivicUser,
  ensureActiveRoleSchema,
};
