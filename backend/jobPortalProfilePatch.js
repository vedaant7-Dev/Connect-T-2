/*
 * Connect-T Job Portal profile persistence patch
 *
 * This preloader extends the existing backend/server.js Job Portal user routes without
 * rewriting the large server file. It adds the extra seeker/employer profile fields
 * used by the mobile app and enriches API user responses with those fields.
 */

const EXTRA_FIELDS = {
  currentCompany: { column: "current_company", definition: "VARCHAR(190) NULL" },
  currentRole: { column: "current_role", definition: "VARCHAR(160) NULL" },
  previousCompany: { column: "previous_company", definition: "VARCHAR(190) NULL" },
  previousRole: { column: "previous_role", definition: "VARCHAR(160) NULL" },
  collegeName: { column: "college_name", definition: "VARCHAR(190) NULL" },
  fieldOfStudy: { column: "field_of_study", definition: "VARCHAR(190) NULL" },
  companyType: { column: "company_type", definition: "VARCHAR(80) NULL" },
  companySize: { column: "company_size", definition: "VARCHAR(80) NULL" },
  yearEstablished: { column: "year_established", definition: "VARCHAR(20) NULL" },
};

const CORE_PATCH_FIELDS = new Set([
  "name",
  "dob",
  "email",
  "avatarColor",
  "profilePhoto",
  "qualification",
  "skills",
  "about",
  "currentStatus",
  "experience",
  "location",
  "languages",
  "company",
  "contactPerson",
  "gstNo",
  "industry",
  "website",
  "companyDescription",
  "address",
  "pincode",
  "whatsapp",
  "latitude",
  "longitude",
]);

const COLUMNS = Object.values(EXTRA_FIELDS).map((field) => field.column);
const FIELD_BY_COLUMN = Object.fromEntries(
  Object.entries(EXTRA_FIELDS).map(([bodyKey, field]) => [field.column, bodyKey]),
);

let pool = null;
let ensurePromise = null;

function cleanValue(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function extractExtraPayload(body = {}) {
  const payload = {};

  for (const [bodyKey, field] of Object.entries(EXTRA_FIELDS)) {
    if (Object.prototype.hasOwnProperty.call(body, bodyKey)) {
      payload[field.column] = cleanValue(body[bodyKey]);
    }

    if (Object.prototype.hasOwnProperty.call(body, field.column)) {
      payload[field.column] = cleanValue(body[field.column]);
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

async function ensureExtraOnlyPatchCanPassServerRoute(userId, body = {}) {
  if (!pool || !userId || hasCorePatchField(body)) return;

  const extraPayload = extractExtraPayload(body);
  if (!Object.keys(extraPayload).length) return;

  try {
    const [rows] = await pool.query(
      "SELECT name FROM job_portal_users WHERE id = ? LIMIT 1",
      [userId],
    );

    body.name = rows?.[0]?.name || "User";
  } catch {
    body.name = "User";
  }
}

async function getPatchColumnStatus() {
  if (!pool) {
    return { connected: false, columns: COLUMNS.map((column) => ({ column, exists: false })) };
  }

  try {
    const [rows] = await pool.query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'job_portal_users'
         AND COLUMN_NAME IN (${COLUMNS.map(() => "?").join(",")})`,
      COLUMNS,
    );

    const existing = new Set(rows.map((row) => row.COLUMN_NAME));

    return {
      connected: true,
      columns: COLUMNS.map((column) => ({ column, exists: existing.has(column) })),
    };
  } catch (err) {
    return {
      connected: true,
      error: err.message,
      columns: COLUMNS.map((column) => ({ column, exists: false })),
    };
  }
}

async function ensureExtraColumns() {
  if (!pool) return;

  if (!ensurePromise) {
    ensurePromise = (async () => {
      for (const field of Object.values(EXTRA_FIELDS)) {
        try {
          const [rows] = await pool.query(
            `SELECT COLUMN_NAME
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'job_portal_users'
               AND COLUMN_NAME = ?
             LIMIT 1`,
            [field.column],
          );

          if (!rows.length) {
            await pool.query(`ALTER TABLE job_portal_users ADD COLUMN ${field.column} ${field.definition}`);
          }
        } catch (err) {
          console.warn(`[JobPortalPatch] Could not ensure ${field.column}:`, err.message);
        }
      }
    })();
  }

  return ensurePromise;
}

async function updateExtraFields(userId, body) {
  if (!pool || !userId) return;

  const payload = extractExtraPayload(body);
  const entries = Object.entries(payload);

  if (!entries.length) return;

  await ensureExtraColumns();

  const sets = entries.map(([column]) => `${column} = ?`).join(", ");
  const values = entries.map(([, value]) => value);

  await pool.query(
    `UPDATE job_portal_users SET ${sets} WHERE id = ?`,
    [...values, userId],
  );
}

async function enrichUser(user) {
  if (!pool || !user?.id) return user;

  try {
    await ensureExtraColumns();

    const [rows] = await pool.query(
      `SELECT ${COLUMNS.join(", ")}
       FROM job_portal_users
       WHERE id = ?
       LIMIT 1`,
      [user.id],
    );

    if (!rows.length) return user;

    const extras = toCamelExtras(rows[0]);
    const companies =
      user.company || extras.companyType || extras.companySize || user.industry || user.website
        ? [
            {
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
            },
          ]
        : user.companies;

    return { ...user, ...extras, companies };
  } catch (err) {
    console.warn("[JobPortalPatch] Could not enrich user:", err.message);
    return user;
  }
}

function wrapUserJson(res, options = {}) {
  const originalJson = res.json.bind(res);

  res.json = (payload) => {
    if (!payload?.user) return originalJson(payload);

    Promise.resolve()
      .then(async () => {
        if (options.beforeEnrich) {
          await options.beforeEnrich(payload.user);
        }

        const user = await enrichUser(payload.user);
        return originalJson({ ...payload, user });
      })
      .catch((err) => {
        console.warn("[JobPortalPatch] Response enrichment failed:", err.message);
        originalJson(payload);
      });

    return res;
  };
}

function createClientId(role) {
  const prefix = role === "employer" ? "emp" : "seek";
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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
        ensureExtraColumns().catch((err) => {
          console.warn("[JobPortalPatch] Deferred column ensure failed:", err.message);
        });
      }

      return result;
    };

    return pool;
  };
} catch (err) {
  console.warn("[JobPortalPatch] mysql patch disabled:", err.message);
}

try {
  const express = require("express");

  const originalGet = express.application.get;
  const originalPost = express.application.post;
  const originalPatch = express.application.patch;

  express.application.get = function patchedGet(path, ...handlers) {
    if (path === "/api/job-portal/users/:id") {
      handlers = handlers.map((handler) => async function jobPortalGetUserPatch(req, res, next) {
        wrapUserJson(res);
        return handler(req, res, next);
      });
    }

    return originalGet.call(this, path, ...handlers);
  };

  express.application.post = function patchedPost(path, ...handlers) {
    if (path === "/api/job-portal/register") {
      handlers = handlers.map((handler) => async function jobPortalRegisterPatch(req, res, next) {
        if (!req.body.id) req.body.id = createClientId(req.body.role);

        wrapUserJson(res, {
          beforeEnrich: async (user) => {
            await updateExtraFields(user.id || req.body.id, req.body);
          },
        });

        return handler(req, res, next);
      });
    }

    if (path === "/api/job-portal/login") {
      handlers = handlers.map((handler) => async function jobPortalLoginPatch(req, res, next) {
        wrapUserJson(res);
        return handler(req, res, next);
      });
    }

    return originalPost.call(this, path, ...handlers);
  };

  express.application.patch = function patchedPatch(path, ...handlers) {
    if (path === "/api/job-portal/users/:id") {
      handlers = handlers.map((handler) => async function jobPortalPatchUserPatch(req, res, next) {
        await updateExtraFields(req.params.id, req.body);
        await ensureExtraOnlyPatchCanPassServerRoute(req.params.id, req.body);

        wrapUserJson(res, {
          beforeEnrich: async () => {
            await updateExtraFields(req.params.id, req.body);
          },
        });

        return handler(req, res, next);
      });
    }

    return originalPatch.call(this, path, ...handlers);
  };

  express.application.get.call(express.application, "/api/job-portal/patch-health", async function jobPortalPatchHealth(req, res) {
    try {
      await ensureExtraColumns();
      const status = await getPatchColumnStatus();
      res.json({
        success: true,
        patch: "jobPortalProfilePatch",
        active: true,
        extraFields: Object.keys(EXTRA_FIELDS),
        ...status,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        patch: "jobPortalProfilePatch",
        active: true,
        error: err.message,
      });
    }
  });

  console.log("[JobPortalPatch] Profile field persistence patch active");
} catch (err) {
  console.warn("[JobPortalPatch] express patch disabled:", err.message);
}
