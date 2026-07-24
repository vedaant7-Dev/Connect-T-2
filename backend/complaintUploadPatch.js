"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const { verifyRequestToken } = require("./authSecurity");
const { hasExpectedSignature, MAX_UPLOAD_BYTES } = require("./mediaStorage");
const { isPrivilegedRoleActive } = require("./roleAuthorization");
const { validateCoordinates } = require("./validation");

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const COMPLAINT_CATEGORIES = new Set(["roads", "water", "electricity", "garbage", "drainage", "streetlight", "encroachment", "other"]);
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "uploads");

function uploadFileFilter(_req, file, callback) {
  const mime = String(file?.mimetype || "").toLowerCase();
  if (IMAGE_TYPES.has(mime)) return callback(null, true);
  const error = new Error("Choose a JPEG, PNG or WebP image.");
  error.status = 415;
  error.code = "UNSUPPORTED_IMAGE";
  return callback(error);
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: uploadFileFilter,
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
    fields: 30,
    fieldSize: 20 * 1024,
    parts: 32,
    headerPairs: 100,
  },
}).single("photo");

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

function publicBaseUrl(req) {
  return String(process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
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
    const active = await isPrivilegedRoleActive(pool, { mobile: user.mobile, role: user.role, userId: user.id });
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

async function writePhoto(file, req) {
  if (!file) return null;
  const mime = String(file.mimetype || "").toLowerCase();
  if (!IMAGE_TYPES.has(mime) || !hasExpectedSignature(file.buffer, mime)) {
    const error = new Error("Choose a valid JPEG, PNG or WebP image.");
    error.status = 415;
    error.code = "UNSUPPORTED_IMAGE";
    throw error;
  }
  const extension = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const fileName = `complaint_${Date.now()}_${crypto.randomBytes(8).toString("hex")}.${extension}`;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  await fs.promises.writeFile(path.join(UPLOAD_DIR, fileName), file.buffer, { flag: "wx" });
  return { filePath: path.join(UPLOAD_DIR, fileName), url: `${publicBaseUrl(req)}/uploads/${fileName}` };
}

function runUpload(req, res) {
  return new Promise((resolve, reject) => {
    upload(req, res, (error) => {
      if (!error) return resolve();
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        error.status = 413;
        error.message = "The selected image is larger than 8MB. Choose a smaller image.";
      } else if (error instanceof multer.MulterError) {
        error.status = 400;
        error.message = "The selected image could not be processed. Choose another image.";
      }
      return reject(error);
    });
  });
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
    photo_url: row.photo_url,
    ward_code: row.ward_code,
    assigned_officer_id: row.assigned_officer_id,
  };
}

async function createMultipartComplaint(req, res) {
  let savedFile = null;
  try {
    if (!pool) throw new Error("Database pool is unavailable");
    await ensureSchema();

    // Authenticate and authorize before Multer reads the multipart body into
    // memory. Unauthorized callers must not be able to consume upload memory.
    const user = await currentUser(req);
    if (!user) return sendJson(res, 401, { success: false, code: "SESSION_INVALID", message: "Please log in again before submitting a complaint." });
    const isSuperAdmin = user.role === "super_admin" || !!user.is_super_admin;
    const isApprovedOfficer = user.role === "nagarsevak" && String(user.approval_status || "") === "approved";
    if (user.role !== "citizen" && !isSuperAdmin && !isApprovedOfficer) {
      return sendJson(res, 403, { success: false, code: "COMPLAINT_ROLE_FORBIDDEN", message: "This account cannot submit complaints." });
    }

    await runUpload(req, res);
    if (!req.file) return sendJson(res, 400, { success: false, code: "PHOTO_REQUIRED", message: "Choose a complaint image before submitting." });

    const title = cleanText(req.body?.title, 255);
    const description = cleanText(req.body?.description, 10000);
    const category = cleanText(req.body?.category || "other", 80).toLowerCase() || "other";
    const location = cleanText(req.body?.location, 2000);
    const requestId = cleanText(req.body?.client_request_id, 80);
    if (!title || !description || !location) {
      return sendJson(res, 400, { success: false, code: "COMPLAINT_FIELDS_REQUIRED", message: "Title, description and location are required." });
    }
    if (!isAllowedComplaintCategory(category)) {
      return sendJson(res, 400, { success: false, code: "INVALID_COMPLAINT_CATEGORY", message: "Select a valid complaint category." });
    }
    if (!/^[A-Za-z0-9_-]{12,80}$/.test(requestId)) {
      return sendJson(res, 400, { success: false, code: "INVALID_REQUEST_ID", message: "The complaint request could not be verified. Please try again." });
    }

    const userMobile = normalizeMobile(user.mobile);
    const existing = await findExistingComplaint(requestId, user.id, userMobile);
    if (existing) return sendJson(res, 200, duplicatePayload(existing));

    const wardCode = isSuperAdmin ? normalizeWardCode(req.body?.ward_code || req.body?.ward) : normalizeWardCode(user.ward_code || user.ward);
    if (!wardCode) return sendJson(res, 400, { success: false, code: "WARD_REQUIRED", message: "Select a valid ward from Ward 1 to Ward 29." });
    const coordinates = validateCoordinates(req.body?.latitude, req.body?.longitude, req.body?.location_accuracy);
    if (!coordinates.valid) return sendJson(res, 400, { success: false, code: "INVALID_LOCATION", message: coordinates.message });

    savedFile = await writePhoto(req.file, req);
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
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          complaintId, requestId, title, description, category, savedFile.url, location,
          coordinates.latitude, coordinates.longitude, coordinates.accuracy,
          `Ward ${wardCode}`, wardCode, assignedOfficerId,
          user.id, user.name, userMobile, user.address || null, user.age || null,
          user.email || null, user.dob || null, user.profile_photo || null,
        ],
      );
      await connection.query(
        `INSERT INTO complaint_status_updates (complaint_id, status, note, updated_by)
         VALUES (?, 'submitted', 'Complaint submitted with image', ?)`,
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

    if (duplicateAfterRace) {
      if (savedFile?.filePath) await fs.promises.unlink(savedFile.filePath).catch(() => undefined);
      savedFile = null;
      return sendJson(res, 200, duplicatePayload(duplicateAfterRace));
    }

    return sendJson(res, 201, {
      success: true,
      complaintId,
      photo_url: savedFile.url,
      ward_code: wardCode,
      assigned_officer_id: assignedOfficerId,
    });
  } catch (error) {
    if (savedFile?.filePath) await fs.promises.unlink(savedFile.filePath).catch(() => undefined);
    const status = Number(error?.status || 500);
    console.warn("[ComplaintUploadPatch] upload failed", error?.code || error?.name || "upload_error");
    return sendJson(res, status, {
      success: false,
      code: status === 413 ? "IMAGE_TOO_LARGE" : status === 415 ? "UNSUPPORTED_IMAGE" : "COMPLAINT_UPLOAD_FAILED",
      message: status >= 500 ? "The complaint image could not be uploaded right now. Please try again." : error.message || "The selected image could not be uploaded.",
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
  console.warn("[ComplaintUploadPatch] database hook disabled", error.message);
}

try {
  const express = require("express");
  const originalPost = express.application.post;
  function install(app) {
    if (installed) return;
    installed = true;
    originalPost.call(app, "/api/complaints", (req, res, next) => {
      if (!req.is("multipart/form-data")) return next();
      return createMultipartComplaint(req, res);
    });
    console.log("[ComplaintUploadPatch] authenticated multipart complaint upload active");
  }
  express.application.post = function patchedPost(routePath, ...handlers) {
    install(this);
    return originalPost.call(this, routePath, ...handlers);
  };
} catch (error) {
  console.warn("[ComplaintUploadPatch] route hook disabled", error.message);
}

module.exports = {
  createMultipartComplaint,
  isAllowedComplaintCategory,
  normalizeWardCode,
  uploadFileFilter,
};
