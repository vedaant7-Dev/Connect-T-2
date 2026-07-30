"use strict";

// Connect-T now uses one Civic login for Civic services and Job Portal. The old
// standalone register, login and session endpoints are permanently retired.

let installed = false;

function retiredAuthRoute(_req, res) {
  return res.status(410).json({
    success: false,
    code: "JOB_PORTAL_STANDALONE_AUTH_REMOVED",
    error: "Use the main Connect-T login and open Job Portal from the portal switcher.",
    message: "Use the main Connect-T login and open Job Portal from the portal switcher.",
    authMode: "unified_civic",
  });
}

try {
  const express = require("express");
  const originalPost = express.application.post;

  function install(app) {
    if (installed) return;
    installed = true;
    originalPost.call(app, "/api/job-portal/register", retiredAuthRoute);
    originalPost.call(app, "/api/job-portal/login", retiredAuthRoute);
    originalPost.call(app, "/api/job-portal/session", retiredAuthRoute);
    console.log("[JobPortalLegacyAuthBlockPatch] standalone Job Portal auth removed");
  }

  express.application.post = function patchedPost(routePath, ...handlers) {
    install(this);
    return originalPost.call(this, routePath, ...handlers);
  };
} catch (error) {
  console.warn("[JobPortalLegacyAuthBlockPatch] route hook disabled", error?.message || "unknown_error");
}

module.exports = { retiredAuthRoute };
