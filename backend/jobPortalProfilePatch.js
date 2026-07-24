/*
 * Connect-T Job Portal profile persistence and safety patch.
 *
 * The base server owns the core user route. This layer extends the stored field
 * set, keeps mobile/role immutable, and applies extra columns only after the
 * authorized base route has accepted the request.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const { UPLOAD_DIR } = require("./mediaStorage");

const EXTRA_FIELDS = {
  currentCompany: { column: "current_company", definition: "VARCHAR(190) NULL", max: 190 },
  currentRole: { column: "current_role", definition: "VARCHAR(160) NULL", max: 160 },
  previousCompany: { column: "previous_company", definition: "VARCHAR(190) NULL", max: 190 },
  previousRole: { column: "previous_role", definition: "VARCHAR(160) NULL", max: 160 },
  collegeName: { column: "college_name", definition: "VARCHAR(190) NULL", max: 190 },
  fieldOfStudy: { column: "field_of_study", definition: "VARCHAR(190) NULL", max: 190 },
  companyType: { column: "company_type", definition: "VARCHAR(80) NULL", max: 80 },
  companySize: { column: "company_size", definition: "VARCHAR(80) NULL", max: 80 },
  yearEstablished: { column: "year_established", definition: "VARCHAR(20) NULL", max: 20 },
};

const CORE_PATCH_FIELDS = new Set([
  "name", "dob", "email", "avatarColor", "profilePhoto", "qualification", "skills", "about",
  "currentStatus", "experience", "location", "languages", "company", "contactPerson", "gstNo",
  "industry", "website", "companyDescription", "address", "pincode", "whatsapp", "latitude", "longitude",
]);

const SEEKER_ONLY_FIELDS = new Set([
  "qualification", "skills", "about", "currentStatus", "experience", "languages",
  "currentCompany", "currentRole", "previousCompany", "previousRole", "collegeName", "fieldOfStudy",
]);
const EMPLOYER_ONLY_FIELDS = new Set([
  "company", "contactPerson", "gstNo", "industry", "website", "companyDescription", "address",
  "pincode", "whatsapp", "companyType", "companySize", "yearEstablished",
]);

const COLUMNS = Object.values(EXTRA_FIELDS).map((field) => field.column);
const FIELD_BY_COLUMN = Object.fromEntries(
  Object.entries(EXTRA_FIELDS).map(([bodyKey, field]) => [field.column, bodyKey]),
);

let pool = null;
let ensurePromise = null;
let patchHealthInstalled = false;

function q(column) {
  return `\`${String(column).replace(/`/g, "")}\``;
}

function cleanPhone(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function cleanValue(value, max = 2000) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text.slice(0, max);
}

function extractExtraPayload(body = {}) {
  const payload = {};
  for (const [bodyKey, field] of Object.entries(EXTRA_FIELDS)) {
    if (Object.prototype.hasOwnProperty.call(body, bodyKey)) {
      payload[field.column] = cleanValue(body[bodyKey], field.max);
    }
    if (Object.prototype.hasOwnProperty.call(body, field.column)) {
      payload[field.column] = cleanValue(body[field.column], field.max);
    }
  }
  return payload;
}

function toCamelExtras(row = {}) {
  const extra = {};
  for (const column of COLUMNS) {
    const bodyKey = FIELD_BY_COLUMN[column];
    if (row[column] !== undefined && row[column] !== null && String(row[column]).trim() !== "") {
      extra[bodyKey] = row[column];
    }
  }
  return extra;
}

function hasCorePatchField(body = {}) {
  return Object.keys(body).some((key) => CORE_PATCH_FIELDS.has(key));
}

async function getProfile(userId) {
  if (!pool || !userId) return null;
  const [rows] = await pool.query(
    "SELECT id, phone, role, name, profile_photo FROM job_portal_users WHERE id = ? LIMIT 1",
    [userId],
  );
  return rows[0] || null;
}

function incompatibleRoleField(role, body = {}) {
  const forbidden = role === "seeker" ? EMPLOYER_ONLY_FIELDS : SEEKER_ONLY_FIELDS;
  for (const key of forbidden) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      const value = body[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") return key;
    }
  }
  return null;
}

function validateEmployerFields(body = {}) {
  if (Object.prototype.hasOwnProperty.call(body, "whatsapp")) {
    const value = cleanPhone(body.whatsapp);
    if (body.whatsapp && value.length !== 10) return "Enter a valid 10-digit WhatsApp number.";
    body.whatsapp = value || null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "pincode")) {
    const value = String(body.pincode || "").replace(/\D/g, "").slice(0, 6);
    if (body.pincode && value.length !== 6) return "Enter a valid 6-digit PIN code.";
    body.pincode = value || null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "yearEstablished")) {
    const value = String(body.yearEstablished || "").replace(/\D/g, "").slice(0, 4);
    const year = Number(value);
    if (value && (value.length !== 4 || year < 1800 || year > new Date().getFullYear())) {
      return "Enter a valid establishment year.";
    }
    body.yearEstablished = value || null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "website") && body.website) {
    try {
      const parsed = new URL(String(body.website).trim().match(/^https?:\/\//i) ? String(body.website).trim() : `https://${String(body.website).trim()}`);
      body.website = parsed.toString().slice(0, 190);
    } catch {
      return "Enter a valid website address.";
    }
  }
  return "";
}

async function prepareProfileUpdate(req, res) {
  const profile = await getProfile(req.params.id);
  if (!profile) return { profile: null, continue: true };

  const suppliedPhone = Object.prototype.hasOwnProperty.call(req.body, "phone")
    ? cleanPhone(req.body.phone)
    : Object.prototype.hasOwnProperty.call(req.body, "mobile")
      ? cleanPhone(req.body.mobile)
      : "";
  if (suppliedPhone && suppliedPhone !== cleanPhone(profile.phone)) {
    res.status(403).json({
      success: false,
      code: "VERIFIED_MOBILE_IMMUTABLE",
      message: "Verified mobile number cannot be changed from the profile form.",
    });
    return { profile, continue: false };
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "role") && String(req.body.role || "") !== String(profile.role)) {
    res.status(403).json({
      success: false,
      code: "JOB_ROLE_IMMUTABLE",
      message: "Job Portal role can only be changed through the approved role-correction workflow.",
    });
    return { profile, continue: false };
  }

  delete req.body.phone;
  delete req.body.mobile;
  delete req.body.role;
  delete req.body.id;
  delete req.body.createdAt;
  delete req.body.created_at;
  delete req.body.companies;

  const incompatible = incompatibleRoleField(profile.role, req.body);
  if (incompatible) {
    res.status(400).json({ success: false, message: "This field does not belong to the active Job Portal role." });
    return { profile, continue: false };
  }

  if (profile.role === "employer") {
    const fieldError = validateEmployerFields(req.body);
    if (fieldError) {
      res.status(400).json({ success: false, message: fieldError });
      return { profile, continue: false };
    }
  }

  if (!hasCorePatchField(req.body) && Object.keys(extractExtraPayload(req.body)).length) {
    req.body.name = profile.name || "Job Portal User";
  }
  return { profile, continue: true };
}

async function getPatchColumnStatus() {
  if (!pool) return { connected: false, columns: COLUMNS.map((column) => ({ column, exists: false })) };
  try {
    const [rows] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'job_portal_users'
         AND COLUMN_NAME IN (${COLUMNS.map(() => "?").join(",")})`,
      COLUMNS,
    );
    const existing = new Set(rows.map((row) => row.COLUMN_NAME));
    return { connected: true, columns: COLUMNS.map((column) => ({ column, exists: existing.has(column) })) };
  } catch (error) {
    return { connected: true, error: error.message, columns: COLUMNS.map((column) => ({ column, exists: false })) };
  }
}

async function ensureExtraColumns() {
  if (!pool) return;
  if (!ensurePromise) {
    ensurePromise = (async () => {
      for (const field of Object.values(EXTRA_FIELDS)) {
        const [rows] = await pool.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'job_portal_users' AND COLUMN_NAME = ? LIMIT 1`,
          [field.column],
        );
        if (!rows.length) await pool.query(`ALTER TABLE job_portal_users ADD COLUMN ${q(field.column)} ${field.definition}`);
      }
    })().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  return ensurePromise;
}

async function updateExtraFields(userId, body) {
  if (!pool || !userId) return;
  const entries = Object.entries(extractExtraPayload(body));
  if (!entries.length) return;
  await ensureExtraColumns();
  const sets = entries.map(([column]) => `${q(column)} = ?`).join(", ");
  await pool.query(
    `UPDATE job_portal_users SET ${sets} WHERE id = ?`,
    [...entries.map(([, value]) => value), userId],
  );
}

async function enrichUser(user) {
  if (!pool || !user?.id) return user;
  await ensureExtraColumns();
  const [rows] = await pool.query(
    `SELECT ${COLUMNS.map(q).join(", ")} FROM job_portal_users WHERE id = ? LIMIT 1`,
    [user.id],
  );
  if (!rows.length) return user;
  const extras = toCamelExtras(rows[0]);
  const companies = user.company || extras.companyType || extras.companySize || user.industry || user.website
    ? [{
        id: "primary",
        name: user.company || "Company",
        type: extras.companyType || user.companyType,
        size: extras.companySize || user.companySize,
        industry: user.industry,
        website: user.website,
        description: user.companyDescription,
        address: user.address,
        pincode: user.pincode,
        whatsapp: user.whatsapp,
        yearEstablished: extras.yearEstablished || user.yearEstablished,
        contactPerson: user.contactPerson,
        gstNo: user.gstNo,
      }]
    : user.companies;
  return { ...user, ...extras, companies };
}

function managedProfilePath(value) {
  const uri = String(value || "");
  if (!uri.includes("/uploads/job_profile_")) return null;
  try {
    const fileName = path.basename(new URL(uri, "https://connect-t.invalid").pathname);
    if (!/^job_profile_\d+_[a-f0-9]+\.(?:jpg|png|webp)$/i.test(fileName)) return null;
    return path.join(UPLOAD_DIR, fileName);
  } catch {
    return null;
  }
}

async function removeManagedProfile(value) {
  const filePath = managedProfilePath(value);
  if (filePath) await fs.promises.unlink(filePath).catch(() => undefined);
}

function wrapUserJson(res, options = {}) {
  const originalJson = res.json.bind(res);
  let used = false;
  res.json = (payload) => {
    if (used) return originalJson(payload);
    used = true;

    Promise.resolve()
      .then(async () => {
        if (!payload?.user) {
          if (options.cleanupFailedPhoto) await options.cleanupFailedPhoto();
          return payload;
        }
        if (options.beforeEnrich) await options.beforeEnrich(payload.user);
        const user = await enrichUser(payload.user);
        if (options.afterSuccess) await options.afterSuccess(user);
        return { ...payload, user };
      })
      .then((nextPayload) => originalJson(nextPayload))
      .catch((error) => {
        console.warn("[JobPortalPatch] Response enrichment failed:", error.message);
        originalJson(payload);
      });
    return res;
  };
}

function createClientId(role) {
  const prefix = role === "employer" ? "emp" : "seek";
  return `${prefix}_${Date.now()}_${require("crypto").randomBytes(6).toString("hex")}`;
}

try {
  const mysql = require("mysql2/promise");
  const originalCreatePool = mysql.createPool;
  mysql.createPool = function patchedCreatePool(...args) {
    pool = originalCreatePool.apply(this, args);
    const originalQuery = pool.query.bind(pool);
    pool.query = async function patchedQuery(sql, params) {
      const result = await originalQuery(sql, params);
      if (String(sql || "").includes("CREATE TABLE IF NOT EXISTS job_portal_users")) {
        ensureExtraColumns().catch((error) => console.warn("[JobPortalPatch] Deferred column ensure failed:", error.message));
      }
      return result;
    };
    return pool;
  };
} catch (error) {
  console.warn("[JobPortalPatch] mysql patch disabled:", error.message);
}

try {
  const express = require("express");
  const originalGet = express.application.get;
  const originalPost = express.application.post;
  const originalPatch = express.application.patch;

  function installPatchHealth(app) {
    if (patchHealthInstalled || !app || typeof app.get !== "function") return;
    patchHealthInstalled = true;
    originalGet.call(app, "/api/job-portal/patch-health", async function jobPortalPatchHealth(_req, res) {
      try {
        await ensureExtraColumns();
        res.json({ success: true, patch: "jobPortalProfilePatch", active: true, extraFields: Object.keys(EXTRA_FIELDS), ...(await getPatchColumnStatus()) });
      } catch (error) {
        res.status(500).json({ success: false, patch: "jobPortalProfilePatch", active: true, message: "Profile schema could not be verified right now." });
      }
    });
  }

  express.application.get = function patchedGet(routePath, ...handlers) {
    installPatchHealth(this);
    if (routePath === "/api/job-portal/users/:id") {
      handlers = handlers.map((handler) => async function jobPortalGetUserPatch(req, res, next) {
        wrapUserJson(res);
        return handler(req, res, next);
      });
    }
    return originalGet.call(this, routePath, ...handlers);
  };

  express.application.post = function patchedPost(routePath, ...handlers) {
    installPatchHealth(this);
    if (routePath === "/api/job-portal/register") {
      handlers = handlers.map((handler) => async function jobPortalRegisterPatch(req, res, next) {
        if (!req.body.id) req.body.id = createClientId(req.body.role);
        wrapUserJson(res, { beforeEnrich: async (user) => updateExtraFields(user.id || req.body.id, req.body) });
        return handler(req, res, next);
      });
    }
    if (routePath === "/api/job-portal/login" || routePath === "/api/job-portal/session") {
      handlers = handlers.map((handler) => async function jobPortalSessionProfilePatch(req, res, next) {
        wrapUserJson(res);
        return handler(req, res, next);
      });
    }
    return originalPost.call(this, routePath, ...handlers);
  };

  express.application.patch = function patchedPatch(routePath, ...handlers) {
    installPatchHealth(this);
    if (routePath === "/api/job-portal/users/:id") {
      handlers = handlers.map((handler) => async function jobPortalPatchUserPatch(req, res, next) {
        const prepared = await prepareProfileUpdate(req, res);
        if (!prepared.continue) return;
        const oldPhoto = prepared.profile?.profile_photo || null;
        const incomingWasData = typeof req.body?.profilePhoto === "string" && req.body.profilePhoto.startsWith("data:");

        wrapUserJson(res, {
          beforeEnrich: async () => updateExtraFields(req.params.id, req.body),
          afterSuccess: async (user) => {
            if (oldPhoto && String(oldPhoto) !== String(user.profilePhoto || "")) await removeManagedProfile(oldPhoto);
          },
          cleanupFailedPhoto: async () => {
            if (incomingWasData && req.body?.profilePhoto && String(req.body.profilePhoto) !== String(oldPhoto || "")) {
              await removeManagedProfile(req.body.profilePhoto);
            }
          },
        });
        return handler(req, res, next);
      });
    }
    return originalPatch.call(this, routePath, ...handlers);
  };

  console.log("[JobPortalPatch] authorized profile field persistence active");
} catch (error) {
  console.warn("[JobPortalPatch] express patch disabled:", error.message);
}

module.exports = {
  extractExtraPayload,
  incompatibleRoleField,
  managedProfilePath,
};
