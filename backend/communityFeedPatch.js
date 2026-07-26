"use strict";

const crypto = require("crypto");

const { verifyRequestToken } = require("./authSecurity");
const { removeManagedMedia, saveDataUri } = require("./mediaStorage");
const { isPrivilegedRoleActive } = require("./roleAuthorization");

const POST_TYPES = new Set(["announcement", "update", "complaint", "general"]);
const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
let pool = null;
let installed = false;
let schemaReady = null;

function id(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

function text(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength + 1);
}

async function ensureSchema() {
  if (!pool) throw new Error("Database pool is unavailable");
  if (schemaReady) return schemaReady;
  schemaReady = pool.query(`CREATE TABLE IF NOT EXISTS feed_post_comments (
    id VARCHAR(80) NOT NULL PRIMARY KEY,
    post_id VARCHAR(80) NOT NULL,
    author_id VARCHAR(80) NOT NULL,
    author_name VARCHAR(190) NOT NULL,
    author_role VARCHAR(40) NOT NULL,
    avatar_color VARCHAR(40) NULL,
    content VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_feed_comment_post (post_id, created_at),
    KEY idx_feed_comment_author (author_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`).catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

async function currentUser(req) {
  const auth = verifyRequestToken(req);
  if (!auth?.sub || auth.scope === "job_portal") return null;
  const [rows] = await pool.query(
    `SELECT id, name, mobile, role, avatar_color, is_super_admin, approval_status
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

function isSuperAdmin(user) {
  return user?.role === "super_admin" || !!user?.is_super_admin;
}

async function requireUser(req, res) {
  const user = await currentUser(req);
  if (!user) {
    res.status(401).json({ success: false, code: "SESSION_INVALID", error: "Please log in again." });
    return null;
  }
  return user;
}

async function listPosts(req, res) {
  try {
    await ensureSchema();
    const user = await requireUser(req, res);
    if (!user) return;
    const now = Date.now();
    await pool.query("DELETE FROM feed_user_blocks WHERE blocked_until <= ?", [now]);
    const [rows] = await pool.query(
      `SELECT p.*,
              COUNT(DISTINCT l.id) AS likes_count,
              COALESCE(GROUP_CONCAT(DISTINCT l.user_id ORDER BY l.created_at SEPARATOR ','), '') AS likes_csv,
              COUNT(DISTINCT c.id) AS comments_count
       FROM feed_posts p
       LEFT JOIN feed_post_likes l ON p.id = l.post_id
       LEFT JOIN feed_post_comments c ON p.id = c.post_id
       LEFT JOIN feed_user_blocks b
         ON b.user_id = ? AND b.blocked_user_id = p.author_id AND b.blocked_until > ?
       WHERE b.id IS NULL
       GROUP BY p.id
       ORDER BY p.pinned DESC, p.created_at DESC`,
      [user.id, now],
    );
    return res.json({ success: true, posts: rows });
  } catch (error) {
    console.warn("[CommunityFeedPatch] post list failed", error?.code || error?.name || "feed_error");
    return res.status(500).json({ success: false, error: "Community posts could not be loaded right now." });
  }
}

async function createPost(req, res) {
  try {
    await ensureSchema();
    const user = await requireUser(req, res);
    if (!user) return;
    const content = text(req.body?.content, 5000);
    const type = String(req.body?.type || "general").trim().toLowerCase();
    const image = String(req.body?.image_uri || "").trim();
    if (!content) return res.status(400).json({ success: false, error: "Post content is required." });
    if (content.length > 5000) return res.status(400).json({ success: false, error: "Post content is too long." });
    if (!POST_TYPES.has(type)) return res.status(400).json({ success: false, error: "Select a valid post type." });

    const postId = id("post");
    const savedImage = image
      ? await saveDataUri(image, "feed", req, { allowedMimeTypes: IMAGE_MIME_TYPES, requireDataUri: true })
      : null;
    await pool.query(
      `INSERT INTO feed_posts
       (id, author_id, author_name, author_role, avatar_color, type, content, image_uri, pinned)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        postId,
        user.id,
        user.name,
        user.role,
        user.avatar_color || null,
        type,
        content,
        savedImage,
        isSuperAdmin(user) && !!req.body?.pinned ? 1 : 0,
      ],
    );
    return res.status(201).json({ success: true, postId });
  } catch (error) {
    const unsupported = /uploaded media|file type|device file/i.test(String(error?.message || ""));
    console.warn("[CommunityFeedPatch] post create failed", error?.code || error?.name || "feed_error");
    return res.status(unsupported ? 415 : 500).json({
      success: false,
      code: unsupported ? "UNSUPPORTED_FEED_IMAGE" : "FEED_POST_FAILED",
      error: unsupported ? "Choose a valid JPEG, PNG or WebP image from your device." : "The post could not be published right now.",
    });
  }
}

async function deletePost(req, res) {
  try {
    await ensureSchema();
    const user = await requireUser(req, res);
    if (!user) return;
    const [rows] = await pool.query("SELECT author_id, image_uri FROM feed_posts WHERE id = ? LIMIT 1", [req.params.id]);
    const post = rows[0] || null;
    if (!post) return res.status(404).json({ success: false, error: "Post not found." });
    if (!isSuperAdmin(user) && String(post.author_id) !== String(user.id)) {
      return res.status(403).json({ success: false, error: "You cannot delete another user's post." });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("DELETE FROM feed_post_likes WHERE post_id = ?", [req.params.id]);
      await connection.query("DELETE FROM feed_post_comments WHERE post_id = ?", [req.params.id]);
      await connection.query("DELETE FROM feed_posts WHERE id = ?", [req.params.id]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    if (post.image_uri) await removeManagedMedia(post.image_uri, "feed").catch(() => undefined);
    return res.json({ success: true });
  } catch (error) {
    console.warn("[CommunityFeedPatch] post delete failed", error?.code || error?.name || "feed_error");
    return res.status(500).json({ success: false, error: "The post could not be deleted right now." });
  }
}

async function listComments(req, res) {
  try {
    await ensureSchema();
    const user = await requireUser(req, res);
    if (!user) return;
    const [post] = await pool.query("SELECT id FROM feed_posts WHERE id = ? LIMIT 1", [req.params.id]);
    if (!post.length) return res.status(404).json({ success: false, error: "Post not found." });
    const [rows] = await pool.query(
      `SELECT id, post_id, author_id, author_name, author_role, avatar_color, content, created_at
       FROM feed_post_comments WHERE post_id = ? ORDER BY created_at ASC, id ASC`,
      [req.params.id],
    );
    return res.json({ success: true, comments: rows });
  } catch (error) {
    console.warn("[CommunityFeedPatch] comment list failed", error?.code || error?.name || "feed_error");
    return res.status(500).json({ success: false, error: "Comments could not be loaded right now." });
  }
}

async function createComment(req, res) {
  try {
    await ensureSchema();
    const user = await requireUser(req, res);
    if (!user) return;
    const content = text(req.body?.content, 1000);
    if (!content) return res.status(400).json({ success: false, error: "Comment is required." });
    if (content.length > 1000) return res.status(400).json({ success: false, error: "Comment is too long." });
    const [post] = await pool.query("SELECT id FROM feed_posts WHERE id = ? LIMIT 1", [req.params.id]);
    if (!post.length) return res.status(404).json({ success: false, error: "Post not found." });
    const commentId = id("comment");
    await pool.query(
      `INSERT INTO feed_post_comments
       (id, post_id, author_id, author_name, author_role, avatar_color, content)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [commentId, req.params.id, user.id, user.name, user.role, user.avatar_color || null, content],
    );
    const [rows] = await pool.query("SELECT * FROM feed_post_comments WHERE id = ? LIMIT 1", [commentId]);
    return res.status(201).json({ success: true, comment: rows[0] });
  } catch (error) {
    console.warn("[CommunityFeedPatch] comment create failed", error?.code || error?.name || "feed_error");
    return res.status(500).json({ success: false, error: "The comment could not be posted right now." });
  }
}

async function deleteComment(req, res) {
  try {
    await ensureSchema();
    const user = await requireUser(req, res);
    if (!user) return;
    const [rows] = await pool.query(
      "SELECT author_id FROM feed_post_comments WHERE id = ? AND post_id = ? LIMIT 1",
      [req.params.commentId, req.params.id],
    );
    const comment = rows[0] || null;
    if (!comment) return res.status(404).json({ success: false, error: "Comment not found." });
    if (!isSuperAdmin(user) && String(comment.author_id) !== String(user.id)) {
      return res.status(403).json({ success: false, error: "You cannot delete another user's comment." });
    }
    await pool.query("DELETE FROM feed_post_comments WHERE id = ? AND post_id = ?", [req.params.commentId, req.params.id]);
    return res.json({ success: true });
  } catch (error) {
    console.warn("[CommunityFeedPatch] comment delete failed", error?.code || error?.name || "feed_error");
    return res.status(500).json({ success: false, error: "The comment could not be deleted right now." });
  }
}

async function createSubscription(req, res) {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const targetId = String(req.body?.target_user_id || "").trim();
    if (!targetId) return res.status(400).json({ success: false, error: "Select a user to subscribe to." });
    if (targetId === String(user.id)) return res.status(400).json({ success: false, error: "You cannot subscribe to your own account." });
    const [target] = await pool.query("SELECT id FROM users WHERE id = ? LIMIT 1", [targetId]);
    if (!target.length) return res.status(404).json({ success: false, error: "User not found." });
    await pool.query("INSERT IGNORE INTO feed_subscriptions (subscriber_id, target_user_id) VALUES (?, ?)", [user.id, targetId]);
    return res.status(201).json({ success: true });
  } catch (error) {
    console.warn("[CommunityFeedPatch] subscription failed", error?.code || error?.name || "feed_error");
    return res.status(500).json({ success: false, error: "The subscription could not be saved right now." });
  }
}

async function createBlock(req, res) {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const blockedId = String(req.body?.blocked_user_id || "").trim();
    if (!blockedId) return res.status(400).json({ success: false, error: "Select a user to block." });
    if (blockedId === String(user.id)) return res.status(400).json({ success: false, error: "You cannot block your own account." });
    const [target] = await pool.query("SELECT id FROM users WHERE id = ? LIMIT 1", [blockedId]);
    if (!target.length) return res.status(404).json({ success: false, error: "User not found." });
    const requestedUntil = Number(req.body?.blocked_until || 0);
    const blockedUntil = Math.max(Date.now() + 60_000, Math.min(requestedUntil || Date.now() + 24 * 60 * 60 * 1000, Date.now() + 24 * 60 * 60 * 1000));
    await pool.query(
      `INSERT INTO feed_user_blocks (user_id, blocked_user_id, blocked_until, reason)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE blocked_until = VALUES(blocked_until), reason = VALUES(reason)`,
      [user.id, blockedId, blockedUntil, text(req.body?.reason, 190) || null],
    );
    return res.status(201).json({ success: true, blockedUntil });
  } catch (error) {
    console.warn("[CommunityFeedPatch] block failed", error?.code || error?.name || "feed_error");
    return res.status(500).json({ success: false, error: "The user could not be blocked right now." });
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
  console.warn("[CommunityFeedPatch] database hook disabled", error?.message || "unknown_error");
}

try {
  const express = require("express");
  const originalGet = express.application.get;
  const originalPost = express.application.post;
  const originalDelete = express.application.delete;

  function install(app) {
    if (installed) return;
    installed = true;
    originalGet.call(app, "/api/feed/posts", listPosts);
    originalPost.call(app, "/api/feed/posts", createPost);
    originalDelete.call(app, "/api/feed/posts/:id", deletePost);
    originalGet.call(app, "/api/feed/posts/:id/comments", listComments);
    originalPost.call(app, "/api/feed/posts/:id/comments", createComment);
    originalDelete.call(app, "/api/feed/posts/:id/comments/:commentId", deleteComment);
    originalPost.call(app, "/api/feed/subscriptions", createSubscription);
    originalPost.call(app, "/api/feed/blocks", createBlock);
    console.log("[CommunityFeedPatch] authenticated Feed posts, comments, subscriptions and blocks active");
  }

  express.application.get = function patchedGet(routePath, ...handlers) {
    install(this);
    return originalGet.call(this, routePath, ...handlers);
  };
  express.application.post = function patchedPost(routePath, ...handlers) {
    install(this);
    return originalPost.call(this, routePath, ...handlers);
  };
  express.application.delete = function patchedDelete(routePath, ...handlers) {
    install(this);
    return originalDelete.call(this, routePath, ...handlers);
  };
} catch (error) {
  console.warn("[CommunityFeedPatch] route hook disabled", error?.message || "unknown_error");
}

module.exports = {
  createBlock,
  createComment,
  createPost,
  createSubscription,
  deleteComment,
  deletePost,
  listComments,
  listPosts,
};
