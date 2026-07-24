require("dotenv").config();
require("./productionBootstrap");

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {
  signToken: signSecureToken,
  verifyOtpProof,
  verifyRequestToken,
} = require("./authSecurity");
const { sendOtp: createOtpSession, verifyOtp: verifyOtpSession } = require("./otpService");
const { saveDataUri } = require("./mediaStorage");
const { installHttpSafety, installSafeErrorHandler, safeNotFoundPayload } = require("./httpSafety");
const { isIsoDate, validateCoordinates } = require("./validation");
const { redactApplicationContact, redactJobContact } = require("./jobPortalPrivacy");
const {
  VALID_STATUSES,
  ensureRoleAuthorizationSchema,
  getMigrationSummary,
  isPrivilegedRoleActive,
  mapRoleAssignment,
  privilegedRestrictionReason,
  recordRoleAudit,
  resolveActiveAssignment,
  safeAssignmentUserId,
  wardNumberFromDesignation,
} = require("./roleAuthorization");

const app = express();
installHttpSafety(app);

const SERVER_VERSION = "backend-server-production-ready-v4";
console.log(`[Connect-T] Running ${SERVER_VERSION} from ${__filename}`);

const allowedOrigins = String(process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || !allowedOrigins.length || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  allowedHeaders: ["Content-Type", "Authorization", "X-OTP-Verification", "X-Request-Id", "X-Admin-Key"],
  exposedHeaders: ["X-Request-Id"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
}));
app.use(express.json({ limit: "15mb" }));

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOAD_DIR));

const db = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const createId = (prefix) =>
  `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;

function b64url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlJson(obj) {
  return b64url(JSON.stringify(obj));
}

function signToken(payload) {
  return signSecureToken(payload);
}

function verifyToken(req) {
  return verifyRequestToken(req);
}

function issueUserToken(user) {
  return signToken({
    sub: user.id,
    mobile: user.mobile,
    role: user.role,
    scope: user.scope || "civic",
    isSuperAdmin: !!(user.isSuperAdmin || user.is_super_admin),
  });
}

async function requireSuperAdmin(req, res, next) {
  try {
    const auth = verifyToken(req);
    const user = await currentCivicUser(auth);
    if (!auth || !user || (user.role !== "super_admin" && !user.is_super_admin)) {
      return res.status(401).json({ success: false, error: "Super Admin token required" });
    }

    req.auth = auth;
    req.civicUser = user;
    return next();
  } catch (err) {
    console.error("[Connect-T] Admin authorization failed:", err);
    return res.status(500).json({ success: false, message: "Admin access could not be verified right now." });
  }
}

function replaceRequestQuery(req, updates, remove = []) {
  const nextQuery = { ...(req.query || {}) };
  for (const key of remove) delete nextQuery[key];
  Object.assign(nextQuery, updates || {});
  Object.defineProperty(req, "query", {
    configurable: true,
    enumerable: true,
    value: nextQuery,
  });
}

async function currentCivicUser(auth) {
  if (!auth?.sub) return null;
  const [rows] = await db.query(
    `SELECT id, name, mobile, role, ward, ward_code, ward_number, official_designation,
            is_super_admin, approval_status, address, age, dob, email, avatar_color,
            profile_photo, nagarsevak_id, last_login_at, created_at
     FROM users WHERE id = ? LIMIT 1`,
    [auth.sub],
  );
  const user = rows[0] || null;
  if (!user) return null;
  if (["super_admin", "nagarsevak"].includes(user.role)) {
    await ensureRoleAuthorizationSchema(db);
    const roleIsActive = await isPrivilegedRoleActive(db, {
      mobile: user.mobile,
      role: user.role,
      userId: user.id,
    });
    if (!roleIsActive) return null;
  }
  return user;
}

async function requireCommunityUser(req, res) {
  const auth = verifyToken(req);
  if (!auth || auth.scope === "job_portal") {
    res.status(401).json({ success: false, error: "Login required" });
    return null;
  }

  const user = await currentCivicUser(auth);
  if (!user) {
    res.status(401).json({ success: false, error: "User session is no longer valid" });
    return null;
  }

  req.auth = auth;
  req.civicUser = user;
  return user;
}

function isSuperAdminAuth(auth) {
  return !!auth && (auth.role === "super_admin" || auth.isSuperAdmin === true);
}

async function adminAccessAllowed(req) {
  const tokenUser = await currentCivicUser(verifyToken(req));
  if (tokenUser && (tokenUser.role === "super_admin" || !!tokenUser.is_super_admin)) return true;
  const configured = String(process.env.ADMIN_API_KEY || "");
  const provided = String(req.headers["x-admin-key"] || "");
  const left = Buffer.from(configured);
  const right = Buffer.from(provided);
  return !!configured && left.length === right.length && crypto.timingSafeEqual(left, right);
}

async function authorizeComplaints(req, res, next) {
  try {
    const auth = verifyToken(req);
    if (!auth || auth.scope === "job_portal") {
      return res.status(401).json({ success: false, error: "Login required" });
    }

    const user = await currentCivicUser(auth);
    if (!user) return res.status(401).json({ success: false, error: "User session is no longer valid" });

    const isSuperAdmin = user.role === "super_admin" || !!user.is_super_admin;
    const isOfficer = user.role === "nagarsevak" && user.approval_status === "approved";
    const method = req.method.toUpperCase();
    const complaintId = String(req.params?.id || req.path.split("/").filter(Boolean)[0] || "");

    if (method === "GET" && req.path === "/") {
      if (isSuperAdmin) return next();
      if (isOfficer) {
        replaceRequestQuery(
          req,
          user.ward_code ? { ward_code: user.ward_code } : { ward: user.ward },
          ["user_id", "user_mobile", "assigned_officer_id", "ward", "ward_code"],
        );
        return next();
      }

      replaceRequestQuery(
        req,
        { user_mobile: String(user.mobile || "").replace(/\D/g, "").slice(-10) },
        ["user_id", "ward", "ward_code", "assigned_officer_id"],
      );
      return next();
    }

    if (method === "POST" && req.path === "/") {
      // Multipart complaints parse their body in the dedicated upload route,
      // which performs the same server-side identity and role derivation.
      if (req.is("multipart/form-data")) return next();
      if (user.role !== "citizen" && !isOfficer && !isSuperAdmin) {
        return res.status(403).json({ success: false, error: "Citizen or officer account required" });
      }
      if (!isSuperAdmin) {
        req.body.user_id = user.id;
        req.body.user_name = user.name;
        req.body.user_mobile = String(user.mobile || "").replace(/\D/g, "").slice(-10);
        req.body.user_address = user.address || null;
        req.body.user_age = user.age || null;
        req.body.user_email = user.email || null;
        req.body.user_dob = user.dob || null;
        req.body.user_profile_photo = user.profile_photo || null;
        req.body.ward = user.ward || req.body.ward;
        req.body.ward_code = user.ward_code || req.body.ward_code;
        delete req.body.assigned_officer_id;
      }
      return next();
    }

    if (!complaintId) return res.status(400).json({ success: false, error: "Complaint id is required" });
    const [rows] = await db.query(
      "SELECT user_id, user_mobile, ward, ward_code FROM complaints WHERE id = ? LIMIT 1",
      [complaintId],
    );
    if (!rows.length) return res.status(404).json({ success: false, error: "Complaint not found" });
    const complaint = rows[0];

    if (isSuperAdmin) return next();
    if (isOfficer) {
      const sameWard = user.ward_code
        ? String(complaint.ward_code || "").toLowerCase() === String(user.ward_code).toLowerCase()
        : String(complaint.ward || "").toLowerCase() === String(user.ward || "").toLowerCase();
      if (!sameWard) return res.status(403).json({ success: false, error: "Complaint belongs to another ward" });
      if (method === "PATCH") {
        const validStatuses = ["assigned", "in_progress", "resolved", "rejected"];
        if (!validStatuses.includes(String(req.body?.status || ""))) {
          return res.status(400).json({ success: false, error: "Invalid complaint status" });
        }
        req.body.updated_by = user.name;
      }
      return next();
    }

    const ownComplaint =
      String(complaint.user_id || "") === String(user.id) ||
      String(complaint.user_mobile || "").replace(/\D/g, "").slice(-10) ===
        String(user.mobile || "").replace(/\D/g, "").slice(-10);
    if (!ownComplaint || method !== "GET") {
      return res.status(403).json({ success: false, error: "You cannot access this complaint" });
    }
    return next();
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || "Complaint authorization failed" });
  }
}

async function authorizeJobPortal(req, res, next) {
  try {
    const method = req.method.toUpperCase();
    const pathName = req.path;
    const auth = verifyToken(req);

    if (method === "GET" && pathName === "/jobs") {
      if (auth?.scope === "job_portal" && auth.sub) {
        const [jobUsers] = await db.query(
          "SELECT role FROM job_portal_users WHERE id = ? LIMIT 1",
          [auth.sub],
        );
        if (jobUsers.length && jobUsers[0].role === auth.role) {
          req.jobPortalViewer = { sub: String(auth.sub), role: auth.role };
          if (auth.role === "seeker") replaceRequestQuery(req, { viewerId: auth.sub });
          else replaceRequestQuery(req, {}, ["viewerId"]);
        } else {
          replaceRequestQuery(req, {}, ["viewerId"]);
        }
      } else {
        replaceRequestQuery(req, {}, ["viewerId"]);
        const civicUser = await currentCivicUser(auth);
        if (civicUser && (civicUser.role === "super_admin" || !!civicUser.is_super_admin)) {
          req.jobPortalViewer = { sub: String(civicUser.id), role: "super_admin" };
        }
      }
      return next();
    }

    if (
      (method === "GET" && ["/health", "/patch-health"].includes(pathName)) ||
      (method === "POST" && ["/register", "/login", "/session"].includes(pathName))
    ) {
      if (pathName !== "/session") return next();
      const civicUser = await currentCivicUser(auth);
      if (auth?.scope !== "job_portal" && civicUser?.role === "citizen") return next();
      return res.status(401).json({ success: false, error: "Citizen login required" });
    }

    let isSuperAdmin = isSuperAdminAuth(auth);
    if (isSuperAdmin) {
      const civicUser = await currentCivicUser(auth);
      isSuperAdmin = !!civicUser && (civicUser.role === "super_admin" || !!civicUser.is_super_admin);
    }
    let isJobUser = auth?.scope === "job_portal" && ["seeker", "employer"].includes(auth.role);
    if (isJobUser) {
      const [jobUsers] = await db.query(
        "SELECT role FROM job_portal_users WHERE id = ? LIMIT 1",
        [auth.sub],
      );
      isJobUser = !!jobUsers.length && jobUsers[0].role === auth.role;
    }
    if (!isSuperAdmin && !isJobUser) {
      return res.status(401).json({ success: false, error: "Job Portal login required" });
    }
    req.jobPortalViewer = {
      sub: String(auth.sub),
      role: isSuperAdmin ? "super_admin" : auth.role,
    };

    if (pathName === "/admin/analytics") {
      return isSuperAdmin ? next() : res.status(403).json({ success: false, error: "Super admin required" });
    }

    const userMatch = pathName.match(/^\/users\/([^/]+)$/);
    const resumeMatch = pathName.match(/^\/resume\/([^/]+)$/);
    const notificationMatch = pathName.match(/^\/notifications\/([^/]+)$/);
    const protectedUserId = userMatch?.[1] || resumeMatch?.[1] || notificationMatch?.[1];
    if (protectedUserId && !isSuperAdmin && protectedUserId !== String(auth.sub)) {
      return res.status(403).json({ success: false, error: "You cannot access another Job Portal account" });
    }

    if (method === "POST" && pathName === "/jobs") {
      if (!isSuperAdmin && (auth.role !== "employer" || String(req.body?.employerId || req.body?.employer_id) !== String(auth.sub))) {
        return res.status(403).json({ success: false, error: "Only the logged-in employer can post this job" });
      }
      return next();
    }

    const jobMutation = pathName.match(/^\/jobs\/([^/]+)$/);
    if (jobMutation && ["PATCH", "DELETE"].includes(method) && !isSuperAdmin) {
      if (auth.role !== "employer") return res.status(403).json({ success: false, error: "Employer account required" });
      const [rows] = await db.query("SELECT employer_id FROM job_portal_jobs WHERE id = ? LIMIT 1", [jobMutation[1]]);
      if (!rows.length) return res.status(404).json({ success: false, error: "Job not found" });
      if (String(rows[0].employer_id) !== String(auth.sub)) {
        return res.status(403).json({ success: false, error: "You cannot modify another employer's job" });
      }
      return next();
    }

    const applyMatch = pathName.match(/^\/jobs\/([^/]+)\/apply$/);
    if (applyMatch && method === "POST" && !isSuperAdmin) {
      if (auth.role !== "seeker" || String(req.body?.seekerId || req.body?.seeker_id) !== String(auth.sub)) {
        return res.status(403).json({ success: false, error: "Only the logged-in seeker can apply" });
      }
      return next();
    }

    if (pathName === "/applications" && method === "GET" && !isSuperAdmin) {
      if (auth.role === "seeker") {
        replaceRequestQuery(req, { seekerId: auth.sub }, ["employerId", "jobId"]);
      } else {
        replaceRequestQuery(req, { employerId: auth.sub }, ["seekerId", "jobId"]);
      }
      return next();
    }

    const statusMatch = pathName.match(/^\/applications\/([^/]+)\/status$/);
    if (statusMatch && method === "PATCH" && !isSuperAdmin) {
      if (auth.role !== "employer") return res.status(403).json({ success: false, error: "Employer account required" });
      const [rows] = await db.query(
        `SELECT j.employer_id FROM job_portal_applications a
         JOIN job_portal_jobs j ON j.id = a.job_id WHERE a.id = ? LIMIT 1`,
        [statusMatch[1]],
      );
      if (!rows.length) return res.status(404).json({ success: false, error: "Application not found" });
      if (String(rows[0].employer_id) !== String(auth.sub)) {
        return res.status(403).json({ success: false, error: "You cannot update this application" });
      }
      return next();
    }

    if (pathName === "/messages" && method === "GET" && !isSuperAdmin) {
      if (String(req.query?.userId || "") !== String(auth.sub)) {
        return res.status(403).json({ success: false, error: "You cannot read another user's messages" });
      }
      return next();
    }

    if (pathName === "/messages" && method === "POST" && !isSuperAdmin) {
      if (String(req.body?.senderId || req.body?.sender_id || "") !== String(auth.sub)) {
        return res.status(403).json({ success: false, error: "Message sender does not match the logged-in user" });
      }

      const jobId = String(req.body?.jobId || req.body?.job_id || "").trim();
      const receiverId = String(req.body?.receiverId || req.body?.receiver_id || "").trim();
      if (!jobId || !receiverId) {
        return res.status(400).json({ success: false, error: "jobId and receiverId are required" });
      }
      const [pairs] = await db.query(
        `SELECT j.employer_id, a.seeker_id
         FROM job_portal_jobs j
         LEFT JOIN job_portal_applications a
           ON a.job_id = j.id AND a.seeker_id = ?
         WHERE j.id = ?
         LIMIT 1`,
        [auth.role === "employer" ? receiverId : auth.sub, jobId],
      );
      const pair = pairs[0];
      const isJobPair = pair && (
        (auth.role === "seeker" && String(pair.employer_id) === receiverId) ||
        (auth.role === "employer" && String(pair.employer_id) === String(auth.sub) && String(pair.seeker_id) === receiverId)
      );
      if (!isJobPair) {
        return res.status(403).json({ success: false, error: "Messages are limited to a job's employer and applicant" });
      }
      return next();
    }

    const messageDelete = pathName.match(/^\/messages\/([^/]+)$/);
    if (messageDelete && method === "DELETE" && !isSuperAdmin) {
      if (String(req.query?.userId || req.body?.userId || "") !== String(auth.sub)) {
        return res.status(403).json({ success: false, error: "You cannot delete another user's message" });
      }
      return next();
    }

    return next();
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || "Job Portal authorization failed" });
  }
}

async function authorizeAlerts(req, res, next) {
  try {
    if (req.method === "GET") return next();

    const user = await requireCommunityUser(req, res);
    if (!user) return;
    const isSuperAdmin = user.role === "super_admin" || !!user.is_super_admin;
    const isOfficer = user.role === "nagarsevak" && user.approval_status === "approved";
    if (!isSuperAdmin && !isOfficer) {
      return res.status(403).json({ success: false, error: "Approved officer or Super Admin required" });
    }

    if (req.method === "POST") {
      req.body.posted_by = user.name;
      req.body.posted_by_id = user.id;
      if (!isSuperAdmin) req.body.ward = user.ward;
      return next();
    }

    if (req.method === "DELETE") {
      const alertId = req.path.split("/").filter(Boolean)[0];
      const [rows] = await db.query("SELECT posted_by_id, ward FROM alerts WHERE id = ? LIMIT 1", [alertId]);
      if (!rows.length) return res.status(404).json({ success: false, error: "Alert not found" });
      const ownsAlert = String(rows[0].posted_by_id || "") === String(user.id);
      const sameWard = String(rows[0].ward || "").toLowerCase() === String(user.ward || "").toLowerCase();
      if (!isSuperAdmin && !ownsAlert && !sameWard) {
        return res.status(403).json({ success: false, error: "You cannot remove another ward's alert" });
      }
    }

    return next();
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || "Alert authorization failed" });
  }
}

async function authorizeCommunity(req, res, next) {
  try {
    const user = await requireCommunityUser(req, res);
    if (!user) return;
    const isSuperAdmin = user.role === "super_admin" || !!user.is_super_admin;
    const method = req.method.toUpperCase();
    const pathName = req.path;

    if (req.baseUrl === "/api/feed") {
      if (method === "POST" && pathName === "/posts") {
        req.body.author_id = user.id;
        req.body.author_name = user.name;
        req.body.author_role = user.role;
        req.body.avatar_color = user.avatar_color;
        req.body.pinned = isSuperAdmin && !!req.body.pinned;
      }

      if (/^\/posts\/[^/]+\/like$/.test(pathName)) {
        if (method === "POST") req.body.user_id = user.id;
        if (method === "DELETE") replaceRequestQuery(req, { user_id: user.id });
      }

      if (method === "DELETE" && /^\/posts\/[^/]+$/.test(pathName)) {
        const postId = pathName.split("/")[2];
        const [rows] = await db.query("SELECT author_id FROM feed_posts WHERE id = ? LIMIT 1", [postId]);
        if (!rows.length) return res.status(404).json({ success: false, error: "Post not found" });
        if (!isSuperAdmin && String(rows[0].author_id) !== String(user.id)) {
          return res.status(403).json({ success: false, error: "You cannot delete another user's post" });
        }
      }

      if (pathName === "/subscriptions") {
        if (method === "GET") replaceRequestQuery(req, { user_id: user.id });
        if (method === "POST") req.body.subscriber_id = user.id;
      }

      if (pathName === "/blocks") {
        if (method === "GET") replaceRequestQuery(req, { user_id: user.id });
        if (method === "POST") {
          req.body.user_id = user.id;
          req.body.blocked_until = Math.min(
            Number(req.body.blocked_until || 0),
            Date.now() + 24 * 60 * 60 * 1000,
          );
        }
      }
    }

    if (req.baseUrl === "/api/chat") {
      if (method === "POST" && pathName === "/messages") {
        req.body.author_id = user.id;
        req.body.author_name = user.name;
        req.body.author_role = user.role;
        req.body.avatar_color = user.avatar_color;
      }

      if (["PATCH", "DELETE"].includes(method) && /^\/messages\/[^/]+$/.test(pathName)) {
        const messageId = pathName.split("/")[2];
        const [rows] = await db.query("SELECT author_id FROM chat_messages WHERE id = ? LIMIT 1", [messageId]);
        if (!rows.length) return res.status(404).json({ success: false, error: "Message not found" });
        if (!isSuperAdmin && String(rows[0].author_id) !== String(user.id)) {
          return res.status(403).json({ success: false, error: "You cannot modify another user's message" });
        }
      }
    }

    return next();
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || "Community authorization failed" });
  }
}

app.use("/api/super-admin", requireSuperAdmin);
app.use("/api/auth/officers", requireSuperAdmin);
app.use("/api/complaints", authorizeComplaints);
app.use("/api/job-portal", authorizeJobPortal);
app.use("/api/alerts", authorizeAlerts);
app.use("/api/feed", authorizeCommunity);
app.use("/api/chat", authorizeCommunity);

function publicBaseUrl(req) {
  return String(process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
}

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function saveDataUriToUploads(value, prefix, req, options) {
  return saveDataUri(value, prefix, req, options);
}

async function columnExists(tableName, columnName) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND column_name = ?`,
    [tableName, columnName],
  );

  return Number(rows?.[0]?.count || 0) > 0;
}

async function ensureColumn(tableName, columnName, ddl) {
  if (!(await columnExists(tableName, columnName))) {
    await db.query(`ALTER TABLE ${tableName} ADD COLUMN ${ddl}`);
  }
}

async function indexExists(tableName, indexName) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.statistics
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND index_name = ?`,
    [tableName, indexName],
  );
  return Number(rows?.[0]?.count || 0) > 0;
}

async function ensureIndex(tableName, indexName, ddl) {
  if (!(await indexExists(tableName, indexName))) {
    await db.query(`ALTER TABLE ${tableName} ADD ${ddl}`);
  }
}

async function ensureProductionMySQLSchema() {
  try {
    await ensureColumn("users", "dob", "dob VARCHAR(40) NULL AFTER age");
    await ensureColumn("users", "approval_status", "approval_status VARCHAR(40) DEFAULT 'approved' AFTER profile_photo");
    await ensureColumn("users", "office_address", "office_address TEXT NULL AFTER address");
    await ensureColumn("users", "residence_address", "residence_address TEXT NULL AFTER office_address");
    await ensureColumn("users", "office_timings", "office_timings VARCHAR(190) NULL AFTER residence_address");
    await ensureColumn("users", "contact_name", "contact_name VARCHAR(150) NULL AFTER office_timings");
    await ensureColumn("users", "contact_number", "contact_number VARCHAR(20) NULL AFTER contact_name");
    await ensureColumn("users", "ward_changed", "ward_changed TINYINT(1) NOT NULL DEFAULT 0 AFTER ward_number");
    await ensureColumn("complaints", "user_dob", "user_dob VARCHAR(40) NULL AFTER user_email");
    await ensureColumn("complaints", "user_profile_photo", "user_profile_photo LONGTEXT NULL AFTER user_dob");
    await ensureColumn("complaints", "latitude", "latitude DECIMAL(10,7) NULL AFTER location");
    await ensureColumn("complaints", "longitude", "longitude DECIMAL(10,7) NULL AFTER latitude");
    await ensureColumn("complaints", "location_accuracy", "location_accuracy DECIMAL(10,2) NULL AFTER longitude");

    await ensureIndex("users", "idx_users_mobile", "INDEX idx_users_mobile (mobile)");
    await ensureIndex("users", "idx_users_ward_code", "INDEX idx_users_ward_code (ward_code)");
    await ensureIndex("complaints", "idx_complaints_user_mobile", "INDEX idx_complaints_user_mobile (user_mobile)");
    await ensureIndex("complaints", "idx_complaints_ward_code", "INDEX idx_complaints_ward_code (ward_code)");
    await ensureIndex("complaints", "idx_complaints_status", "INDEX idx_complaints_status (status)");
    await ensureIndex("complaints", "idx_complaints_category", "INDEX idx_complaints_category (category)");

    // Consolidate legacy A/B sub-wards into the single ward model used by the app.
    await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      migration_key VARCHAR(120) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    const wardMigrationKey = "normalize_single_wards_v2";
    const [appliedWardMigration] = await db.query(
      "SELECT migration_key FROM schema_migrations WHERE migration_key = ? LIMIT 1",
      [wardMigrationKey],
    );
    if (!appliedWardMigration.length) {
      const [legacyUsers] = await db.query("SELECT id, ward, ward_code FROM users WHERE ward IS NOT NULL OR ward_code IS NOT NULL");
      for (const row of legacyUsers) {
        const wardCode = normalizeWardCode(row.ward_code || row.ward);
        if (wardCode && (String(row.ward_code || "") !== wardCode || String(row.ward || "") !== `Ward ${wardCode}`)) {
          await db.query("UPDATE users SET ward = ?, ward_code = ?, ward_number = ? WHERE id = ?", [`Ward ${wardCode}`, wardCode, wardCode, row.id]);
        }
      }
      const [legacyComplaints] = await db.query("SELECT id, ward, ward_code FROM complaints WHERE ward IS NOT NULL OR ward_code IS NOT NULL");
      for (const row of legacyComplaints) {
        const wardCode = normalizeWardCode(row.ward_code || row.ward);
        if (wardCode && (String(row.ward_code || "") !== wardCode || String(row.ward || "") !== `Ward ${wardCode}`)) {
          await db.query("UPDATE complaints SET ward = ?, ward_code = ? WHERE id = ?", [`Ward ${wardCode}`, wardCode, row.id]);
        }
      }
      await db.query("INSERT INTO schema_migrations (migration_key) VALUES (?)", [wardMigrationKey]);
    }


    await db.query(`
      CREATE TABLE IF NOT EXISTS service_places (
        id VARCHAR(80) NOT NULL PRIMARY KEY,
        category_id VARCHAR(80) NOT NULL,
        name VARCHAR(190) NOT NULL,
        address TEXT NOT NULL,
        distance VARCHAR(80) NULL,
        distance_km DECIMAL(8,2) NULL,
        type VARCHAR(120) NULL,
        speciality VARCHAR(190) NULL,
        timing VARCHAR(190) NULL,
        govt_type VARCHAR(120) NULL,
        established VARCHAR(80) NULL,
        beds INT NULL,
        beds_occupied INT NULL,
        services_json LONGTEXT NULL,
        rating DECIMAL(3,2) NULL,
        review_count INT NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_service_category_id (category_id),
        KEY idx_service_active (is_active),
        KEY idx_service_rating (rating),
        KEY idx_service_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await ensureColumn("service_places", "is_active", "is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER review_count");

    await db.query(`
      CREATE TABLE IF NOT EXISTS emergency_contacts (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(160) NOT NULL,
        phone VARCHAR(40) NULL,
        type VARCHAR(80) NULL,
        address TEXT NULL,
        available VARCHAR(80) NULL,
        priority INT NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_emergency_name (name),
        KEY idx_emergency_type (type),
        KEY idx_emergency_active (is_active),
        KEY idx_emergency_priority (priority)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await ensureColumn("emergency_contacts", "priority", "priority INT NOT NULL DEFAULT 0 AFTER available");
    await ensureColumn("emergency_contacts", "is_active", "is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER priority");

    await db.query(`
      CREATE TABLE IF NOT EXISTS feed_subscriptions (
        id BIGINT NOT NULL AUTO_INCREMENT,
        subscriber_id VARCHAR(80) NOT NULL,
        target_user_id VARCHAR(80) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_feed_subscription (subscriber_id, target_user_id),
        KEY idx_feed_subscriber (subscriber_id),
        KEY idx_feed_target (target_user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS feed_user_blocks (
        id BIGINT NOT NULL AUTO_INCREMENT,
        user_id VARCHAR(80) NOT NULL,
        blocked_user_id VARCHAR(80) NOT NULL,
        blocked_until BIGINT NOT NULL,
        reason VARCHAR(190) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_feed_block (user_id, blocked_user_id),
        KEY idx_feed_block_user (user_id),
        KEY idx_feed_block_until (blocked_until)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (err) {
    console.error("[Connect-T] Production schema upgrade warning:", err.message);
  }
}

ensureProductionMySQLSchema();
ensureRoleAuthorizationSchema(db)
  .then((summary) => console.log("[Connect-T] Unified role authorization ready", summary))
  .catch((error) => console.error("[Connect-T] Role authorization migration warning:", error.message));


function normalizeWardCode(value) {
  if (!value) return null;

  const match = String(value)
    .trim()
    .toUpperCase()
    .match(/(\d{1,2})/);

  if (!match) return null;
  const wardNumber = Number(match[1]);
  return wardNumber >= 1 && wardNumber <= 29 ? `${wardNumber}` : null;
}

async function getOfficerIdByWardCode(wardCode) {
  const normalizedWardCode = normalizeWardCode(wardCode);

  if (!normalizedWardCode) return null;
  const [rows] = await db.query(
    `SELECT id FROM users
     WHERE role = 'nagarsevak'
       AND approval_status = 'approved'
       AND (ward_code = ? OR ward = ?)
     ORDER BY created_at ASC
     LIMIT 1`,
    [normalizedWardCode, `Ward ${normalizedWardCode}`],
  );
  return rows[0]?.id || null;
}

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Connect-T Hostinger backend running",
  });
});

app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS connected");
    res.json({ success: true, backend: "hostinger", mysql: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Liveness endpoint used by the checked-in OpenAPI client. Database readiness
// remains available at /api/health.
app.get("/api/healthz", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/server-info", (req, res) => {
  res.json({
    success: true,
    serverVersion: SERVER_VERSION,
    serverFile: "backend/server.js",
    runtimeFile: path.basename(__filename),
    features: {
      safeErrors: true,
      unifiedRoleLogin: true,
      jobPortalSession: true,
      utilityStatus: true,
      seekerMessageLimit: true,
    },
  });
});

/* USERS */
app.get("/api/users", async (req, res) => {
  try {
    if (!(await adminAccessAllowed(req))) {
      return res.status(403).json({
        success: false,
        error: "Admin API key required",
      });
    }

    const [rows] = await db.query(
      `SELECT id, name, mobile, role, ward, ward_code, ward_number, ward_changed,
              is_super_admin, age, dob, email, address, nagarsevak_id,
              avatar_color, profile_photo, notify_email, notify_whatsapp,
              approval_status, office_address, residence_address,
              office_timings, contact_name, contact_number,
              created_at, updated_at
       FROM users
       ORDER BY created_at DESC`,
    );

    res.json({ success: true, users: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function mapUnifiedUser(row) {
  return {
    id: String(row.id),
    name: row.name,
    mobile: normalizeMobile(row.mobile),
    role: row.role,
    ward: row.ward || null,
    wardCode: row.ward_code || null,
    wardNumber: row.ward_number || null,
    officialDesignation: row.official_designation || null,
    isSuperAdmin: row.role === "super_admin" || !!row.is_super_admin,
    approvalStatus: row.approval_status || "approved",
    dob: row.dob || null,
    email: row.email || null,
    address: row.address || null,
    nagarsevakId: row.nagarsevak_id || null,
    avatarColor: row.avatar_color || "#16A34A",
    profilePhoto: row.profile_photo || null,
    lastLoginAt: row.last_login_at || null,
    createdAt: row.created_at || null,
  };
}

function normalizedMobileLookupSql(column) {
  return `RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${column}, ''), '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', ''), 10)`;
}

async function ensureRegisteredCitizenAssignment(mobile) {
  const [existingRows] = await db.query(
    `SELECT * FROM users WHERE ${normalizedMobileLookupSql("mobile")} = ? AND role = 'citizen' ORDER BY created_at ASC LIMIT 1`,
    [mobile],
  );
  const existing = existingRows[0] || null;
  if (!existing) return false;

  await db.query(
    `INSERT INTO role_assignments
     (user_id, normalized_phone, role, display_name, ward_or_designation, status, source)
     VALUES (?, ?, 'citizen', ?, ?, 'active', 'unified_login')
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), display_name = VALUES(display_name),
       ward_or_designation = VALUES(ward_or_designation), status = 'active'`,
    [existing.id, mobile, existing.name, existing.ward || null],
  );
  return true;
}

async function getOrCreateAssignmentUser(assignment) {
  const [existingRows] = await db.query(
    `SELECT * FROM users
     WHERE (id = ? AND ? IS NOT NULL) OR (${normalizedMobileLookupSql("mobile")} = ? AND role = ?)
     ORDER BY (id = ?) DESC, created_at ASC LIMIT 1`,
    [assignment.userId, assignment.userId, assignment.mobile, assignment.role, assignment.userId || ""],
  );
  let user = existingRows[0] || null;
  const assignmentWardCode = wardNumberFromDesignation(assignment.wardOrDesignation);
  const assignmentWard = assignment.role === "super_admin"
    ? "All Wards"
    : assignmentWardCode
      ? `Ward ${assignmentWardCode}`
      : "Not assigned";

  if (user && assignment.role !== "citizen") {
    await db.query(
      `UPDATE users SET name = ?, role = ?, ward = ?, ward_code = ?, ward_number = ?,
       official_designation = ?, is_super_admin = ?, approval_status = 'approved',
       nagarsevak_id = COALESCE(nagarsevak_id, ?), contact_name = COALESCE(contact_name, ?),
       contact_number = COALESCE(contact_number, ?)
       WHERE id = ?`,
      [
        assignment.name,
        assignment.role,
        assignmentWard,
        assignmentWardCode,
        assignmentWardCode,
        assignment.wardOrDesignation,
        assignment.role === "super_admin" ? 1 : 0,
        assignment.role === "nagarsevak" ? `OFFICIAL_NS_${String(assignment.sourceSerial || assignment.id).padStart(3, "0")}` : user.id,
        assignment.name,
        assignment.mobile,
        user.id,
      ],
    );
  }

  if (!user) {
    const userId = safeAssignmentUserId(assignment.role, assignment.id, assignment.mobile);
    await db.query(
      `INSERT INTO users
       (id, name, mobile, role, ward, ward_code, ward_number, official_designation,
        is_super_admin, approval_status, nagarsevak_id, avatar_color, contact_name, contact_number,
        notify_email, notify_whatsapp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, ?, ?, 0, 0)`,
      [
        userId,
        assignment.name,
        assignment.mobile,
        assignment.role,
        assignmentWard,
        assignmentWardCode,
        assignmentWardCode,
        assignment.wardOrDesignation,
        assignment.role === "super_admin" ? 1 : 0,
        assignment.role === "nagarsevak" ? `OFFICIAL_NS_${String(assignment.sourceSerial || assignment.id).padStart(3, "0")}` : userId,
        assignment.role === "super_admin" ? "#16A34A" : "#059669",
        assignment.name,
        assignment.mobile,
      ],
    );
    user = { id: userId };
  }

  await db.query(
    "UPDATE role_assignments SET user_id = ?, last_login_at = NOW() WHERE id = ?",
    [user.id, assignment.id],
  );
  await db.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);
  const [freshRows] = await db.query("SELECT * FROM users WHERE id = ? LIMIT 1", [user.id]);
  return { profileRequired: false, user: freshRows[0] };
}

app.post("/api/auth/unified-login", async (req, res) => {
  try {
    await ensureRoleAuthorizationSchema(db);
    const mobile = normalizeMobile(req.body?.mobile || req.body?.phone);
    if (mobile.length !== 10) {
      return res.status(400).json({ success: false, code: "INVALID_MOBILE", message: "Enter a valid 10 digit mobile number." });
    }
    if (!verifyOtpProof(req, mobile, ["login"])) {
      return res.status(401).json({ success: false, code: "OTP_REQUIRED", message: "Verify the OTP to continue." });
    }

    let assignment = await resolveActiveAssignment(db, mobile);
    if (!assignment && await ensureRegisteredCitizenAssignment(mobile)) {
      assignment = await resolveActiveAssignment(db, mobile);
    }

    if (!assignment) {
      return res.status(404).json({
        success: false,
        code: "ACCOUNT_NOT_FOUND",
        message: "No account is registered with this mobile number. Please use Register first.",
      });
    }

    const result = await getOrCreateAssignmentUser(assignment);

    const user = mapUnifiedUser(result.user);
    return res.json({
      success: true,
      user,
      resolvedRole: user.role,
      dashboard: user.role === "super_admin" ? "/super-admin" : user.role === "nagarsevak" ? "/(tabs)/admin" : "/portal-select",
      token: issueUserToken(user),
    });
  } catch (error) {
    console.error("[Connect-T] Unified login failed:", error);
    return res.status(500).json({ success: false, message: "Login is temporarily unavailable. Please try again after some time." });
  }
});

app.get("/api/auth/session", async (req, res) => {
  try {
    await ensureRoleAuthorizationSchema(db);
    const auth = verifyToken(req);
    const user = await currentCivicUser(auth);
    if (!auth || !user) {
      return res.status(401).json({ success: false, code: "SESSION_INVALID", message: "Your session is no longer valid. Please log in again." });
    }
    return res.json({ success: true, user: mapUnifiedUser(user) });
  } catch (error) {
    console.error("[Connect-T] Session validation failed:", error);
    return res.status(500).json({ success: false, message: "Your session could not be checked right now." });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    await ensureRoleAuthorizationSchema(db);
    const requestedId = req.body.id || createId("user");

    const {
      name,
      mobile: rawMobile,
      role: requestedRole = "citizen",
      ward,
      ward_code,
      ward_number,
      ward_changed: requestedWardChanged = false,
      is_super_admin: requestedSuperAdmin = false,
      age,
      dob,
      email,
      address,
      nagarsevak_id,
      avatar_color,
      profile_photo,
      notify_email = false,
      notify_whatsapp = false,
      approval_status: requestedApprovalStatus,
      office_address,
      residence_address,
      office_timings,
      contact_name,
      contact_number,
    } = req.body;

    const mobile = String(rawMobile || "").replace(/\D/g, "").slice(-10);
    if (!name || mobile.length !== 10) {
      return res.status(400).json({
        success: false,
        error: "name and valid 10 digit mobile are required",
      });
    }
    if (String(name).trim().split(/\s+/).length < 2) {
      return res.status(400).json({ success: false, error: "Full name including surname is required" });
    }
    if (String(name).trim().length > 160) {
      return res.status(400).json({ success: false, error: "Name is too long" });
    }

    if (!['citizen', 'nagarsevak', 'super_admin'].includes(requestedRole)) {
      return res.status(400).json({ success: false, error: "Invalid user role" });
    }

    const auth = verifyToken(req);
    const authUser = await currentCivicUser(auth);
    const authIsSuperAdmin = !!authUser && (authUser.role === "super_admin" || !!authUser.is_super_admin);
    const [existingRows] = await db.query(
      `SELECT id, mobile, role, ward, ward_changed, is_super_admin, approval_status, profile_photo
       FROM users WHERE id = ? OR (mobile = ? AND role = ?)
       ORDER BY (id = ?) DESC LIMIT 1`,
      [requestedId, mobile, requestedRole, requestedId],
    );
    const existing = existingRows[0] || null;
    const ownsExisting = !!existing && String(auth?.sub || "") === String(existing.id);
    const hasOtpProof = !!verifyOtpProof(req, mobile, ["login", "register"]);
    const existingMobile = String(existing?.mobile || "").replace(/\D/g, "").slice(-10);

    if (!authIsSuperAdmin && !ownsExisting && !hasOtpProof) {
      return res.status(401).json({ success: false, error: "Verified OTP or an active user session is required" });
    }

    if (existing && !authIsSuperAdmin && existingMobile !== mobile) {
      return res.status(403).json({
        success: false,
        code: "MOBILE_CHANGE_REQUIRES_REVERIFICATION",
        message: "Mobile number cannot be changed from the normal profile form. A separate re-verification workflow is required.",
      });
    }

    if (!existing && !authIsSuperAdmin && requestedRole !== "citizen") {
      return res.status(403).json({ success: false, error: "Officer and Super Admin roles cannot be self-assigned" });
    }

    const wardIsChanging = !!existing?.ward && !!ward &&
      String(existing.ward).trim().toLowerCase() !== String(ward).trim().toLowerCase();
    if (!authIsSuperAdmin && wardIsChanging && !!existing?.ward_changed) {
      return res.status(403).json({ success: false, error: "Ward can only be changed once" });
    }

    const id = existing?.id || requestedId;
    const role = authIsSuperAdmin ? requestedRole : existing?.role || "citizen";
    const is_super_admin = authIsSuperAdmin
      ? !!requestedSuperAdmin
      : !!(existing?.is_super_admin || role === "super_admin");
    const approval_status = authIsSuperAdmin
      ? requestedApprovalStatus || existing?.approval_status || "approved"
      : existing?.approval_status || "approved";
    const ward_changed = authIsSuperAdmin
      ? !!requestedWardChanged
      : !!(existing?.ward_changed || wardIsChanging);
    const effectiveWardCode = role === "super_admin" ? null : normalizeWardCode(ward_code || ward);
    if (role !== "super_admin" && !effectiveWardCode) {
      return res.status(400).json({ success: false, error: "Select a valid ward from Ward 1 to Ward 29" });
    }
    const effectiveWard = role === "super_admin" ? "All Wards" : `Ward ${effectiveWardCode}`;

    if (dob && (!isIsoDate(dob) || new Date(`${dob}T00:00:00.000Z`).getTime() > Date.now())) {
      return res.status(400).json({ success: false, error: "Enter a valid date of birth" });
    }
    const normalizedContactNumber = contact_number
      ? String(contact_number).replace(/\D/g, "").slice(-10)
      : null;
    if (contact_number && normalizedContactNumber.length !== 10) {
      return res.status(400).json({ success: false, error: "Enter a valid 10 digit office contact number" });
    }

    const savedProfilePhoto = profile_photo === undefined
      ? existing?.profile_photo || null
      : await saveDataUriToUploads(profile_photo, "profile", req, { allowedMimeTypes: IMAGE_MIME_TYPES });

    await db.query(
      `INSERT INTO users
      (id, name, mobile, role, ward, ward_code, ward_number, ward_changed, is_super_admin, age, dob, email, address, nagarsevak_id, avatar_color, profile_photo, notify_email, notify_whatsapp, approval_status, office_address, residence_address, office_timings, contact_name, contact_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      role = VALUES(role),
      ward = VALUES(ward),
      ward_code = VALUES(ward_code),
      ward_number = VALUES(ward_number),
      ward_changed = VALUES(ward_changed),
      is_super_admin = VALUES(is_super_admin),
      age = VALUES(age),
      dob = VALUES(dob),
      email = VALUES(email),
      address = VALUES(address),
      nagarsevak_id = VALUES(nagarsevak_id),
      avatar_color = VALUES(avatar_color),
      profile_photo = VALUES(profile_photo),
      notify_email = VALUES(notify_email),
      notify_whatsapp = VALUES(notify_whatsapp),
      approval_status = COALESCE(VALUES(approval_status), approval_status),
      office_address = VALUES(office_address),
      residence_address = VALUES(residence_address),
      office_timings = VALUES(office_timings),
      contact_name = VALUES(contact_name),
      contact_number = VALUES(contact_number)`,
      [
        id,
        name,
        mobile,
        role,
        effectiveWard,
        effectiveWardCode,
        effectiveWardCode,
        ward_changed ? 1 : 0,
        is_super_admin ? 1 : 0,
        age || null,
        dob || null,
        email || null,
        address || null,
        nagarsevak_id || null,
        avatar_color || null,
        savedProfilePhoto || null,
        notify_email ? 1 : 0,
        notify_whatsapp ? 1 : 0,
        approval_status || null,
        office_address || null,
        residence_address || null,
        office_timings || null,
        contact_name || null,
        normalizedContactNumber,
      ],
    );

    if (role === "citizen") {
      await db.query(
        `INSERT INTO role_assignments
         (user_id, normalized_phone, role, display_name, ward_or_designation, status, source)
         VALUES (?, ?, 'citizen', ?, ?, 'active', 'citizen_registration')
         ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), display_name = VALUES(display_name),
           ward_or_designation = VALUES(ward_or_designation), status = 'active'`,
        [id, mobile, String(name).trim(), effectiveWard],
      );
    }

    res.status(201).json({
      success: true,
      userId: id,
      profilePhoto: savedProfilePhoto || null,
      wardChanged: ward_changed,
      token: issueUserToken({
        id,
        mobile,
        role,
        isSuperAdmin: !!is_super_admin,
      }),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/auth/user-by-mobile", async (req, res) => {
  try {
    const mobile = String(req.body.mobile || "").replace(/\D/g, "").slice(-10);
    const role = String(req.body.role || "").trim();

    if (mobile.length !== 10) {
      return res.status(400).json({
        success: false,
        error: "Valid 10 digit mobile number is required",
      });
    }

    if (!verifyOtpProof(req, mobile, ["login", "register"])) {
      return res.status(401).json({
        success: false,
        error: "Verified OTP is required to access this account",
      });
    }

    const params = [mobile];
    let sql = `
      SELECT id, name, mobile, role, ward, ward_code, ward_number, ward_changed,
             is_super_admin, age, dob, email, address, nagarsevak_id,
             avatar_color, profile_photo, notify_email, notify_whatsapp,
             approval_status, office_address, residence_address,
             office_timings, contact_name, contact_number,
             created_at, updated_at
      FROM users
      WHERE mobile = ?
    `;

    if (role) {
      sql += " AND role = ?";
      params.push(role);
    }

    sql += " ORDER BY FIELD(role, 'super_admin', 'nagarsevak', 'citizen'), created_at DESC LIMIT 1";

    const [rows] = await db.query(sql, params);

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        error: "Account not found",
      });
    }

    return res.json({
      success: true,
      user: rows[0],
      token: issueUserToken({
        id: rows[0].id,
        mobile: rows[0].mobile,
        role: rows[0].role,
        isSuperAdmin: rows[0].is_super_admin === 1 || rows[0].is_super_admin === true,
      }),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});


/* COMPLAINTS */
app.get("/api/complaints", async (req, res) => {
  try {
    const {
      ward,
      ward_code,
      assigned_officer_id,
      status,
      category,
      user_id,
      user_mobile,
    } = req.query;

    let sql = "SELECT * FROM complaints WHERE 1=1";
    const params = [];

    if (ward) {
      sql += " AND ward = ?";
      params.push(ward);
    }

    if (ward_code) {
      sql += " AND ward_code = ?";
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

    if (user_mobile) {
      sql += " AND user_mobile = ?";
      params.push(user_mobile);
    }

    sql += " ORDER BY created_at DESC";

    const [rows] = await db.query(sql, params);

    res.json({
      success: true,
      complaints: rows,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/complaints/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*,
              COALESCE(c.user_name, u.name) AS user_name,
              COALESCE(c.user_mobile, u.mobile) AS user_mobile,
              COALESCE(c.user_address, u.address) AS user_address,
              COALESCE(c.user_age, u.age) AS user_age,
              COALESCE(c.user_email, u.email) AS user_email,
              COALESCE(c.user_dob, u.dob) AS user_dob,
              COALESCE(c.user_profile_photo, u.profile_photo) AS user_profile_photo
       FROM complaints c
       LEFT JOIN users u ON u.id = c.user_id
       WHERE c.id = ?
       LIMIT 1`,
      [req.params.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Complaint not found",
      });
    }

    const [timeline] = await db.query(
      "SELECT * FROM complaint_status_updates WHERE complaint_id = ? ORDER BY created_at ASC",
      [req.params.id],
    );

    res.json({
      success: true,
      complaint: {
        ...rows[0],
        timeline,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/complaints", async (req, res) => {
  try {
    const id = req.body.id || createId("complaint");

    const {
      title,
      description,
      category = "other",
      photo_url,
      location,
      ward,
      ward_code,
      assigned_officer_id,
      user_id,
      user_name,
      user_mobile,
      user_address,
      user_age,
      user_email,
      user_dob,
      user_profile_photo,
      latitude,
      longitude,
      location_accuracy,
    } = req.body;

    const cleanTitle = String(title || "").trim();
    const cleanDescription = String(description || "").trim();
    const cleanLocation = String(location || "").trim();
    const cleanWard = String(ward || "").trim();
    const cleanCategory = String(category || "other").trim() || "other";

    if (!cleanTitle || !cleanDescription || !cleanLocation || !cleanWard) {
      return res.status(400).json({
        success: false,
        error: "title, description, location and ward are required",
      });
    }
    if (cleanTitle.length > 255 || cleanDescription.length > 10000 || cleanLocation.length > 2000) {
      return res.status(400).json({ success: false, error: "Complaint title or description is too long" });
    }
    if (cleanWard.length > 80 || cleanCategory.length > 80) {
      return res.status(400).json({ success: false, error: "Complaint ward or category is invalid" });
    }

    const coordinates = validateCoordinates(latitude, longitude, location_accuracy);
    if (!coordinates.valid) {
      return res.status(400).json({ success: false, error: coordinates.message });
    }

    const finalWardCode =
      normalizeWardCode(ward_code) || normalizeWardCode(cleanWard);
    if (!finalWardCode) {
      return res.status(400).json({ success: false, error: "Select a valid ward from Ward 1 to Ward 29" });
    }

    const finalAssignedOfficerId =
      assigned_officer_id || await getOfficerIdByWardCode(finalWardCode);

    const savedPhotoUrl = await saveDataUriToUploads(photo_url, "complaint", req, {
      allowedMimeTypes: IMAGE_MIME_TYPES,
    });

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        `INSERT INTO complaints
        (id, title, description, category, photo_url, location, latitude, longitude, location_accuracy, ward, ward_code, assigned_officer_id, user_id, user_name, user_mobile, user_address, user_age, user_email, user_dob, user_profile_photo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          cleanTitle,
          cleanDescription,
          cleanCategory,
          savedPhotoUrl || null,
          cleanLocation,
          coordinates.latitude,
          coordinates.longitude,
          coordinates.accuracy,
          cleanWard,
          finalWardCode || null,
          finalAssignedOfficerId || null,
          user_id || null,
          user_name || null,
          user_mobile || null,
          user_address || null,
          user_age || null,
          user_email || null,
          user_dob || null,
          user_profile_photo || null,
        ],
      );

      await connection.query(
        `INSERT INTO complaint_status_updates
        (complaint_id, status, note, updated_by)
        VALUES (?, 'submitted', 'Complaint submitted', ?)`,
        [id, user_name || "citizen"],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.status(201).json({
      success: true,
      complaintId: id,
      ward_code: finalWardCode || null,
      assigned_officer_id: finalAssignedOfficerId || null,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/complaints/:id/status", async (req, res) => {
  try {
    const { status, note, assigned_to, resolved_note, updated_by } = req.body;
    const validStatuses = ["assigned", "in_progress", "resolved", "rejected"];

    if (!validStatuses.includes(String(status || ""))) {
      return res.status(400).json({
        success: false,
        error: "A valid complaint status is required",
      });
    }
    if (note && String(note).trim().length > 5000) {
      return res.status(400).json({ success: false, error: "Complaint note is too long" });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query(
        `UPDATE complaints
         SET status = ?,
             assigned_to = COALESCE(?, assigned_to),
             resolved_note = COALESCE(?, resolved_note)
         WHERE id = ?`,
        [status, assigned_to || null, resolved_note || null, req.params.id],
      );
      if (!result.affectedRows) {
        await connection.rollback();
        return res.status(404).json({ success: false, error: "Complaint not found" });
      }

      await connection.query(
        `INSERT INTO complaint_status_updates
        (complaint_id, status, note, updated_by)
        VALUES (?, ?, ?, ?)`,
        [req.params.id, status, note || null, updated_by || "admin"],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});



async function ensureAlertsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS alerts (
      id VARCHAR(80) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      type VARCHAR(30) NOT NULL DEFAULT 'alert',
      category VARCHAR(80) NULL,
      priority VARCHAR(30) NULL DEFAULT 'normal',
      location VARCHAR(255) NULL,
      valid_until VARCHAR(80) NULL,
      expires_at VARCHAR(80) NULL,
      target_audience VARCHAR(80) NULL,
      media_uri TEXT NULL,
      media_type VARCHAR(30) NULL,
      media_file_name VARCHAR(255) NULL,
      media_mime_type VARCHAR(120) NULL,
      media_duration INT NULL,
      posted_by VARCHAR(120) NOT NULL DEFAULT 'Connect-T',
      posted_by_id VARCHAR(80) NULL,
      ward VARCHAR(80) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

app.delete("/api/alerts/:id", async (req, res) => {
  try {
    await ensureAlertsTable();

    await db.query(
      "UPDATE alerts SET is_active = 0 WHERE id = ?",
      [req.params.id],
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ADMIN ANALYTICS */
app.get("/api/admin/analytics", requireSuperAdmin, async (req, res) => {
  try {
    const [summary] = await db.query(
      `SELECT 
        COUNT(*) AS total,
        SUM(status = 'submitted') AS submitted,
        SUM(status = 'assigned') AS assigned,
        SUM(status = 'in_progress') AS in_progress,
        SUM(status = 'resolved') AS resolved,
        SUM(status = 'rejected') AS rejected
       FROM complaints`,
    );

    const [wardStats] = await db.query(
      `SELECT 
        ward_code,
        ward,
        COUNT(*) AS total,
        SUM(status = 'submitted') AS submitted,
        SUM(status = 'assigned') AS assigned,
        SUM(status = 'in_progress') AS in_progress,
        SUM(status = 'resolved') AS resolved,
        SUM(status = 'rejected') AS rejected
       FROM complaints
       GROUP BY ward_code, ward
       ORDER BY ward_code ASC`,
    );

    const [officerStats] = await db.query(
      `SELECT 
        assigned_officer_id,
        COUNT(*) AS total,
        SUM(status = 'submitted') AS submitted,
        SUM(status = 'assigned') AS assigned,
        SUM(status = 'in_progress') AS in_progress,
        SUM(status = 'resolved') AS resolved,
        SUM(status = 'rejected') AS rejected
       FROM complaints
       GROUP BY assigned_officer_id
       ORDER BY assigned_officer_id ASC`,
    );

    res.json({
      success: true,
      summary: summary[0],
      wardStats,
      officerStats,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ALERTS */
app.get("/api/alerts", async (req, res) => {
  try {
    await ensureAlertsTable();
    const { type, ward } = req.query;

    let sql = "SELECT * FROM alerts WHERE is_active = 1 AND (expires_at IS NULL OR expires_at = '' OR expires_at > ?)";
    const params = [new Date().toISOString()];

    if (type) {
      sql += " AND type = ?";
      params.push(type);
    }

    if (ward) {
      sql += " AND (ward = ? OR ward IS NULL)";
      params.push(ward);
    }

    sql += " ORDER BY created_at DESC";

    const [rows] = await db.query(sql, params);
    res.json({ success: true, alerts: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/alerts", async (req, res) => {
  try {
    await ensureAlertsTable();
    const id = req.body.id || createId("alert");

    const {
      title,
      body,
      type = "alert",
      category,
      priority = "normal",
      location,
      valid_until,
      expires_at,
      target_audience,
      media_uri,
      media_type,
      media_file_name,
      media_mime_type,
      media_duration,
      posted_by,
      posted_by_id,
      ward,
    } = req.body;

    if (!title || !body || !posted_by) {
      return res.status(400).json({
        success: false,
        error: "title, body and posted_by are required",
      });
    }
    if (String(title).trim().length > 255 || String(body).trim().length > 10000) {
      return res.status(400).json({ success: false, error: "Alert title or message is too long" });
    }

    if (!['alert', 'news', 'emergency'].includes(type)) {
      return res.status(400).json({ success: false, error: "Invalid alert type" });
    }
    if (!['normal', 'important', 'urgent', 'high'].includes(priority)) {
      return res.status(400).json({ success: false, error: "Invalid alert priority" });
    }
    if (expires_at && Number.isNaN(new Date(expires_at).getTime())) {
      return res.status(400).json({ success: false, error: "Invalid alert expiry" });
    }
    if (expires_at && new Date(expires_at).getTime() <= Date.now()) {
      return res.status(400).json({ success: false, error: "Alert expiry must be in the future" });
    }
    if (media_type && !['image', 'video'].includes(media_type)) {
      return res.status(400).json({ success: false, error: "Invalid alert media type" });
    }

    const savedMediaUri = await saveDataUriToUploads(req.body.media_uri, "alert", req);

    await db.query(
      `INSERT INTO alerts
      (id, title, body, type, category, priority, location, valid_until, expires_at, target_audience, media_uri, media_type, media_file_name, media_mime_type, media_duration, posted_by, posted_by_id, ward)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        title,
        body,
        type,
        category || null,
        priority,
        location || null,
        valid_until || null,
        expires_at || null,
        target_audience || null,
        savedMediaUri || null,
        media_type || null,
        media_file_name || null,
        media_mime_type || null,
        media_duration || null,
        posted_by,
        posted_by_id || null,
        ward || null,
      ],
    );

    res.status(201).json({ success: true, alertId: id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* FEED */
app.get("/api/feed/posts", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        p.*,
        COUNT(l.id) AS likes_count,
        COALESCE(GROUP_CONCAT(l.user_id ORDER BY l.created_at SEPARATOR ','), '') AS likes_csv
       FROM feed_posts p
       LEFT JOIN feed_post_likes l ON p.id = l.post_id
       GROUP BY p.id
       ORDER BY p.pinned DESC, p.created_at DESC`,
    );

    res.json({ success: true, posts: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/feed/posts", async (req, res) => {
  try {
    const id = req.body.id || createId("post");
    const savedImageUri = await saveDataUriToUploads(req.body.image_uri, "feed", req, {
      allowedMimeTypes: IMAGE_MIME_TYPES,
    });

    const {
      author_id,
      author_name,
      author_role,
      avatar_color,
      type = "general",
      content,
      image_uri,
      pinned = false,
    } = req.body;

    if (!author_id || !author_name || !author_role || !content) {
      return res.status(400).json({
        success: false,
        error: "author_id, author_name, author_role and content are required",
      });
    }
    if (String(content).trim().length > 5000) {
      return res.status(400).json({ success: false, error: "Post content is too long" });
    }

    await db.query(
      `INSERT INTO feed_posts
      (id, author_id, author_name, author_role, avatar_color, type, content, image_uri, pinned)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        author_id,
        author_name,
        author_role,
        avatar_color || null,
        type,
        content,
        savedImageUri || null,
        pinned ? 1 : 0,
      ],
    );

    res.status(201).json({ success: true, postId: id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/feed/posts/:id/like", async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: "user_id is required",
      });
    }

    await db.query(
      "INSERT IGNORE INTO feed_post_likes (post_id, user_id) VALUES (?, ?)",
      [req.params.id, user_id],
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/feed/posts/:id/like", async (req, res) => {
  try {
    const userId = req.query.user_id || req.body?.user_id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "user_id is required",
      });
    }

    await db.query(
      "DELETE FROM feed_post_likes WHERE post_id = ? AND user_id = ?",
      [req.params.id, userId],
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/feed/posts/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM feed_post_likes WHERE post_id = ?", [req.params.id]);
    await db.query("DELETE FROM feed_posts WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/feed/subscriptions", async (req, res) => {
  try {
    await ensureProductionMySQLSchema();
    const subscriberId = String(req.query.user_id || "");

    if (!subscriberId) {
      return res.status(400).json({ success: false, error: "user_id is required" });
    }

    const [rows] = await db.query(
      "SELECT target_user_id FROM feed_subscriptions WHERE subscriber_id = ?",
      [subscriberId],
    );

    res.json({ success: true, subscriptions: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/feed/subscriptions", async (req, res) => {
  try {
    await ensureProductionMySQLSchema();
    const { subscriber_id, target_user_id } = req.body;

    if (!subscriber_id || !target_user_id) {
      return res.status(400).json({ success: false, error: "subscriber_id and target_user_id are required" });
    }

    await db.query(
      "INSERT IGNORE INTO feed_subscriptions (subscriber_id, target_user_id) VALUES (?, ?)",
      [subscriber_id, target_user_id],
    );

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/feed/blocks", async (req, res) => {
  try {
    await ensureProductionMySQLSchema();
    const userId = String(req.query.user_id || "");
    const now = Date.now();

    if (!userId) {
      return res.status(400).json({ success: false, error: "user_id is required" });
    }

    await db.query("DELETE FROM feed_user_blocks WHERE blocked_until <= ?", [now]);

    const [rows] = await db.query(
      "SELECT blocked_user_id, blocked_until FROM feed_user_blocks WHERE user_id = ?",
      [userId],
    );

    res.json({ success: true, blocks: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/feed/blocks", async (req, res) => {
  try {
    await ensureProductionMySQLSchema();
    const { user_id, blocked_user_id, blocked_until, reason } = req.body;

    if (!user_id || !blocked_user_id || !blocked_until) {
      return res.status(400).json({ success: false, error: "user_id, blocked_user_id and blocked_until are required" });
    }

    await db.query(
      `INSERT INTO feed_user_blocks (user_id, blocked_user_id, blocked_until, reason)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE blocked_until = VALUES(blocked_until), reason = VALUES(reason)`,
      [user_id, blocked_user_id, blocked_until, reason || null],
    );

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* CHAT */
app.get("/api/chat/messages", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM chat_messages ORDER BY created_at ASC",
    );

    res.json({ success: true, messages: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/chat/messages", async (req, res) => {
  try {
    const id = req.body.id || createId("msg");

    const { author_id, author_name, author_role, avatar_color, text } =
      req.body;

    if (!author_id || !author_name || !author_role || !text) {
      return res.status(400).json({
        success: false,
        error: "author_id, author_name, author_role and text are required",
      });
    }
    if (String(text).trim().length > 2000) {
      return res.status(400).json({ success: false, error: "Message is too long" });
    }

    await db.query(
      `INSERT INTO chat_messages
      (id, author_id, author_name, author_role, avatar_color, text)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [id, author_id, author_name, author_role, avatar_color || null, text],
    );

    res.status(201).json({ success: true, messageId: id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/chat/messages/:id", async (req, res) => {
  try {
    const text = String(req.body.text || "").trim();

    if (!text) {
      return res.status(400).json({ success: false, error: "text is required" });
    }
    if (text.length > 2000) {
      return res.status(400).json({ success: false, error: "Message is too long" });
    }

    await db.query("UPDATE chat_messages SET text = ? WHERE id = ?", [text, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/chat/messages/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM chat_messages WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


async function ensureServiceDirectorySchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS service_categories (
      id VARCHAR(80) NOT NULL PRIMARY KEY,
      label VARCHAR(160) NOT NULL,
      icon VARCHAR(80) NULL,
      color VARCHAR(40) NULL,
      bg_color VARCHAR(40) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS service_places (
      id VARCHAR(80) NOT NULL PRIMARY KEY,
      category_id VARCHAR(80) NOT NULL,
      name VARCHAR(190) NOT NULL,
      address TEXT NOT NULL,
      distance VARCHAR(80) NULL,
      distance_km DECIMAL(8,2) NULL,
      type VARCHAR(120) NULL,
      speciality VARCHAR(190) NULL,
      timing VARCHAR(190) NULL,
      govt_type VARCHAR(120) NULL,
      established VARCHAR(80) NULL,
      beds INT NULL,
      beds_occupied INT NULL,
      services_json LONGTEXT NULL,
      rating DECIMAL(3,2) NULL,
      review_count INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_service_category_id (category_id),
      KEY idx_service_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS service_place_contacts (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      place_id VARCHAR(80) NOT NULL,
      name VARCHAR(160) NOT NULL,
      phone VARCHAR(60) NOT NULL,
      role VARCHAR(120) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_spc_place_id (place_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS service_place_reviews (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      place_id VARCHAR(80) NOT NULL,
      reviewer VARCHAR(160) NOT NULL,
      rating DECIMAL(3,2) NOT NULL DEFAULT 0,
      comment TEXT NULL,
      review_date VARCHAR(80) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_spr_place_id (place_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS emergency_contacts (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(160) NOT NULL,
      phone VARCHAR(40) NULL,
      type VARCHAR(80) NULL,
      icon VARCHAR(80) NULL,
      color VARCHAR(40) NULL,
      bg VARCHAR(40) NULL,
      address TEXT NULL,
      available VARCHAR(80) NULL,
      priority INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureColumn("service_categories", "is_active", "is_active TINYINT(1) NOT NULL DEFAULT 1");
  await ensureColumn("service_places", "is_active", "is_active TINYINT(1) NOT NULL DEFAULT 1");
  await ensureColumn("emergency_contacts", "phone", "phone VARCHAR(40) NULL AFTER name");
  await ensureColumn("emergency_contacts", "type", "type VARCHAR(80) NULL AFTER phone");
  await ensureColumn("emergency_contacts", "icon", "icon VARCHAR(80) NULL AFTER type");
  await ensureColumn("emergency_contacts", "color", "color VARCHAR(40) NULL AFTER icon");
  await ensureColumn("emergency_contacts", "bg", "bg VARCHAR(40) NULL AFTER color");
  await ensureColumn("emergency_contacts", "address", "address TEXT NULL AFTER bg");
  await ensureColumn("emergency_contacts", "available", "available VARCHAR(80) NULL AFTER address");
  await ensureColumn("emergency_contacts", "priority", "priority INT NOT NULL DEFAULT 0 AFTER available");
  await ensureColumn("emergency_contacts", "is_active", "is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER priority");
}

function safeParseJson(value, fallback = []) {
  if (!value) return fallback;
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}


/* SERVICES */

app.get("/api/services/catalog", async (req, res) => {
  try {
    await ensureServiceDirectorySchema();

    const [categoryRows] = await db.query(
      `SELECT id, label, icon, color, bg_color
       FROM service_categories
       WHERE is_active = 1
       ORDER BY FIELD(id, 'hospital', 'childHospital', 'clinic', 'police', 'bank', 'postOffice', 'school', 'shamshanbhumi'), label ASC`,
    );

    const [placeRows] = await db.query(
      `SELECT *
       FROM service_places
       WHERE is_active = 1
       ORDER BY category_id ASC, distance_km ASC, rating DESC, name ASC`,
    );

    const [contactRows] = await db.query(
      `SELECT place_id, name, phone, role
       FROM service_place_contacts
       ORDER BY id ASC`,
    );

    const [reviewRows] = await db.query(
      `SELECT place_id, reviewer, rating, comment, review_date
       FROM service_place_reviews
       ORDER BY id ASC`,
    );

    const contactsByPlace = {};
    for (const contact of contactRows) {
      if (!contactsByPlace[contact.place_id]) contactsByPlace[contact.place_id] = [];
      contactsByPlace[contact.place_id].push({
        name: contact.name,
        phone: contact.phone,
        role: contact.role || undefined,
      });
    }

    const reviewsByPlace = {};
    for (const review of reviewRows) {
      if (!reviewsByPlace[review.place_id]) reviewsByPlace[review.place_id] = [];
      reviewsByPlace[review.place_id].push({
        reviewer: review.reviewer,
        rating: Number(review.rating || 0),
        comment: review.comment || "",
        date: review.review_date || "",
      });
    }

    const defaultCategoryMeta = {
      hospital: { label: "Hospitals", icon: "activity", color: "#DC2626", bgColor: "#FEE2E2" },
      childHospital: { label: "Child Care", icon: "heart", color: "#7C3AED", bgColor: "#EDE9FE" },
      clinic: { label: "Clinics", icon: "plus-circle", color: "#059669", bgColor: "#D1FAE5" },
      police: { label: "Police", icon: "shield", color: "#1E40AF", bgColor: "#DBEAFE" },
      bank: { label: "Banks", icon: "credit-card", color: "#D97706", bgColor: "#FEF3C7" },
      postOffice: { label: "Post Office", icon: "mail", color: "#0EA5E9", bgColor: "#BAE6FD" },
      school: { label: "Schools", icon: "book-open", color: "#7C3AED", bgColor: "#EDE9FE" },
      shamshanbhumi: { label: "Crematorium", icon: "wind", color: "#475569", bgColor: "#F1F5F9" },
    };

    const categoriesSource = categoryRows.length
      ? categoryRows
      : Array.from(new Set(placeRows.map((p) => p.category_id))).map((id) => ({ id }));

    const placesByCategory = {};
    for (const place of placeRows) {
      if (!placesByCategory[place.category_id]) placesByCategory[place.category_id] = [];
      placesByCategory[place.category_id].push({
        id: place.id,
        name: place.name,
        address: place.address,
        distance: place.distance || "",
        distanceKm: Number(place.distance_km || 0),
        contacts: contactsByPlace[place.id] || [],
        type: place.type || place.category_id,
        speciality: place.speciality || undefined,
        timing: place.timing || undefined,
        govtType: place.govt_type || undefined,
        established: place.established ? Number(place.established) : undefined,
        beds: place.beds === null || place.beds === undefined ? undefined : Number(place.beds),
        bedsOccupied: place.beds_occupied === null || place.beds_occupied === undefined ? undefined : Number(place.beds_occupied),
        services: safeParseJson(place.services_json, []),
        rating: place.rating === null || place.rating === undefined ? undefined : Number(place.rating),
        reviewCount: Number(place.review_count || 0),
        reviews: reviewsByPlace[place.id] || [],
      });
    }

    const categories = categoriesSource.map((cat) => {
      const meta = defaultCategoryMeta[cat.id] || {};
      return {
        id: cat.id,
        label: cat.label || meta.label || cat.id,
        icon: cat.icon || meta.icon || "map-pin",
        color: cat.color || meta.color || "#EA580C",
        bgColor: cat.bg_color || meta.bgColor || "#FFEDD5",
        data: placesByCategory[cat.id] || [],
      };
    });

    res.json({
      success: true,
      categories,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});


app.get("/api/services", async (req, res) => {
  try {
    await ensureServiceDirectorySchema();
    const { category_id } = req.query;

    let sql = "SELECT * FROM service_places WHERE is_active = 1";
    const params = [];

    if (category_id) {
      sql += " AND category_id = ?";
      params.push(category_id);
    }

    sql += " ORDER BY rating DESC, name ASC";

    const [rows] = await db.query(sql, params);
    res.json({ success: true, services: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/services", requireSuperAdmin, async (req, res) => {
  try {
    const id = req.body.id || createId("service");

    const {
      category_id,
      name,
      address,
      distance,
      distance_km,
      type,
      speciality,
      timing,
      govt_type,
      established,
      beds,
      beds_occupied,
      services_json,
      rating,
      review_count = 0,
    } = req.body;

    if (!category_id || !name || !address) {
      return res.status(400).json({
        success: false,
        error: "category_id, name and address are required",
      });
    }

    await db.query(
      `INSERT INTO service_places
      (id, category_id, name, address, distance, distance_km, type, speciality, timing, govt_type, established, beds, beds_occupied, services_json, rating, review_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        category_id,
        name,
        address,
        distance || null,
        distance_km || null,
        type || null,
        speciality || null,
        timing || null,
        govt_type || null,
        established || null,
        beds || null,
        beds_occupied || null,
        services_json ? JSON.stringify(services_json) : null,
        rating || null,
        review_count,
      ],
    );

    res.status(201).json({ success: true, serviceId: id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


app.patch("/api/services/:id", requireSuperAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "service id is required",
      });
    }

    const allowed = {
      category_id: "category_id",
      name: "name",
      address: "address",
      distance: "distance",
      distance_km: "distance_km",
      type: "type",
      speciality: "speciality",
      timing: "timing",
      govt_type: "govt_type",
      established: "established",
      beds: "beds",
      beds_occupied: "beds_occupied",
      services_json: "services_json",
      rating: "rating",
      review_count: "review_count",
      is_active: "is_active",
    };

    const sets = [];
    const params = [];

    for (const [bodyKey, column] of Object.entries(allowed)) {
      if (Object.prototype.hasOwnProperty.call(req.body, bodyKey)) {
        sets.push(`${column} = ?`);
        params.push(
          bodyKey === "services_json" && req.body[bodyKey] !== null && req.body[bodyKey] !== undefined
            ? JSON.stringify(req.body[bodyKey])
            : req.body[bodyKey],
        );
      }
    }

    if (!sets.length) {
      return res.status(400).json({
        success: false,
        error: "No valid service fields provided",
      });
    }

    params.push(id);

    const [result] = await db.query(
      `UPDATE service_places SET ${sets.join(", ")} WHERE id = ?`,
      params,
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        error: "Service not found",
      });
    }

    return res.json({
      success: true,
      serviceId: id,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.delete("/api/services/:id", requireSuperAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "service id is required",
      });
    }

    const [result] = await db.query(
      "UPDATE service_places SET is_active = 0 WHERE id = ?",
      [id],
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        error: "Service not found",
      });
    }

    return res.json({
      success: true,
      serviceId: id,
      message: "Service deleted",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* EMERGENCY */
app.get("/api/emergency", async (req, res) => {
  try {
    await ensureServiceDirectorySchema();
    const type = String(req.query.type || "").trim();

    let sql = "SELECT * FROM emergency_contacts WHERE is_active = 1";
    const params = [];

    if (type) {
      sql += " AND type = ?";
      params.push(type);
    }

    sql += " ORDER BY priority DESC, id ASC";

    const [rows] = await db.query(sql, params);

    res.json({
      success: true,
      emergencyContacts: rows,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.post("/api/emergency", requireSuperAdmin, async (req, res) => {
  try {
    const {
      name,
      phone,
      type,
      address,
      available,
      priority = 0,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "name is required",
      });
    }

    const [result] = await db.query(
      `INSERT INTO emergency_contacts
       (name, phone, type, address, available, priority, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        String(name).trim(),
        phone || null,
        type || null,
        address || null,
        available || null,
        Number(priority) || 0,
      ],
    );

    return res.status(201).json({
      success: true,
      emergencyId: result.insertId,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.patch("/api/emergency/:id", requireSuperAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "valid emergency id is required",
      });
    }

    const allowed = {
      name: "name",
      phone: "phone",
      type: "type",
      address: "address",
      available: "available",
      priority: "priority",
      is_active: "is_active",
    };

    const sets = [];
    const params = [];

    for (const [bodyKey, column] of Object.entries(allowed)) {
      if (Object.prototype.hasOwnProperty.call(req.body, bodyKey)) {
        sets.push(`${column} = ?`);
        params.push(req.body[bodyKey]);
      }
    }

    if (!sets.length) {
      return res.status(400).json({
        success: false,
        error: "No valid emergency fields provided",
      });
    }

    params.push(id);

    const [result] = await db.query(
      `UPDATE emergency_contacts SET ${sets.join(", ")} WHERE id = ?`,
      params,
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        error: "Emergency contact not found",
      });
    }

    return res.json({
      success: true,
      emergencyId: id,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.delete("/api/emergency/:id", requireSuperAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "valid emergency id is required",
      });
    }

    const [result] = await db.query(
      "UPDATE emergency_contacts SET is_active = 0 WHERE id = ?",
      [id],
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        error: "Emergency contact not found",
      });
    }

    return res.json({
      success: true,
      emergencyId: id,
      message: "Emergency contact deleted",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* ROLE ACCESS MANAGEMENT */
function recentAdminSession(req, maxAgeSeconds = 30 * 60) {
  const issuedAt = Number(req.auth?.iat || 0);
  return issuedAt > 0 && Math.floor(Date.now() / 1000) - issuedAt <= maxAgeSeconds;
}

async function loadRoleAssignment(id, role, client = db, lock = false) {
  const [rows] = await client.query(
    `SELECT * FROM role_assignments WHERE id = ? AND role = ? LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [id, role],
  );
  return rows[0] || null;
}

async function withTransaction(work) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function assertAdminCanRestrictTarget(req, res, target, client = db) {
  if (!recentAdminSession(req)) {
    res.status(401).json({ success: false, code: "RECENT_LOGIN_REQUIRED", message: "Please log in again before changing admin access." });
    return false;
  }
  const actor = req.civicUser;
  let activeCount = 2;
  if (target.status === "active") {
    const [activeRows] = await client.query(
      "SELECT id FROM role_assignments WHERE role = 'super_admin' AND status = 'active' FOR UPDATE",
    );
    activeCount = activeRows.length;
  }
  const restriction = privilegedRestrictionReason({
    target,
    actorUserId: actor?.id,
    actorMobile: actor?.mobile,
    activeCount,
  });
  if (restriction) {
    const messages = {
      PRIMARY_ADMIN_PROTECTED: "The primary Super Admin cannot be deactivated or removed.",
      SELF_LOCKOUT_BLOCKED: "You cannot remove your own Super Admin access.",
      LAST_ADMIN_PROTECTED: "The last active Super Admin cannot be removed.",
    };
    res.status(409).json({ success: false, code: restriction, message: messages[restriction] });
    return false;
  }
  return true;
}

app.get("/api/super-admin/access-management", async (req, res) => {
  try {
    await ensureRoleAuthorizationSchema(db);
    const search = String(req.query?.search || "").trim();
    const status = String(req.query?.status || "").trim().toLowerCase();
    const params = [];
    let where = "WHERE ra.role = 'super_admin'";
    if (search) {
      where += " AND (ra.display_name LIKE ? OR ra.normalized_phone LIKE ?)";
      params.push(`%${search}%`, `%${normalizeMobile(search) || search}%`);
    }
    if (VALID_STATUSES.has(status)) {
      where += " AND ra.status = ?";
      params.push(status);
    }
    const [rows] = await db.query(
      `SELECT ra.*, added.name AS added_by_name
       FROM role_assignments ra
       LEFT JOIN users added ON added.id = ra.added_by
       ${where}
       ORDER BY ra.is_primary DESC, FIELD(ra.status, 'active', 'inactive', 'revoked'), ra.created_at ASC`,
      params,
    );
    return res.json({ success: true, assignments: rows.map(mapRoleAssignment) });
  } catch (error) {
    console.error("[Connect-T] Access management list failed:", error);
    return res.status(500).json({ success: false, message: "Admin access records could not be loaded right now." });
  }
});

app.post("/api/super-admin/access-management", async (req, res) => {
  try {
    await ensureRoleAuthorizationSchema(db);
    if (!recentAdminSession(req)) {
      return res.status(401).json({ success: false, code: "RECENT_LOGIN_REQUIRED", message: "Please log in again before adding an administrator." });
    }
    const name = String(req.body?.name || req.body?.displayName || "").trim().replace(/\s+/g, " ");
    const mobile = normalizeMobile(req.body?.mobile || req.body?.phone);
    if (name.split(/\s+/).filter(Boolean).length < 2) {
      return res.status(400).json({ success: false, code: "FULL_NAME_REQUIRED", message: "Enter the administrator's full name." });
    }
    if (mobile.length !== 10) {
      return res.status(400).json({ success: false, code: "INVALID_MOBILE", message: "Enter a valid 10 digit mobile number." });
    }
    const [existing] = await db.query(
      "SELECT id, status FROM role_assignments WHERE normalized_phone = ? AND role = 'super_admin' LIMIT 1",
      [mobile],
    );
    if (existing.length) {
      return res.status(409).json({ success: false, code: "ADMIN_ALREADY_EXISTS", message: "This mobile number already has a Super Admin record." });
    }
    const created = await withTransaction(async (connection) => {
      const [result] = await connection.query(
        `INSERT INTO role_assignments
         (normalized_phone, role, display_name, status, source, added_by)
         VALUES (?, 'super_admin', ?, 'active', 'admin', ?)`,
        [mobile, name, req.civicUser.id],
      );
      await recordRoleAudit(connection, {
        actorUserId: req.civicUser.id,
        actorPhone: req.civicUser.mobile,
        actorRole: "super_admin",
        action: "SUPER_ADMIN_ADDED",
        targetAssignmentId: result.insertId,
        targetPhone: mobile,
        newStatus: "active",
        details: { displayName: name },
        requestId: req.requestId,
      });
      return loadRoleAssignment(result.insertId, "super_admin", connection);
    });
    return res.status(201).json({ success: true, assignment: mapRoleAssignment(created) });
  } catch (error) {
    console.error("[Connect-T] Add Super Admin failed:", error);
    return res.status(500).json({ success: false, message: "The Super Admin could not be added right now." });
  }
});

app.patch("/api/super-admin/access-management/:id", async (req, res) => {
  try {
    await ensureRoleAuthorizationSchema(db);
    const nextStatus = String(req.body?.status || "").toLowerCase();
    if (!["active", "inactive"].includes(nextStatus)) {
      return res.status(400).json({ success: false, message: "Status must be active or inactive." });
    }
    if (nextStatus === "active" && !recentAdminSession(req)) {
      return res.status(401).json({ success: false, code: "RECENT_LOGIN_REQUIRED", message: "Please log in again before restoring administrator access." });
    }
    const result = await withTransaction(async (connection) => {
      const target = await loadRoleAssignment(req.params.id, "super_admin", connection, true);
      if (!target) return { notFound: true };
      if (nextStatus !== "active" && !(await assertAdminCanRestrictTarget(req, res, target, connection))) return { blocked: true };
      await connection.query("UPDATE role_assignments SET status = ? WHERE id = ?", [nextStatus, target.id]);
      if (target.user_id) {
        await connection.query(
          "UPDATE users SET is_super_admin = ?, approval_status = ? WHERE id = ?",
          [nextStatus === "active" ? 1 : 0, nextStatus === "active" ? "approved" : "rejected", target.user_id],
        );
      }
      await recordRoleAudit(connection, {
        actorUserId: req.civicUser.id,
        actorPhone: req.civicUser.mobile,
        actorRole: "super_admin",
        action: nextStatus === "active" ? "SUPER_ADMIN_ACTIVATED" : "SUPER_ADMIN_DEACTIVATED",
        targetAssignmentId: target.id,
        targetPhone: target.normalized_phone,
        previousStatus: target.status,
        newStatus: nextStatus,
        requestId: req.requestId,
      });
      return { updated: true };
    });
    if (result.notFound) return res.status(404).json({ success: false, message: "Super Admin record not found." });
    if (result.blocked) return;
    return res.json({ success: true, status: nextStatus });
  } catch (error) {
    console.error("[Connect-T] Update Super Admin failed:", error);
    return res.status(500).json({ success: false, message: "Admin access could not be updated right now." });
  }
});

app.delete("/api/super-admin/access-management/:id", async (req, res) => {
  try {
    await ensureRoleAuthorizationSchema(db);
    const result = await withTransaction(async (connection) => {
      const target = await loadRoleAssignment(req.params.id, "super_admin", connection, true);
      if (!target) return { notFound: true };
      if (!(await assertAdminCanRestrictTarget(req, res, target, connection))) return { blocked: true };
      await connection.query("UPDATE role_assignments SET status = 'revoked' WHERE id = ?", [target.id]);
      if (target.user_id) {
        await connection.query("UPDATE users SET is_super_admin = 0, approval_status = 'rejected' WHERE id = ?", [target.user_id]);
      }
      await recordRoleAudit(connection, {
        actorUserId: req.civicUser.id,
        actorPhone: req.civicUser.mobile,
        actorRole: "super_admin",
        action: "SUPER_ADMIN_REMOVED",
        targetAssignmentId: target.id,
        targetPhone: target.normalized_phone,
        previousStatus: target.status,
        newStatus: "revoked",
        requestId: req.requestId,
      });
      return { updated: true };
    });
    if (result.notFound) return res.status(404).json({ success: false, message: "Super Admin record not found." });
    if (result.blocked) return;
    return res.json({ success: true, status: "revoked" });
  } catch (error) {
    console.error("[Connect-T] Remove Super Admin failed:", error);
    return res.status(500).json({ success: false, message: "Admin access could not be removed right now." });
  }
});

app.get("/api/super-admin/role-audit-logs", async (req, res) => {
  try {
    await ensureRoleAuthorizationSchema(db);
    const limit = Math.min(Math.max(Number(req.query?.limit || 100), 1), 250);
    const [rows] = await db.query(
      `SELECT ral.*, actor.name AS actor_name, target.display_name AS target_name
       FROM role_audit_logs ral
       LEFT JOIN users actor ON actor.id = ral.actor_user_id
       LEFT JOIN role_assignments target ON target.id = ral.target_assignment_id
       ORDER BY ral.created_at DESC LIMIT ?`,
      [limit],
    );
    return res.json({ success: true, logs: rows });
  } catch (error) {
    console.error("[Connect-T] Role audit log failed:", error);
    return res.status(500).json({ success: false, message: "Role audit logs could not be loaded right now." });
  }
});

app.get("/api/super-admin/role-import-summary", async (req, res) => {
  try {
    return res.json({ success: true, summary: await getMigrationSummary(db) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Import summary could not be loaded right now." });
  }
});

app.get("/api/super-admin/nagarsevaks", async (req, res) => {
  try {
    await ensureRoleAuthorizationSchema(db);
    const search = String(req.query?.search || "").trim();
    const params = [];
    let filter = "WHERE ra.role = 'nagarsevak'";
    if (search) {
      filter += " AND (ra.display_name LIKE ? OR ra.normalized_phone LIKE ? OR ra.ward_or_designation LIKE ?)";
      params.push(`%${search}%`, `%${normalizeMobile(search) || search}%`, `%${search}%`);
    }
    const [rows] = await db.query(
      `SELECT ra.*, added.name AS added_by_name FROM role_assignments ra
       LEFT JOIN users added ON added.id = ra.added_by
       ${filter}
       ORDER BY COALESCE(ra.source_serial, 9999), ra.created_at ASC`,
      params,
    );
    return res.json({ success: true, assignments: rows.map(mapRoleAssignment) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Nagarsevak records could not be loaded right now." });
  }
});

app.post("/api/super-admin/nagarsevaks", async (req, res) => {
  try {
    await ensureRoleAuthorizationSchema(db);
    const name = String(req.body?.name || "").trim().replace(/\s+/g, " ");
    const mobile = normalizeMobile(req.body?.mobile);
    const designation = String(req.body?.wardOrDesignation || req.body?.designation || "").trim();
    if (name.split(/\s+/).filter(Boolean).length < 2 || mobile.length !== 10 || !designation) {
      return res.status(400).json({ success: false, message: "Full name, valid mobile number, and ward/designation are required." });
    }
    const created = await withTransaction(async (connection) => {
      const [result] = await connection.query(
        `INSERT INTO role_assignments
         (normalized_phone, role, display_name, ward_or_designation, status, source, added_by)
         VALUES (?, 'nagarsevak', ?, ?, 'active', 'super_admin', ?)`,
        [mobile, name, designation, req.civicUser.id],
      );
      await recordRoleAudit(connection, {
        actorUserId: req.civicUser.id,
        actorPhone: req.civicUser.mobile,
        actorRole: "super_admin",
        action: "NAGARSEVAK_ADDED",
        targetAssignmentId: result.insertId,
        targetPhone: mobile,
        newStatus: "active",
        details: { displayName: name, designation },
        requestId: req.requestId,
      });
      return loadRoleAssignment(result.insertId, "nagarsevak", connection);
    });
    return res.status(201).json({ success: true, assignment: mapRoleAssignment(created) });
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "This mobile number already has a Nagarsevak record." });
    }
    return res.status(500).json({ success: false, message: "The Nagarsevak could not be added right now." });
  }
});

app.patch("/api/super-admin/nagarsevaks/:id", async (req, res) => {
  try {
    await ensureRoleAuthorizationSchema(db);
    const nextStatus = String(req.body?.status || "").toLowerCase();
    if (!["active", "inactive", "revoked"].includes(nextStatus)) {
      return res.status(400).json({ success: false, message: "Select a valid status." });
    }
    const result = await withTransaction(async (connection) => {
      const target = await loadRoleAssignment(req.params.id, "nagarsevak", connection, true);
      if (!target) return { notFound: true };
      await connection.query("UPDATE role_assignments SET status = ? WHERE id = ?", [nextStatus, target.id]);
      if (target.user_id) {
        await connection.query(
          "UPDATE users SET approval_status = ? WHERE id = ?",
          [nextStatus === "active" ? "approved" : "rejected", target.user_id],
        );
      }
      await recordRoleAudit(connection, {
        actorUserId: req.civicUser.id,
        actorPhone: req.civicUser.mobile,
        actorRole: "super_admin",
        action: "NAGARSEVAK_STATUS_CHANGED",
        targetAssignmentId: target.id,
        targetPhone: target.normalized_phone,
        previousStatus: target.status,
        newStatus: nextStatus,
        requestId: req.requestId,
      });
      return { updated: true };
    });
    if (result.notFound) return res.status(404).json({ success: false, message: "Nagarsevak record not found." });
    return res.json({ success: true, status: nextStatus });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Nagarsevak access could not be updated right now." });
  }
});

function legacyRoleFlowRetired(req, res) {
  return res.status(410).json({
    success: false,
    code: "LEGACY_ROLE_FLOW_RETIRED",
    message: "This access method has been retired. Use the main mobile OTP login.",
  });
}

app.get("/api/super-admin/access-codes", legacyRoleFlowRetired);
app.post("/api/super-admin/access-codes", legacyRoleFlowRetired);
app.patch("/api/super-admin/access-codes/:id", legacyRoleFlowRetired);
app.delete("/api/super-admin/access-codes/:id", legacyRoleFlowRetired);
app.post("/api/auth/super-admin-access-login", legacyRoleFlowRetired);
app.post("/api/auth/nagarsevak-login", legacyRoleFlowRetired);
app.post("/api/auth/nagarsevak-register", legacyRoleFlowRetired);
app.post("/api/auth/nagarsevak-status", legacyRoleFlowRetired);

/* NAGARSEVAK AUTH + APPROVAL */
app.get("/api/auth/ward-check", async (req, res) => {
  try {
    const ward = String(req.query.ward || "").trim();
    const wardCode = normalizeWardCode(ward) || normalizeWardCode(req.query.ward_code);

    if (!ward && !wardCode) {
      return res.status(400).json({
        success: false,
        available: false,
        message: "ward is required",
      });
    }

    const [rows] = await db.query(
      `SELECT id
       FROM users
       WHERE role = 'nagarsevak'
         AND approval_status IN ('pending', 'approved')
         AND (
           ward = ?
           OR ward_code = ?
         )
       LIMIT 1`,
      [ward, wardCode],
    );

    return res.json({
      success: true,
      available: rows.length === 0,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      available: false,
      message: err.message,
    });
  }
});

app.post("/api/auth/nagarsevak-register", async (req, res) => {
  try {
    const mobile = normalizeMobile(req.body.mobile);

    if (!req.body.name || mobile.length !== 10) {
      return res.status(400).json({
        success: false,
        message: "Name and valid mobile number are required",
      });
    }

    if (!verifyOtpProof(req, mobile, ["register"])) {
      return res.status(401).json({
        success: false,
        message: "Verified registration OTP is required",
      });
    }

    const ward = String(req.body.ward || "").trim();
    const wardCode = normalizeWardCode(req.body.wardCode) || normalizeWardCode(ward);

    if (!ward) {
      return res.status(400).json({
        success: false,
        message: "Ward is required",
      });
    }

    const [existingMobile] = await db.query(
      `SELECT id, approval_status
       FROM users
       WHERE mobile = ?
         AND role = 'nagarsevak'
       LIMIT 1`,
      [mobile],
    );

    if (existingMobile.length) {
      const status = existingMobile[0].approval_status || "pending";

      return res.status(409).json({
        success: false,
        message: status === "pending" ? "ALREADY_PENDING" : "Officer already registered",
        approvalStatus: status,
      });
    }

    const [existingWard] = await db.query(
      `SELECT id
       FROM users
       WHERE role = 'nagarsevak'
         AND approval_status IN ('pending', 'approved')
         AND (
           ward = ?
           OR ward_code = ?
         )
       LIMIT 1`,
      [ward, wardCode],
    );

    if (existingWard.length) {
      return res.status(409).json({
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
        String(req.body.name || "").trim(),
        mobile,
        ward,
        wardCode || null,
        wardCode ? wardCode.replace(/[A-Z]/g, "") : null,
        req.body.address || null,
        id,
        req.body.officeAddress || null,
        req.body.residenceAddress || null,
        req.body.officeTimings || null,
        req.body.contactName || null,
        req.body.contactNumber || mobile,
        req.body.profilePhoto || null,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Nagarsevak registration submitted for approval",
      officerId: id,
      approvalStatus: "pending",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

app.post("/api/auth/nagarsevak-login", async (req, res) => {
  try {
    const mobile = normalizeMobile(req.body.mobile);

    if (mobile.length !== 10) {
      return res.status(400).json({
        success: false,
        message: "Valid mobile number is required",
      });
    }

    const [rows] = await db.query(
      `SELECT
         id,
         name,
         mobile,
         role,
         ward,
         ward_code AS wardCode,
         ward_number AS wardNumber,
         is_super_admin AS isSuperAdmin,
         approval_status AS approvalStatus,
         address,
         nagarsevak_id AS nagarsevakId,
         avatar_color AS avatarColor,
         profile_photo AS profilePhoto,
         office_address AS officeAddress,
         residence_address AS residenceAddress,
         office_timings AS officeTimings,
         contact_name AS contactName,
         contact_number AS contactNumber,
         created_at AS createdAt
       FROM users
       WHERE mobile = ?
         AND role IN ('nagarsevak', 'super_admin')
       LIMIT 1`,
      [mobile],
    );

    if (!rows.length) {
      return res.json({
        success: false,
        message: "NOT_FOUND",
        notFound: true,
      });
    }

    const officer = rows[0];
    const approvalStatus = officer.approvalStatus || "approved";

    if (approvalStatus === "pending") {
      return res.json({
        success: false,
        message: "PENDING",
        approvalStatus,
      });
    }

    if (approvalStatus === "rejected") {
      return res.json({
        success: false,
        message: "REJECTED",
        approvalStatus,
      });
    }

    if (!verifyOtpProof(req, mobile, ["login"])) {
      return res.json({
        success: false,
        message: "OTP_REQUIRED",
        approvalStatus,
      });
    }

    const user = {
      id: officer.id,
      name: officer.name,
      mobile: officer.mobile,
      role: officer.isSuperAdmin ? "super_admin" : "nagarsevak",
      ward: officer.ward,
      wardCode: officer.wardCode,
      wardNumber: officer.wardNumber,
      nagarsevakId: officer.nagarsevakId || officer.id,
      isSuperAdmin: !!officer.isSuperAdmin,
      avatarColor: officer.avatarColor || "#EA580C",
      profilePhoto: officer.profilePhoto,
      officeAddress: officer.officeAddress,
      residenceAddress: officer.residenceAddress,
      officeTimings: officer.officeTimings,
      contactName: officer.contactName,
      contactNumber: officer.contactNumber,
      createdAt: officer.createdAt,
    };

    return res.json({
      success: true,
      user,
      token: issueUserToken(user),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

app.get("/api/auth/officers", async (req, res) => {
  try {
    const status = req.query.status ? normalizeApprovalStatus(req.query.status) : null;

    let sql = `
      SELECT
        id,
        name,
        mobile,
        ward,
        ward_code AS wardCode,
        role,
        is_super_admin AS isSuperAdmin,
        approval_status AS approvalStatus,
        office_address AS officeAddress,
        residence_address AS residenceAddress,
        office_timings AS officeTimings,
        contact_name AS contactName,
        contact_number AS contactNumber,
        profile_photo AS profilePhoto,
        created_at AS createdAt
      FROM users
      WHERE role = 'nagarsevak'
    `;

    const params = [];

    if (status) {
      sql += " AND approval_status = ?";
      params.push(status);
    }

    sql += " ORDER BY created_at DESC";

    const [rows] = await db.query(sql, params);

    return res.json({
      success: true,
      officers: rows.map((row) => ({
        ...row,
        isSuperAdmin: !!row.isSuperAdmin,
        approvalStatus: row.approvalStatus || "approved",
      })),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

app.patch("/api/auth/officers", async (req, res) => {
  try {
    const id = String(req.body.id || "").trim();
    const approvalStatus = String(req.body.approvalStatus || "").trim().toLowerCase();

    if (!id || !["pending", "approved", "rejected"].includes(approvalStatus)) {
      return res.status(400).json({
        success: false,
        message: "Officer id and a valid approval status are required",
      });
    }

    const [result] = await db.query(
      `UPDATE users
       SET approval_status = ?
       WHERE id = ?
         AND role = 'nagarsevak'`,
      [approvalStatus, id],
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Officer not found" });
    }
    await ensureRoleAuthorizationSchema(db);
    await db.query(
      `UPDATE role_assignments SET status = ?
       WHERE role = 'nagarsevak' AND user_id = ?`,
      [approvalStatus === "approved" ? "active" : "inactive", id],
    );

    return res.json({
      success: true,
      id,
      approvalStatus,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

app.delete("/api/auth/officers/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) {
      return res.status(400).json({ success: false, message: "Officer id is required" });
    }

    const [rows] = await db.query(
      "SELECT id, role, is_super_admin FROM users WHERE id = ? LIMIT 1",
      [id],
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Officer not found" });
    }
    if (rows[0].role !== "nagarsevak" || rows[0].is_super_admin) {
      return res.status(403).json({ success: false, message: "Super Admin accounts cannot be deleted here" });
    }

    await ensureRoleAuthorizationSchema(db);
    await db.query("UPDATE users SET approval_status = 'rejected' WHERE id = ? AND role = 'nagarsevak'", [id]);
    await db.query("UPDATE role_assignments SET status = 'revoked' WHERE role = 'nagarsevak' AND user_id = ?", [id]);
    return res.json({ success: true, id, status: "revoked" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Officer deletion failed" });
  }
});


/* OTP AUTH */
function normalizeMobile(mobile) {
  return String(mobile || "").replace(/\D/g, "").slice(-10);
}

function normalizeApprovalStatus(value) {
  if (value === "approved" || value === "pending" || value === "rejected") {
    return value;
  }

  return "pending";
}

function makeNagarsevakId() {
  return `NS${Date.now()}`;
}

app.post("/api/auth/send-otp", async (req, res) => {
  try {
    const { sendOtpSms } = require("./smsProvider");
    const result = await createOtpSession({
      mobile: req.body?.mobile || req.body?.phone,
      purpose: req.body?.purpose || "login",
      sendSms: sendOtpSms,
    });
    return res.json({
      success: true,
      message: "OTP sent successfully",
      ...result,
    });
  } catch (err) {
    return res.status(Number(err?.status || 500)).json({
      success: false,
      error: err.message || "Failed to send OTP",
      code: err?.code,
      retryAfterSeconds: err?.retryAfterMs ? Math.ceil(err.retryAfterMs / 1000) : undefined,
    });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const result = verifyOtpSession({
      mobile: req.body?.mobile || req.body?.phone,
      code: req.body?.otp || req.body?.otp_code,
      purpose: req.body?.purpose || "login",
      sessionToken: req.body?.sessionToken || req.body?.session_token,
    });
    return res.json({
      success: true,
      valid: true,
      message: "OTP verified successfully",
      ...result,
    });
  } catch (err) {
    return res.status(Number(err?.status || 500)).json({
      success: false,
      valid: false,
      error: err.message || "OTP verification failed",
      code: err?.code,
    });
  }
});


/* JOB PORTAL MYSQL API V1 */
const jpCreateId = (prefix) =>
  `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;

function jpPhone(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function jpEmailOk(value) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function jpWordCount(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function jpBadRequest(res, error) {
  return res.status(400).json({ success: false, error });
}

function jpUser(row) {
  if (!row) return null;

  return {
    id: row.id,
    role: row.role,
    name: row.name,
    dob: row.dob,
    phone: row.phone,
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
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function jpJob(row) {
  if (!row) return null;

  return {
    id: row.id,
    employerId: row.employer_id,
    employerName: row.employer_name || row.employerName,
    employerPhone: row.employer_phone,
    employerWhatsApp: row.employer_whatsapp,
    company: row.company,
    title: row.title,
    category: row.category,
    type: row.type,
    shift: row.shift,
    jobMode: row.job_mode,
    workStartTime: row.work_start_time,
    workEndTime: row.work_end_time,
    workingDays: row.working_days,
    weeklyOff: row.weekly_off,
    salary: row.salary_text,
    salaryMin: row.salary_min,
    salaryMax: row.salary_max,
    location: row.location,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    distanceKm:
      row.distance_km === null || row.distance_km === undefined
        ? null
        : Number(row.distance_km),
    description: row.description,
    requirements: row.requirements,
    experienceRequired: row.experience_required,
    educationRequired: row.education_required,
    skillsRequired: row.skills_required,
    benefits: row.benefits,
    joiningPreference: row.joining_preference,
    lastDateToApply: row.last_date_to_apply,
    openings: row.openings,
    active: !!row.active,
    allowMessaging: !!row.allow_messaging,
    urgentHiring: !!row.urgent_hiring,
    applicantsCount: Number(row.applicants_count || 0),
    applicationStatus: row.application_status || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}


async function jpEnsureColumn(tableName, columnName, definition) {
  const [rows] = await db.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName],
  );

  if (!rows.length) {
    await db.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

async function ensureJobPortalSchema() {
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

  await db.query(`CREATE TABLE IF NOT EXISTS job_portal_jobs (
    id VARCHAR(64) PRIMARY KEY,
    employer_id VARCHAR(64) NOT NULL,
    title VARCHAR(190) NOT NULL,
    category VARCHAR(80) NOT NULL DEFAULT 'other',
    type VARCHAR(40) NOT NULL DEFAULT 'full-time',
    salary_min INT NULL,
    salary_max INT NULL,
    salary_text VARCHAR(120) NULL,
    location VARCHAR(190) NULL,
    address TEXT NULL,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    description TEXT NULL,
    requirements TEXT NULL,
    openings INT NOT NULL DEFAULT 1,
    active TINYINT(1) NOT NULL DEFAULT 1,
    allow_messaging TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_jp_jobs_employer (employer_id),
    KEY idx_jp_jobs_category (category),
    KEY idx_jp_jobs_active (active)
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS job_portal_applications (
    id VARCHAR(64) PRIMARY KEY,
    job_id VARCHAR(64) NOT NULL,
    seeker_id VARCHAR(64) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'applied',
    status_note TEXT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_jp_application (job_id, seeker_id),
    KEY idx_jp_app_job (job_id),
    KEY idx_jp_app_seeker (seeker_id),
    KEY idx_jp_app_status (status)
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS job_portal_messages (
    id VARCHAR(64) PRIMARY KEY,
    job_id VARCHAR(64) NULL,
    application_id VARCHAR(64) NULL,
    sender_id VARCHAR(64) NOT NULL,
    receiver_id VARCHAR(64) NOT NULL,
    message TEXT NOT NULL,
    read_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_jp_msg_pair (sender_id, receiver_id),
    KEY idx_jp_msg_job (job_id),
    KEY idx_jp_msg_app (application_id)
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS job_portal_notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    title VARCHAR(190) NOT NULL,
    body TEXT NULL,
    type VARCHAR(60) NULL,
    ref_id VARCHAR(64) NULL,
    read_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_jp_notif_user (user_id),
    KEY idx_jp_notif_read (read_at)
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS job_portal_resumes (
    user_id VARCHAR(64) PRIMARY KEY,
    summary TEXT NULL,
    skills_json LONGTEXT NULL,
    education_json LONGTEXT NULL,
    experience_json LONGTEXT NULL,
    certifications_json LONGTEXT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`);

  await jpEnsureColumn("job_portal_jobs", "shift", "VARCHAR(60) NULL AFTER type");
  await jpEnsureColumn("job_portal_jobs", "job_mode", "VARCHAR(40) NULL AFTER shift");
  await jpEnsureColumn("job_portal_jobs", "work_start_time", "VARCHAR(20) NULL AFTER job_mode");
  await jpEnsureColumn("job_portal_jobs", "work_end_time", "VARCHAR(20) NULL AFTER work_start_time");
  await jpEnsureColumn("job_portal_jobs", "working_days", "VARCHAR(120) NULL AFTER work_end_time");
  await jpEnsureColumn("job_portal_jobs", "weekly_off", "VARCHAR(80) NULL AFTER working_days");
  await jpEnsureColumn("job_portal_jobs", "experience_required", "VARCHAR(120) NULL AFTER requirements");
  await jpEnsureColumn("job_portal_jobs", "education_required", "VARCHAR(160) NULL AFTER experience_required");
  await jpEnsureColumn("job_portal_jobs", "skills_required", "TEXT NULL AFTER education_required");
  await jpEnsureColumn("job_portal_jobs", "benefits", "TEXT NULL AFTER skills_required");
  await jpEnsureColumn("job_portal_jobs", "joining_preference", "VARCHAR(120) NULL AFTER benefits");
  await jpEnsureColumn("job_portal_jobs", "last_date_to_apply", "DATE NULL AFTER joining_preference");
  await jpEnsureColumn("job_portal_jobs", "urgent_hiring", "TINYINT(1) NOT NULL DEFAULT 0 AFTER allow_messaging");
  await jpEnsureColumn("job_portal_messages", "message_type", "VARCHAR(20) NOT NULL DEFAULT 'text' AFTER message");
  await jpEnsureColumn("job_portal_messages", "media_url", "LONGTEXT NULL AFTER message_type");
  await jpEnsureColumn("job_portal_messages", "read_at", "DATETIME NULL AFTER media_url");
}

app.get("/api/job-portal/health", async (req, res) => {
  try {
    await ensureJobPortalSchema();
    res.json({ success: true, message: "Job Portal MySQL schema ready" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/job-portal/register", async (req, res) => {
  try {
    await ensureJobPortalSchema();

    const role = String(req.body.role || "").trim();
    const phone = jpPhone(req.body.phone || req.body.mobile);
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim();
    const id = req.body.id || jpCreateId(role === "employer" ? "emp" : "seek");

    if (!["seeker", "employer"].includes(role)) {
      return jpBadRequest(res, "Valid role is required");
    }

    if (name.split(/\s+/).filter(Boolean).length < 2 || !/^[A-Za-z .'-]+$/.test(name)) {
      return jpBadRequest(res, "Enter a valid full name");
    }

    if (phone.length !== 10) {
      return jpBadRequest(res, "Enter a valid 10 digit contact number");
    }

    if (!verifyOtpProof(req, phone, ["register"])) {
      return res.status(401).json({ success: false, error: "Verified OTP is required to register" });
    }

    if (!jpEmailOk(email)) {
      return jpBadRequest(res, "Enter a valid email address");
    }

    if (role === "seeker" && !req.body.dob) {
      return jpBadRequest(res, "Date of birth is required");
    }

    if (role === "employer" && (!req.body.company || !req.body.address)) {
      return jpBadRequest(res, "Company name and address are required");
    }

    const savedProfilePhoto = await saveDataUriToUploads(
      req.body.profilePhoto || req.body.profile_photo,
      "job_profile",
      req,
      { allowedMimeTypes: IMAGE_MIME_TYPES },
    );

    await db.query(
      `INSERT INTO job_portal_users
       (id, role, name, dob, phone, email, avatar_color, profile_photo, qualification, skills, about, current_status, experience, location, languages, company, contact_person, gst_no, industry, website, company_description, address, pincode, whatsapp, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       name=VALUES(name),
       dob=VALUES(dob),
       email=VALUES(email),
       avatar_color=VALUES(avatar_color),
       profile_photo=VALUES(profile_photo),
       qualification=VALUES(qualification),
       skills=VALUES(skills),
       about=VALUES(about),
       current_status=VALUES(current_status),
       experience=VALUES(experience),
       location=VALUES(location),
       languages=VALUES(languages),
       company=VALUES(company),
       contact_person=VALUES(contact_person),
       gst_no=VALUES(gst_no),
       industry=VALUES(industry),
       website=VALUES(website),
       company_description=VALUES(company_description),
       address=VALUES(address),
       pincode=VALUES(pincode),
       whatsapp=VALUES(whatsapp),
       latitude=VALUES(latitude),
       longitude=VALUES(longitude)`,
      [
        id,
        role,
        name,
        req.body.dob || null,
        phone,
        email || null,
        req.body.avatarColor || req.body.avatar_color || "#059669",
        savedProfilePhoto || null,
        req.body.qualification || null,
        req.body.skills || null,
        req.body.about || null,
        req.body.currentStatus || req.body.current_status || null,
        req.body.experience || null,
        req.body.location || null,
        req.body.languages || null,
        req.body.company || null,
        req.body.contactPerson || req.body.contact_person || null,
        req.body.gstNo || req.body.gst_no || null,
        req.body.industry || null,
        req.body.website || null,
        req.body.companyDescription || req.body.company_description || null,
        req.body.address || null,
        req.body.pincode || null,
        req.body.whatsapp || phone,
        req.body.latitude || null,
        req.body.longitude || null,
      ],
    );

    const [rows] = await db.query(
      "SELECT * FROM job_portal_users WHERE phone = ? AND role = ? LIMIT 1",
      [phone, role],
    );

    const user = jpUser(rows[0]);
    res.status(201).json({
      success: true,
      user,
      token: signToken({ sub: user.id, mobile: user.phone, role: user.role, scope: "job_portal" }),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/job-portal/login", async (req, res) => {
  try {
    await ensureJobPortalSchema();

    const role = String(req.body.role || "").trim();
    const phone = jpPhone(req.body.phone || req.body.mobile);

    if (!["seeker", "employer"].includes(role)) {
      return jpBadRequest(res, "Valid role is required");
    }

    if (phone.length !== 10) {
      return jpBadRequest(res, "Enter a valid 10 digit contact number");
    }

    if (!verifyOtpProof(req, phone, ["login"])) {
      return res.status(401).json({ success: false, error: "Verified OTP is required to login" });
    }

    const [rows] = await db.query(
      "SELECT * FROM job_portal_users WHERE phone = ? AND role = ? LIMIT 1",
      [phone, role],
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        error: "Account not found. Please register first.",
      });
    }

    const user = jpUser(rows[0]);
    res.json({
      success: true,
      user,
      token: signToken({ sub: user.id, mobile: user.phone, role: user.role, scope: "job_portal" }),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/job-portal/users/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM job_portal_users WHERE id = ? LIMIT 1",
      [req.params.id],
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({ success: true, user: jpUser(rows[0]) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/job-portal/users/:id", async (req, res) => {
  try {
    await ensureJobPortalSchema();

    if (Object.prototype.hasOwnProperty.call(req.body, "profilePhoto")) {
      req.body.profilePhoto = await saveDataUriToUploads(req.body.profilePhoto, "job_profile", req, {
        allowedMimeTypes: IMAGE_MIME_TYPES,
      });
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "name") && String(req.body.name || "").trim().split(/\s+/).filter(Boolean).length < 2) {
      return jpBadRequest(res, "Enter your full name, including surname");
    }
    if (req.body.name && String(req.body.name).trim().length > 160) {
      return jpBadRequest(res, "Full name is too long");
    }
    if (req.body.dob && (!isIsoDate(req.body.dob) || new Date(`${req.body.dob}T00:00:00.000Z`).getTime() > Date.now())) {
      return jpBadRequest(res, "Enter a valid date of birth");
    }
    if (req.body.currentStatus && !["employed", "unemployed", "student", "fresher"].includes(req.body.currentStatus)) {
      return jpBadRequest(res, "Select a valid current status");
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "latitude") || Object.prototype.hasOwnProperty.call(req.body, "longitude")) {
      const coordinates = validateCoordinates(req.body.latitude, req.body.longitude, undefined);
      if (!coordinates.valid) return jpBadRequest(res, coordinates.message);
      req.body.latitude = coordinates.latitude;
      req.body.longitude = coordinates.longitude;
    }

    const allowed = {
      name: "name",
      dob: "dob",
      email: "email",
      avatarColor: "avatar_color",
      profilePhoto: "profile_photo",
      qualification: "qualification",
      skills: "skills",
      about: "about",
      currentStatus: "current_status",
      experience: "experience",
      location: "location",
      languages: "languages",
      company: "company",
      contactPerson: "contact_person",
      gstNo: "gst_no",
      industry: "industry",
      website: "website",
      companyDescription: "company_description",
      address: "address",
      pincode: "pincode",
      whatsapp: "whatsapp",
      latitude: "latitude",
      longitude: "longitude",
    };

    const sets = [];
    const params = [];

    for (const [bodyKey, col] of Object.entries(allowed)) {
      if (Object.prototype.hasOwnProperty.call(req.body, bodyKey)) {
        if (bodyKey === "email" && !jpEmailOk(req.body[bodyKey])) {
          return jpBadRequest(res, "Enter a valid email address");
        }

        sets.push(`${col} = ?`);
        params.push(req.body[bodyKey] || null);
      }
    }

    if (!sets.length) {
      return jpBadRequest(res, "No valid fields to update");
    }

    params.push(req.params.id);
    const [result] = await db.query(`UPDATE job_portal_users SET ${sets.join(", ")} WHERE id = ?`, params);
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, error: "Job Portal profile not found" });
    }

    const [rows] = await db.query(
      "SELECT * FROM job_portal_users WHERE id = ? LIMIT 1",
      [req.params.id],
    );

    res.json({ success: true, user: jpUser(rows[0]) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/job-portal/jobs", async (req, res) => {
  try {
    await ensureJobPortalSchema();

    const {
      search,
      category,
      type,
      employerId,
      active = "true",
      viewerId,
      userLat,
      userLng,
    } = req.query;

    const params = [];
    const where = ["1=1"];

    if (active !== "all") {
      where.push("j.active = ?");
      params.push(active === "false" ? 0 : 1);
    }

    if (category) {
      where.push("j.category = ?");
      params.push(category);
    }

    if (type) {
      where.push("j.type = ?");
      params.push(type);
    }

    if (employerId) {
      where.push("j.employer_id = ?");
      params.push(employerId);
    }

    if (search) {
      where.push("(j.title LIKE ? OR j.location LIKE ? OR j.description LIKE ? OR u.company LIKE ? OR j.category LIKE ?)");
      const like = `%${search}%`;
      params.push(like, like, like, like, like);
    }

    const lat = Number(userLat);
    const lng = Number(userLng);

    const distanceSql =
      Number.isFinite(lat) && Number.isFinite(lng)
        ? `ROUND(6371 * ACOS(COS(RADIANS(?)) * COS(RADIANS(j.latitude)) * COS(RADIANS(j.longitude) - RADIANS(?)) + SIN(RADIANS(?)) * SIN(RADIANS(j.latitude))), 2)`
        : "NULL";

    const distanceParams = Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng, lat] : [];

    const viewerJoin = viewerId
      ? "LEFT JOIN job_portal_applications mine ON mine.job_id = j.id AND mine.seeker_id = ?"
      : "LEFT JOIN job_portal_applications mine ON 1=0";

    const viewerParams = viewerId ? [viewerId] : [];

    const [rows] = await db.query(
      `SELECT
         j.*,
         u.name AS employer_name,
         u.phone AS employer_phone,
         u.whatsapp AS employer_whatsapp,
         u.company,
         COUNT(a.id) AS applicants_count,
         MAX(mine.status) AS application_status,
         ${distanceSql} AS distance_km
       FROM job_portal_jobs j
       JOIN job_portal_users u ON u.id = j.employer_id
       LEFT JOIN job_portal_applications a ON a.job_id = j.id
       ${viewerJoin}
       WHERE ${where.join(" AND ")}
       GROUP BY j.id
       ORDER BY ${Number.isFinite(lat) && Number.isFinite(lng) ? "distance_km IS NULL, distance_km ASC," : ""} j.created_at DESC`,
      [...distanceParams, ...viewerParams, ...params],
    );

    const viewer = req.jobPortalViewer;
    res.json({
      success: true,
      jobs: rows.map((row) => {
        return jpJob(redactJobContact(row, viewer));
      }),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/job-portal/jobs", async (req, res) => {
  try {
    await ensureJobPortalSchema();

    const employerId = req.body.employerId || req.body.employer_id;
    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();
    const requirements = String(req.body.requirements || "").trim();

    if (!employerId) return jpBadRequest(res, "Employer id is required");
    if (title.length < 3) return jpBadRequest(res, "Job title is required");

    if (jpWordCount(description) < 5 || jpWordCount(description) > 100) {
      return jpBadRequest(res, "Description must be between 5 and 100 words");
    }

    if (requirements && jpWordCount(requirements) > 100) {
      return jpBadRequest(res, "Requirements must be maximum 100 words");
    }

    const [empRows] = await db.query(
      'SELECT * FROM job_portal_users WHERE id = ? AND role = "employer" LIMIT 1',
      [employerId],
    );

    if (!empRows.length) {
      return jpBadRequest(res, "Employer account not found");
    }

    const id = req.body.id || jpCreateId("job");

    await db.query(
      `INSERT INTO job_portal_jobs
       (id, employer_id, title, category, type, shift, job_mode, work_start_time, work_end_time, working_days, weekly_off, salary_min, salary_max, salary_text, location, address, latitude, longitude, description, requirements, experience_required, education_required, skills_required, benefits, joining_preference, last_date_to_apply, openings, active, allow_messaging, urgent_hiring)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        employerId,
        title,
        req.body.category || "other",
        req.body.type || "full-time",
        req.body.shift || null,
        req.body.jobMode || req.body.job_mode || null,
        req.body.workStartTime || req.body.work_start_time || null,
        req.body.workEndTime || req.body.work_end_time || null,
        req.body.workingDays || req.body.working_days || null,
        req.body.weeklyOff || req.body.weekly_off || null,
        req.body.salaryMin || null,
        req.body.salaryMax || null,
        req.body.salary || req.body.salaryText || null,
        req.body.location || null,
        req.body.address || empRows[0].address || null,
        req.body.latitude || null,
        req.body.longitude || null,
        description,
        requirements || null,
        req.body.experienceRequired || req.body.experience_required || null,
        req.body.educationRequired || req.body.education_required || null,
        req.body.skillsRequired || req.body.skills_required || null,
        req.body.benefits || null,
        req.body.joiningPreference || req.body.joining_preference || null,
        req.body.lastDateToApply || req.body.last_date_to_apply || null,
        Number(req.body.openings || 1),
        req.body.active === false ? 0 : 1,
        req.body.allowMessaging === false ? 0 : 1,
        req.body.urgentHiring === true ? 1 : 0,
      ],
    );

    const [rows] = await db.query(
      `SELECT
         j.*,
         u.name AS employer_name,
         u.phone AS employer_phone,
         u.whatsapp AS employer_whatsapp,
         u.company,
         0 AS applicants_count,
         NULL AS application_status,
         NULL AS distance_km
       FROM job_portal_jobs j
       JOIN job_portal_users u ON u.id = j.employer_id
       WHERE j.id = ?`,
      [id],
    );

    res.status(201).json({ success: true, job: jpJob(rows[0]) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/job-portal/jobs/:id", async (req, res) => {
  try {
    await ensureJobPortalSchema();

    const allowed = {
      title: "title",
      category: "category",
      type: "type",
      shift: "shift",
      jobMode: "job_mode",
      workStartTime: "work_start_time",
      workEndTime: "work_end_time",
      workingDays: "working_days",
      weeklyOff: "weekly_off",
      salary: "salary_text",
      salaryMin: "salary_min",
      salaryMax: "salary_max",
      location: "location",
      address: "address",
      description: "description",
      requirements: "requirements",
      experienceRequired: "experience_required",
      educationRequired: "education_required",
      skillsRequired: "skills_required",
      benefits: "benefits",
      joiningPreference: "joining_preference",
      lastDateToApply: "last_date_to_apply",
      openings: "openings",
      active: "active",
      allowMessaging: "allow_messaging",
      urgentHiring: "urgent_hiring",
    };

    const sets = [];
    const params = [];

    for (const [bodyKey, col] of Object.entries(allowed)) {
      if (Object.prototype.hasOwnProperty.call(req.body, bodyKey)) {
        if (
          bodyKey === "description" &&
          (jpWordCount(req.body[bodyKey]) < 5 || jpWordCount(req.body[bodyKey]) > 100)
        ) {
          return jpBadRequest(res, "Description must be between 5 and 100 words");
        }

        sets.push(`${col} = ?`);
        params.push(typeof req.body[bodyKey] === "boolean" ? (req.body[bodyKey] ? 1 : 0) : req.body[bodyKey]);
      }
    }

    if (!sets.length) {
      return jpBadRequest(res, "No valid fields to update");
    }

    params.push(req.params.id);
    await db.query(`UPDATE job_portal_jobs SET ${sets.join(", ")} WHERE id = ?`, params);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/job-portal/jobs/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM job_portal_jobs WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/job-portal/jobs/:id/apply", async (req, res) => {
  try {
    await ensureJobPortalSchema();

    const seekerId = req.body.seekerId || req.body.seeker_id;

    if (!seekerId) {
      return jpBadRequest(res, "Seeker id is required");
    }

    const appId = jpCreateId("app");

    await db.query(
      `INSERT INTO job_portal_applications (id, job_id, seeker_id, status)
       VALUES (?, ?, ?, 'applied')
       ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
      [appId, req.params.id, seekerId],
    );

    const [rows] = await db.query(
      "SELECT * FROM job_portal_applications WHERE job_id = ? AND seeker_id = ? LIMIT 1",
      [req.params.id, seekerId],
    );

    res.status(201).json({ success: true, application: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/job-portal/applications", async (req, res) => {
  try {
    await ensureJobPortalSchema();

    const { seekerId, employerId, jobId } = req.query;
    const where = [];
    const params = [];

    if (seekerId) {
      where.push("a.seeker_id = ?");
      params.push(seekerId);
    }

    if (employerId) {
      where.push("j.employer_id = ?");
      params.push(employerId);
    }

    if (jobId) {
      where.push("a.job_id = ?");
      params.push(jobId);
    }

    const [rows] = await db.query(
      `SELECT
         a.*,
         j.title,
         j.category,
         j.type,
         j.salary_text,
         j.location,
         j.openings,
         u.company,
         u.name AS employer_name,
         u.phone AS employer_phone,
         u.whatsapp AS employer_whatsapp,
         s.name AS seeker_name,
         s.phone AS seeker_phone,
         s.email AS seeker_email,
         s.skills AS seeker_skills,
         s.qualification AS seeker_qualification,
         s.profile_photo AS seeker_profile_photo
       FROM job_portal_applications a
       JOIN job_portal_jobs j ON j.id = a.job_id
       JOIN job_portal_users u ON u.id = j.employer_id
       JOIN job_portal_users s ON s.id = a.seeker_id
       ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY a.updated_at DESC`,
      params,
    );

    const applications = rows.map((row) => redactApplicationContact(row, req.jobPortalViewer));
    res.json({ success: true, applications });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/job-portal/applications/:id/status", async (req, res) => {
  try {
    const status = String(req.body.status || "").trim();

    if (!["applied", "shortlisted", "rejected", "hired"].includes(status)) {
      return jpBadRequest(res, "Invalid application status");
    }

    await db.query(
      "UPDATE job_portal_applications SET status = ?, status_note = ? WHERE id = ?",
      [status, req.body.statusNote || req.body.status_note || null, req.params.id],
    );

    const [appRows] = await db.query(
      "SELECT seeker_id FROM job_portal_applications WHERE id = ? LIMIT 1",
      [req.params.id],
    );

    if (appRows.length) {
      await db.query(
        "INSERT INTO job_portal_notifications (id, user_id, title, body, type, ref_id) VALUES (?, ?, ?, ?, ?, ?)",
        [
          jpCreateId("notif"),
          appRows[0].seeker_id,
          "Application updated",
          `Your application status is now ${status}.`,
          "job_application_status",
          req.params.id,
        ],
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/job-portal/messages", async (req, res) => {
  try {
    const { userId, peerId, jobId, applicationId } = req.query;

    const where = [];
    const params = [];

    if (!userId) {
      return jpBadRequest(res, "userId is required");
    }

    if (peerId) {
      where.push("((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))");
      params.push(userId, peerId, peerId, userId);
    } else {
      where.push("(sender_id = ? OR receiver_id = ?)");
      params.push(userId, userId);
    }

    if (jobId) {
      where.push("job_id = ?");
      params.push(jobId);
    }

    if (applicationId) {
      where.push("application_id = ?");
      params.push(applicationId);
    }

    if (peerId) {
      const updateWhere = ["receiver_id = ?", "sender_id = ?", "read_at IS NULL"];
      const updateParams = [userId, peerId];
      if (jobId) {
        updateWhere.push("job_id = ?");
        updateParams.push(jobId);
      }
      await db.query(
        `UPDATE job_portal_messages SET read_at = NOW() WHERE ${updateWhere.join(" AND ")}`,
        updateParams,
      );
    }

    const [rows] = await db.query(
      `SELECT * FROM job_portal_messages WHERE ${where.join(" AND ")} ORDER BY created_at ASC`,
      params,
    );

    res.json({ success: true, messages: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/job-portal/messages", async (req, res) => {
  try {
    const senderId = req.body.senderId || req.body.sender_id;
    const receiverId = req.body.receiverId || req.body.receiver_id;
    const message = String(req.body.message || "").trim();
    const messageType = String(req.body.messageType || req.body.message_type || "text").trim();
    const mediaUrl = await saveDataUriToUploads(
      req.body.mediaUrl || req.body.media_url,
      "job_message",
      req,
      { allowedMimeTypes: IMAGE_MIME_TYPES },
    );

    if (!senderId || !receiverId || (!message && !mediaUrl)) {
      return jpBadRequest(res, "senderId, receiverId and message or media are required");
    }
    if (message.length > 500 || !["text", "image"].includes(messageType)) {
      return jpBadRequest(res, "Message must be 500 characters or fewer and use a supported type");
    }

    const id = jpCreateId("msg");

    await db.query(
      `INSERT INTO job_portal_messages
       (id, job_id, application_id, sender_id, receiver_id, message, message_type, media_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.body.jobId || req.body.job_id || null,
        req.body.applicationId || req.body.application_id || null,
        senderId,
        receiverId,
        message || "Photo",
        messageType || "text",
        mediaUrl || null,
      ],
    );

    const [rows] = await db.query(
      "SELECT * FROM job_portal_messages WHERE id = ? LIMIT 1",
      [id],
    );

    res.status(201).json({ success: true, message: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/job-portal/messages/:id", async (req, res) => {
  try {
    const userId = String(req.query.userId || req.body?.userId || "").trim();
    const mode = String(req.query.mode || req.body?.mode || "delete").trim();
    if (!userId) return jpBadRequest(res, "userId is required");

    if (mode === "unsend") {
      await db.query(
        "DELETE FROM job_portal_messages WHERE id = ? AND sender_id = ?",
        [req.params.id, userId],
      );
      return res.json({ success: true, mode });
    }

    await db.query(
      "UPDATE job_portal_messages SET message = '[deleted]', media_url = NULL WHERE id = ? AND (sender_id = ? OR receiver_id = ?)",
      [req.params.id, userId, userId],
    );
    return res.json({ success: true, mode: "delete" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/job-portal/resume/:userId", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM job_portal_resumes WHERE user_id = ? LIMIT 1",
      [req.params.userId],
    );

    res.json({ success: true, resume: rows[0] || null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/job-portal/resume/:userId", async (req, res) => {
  try {
    await ensureJobPortalSchema();

    await db.query(
      `INSERT INTO job_portal_resumes
       (user_id, summary, skills_json, education_json, experience_json, certifications_json)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       summary=VALUES(summary),
       skills_json=VALUES(skills_json),
       education_json=VALUES(education_json),
       experience_json=VALUES(experience_json),
       certifications_json=VALUES(certifications_json)`,
      [
        req.params.userId,
        req.body.summary || null,
        JSON.stringify(req.body.skills || []),
        JSON.stringify(req.body.education || []),
        JSON.stringify(req.body.experience || []),
        JSON.stringify(req.body.certifications || []),
      ],
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/job-portal/notifications/:userId", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM job_portal_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100",
      [req.params.userId],
    );

    res.json({ success: true, notifications: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/job-portal/admin/analytics", async (req, res) => {
  try {
    await ensureJobPortalSchema();

    const [[users]] = await db.query(
      `SELECT
         SUM(role='seeker') AS seekers,
         SUM(role='employer') AS employers
       FROM job_portal_users`,
    );

    const [[jobs]] = await db.query(
      `SELECT COUNT(*) AS totalJobs, SUM(active=1) AS activeJobs
       FROM job_portal_jobs`,
    );

    const [[apps]] = await db.query(
      `SELECT
         COUNT(*) AS totalApplications,
         SUM(status='shortlisted') AS shortlisted,
         SUM(status='hired') AS hired,
         SUM(status='rejected') AS rejected
       FROM job_portal_applications`,
    );

    const [byCategory] = await db.query(
      `SELECT category, COUNT(*) AS count
       FROM job_portal_jobs
       GROUP BY category
       ORDER BY count DESC`,
    );

    res.json({
      success: true,
      analytics: {
        users,
        jobs,
        applications: apps,
        byCategory,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

ensureJobPortalSchema()
  .then(() => console.log("[Connect-T] Job Portal MySQL schema ready"))
  .catch((err) => console.error("[Connect-T] Job Portal schema warning:", err.message));
/* END JOB PORTAL MYSQL API V1 */



// Permanent SMS gateway settings API.
// Stores Dove SMS settings in MySQL app_settings table.
// Credentials are never stored in mobile app code.
app.get("/api/admin/sms-settings", async (req, res) => {
  try {
    if (!(await adminAccessAllowed(req))) {
      return res.status(403).json({ success: false, error: "Admin API key required" });
    }

    const { getDoveSmsSettingsSafe } = require("./smsProvider");
    const settings = await getDoveSmsSettingsSafe();

    return res.json({ success: true, settings });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || "Failed to read SMS settings" });
  }
});

app.post("/api/admin/sms-settings", async (req, res) => {
  try {
    if (!(await adminAccessAllowed(req))) {
      return res.status(403).json({ success: false, error: "Admin API key required" });
    }

    const { saveDoveSmsSettings } = require("./smsProvider");
    const result = await saveDoveSmsSettings(req.body || {});

    return res.json({
      success: true,
      message: "Dove SMS settings saved successfully",
      ...result,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || "Failed to save SMS settings" });
  }
});


/* 404 */
app.use((req, res) => {
  res.status(404).json(safeNotFoundPayload(res.locals.requestId));
});

installSafeErrorHandler(app);


const PORT = process.env.PORT || 3000;


app.listen(PORT, "0.0.0.0", () => {
  console.log(`Connect-T backend running on port ${PORT}`);
});
