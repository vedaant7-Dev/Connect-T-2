"use strict";

// Connect-T uses one verified Civic account and creates/restores the Job Portal
// session from that identity. The old standalone register/login endpoints could
// create a second profile outside the governed role-lock workflow, so they are
// intentionally retired while `/session` and `/onboarding` remain active.

let installed = false;

function retiredAuthRoute(_req, res) {
  return res.status(410).json({
    success: false,
    code: "JOB_PORTAL_LEGACY_AUTH_DISABLED",
    error: "Use your verified Connect-T Civic login, then open Job Portal from the portal switcher.",
    message: "Use your verified Connect-T Civic login, then open Job Portal from the portal switcher.",
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
    console.log("[JobPortalLegacyAuthBlockPatch] standalone Job Portal register/login disabled");
  }

  express.application.post = function patchedPost(routePath, ...handlers) {
    install(this);
    return originalPost.call(this, routePath, ...handlers);
  };
} catch (error) {
  console.warn("[JobPortalLegacyAuthBlockPatch] route hook disabled", error?.message || "unknown_error");
}

module.exports = {
  retiredAuthRoute,
};
