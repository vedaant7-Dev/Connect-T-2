"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "uploads");
const MANAGED_EXTENSIONS = new Set(["jpg", "png", "webp", "mp4", "webm", "mov"]);

function hasExpectedSignature(buffer, mime) {
  if (mime === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
  if (mime === "image/webp") return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  if (mime === "video/mp4" || mime === "video/quicktime") return buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp";
  if (mime === "video/webm") return buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from("1a45dfa3", "hex"));
  return false;
}

function publicBaseUrl(req) {
  return String(process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
}

function safePrefix(value) {
  return String(value || "media").replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "media";
}

function managedMediaPath(value, expectedPrefix) {
  const uri = String(value || "").trim();
  if (!uri || !expectedPrefix) return null;
  try {
    const fileName = path.basename(new URL(uri, "https://connect-t.invalid").pathname);
    const prefix = safePrefix(expectedPrefix).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = fileName.match(new RegExp(`^${prefix}_\\d+_[a-f0-9]{16}\\.([a-z0-9]+)$`, "i"));
    if (!match || !MANAGED_EXTENSIONS.has(match[1].toLowerCase())) return null;
    const filePath = path.join(UPLOAD_DIR, fileName);
    const resolved = path.resolve(filePath);
    const uploadRoot = `${path.resolve(UPLOAD_DIR)}${path.sep}`;
    return resolved.startsWith(uploadRoot) ? resolved : null;
  } catch {
    return null;
  }
}

async function removeManagedMedia(value, expectedPrefix) {
  const filePath = managedMediaPath(value, expectedPrefix);
  if (!filePath) return false;
  await fs.promises.unlink(filePath).catch((error) => {
    if (error?.code !== "ENOENT") throw error;
  });
  return true;
}

async function saveDataUri(value, prefix, req, options = {}) {
  if (!value || typeof value !== "string" || !value.startsWith("data:")) return value || null;

  const match = value.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("Invalid uploaded media format");

  const mime = match[1].toLowerCase();
  const extensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  };
  const ext = extensions[mime];
  if (!ext) throw new Error("Unsupported uploaded media type");
  if (Array.isArray(options.allowedMimeTypes) && !options.allowedMimeTypes.includes(mime)) {
    throw new Error("Unsupported uploaded media type");
  }

  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error("Uploaded media must be between 1 byte and 8MB");
  }
  if (!hasExpectedSignature(buffer, mime)) {
    throw new Error("Uploaded media content does not match its file type");
  }

  const normalizedPrefix = safePrefix(prefix);
  const fileName = `${normalizedPrefix}_${Date.now()}_${crypto.randomBytes(8).toString("hex")}.${ext}`;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  await fs.promises.writeFile(path.join(UPLOAD_DIR, fileName), buffer, { flag: "wx" });

  return `${publicBaseUrl(req)}/uploads/${fileName}`;
}

module.exports = {
  hasExpectedSignature,
  managedMediaPath,
  MAX_UPLOAD_BYTES,
  removeManagedMedia,
  UPLOAD_DIR,
  saveDataUri,
};
