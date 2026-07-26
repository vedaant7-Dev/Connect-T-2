"use strict";

const POST_TYPES = new Set(["announcement", "update", "complaint", "general"]);
const IMAGE_DATA_URI = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/i;
let postInstalled = false;
let patchInstalled = false;

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength + 1);
}

function feedPostPreflight(req, res, next) {
  const content = cleanText(req.body?.content, 5000);
  const type = String(req.body?.type || "general").trim().toLowerCase();
  const image = String(req.body?.image_uri || "").trim();

  if (!content) {
    return res.status(400).json({ success: false, error: "Post content is required." });
  }
  if (content.length > 5000) {
    return res.status(400).json({ success: false, error: "Post content is too long." });
  }
  if (!POST_TYPES.has(type)) {
    return res.status(400).json({ success: false, error: "Select a valid post type." });
  }
  if (image && !IMAGE_DATA_URI.test(image)) {
    return res.status(415).json({
      success: false,
      code: "UNSUPPORTED_FEED_IMAGE",
      error: "Choose a JPEG, PNG or WebP image from your device.",
    });
  }

  delete req.body.id;
  req.body.content = content;
  req.body.type = type;
  req.body.image_uri = image || null;
  return next();
}

function chatMessagePreflight(req, res, next) {
  const text = cleanText(req.body?.text, 2000);
  if (!text) return res.status(400).json({ success: false, error: "Message text is required." });
  if (text.length > 2000) return res.status(400).json({ success: false, error: "Message is too long." });
  delete req.body.id;
  req.body.text = text;
  return next();
}

function chatEditPreflight(req, res, next) {
  const text = cleanText(req.body?.text, 2000);
  if (!text) return res.status(400).json({ success: false, error: "Message text is required." });
  if (text.length > 2000) return res.status(400).json({ success: false, error: "Message is too long." });
  req.body.text = text;
  return next();
}

try {
  const express = require("express");
  const originalPost = express.application.post;
  const originalPatch = express.application.patch;

  function installPost(app) {
    if (postInstalled) return;
    postInstalled = true;
    originalPost.call(app, "/api/feed/posts", feedPostPreflight);
    originalPost.call(app, "/api/chat/messages", chatMessagePreflight);
    console.log("[CommunityPreflightPatch] feed and chat create validation active");
  }

  function installPatch(app) {
    if (patchInstalled) return;
    patchInstalled = true;
    originalPatch.call(app, "/api/chat/messages/:id", chatEditPreflight);
    console.log("[CommunityPreflightPatch] chat edit validation active");
  }

  express.application.post = function patchedPost(routePath, ...handlers) {
    installPost(this);
    return originalPost.call(this, routePath, ...handlers);
  };
  express.application.patch = function patchedPatch(routePath, ...handlers) {
    installPatch(this);
    return originalPatch.call(this, routePath, ...handlers);
  };
} catch (error) {
  console.warn("[CommunityPreflightPatch] route hook disabled", error?.message || "unknown_error");
}

module.exports = {
  chatEditPreflight,
  chatMessagePreflight,
  feedPostPreflight,
};
