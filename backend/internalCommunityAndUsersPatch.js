"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { verifyRequestToken } = require("./authSecurity");
const { hasExpectedSignature, UPLOAD_DIR } = require("./mediaStorage");
const { isPrivilegedRoleActive } = require("./roleAuthorization");

const COMMUNITY_TYPES = new Set(["message", "update", "notice", "information"]);
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime"]);
const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 50 * 1024 * 1024;
let pool = null;
let installed = false;
let schemaReady = null;

const clean = (value, max = 5000) => String(value || "").trim().slice(0, max);
const makeId = (prefix) => `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
const isAdmin = (user) => !!user && (user.role === "super_admin" || !!user.is_super_admin);
const isOfficer = (user) => !!user && user.role === "nagarsevak" && String(user.approval_status || "") === "approved";

async function currentUser(req) {
  const auth = verifyRequestToken(req);
  if (!auth?.sub || auth.scope === "job_portal") return null;
  const [rows] = await pool.query(
    `SELECT id, name, mobile, role, ward, ward_code, ward_number, avatar_color,
            profile_photo, email, address, is_super_admin, approval_status, created_at, last_login_at
     FROM users WHERE id = ? LIMIT 1`,
    [auth.sub],
  );
  const user = rows[0] || null;
  if (!user) return null;
  if (["nagarsevak", "super_admin"].includes(user.role)) {
    const active = await isPrivilegedRoleActive(pool, { userId: user.id, mobile: user.mobile, role: user.role });
    if (!active) return null;
  }
  return user;
}

async function requireCommunity(req, res) {
  const user = await currentUser(req);
  if (!user) {
    res.status(401).json({ success: false, code: "SESSION_INVALID", error: "Please log in again." });
    return null;
  }
  if (!isAdmin(user) && !isOfficer(user)) {
    res.status(403).json({ success: false, error: "Only approved Nagarsevaks and Super Admin can access this community." });
    return null;
  }
  return user;
}

async function requireAdmin(req, res) {
  const user = await currentUser(req);
  if (!user || !isAdmin(user)) {
    res.status(403).json({ success: false, error: "Super Admin access required." });
    return null;
  }
  return user;
}

async function ensureSchema() {
  if (!pool) throw new Error("Database pool is unavailable");
  if (schemaReady) return schemaReady;
  schemaReady = pool.query(`CREATE TABLE IF NOT EXISTS nagarsevak_community_posts (
    id VARCHAR(80) PRIMARY KEY,
    author_id VARCHAR(80) NOT NULL,
    author_name VARCHAR(190) NOT NULL,
    author_role VARCHAR(40) NOT NULL,
    ward VARCHAR(80) NULL,
    post_type VARCHAR(30) NOT NULL DEFAULT 'message',
    title VARCHAR(255) NULL,
    content TEXT NULL,
    media_uri TEXT NULL,
    media_type VARCHAR(20) NULL,
    media_file_name VARCHAR(255) NULL,
    media_mime_type VARCHAR(120) NULL,
    media_size_bytes BIGINT NULL,
    media_duration_seconds INT NULL,
    edited_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_ng_community_created (created_at),
    KEY idx_ng_community_author (author_id),
    KEY idx_ng_community_type (post_type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`).catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

function readUInt64(buffer, offset) {
  if (offset < 0 || offset + 8 > buffer.length) return 0;
  const value = buffer.readBigUInt64BE(offset);
  return value > BigInt(Number.MAX_SAFE_INTEGER) ? 0 : Number(value);
}

function videoDuration(buffer) {
  let index = 0;
  while (index + 4 <= buffer.length) {
    const marker = buffer.indexOf("mvhd", index, "ascii");
    if (marker < 0) break;
    if (marker + 40 <= buffer.length) {
      const version = buffer[marker + 4];
      const timescaleOffset = version === 1 ? marker + 24 : marker + 16;
      const durationOffset = version === 1 ? marker + 28 : marker + 20;
      const timescale = buffer.readUInt32BE(timescaleOffset);
      const duration = version === 1 ? readUInt64(buffer, durationOffset) : buffer.readUInt32BE(durationOffset);
      if (timescale > 0 && duration > 0) return duration / timescale;
    }
    index = marker + 4;
  }
  return null;
}

function validateMedia(file) {
  if (!file) return null;
  const mime = String(file.mimetype || "").toLowerCase();
  const image = IMAGE_TYPES.has(mime);
  const video = VIDEO_TYPES.has(mime);
  if (!image && !video) throw Object.assign(new Error("Choose a JPEG, PNG, WebP, MP4 or MOV file."), { status: 415 });
  if (!file.buffer?.length || file.buffer.length > (video ? MAX_VIDEO : MAX_IMAGE)) {
    throw Object.assign(new Error(video ? "Video must be smaller than 50MB." : "Image must be smaller than 10MB."), { status: 413 });
  }
  if (!hasExpectedSignature(file.buffer, mime)) throw Object.assign(new Error("The selected file content does not match its file type."), { status: 415 });
  const duration = video ? videoDuration(file.buffer) : null;
  if (video && (!duration || !Number.isFinite(duration))) throw Object.assign(new Error("The video duration could not be verified."), { status: 422 });
  if (video && duration > 300.5) throw Object.assign(new Error("Video duration cannot exceed 5 minutes."), { status: 422 });
  const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/quicktime": "mov" }[mime];
  return { mime, type: video ? "video" : "image", extension, size: file.buffer.length, duration: duration ? Math.ceil(duration) : null, originalName: clean(file.originalname, 255) || `community.${extension}` };
}

const baseUrl = (req) => String(process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");

async function saveMedia(file, meta, req) {
  if (!file || !meta) return null;
  const fileName = `nagarsevak_community_${Date.now()}_${crypto.randomBytes(8).toString("hex")}.${meta.extension}`;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const filePath = path.join(UPLOAD_DIR, fileName);
  await fs.promises.writeFile(filePath, file.buffer, { flag: "wx" });
  return { filePath, uri: `${baseUrl(req)}/uploads/${fileName}` };
}

async function removeMedia(uri) {
  const fileName = path.basename(String(uri || "").split("?")[0]);
  if (!fileName.startsWith("nagarsevak_community_")) return;
  await fs.promises.unlink(path.join(UPLOAD_DIR, fileName)).catch(() => undefined);
}

const pageNumber = (value) => Math.max(1, Number.parseInt(String(value || "1"), 10) || 1);

async function listUsers(req, res) {
  try {
    if (!(await requireAdmin(req, res))) return;
    const page = pageNumber(req.query?.page);
    const limit = 10;
    const offset = (page - 1) * limit;
    const role = clean(req.query?.role, 40).toLowerCase();
    const query = clean(req.query?.q, 120);
    const conditions = [];
    const values = [];
    if (role && role !== "all") { conditions.push("role = ?"); values.push(role); }
    if (query) {
      conditions.push("(name LIKE ? OR mobile LIKE ? OR email LIKE ? OR ward LIKE ? OR ward_code LIKE ?)");
      const like = `%${query}%`;
      values.push(like, like, like, like, like);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM users ${where}`, values);
    const total = Number(countRows?.[0]?.total || 0);
    const [users] = await pool.query(
      `SELECT id, name, mobile, role, ward, ward_code, ward_number, email, address,
              approval_status, avatar_color, profile_photo, created_at, last_login_at
       FROM users ${where} ORDER BY created_at DESC, name ASC LIMIT ? OFFSET ?`,
      [...values, limit, offset],
    );
    const [roleCounts] = await pool.query("SELECT role, COUNT(*) AS count FROM users GROUP BY role ORDER BY role");
    return res.json({ success: true, users, roleCounts, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (error) {
    console.warn("[InternalCommunityUsers] users failed", error?.code || error?.name || "users_error");
    return res.status(500).json({ success: false, error: "App users could not be loaded right now." });
  }
}

async function listPosts(req, res) {
  try {
    await ensureSchema();
    const user = await requireCommunity(req, res);
    if (!user) return;
    const page = pageNumber(req.query?.page);
    const limit = 20;
    const offset = (page - 1) * limit;
    const type = clean(req.query?.type, 30).toLowerCase();
    const where = type && type !== "all" && COMMUNITY_TYPES.has(type) ? "WHERE post_type = ?" : "";
    const values = where ? [type] : [];
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM nagarsevak_community_posts ${where}`, values);
    const total = Number(countRows?.[0]?.total || 0);
    const [posts] = await pool.query(
      `SELECT * FROM nagarsevak_community_posts ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [...values, limit, offset],
    );
    return res.json({ success: true, posts, currentUser: { id: user.id, role: isAdmin(user) ? "super_admin" : "nagarsevak", isAdmin: isAdmin(user) }, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (error) {
    console.warn("[InternalCommunityUsers] list failed", error?.code || error?.name || "community_list_error");
    return res.status(500).json({ success: false, error: "Nagarsevak Community could not be loaded right now." });
  }
}

async function createPost(req, res) {
  let stored = null;
  try {
    await ensureSchema();
    const user = await requireCommunity(req, res);
    if (!user) return;
    const postType = clean(req.body?.postType || req.body?.post_type || "message", 30).toLowerCase();
    const title = clean(req.body?.title, 255);
    const content = clean(req.body?.content, 5000);
    if (!COMMUNITY_TYPES.has(postType)) return res.status(400).json({ success: false, error: "Choose Message, Update, Notice or Information." });
    const media = validateMedia(req.file);
    if (!content && !media) return res.status(400).json({ success: false, error: "Enter a message or attach an image/video." });
    if (media) stored = await saveMedia(req.file, media, req);
    const id = makeId("ngcommunity");
    await pool.query(
      `INSERT INTO nagarsevak_community_posts
       (id, author_id, author_name, author_role, ward, post_type, title, content,
        media_uri, media_type, media_file_name, media_mime_type, media_size_bytes, media_duration_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, user.id, clean(user.name, 190) || "Nagarsevak", isAdmin(user) ? "super_admin" : "nagarsevak", user.ward || (user.ward_code ? `Ward ${user.ward_code}` : null), postType, title || null, content || null, stored?.uri || null, media?.type || null, media?.originalName || null, media?.mime || null, media?.size || null, media?.duration || null],
    );
    const [rows] = await pool.query("SELECT * FROM nagarsevak_community_posts WHERE id = ? LIMIT 1", [id]);
    return res.status(201).json({ success: true, post: rows[0] });
  } catch (error) {
    if (stored?.filePath) await fs.promises.unlink(stored.filePath).catch(() => undefined);
    const status = Number(error?.status || 500);
    return res.status(status).json({ success: false, error: status >= 500 ? "The community post could not be published right now." : error.message });
  }
}

async function editPost(req, res) {
  try {
    await ensureSchema();
    const user = await requireCommunity(req, res);
    if (!user) return;
    const [rows] = await pool.query("SELECT * FROM nagarsevak_community_posts WHERE id = ? LIMIT 1", [req.params.id]);
    const post = rows[0] || null;
    if (!post) return res.status(404).json({ success: false, error: "Community post not found." });
    if (!isAdmin(user) && String(post.author_id) !== String(user.id)) return res.status(403).json({ success: false, error: "You can edit only your own community posts." });
    const postType = clean(req.body?.postType || req.body?.post_type || post.post_type, 30).toLowerCase();
    const title = clean(req.body?.title ?? post.title, 255);
    const content = clean(req.body?.content ?? post.content, 5000);
    const remove = req.body?.removeMedia === true || req.body?.removeMedia === "true" || req.body?.remove_media === true;
    if (!COMMUNITY_TYPES.has(postType)) return res.status(400).json({ success: false, error: "Choose a valid post type." });
    if (!content && (!post.media_uri || remove)) return res.status(400).json({ success: false, error: "Enter a message or keep the attached media." });
    await pool.query(
      `UPDATE nagarsevak_community_posts SET post_type = ?, title = ?, content = ?,
       media_uri = ?, media_type = ?, media_file_name = ?, media_mime_type = ?, media_size_bytes = ?, media_duration_seconds = ?, edited_at = NOW()
       WHERE id = ?`,
      [postType, title || null, content || null, remove ? null : post.media_uri, remove ? null : post.media_type, remove ? null : post.media_file_name, remove ? null : post.media_mime_type, remove ? null : post.media_size_bytes, remove ? null : post.media_duration_seconds, req.params.id],
    );
    if (remove && post.media_uri) await removeMedia(post.media_uri);
    const [updated] = await pool.query("SELECT * FROM nagarsevak_community_posts WHERE id = ? LIMIT 1", [req.params.id]);
    return res.json({ success: true, post: updated[0] });
  } catch (error) {
    return res.status(500).json({ success: false, error: "The community post could not be updated right now." });
  }
}

async function deletePost(req, res) {
  try {
    await ensureSchema();
    const user = await requireCommunity(req, res);
    if (!user) return;
    const [rows] = await pool.query("SELECT author_id, media_uri FROM nagarsevak_community_posts WHERE id = ? LIMIT 1", [req.params.id]);
    const post = rows[0] || null;
    if (!post) return res.status(404).json({ success: false, error: "Community post not found." });
    if (!isAdmin(user) && String(post.author_id) !== String(user.id)) return res.status(403).json({ success: false, error: "You can delete only your own community posts." });
    await pool.query("DELETE FROM nagarsevak_community_posts WHERE id = ?", [req.params.id]);
    if (post.media_uri) await removeMedia(post.media_uri);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: "The community post could not be deleted right now." });
  }
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_VIDEO, files: 1, fields: 10 } });

try {
  const mysql = require("mysql2/promise");
  const originalCreatePool = mysql.createPool;
  mysql.createPool = function patchedCreatePool(...args) { pool = originalCreatePool.apply(this, args); return pool; };
} catch (error) {
  console.warn("[InternalCommunityUsers] database hook disabled", error?.message || "unknown_error");
}

try {
  const express = require("express");
  const originalGet = express.application.get;
  const originalPost = express.application.post;
  const originalPatch = express.application.patch;
  const originalDelete = express.application.delete;
  function install(app) {
    if (installed) return;
    installed = true;
    originalGet.call(app, "/api/admin/users", listUsers);
    originalGet.call(app, "/api/nagarsevak-community/posts", listPosts);
    originalPost.call(app, "/api/nagarsevak-community/posts", upload.single("media"), createPost);
    originalPatch.call(app, "/api/nagarsevak-community/posts/:id", editPost);
    originalDelete.call(app, "/api/nagarsevak-community/posts/:id", deletePost);
    console.log("[InternalCommunityUsers] App Users and Nagarsevak Community active");
  }
  express.application.get = function patchedGet(routePath, ...handlers) { install(this); return originalGet.call(this, routePath, ...handlers); };
  express.application.post = function patchedPost(routePath, ...handlers) { install(this); return originalPost.call(this, routePath, ...handlers); };
  express.application.patch = function patchedPatch(routePath, ...handlers) { install(this); return originalPatch.call(this, routePath, ...handlers); };
  express.application.delete = function patchedDelete(routePath, ...handlers) { install(this); return originalDelete.call(this, routePath, ...handlers); };
} catch (error) {
  console.warn("[InternalCommunityUsers] route hook disabled", error?.message || "unknown_error");
}

module.exports = { ensureSchema, listUsers, listPosts, createPost, editPost, deletePost };
