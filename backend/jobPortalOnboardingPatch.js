/*
 * Connect-T Job Portal onboarding route.
 *
 * Citizens authenticate once through the main Connect-T login. This route uses
 * that verified civic session to create or update a Job Seeker / Employer
 * profile without a second OTP, password, login, or registration workflow.
 */

"use strict";

const crypto = require("crypto");
const { signToken, verifyRequestToken } = require("./authSecurity");

let pool = null;
let installed = false;

function sendJson(res, status, payload) {
  if (res.headersSent) return;
  return res.status(status).json(payload);
}

function cleanPhone(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function cleanText(value, maxLength = 500) {
  const text = String(value || "").trim();
  return text ? text.slice(0, maxLength) : "";
}

function makeId(role) {
  const prefix = role === "employer" ? "emp" : "seek";
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

function randomColor() {
  const colors = ["#C2410C", "#EA580C", "#F97316", "#FB923C", "#B45309", "#92400E"];
  return colors[Math.floor(Math.random() * colors.length)];
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
    company: row.company,
    contactPerson: row.contact_person,
    gstNo: row.gst_no,
    industry: row.industry,
    website: row.website,
    companyDescription: row.company_description,
    address: row.address,
    pincode: row.pincode,
    whatsapp: row.whatsapp,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getPool() {
  if (!pool) throw new Error("Database pool is not ready");
  return pool;
}

async function ensureSchema(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS job_portal_users (
    id VARCHAR(64) PRIMARY KEY,
    role VARCHAR(20) NOT NULL,
    name VARCHAR(160) NOT NULL,
    dob DATE NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(190) NULL,
    avatar_color VARCHAR(32) NULL,
    profile_photo LONGTEXT NULL,
    qualification VARCHAR(160) NULL,
    skills TEXT NULL,
    about TEXT NULL,
    current_status VARCHAR(40) NULL,
    experience VARCHAR(80) NULL,
    location VARCHAR(190) NULL,
    languages VARCHAR(190) NULL,
    company VARCHAR(190) NULL,
    contact_person VARCHAR(160) NULL,
    gst_no VARCHAR(64) NULL,
    industry VARCHAR(120) NULL,
    website VARCHAR(190) NULL,
    company_description TEXT NULL,
    address TEXT NULL,
    pincode VARCHAR(20) NULL,
    whatsapp VARCHAR(20) NULL,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_job_portal_phone_role (phone, role),
    KEY idx_job_portal_role (role),
    KEY idx_job_portal_phone (phone)
  )`);
}

async function onboarding(req, res) {
  try {
    const db = getPool();
    await ensureSchema(db);

    const auth = verifyRequestToken(req);
    if (!auth?.sub || auth.scope === "job_portal") {
      return sendJson(res, 401, {
        success: false,
        message: "Please log in to Connect T first.",
      });
    }

    const [civicRows] = await db.query(
      `SELECT id, name, mobile, dob, email, address, profile_photo, role
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [auth.sub],
    );
    const civicUser = civicRows[0];

    if (!civicUser || civicUser.role !== "citizen") {
      return sendJson(res, 403, {
        success: false,
        message: "Job Portal is available from a citizen account.",
      });
    }

    const role = cleanText(req.body?.role, 20);
    if (!['seeker', 'employer'].includes(role)) {
      return sendJson(res, 400, {
        success: false,
        message: "Choose Job Seeker or Employer.",
      });
    }

    const phone = cleanPhone(civicUser.mobile);
    const name = cleanText(req.body?.name || civicUser.name, 160);
    const location = cleanText(req.body?.location || req.body?.address || civicUser.address, 190);

    if (phone.length !== 10) {
      return sendJson(res, 400, {
        success: false,
        message: "Your Connect T mobile number is not valid.",
      });
    }
    if (name.split(/\s+/).filter(Boolean).length < 2) {
      return sendJson(res, 400, {
        success: false,
        message: "Enter your full name, including surname.",
      });
    }
    if (location.length < 3) {
      return sendJson(res, 400, {
        success: false,
        message: role === "employer" ? "Enter your business location." : "Enter your preferred work location.",
      });
    }

    const qualification = cleanText(req.body?.qualification, 160);
    const skills = cleanText(req.body?.skills, 1200);
    const about = cleanText(req.body?.about, 1200);
    const experience = cleanText(req.body?.experience, 500);
    const languages = cleanText(req.body?.languages, 190);
    const company = cleanText(req.body?.company, 190);
    const contactPerson = cleanText(req.body?.contactPerson || name, 160);
    const industry = cleanText(req.body?.industry, 120);
    const companyDescription = cleanText(req.body?.companyDescription, 1500);
    const address = cleanText(req.body?.address || location, 1500);
    const whatsapp = cleanPhone(req.body?.whatsapp || phone);
    const allowedStatuses = new Set(["employed", "unemployed", "student", "fresher"]);
    const requestedStatus = cleanText(req.body?.currentStatus, 40);
    const currentStatus = role === "seeker"
      ? (allowedStatuses.has(requestedStatus) ? requestedStatus : "fresher")
      : "";

    if (role === "seeker" && qualification.length < 2) {
      return sendJson(res, 400, {
        success: false,
        message: "Add your qualification.",
      });
    }
    if (role === "seeker" && skills.length < 2) {
      return sendJson(res, 400, {
        success: false,
        message: "Add at least one skill.",
      });
    }
    if (role === "seeker" && about.length < 2) {
      return sendJson(res, 400, {
        success: false,
        message: "Add your preferred job category.",
      });
    }
    if (role === "employer" && company.length < 2) {
      return sendJson(res, 400, {
        success: false,
        message: "Enter your company, shop, or business name.",
      });
    }
    if (role === "employer" && industry.length < 2) {
      return sendJson(res, 400, {
        success: false,
        message: "Add your business type or industry.",
      });
    }

    const [existingRows] = await db.query(
      "SELECT id FROM job_portal_users WHERE phone = ? AND role = ? LIMIT 1",
      [phone, role],
    );
    const existed = existingRows.length > 0;
    const id = existingRows[0]?.id || makeId(role);

    await db.query(
      `INSERT INTO job_portal_users
       (id, role, name, dob, phone, email, avatar_color, profile_photo,
        qualification, skills, about, current_status, experience, location,
        languages, company, contact_person, industry, company_description,
        address, whatsapp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         qualification = VALUES(qualification),
         skills = VALUES(skills),
         about = VALUES(about),
         current_status = VALUES(current_status),
         experience = VALUES(experience),
         location = VALUES(location),
         languages = VALUES(languages),
         company = VALUES(company),
         contact_person = VALUES(contact_person),
         industry = VALUES(industry),
         company_description = VALUES(company_description),
         address = VALUES(address),
         whatsapp = VALUES(whatsapp),
         updated_at = CURRENT_TIMESTAMP`,
      [
        id,
        role,
        name,
        civicUser.dob || null,
        phone,
        civicUser.email || null,
        randomColor(),
        civicUser.profile_photo || null,
        role === "seeker" ? qualification : null,
        skills || null,
        role === "seeker" ? about || null : null,
        currentStatus || null,
        role === "seeker" ? experience || null : null,
        location,
        role === "seeker" ? languages || null : null,
        role === "employer" ? company : null,
        role === "employer" ? contactPerson : null,
        role === "employer" ? industry : null,
        role === "employer" ? companyDescription || null : null,
        address,
        role === "employer" ? whatsapp || phone : null,
      ],
    );

    const [jobRows] = await db.query(
      "SELECT * FROM job_portal_users WHERE phone = ? AND role = ? LIMIT 1",
      [phone, role],
    );
    const user = userPayload(jobRows[0]);

    return sendJson(res, existed ? 200 : 201, {
      success: true,
      user,
      token: signToken({
        sub: user.id,
        mobile: user.phone,
        role: user.role,
        scope: "job_portal",
      }),
    });
  } catch (err) {
    console.warn("[JobPortalOnboardingPatch] onboarding failed:", err.message);
    return sendJson(res, 500, {
      success: false,
      message: "Job profile could not be saved right now. Please try again after some time.",
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
  console.warn("[JobPortalOnboardingPatch] mysql patch disabled:", err.message);
}

try {
  const express = require("express");
  const originalPost = express.application.post;

  function install(app) {
    if (installed) return;
    installed = true;
    originalPost.call(app, "/api/job-portal/onboarding", onboarding);
  }

  express.application.post = function patchedPost(path, ...handlers) {
    install(this);
    return originalPost.call(this, path, ...handlers);
  };

  console.log("[JobPortalOnboardingPatch] unified profile setup route active");
} catch (err) {
  console.warn("[JobPortalOnboardingPatch] express patch disabled:", err.message);
}

module.exports = {};
