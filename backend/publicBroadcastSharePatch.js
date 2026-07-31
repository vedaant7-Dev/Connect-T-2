"use strict";

const fs = require("fs");
const path = require("path");
const { UPLOAD_DIR } = require("./mediaStorage");

let pool = null;
let installed = false;

function clean(value, max = 10000) {
  return String(value || "").trim().slice(0, max);
}

function escapeHtml(value) {
  return clean(value, 20000)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function publicBaseUrl(req) {
  return clean(process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`, 500).replace(/\/$/, "");
}

function safeFileName(value) {
  let fileName = "";
  try {
    fileName = path.basename(new URL(clean(value, 2000), "https://connect-t.invalid").pathname);
  } catch {
    fileName = path.basename(clean(value, 2000));
  }
  if (!/^[A-Za-z0-9._-]+$/.test(fileName)) return "";
  if (!/\.(?:jpe?g|png|webp|gif|mp4|mov|webm)$/i.test(fileName)) return "";
  return fileName;
}

function mediaMime(row, fileName) {
  const configured = clean(row?.media_mime_type || row?.mediaMimeType, 120).toLowerCase();
  if (/^(?:image|video)\//.test(configured)) return configured;
  const extension = path.extname(fileName).toLowerCase();
  if ([".jpg", ".jpeg"].includes(extension)) return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";
  if (extension === ".mov") return "video/quicktime";
  if (extension === ".webm") return "video/webm";
  return "video/mp4";
}

function candidateUploadDirectories() {
  return Array.from(new Set([
    path.resolve(UPLOAD_DIR),
    path.resolve(__dirname, "uploads"),
    path.resolve(process.cwd(), "uploads"),
    path.resolve(process.cwd(), "backend", "uploads"),
  ]));
}

function locateMediaFile(value) {
  const fileName = safeFileName(value);
  if (!fileName) return null;
  for (const directory of candidateUploadDirectories()) {
    const candidate = path.resolve(directory, fileName);
    if (!candidate.startsWith(`${directory}${path.sep}`)) continue;
    try {
      if (fs.statSync(candidate).isFile()) return { fileName, filePath: candidate };
    } catch {
      // Continue through compatible deployment directories.
    }
  }
  return null;
}

async function broadcastById(id) {
  if (!pool) return null;
  const [rows] = await pool.query(
    `SELECT * FROM broadcasts
     WHERE id = ? AND status = 'sent' AND archived_at IS NULL
     LIMIT 1`,
    [clean(id, 100)],
  );
  return rows?.[0] || null;
}

function categoryLabel(value) {
  return ({
    announcement: "Announcement",
    news: "News",
    emergency: "Emergency",
    information: "Information",
    notice: "Notice",
  })[clean(value, 30).toLowerCase()] || "Official Update";
}

function pageHtml(req, row) {
  const base = publicBaseUrl(req);
  const shareUrl = `${base}/share/broadcast/${encodeURIComponent(row.id)}`;
  const mediaValue = row.media_uri || row.media_file_name || "";
  const mediaRecord = locateMediaFile(mediaValue);
  const mediaUrl = mediaRecord ? `${shareUrl}/media` : "";
  const type = clean(row.media_type, 20).toLowerCase() === "video" ? "video" : "image";
  const title = escapeHtml(row.title || "Connect-T Official Update");
  const body = escapeHtml(row.body || "");
  const description = escapeHtml(clean(row.body, 220) || "Official Connect-T update");
  const category = escapeHtml(categoryLabel(row.category));
  const audience = escapeHtml(row.ward || row.audience_role || "All citizens");
  const author = escapeHtml(row.created_by_name || "Connect-T");
  const mime = mediaRecord ? mediaMime(row, mediaRecord.fileName) : "";
  const mediaMeta = mediaUrl
    ? type === "video"
      ? `<meta property="og:video" content="${escapeHtml(mediaUrl)}"><meta property="og:video:secure_url" content="${escapeHtml(mediaUrl)}"><meta property="og:video:type" content="${escapeHtml(mime)}">`
      : `<meta property="og:image" content="${escapeHtml(mediaUrl)}"><meta property="og:image:secure_url" content="${escapeHtml(mediaUrl)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${escapeHtml(mediaUrl)}">`
    : "";
  const mediaElement = mediaUrl
    ? type === "video"
      ? `<video controls playsinline preload="metadata" src="${escapeHtml(mediaUrl)}"></video>`
      : `<img src="${escapeHtml(mediaUrl)}" alt="${title}">`
    : `<div class="missing">The attached media is unavailable on the current server deployment.</div>`;

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title} · Connect-T</title>
<meta name="description" content="${description}">
<meta property="og:type" content="article"><meta property="og:site_name" content="Connect-T">
<meta property="og:title" content="${title}"><meta property="og:description" content="${description}">
<meta property="og:url" content="${escapeHtml(shareUrl)}">${mediaMeta}
<style>
*{box-sizing:border-box}body{margin:0;background:#eef2f7;color:#0f172a;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.header{padding:24px 18px;background:linear-gradient(135deg,#052e16,#166534,#16a34a);color:#fff}.brand{font-weight:800;letter-spacing:.8px;font-size:13px}.wrap{max-width:720px;margin:0 auto;padding:18px}.card{overflow:hidden;border-radius:22px;background:#fff;box-shadow:0 12px 35px rgba(15,23,42,.12)}.copy{padding:20px}.pill{display:inline-block;padding:6px 10px;border-radius:999px;background:#dcfce7;color:#166534;font-size:12px;font-weight:800}.title{margin:13px 0 8px;font-size:27px;line-height:1.2}.body{white-space:pre-wrap;font-size:16px;line-height:1.65;color:#334155}.media{background:#020617}.media img,.media video{display:block;width:100%;max-height:620px;object-fit:contain}.meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}.meta div{padding:12px;border-radius:13px;background:#f8fafc}.meta small{display:block;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px}.meta strong{display:block;margin-top:4px;color:#334155}.missing{padding:28px;color:#64748b;text-align:center;background:#f8fafc}.footer{text-align:center;padding:18px;color:#64748b;font-size:13px}@media(max-width:600px){.title{font-size:23px}.meta{grid-template-columns:1fr}.wrap{padding:12px}.copy{padding:17px}}
</style></head><body>
<div class="header"><div class="wrap"><div class="brand">CONNECT-T · OFFICIAL UPDATE</div></div></div>
<main class="wrap"><article class="card"><div class="copy"><span class="pill">${category}</span><h1 class="title">${title}</h1><div class="body">${body}</div></div><div class="media">${mediaElement}</div><div class="copy"><div class="meta"><div><small>Audience</small><strong>${audience}</strong></div><div><small>Posted by</small><strong>${author}</strong></div></div></div></article><div class="footer">Shared securely from Connect-T</div></main>
</body></html>`;
}

async function serveBroadcastMedia(req, res) {
  try {
    const row = await broadcastById(req.params.id);
    if (!row) return res.status(404).type("text/plain").send("Broadcast not found");
    const mediaValue = row.media_uri || row.media_file_name || "";
    const dataMatch = clean(mediaValue, 20_000_000).match(/^data:([^;,]+);base64,(.+)$/s);
    if (dataMatch) {
      res.set("Content-Type", dataMatch[1]);
      res.set("Cache-Control", "public, max-age=86400");
      return res.send(Buffer.from(dataMatch[2], "base64"));
    }
    const media = locateMediaFile(mediaValue);
    if (!media) return res.status(404).type("text/plain").send("Media not found");
    res.set("Content-Type", mediaMime(row, media.fileName));
    res.set("Cache-Control", "public, max-age=86400");
    res.set("Content-Disposition", `inline; filename="${media.fileName.replace(/"/g, "")}"`);
    return res.sendFile(media.filePath);
  } catch (error) {
    console.warn("[PublicBroadcastShare] media failed", error?.code || error?.message || "media_error");
    return res.status(500).type("text/plain").send("Media could not be loaded");
  }
}

async function serveBroadcastPage(req, res) {
  try {
    const row = await broadcastById(req.params.id);
    if (!row) return res.status(404).type("text/html").send("<h1>Update not found</h1>");
    res.set("Cache-Control", "public, max-age=60");
    return res.status(200).type("html").send(pageHtml(req, row));
  } catch (error) {
    console.warn("[PublicBroadcastShare] page failed", error?.code || error?.message || "page_error");
    return res.status(500).type("text/html").send("<h1>This update could not be loaded.</h1>");
  }
}

async function serveLegacyUpload(req, res, next) {
  const media = locateMediaFile(req.params.file);
  if (!media) return next();
  res.set("Cache-Control", "public, max-age=86400");
  return res.sendFile(media.filePath);
}

try {
  const mysql = require("mysql2/promise");
  const originalCreatePool = mysql.createPool;
  mysql.createPool = function patchedCreatePool(...args) {
    pool = originalCreatePool.apply(this, args);
    return pool;
  };
} catch (error) {
  console.warn("[PublicBroadcastShare] database hook disabled", error?.message || "unknown_error");
}

try {
  const express = require("express");
  const originalGet = express.application.get;
  function install(app) {
    if (installed) return;
    installed = true;
    originalGet.call(app, "/share/broadcast/:id/media", serveBroadcastMedia);
    originalGet.call(app, "/share/broadcast/:id", serveBroadcastPage);
    originalGet.call(app, "/uploads/:file", serveLegacyUpload);
    console.log("[PublicBroadcastShare] public broadcast pages active");
  }
  express.application.get = function patchedGet(routePath, ...handlers) {
    install(this);
    return originalGet.call(this, routePath, ...handlers);
  };
} catch (error) {
  console.warn("[PublicBroadcastShare] route hook disabled", error?.message || "unknown_error");
}

module.exports = { locateMediaFile, pageHtml, serveBroadcastMedia, serveBroadcastPage };
