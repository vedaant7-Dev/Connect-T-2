"use strict";

/*
 * Keep the three unified Job Portal bridge routes outside the legacy Job Portal
 * role middleware. Each route performs its own signed-token verification and
 * must accept either a Civic citizen token or an existing Job Portal token.
 * This prevents the middleware from returning 401 before onboarding/session
 * recovery has a chance to run on hosts that register middleware first.
 */

const BRIDGE_PATHS = new Set(["/session", "/onboarding", "/switch-role"]);
let wrapped = false;

try {
  const express = require("express");
  const originalUse = express.application.use;

  express.application.use = function patchedUse(path, ...handlers) {
    if (!wrapped && path === "/api/job-portal" && typeof handlers[0] === "function") {
      wrapped = true;
      const authorizeJobPortal = handlers[0];
      handlers[0] = function jobPortalBridgeAwareAuthorization(req, res, next) {
        if (String(req.method || "").toUpperCase() === "POST" && BRIDGE_PATHS.has(String(req.path || ""))) {
          return next();
        }
        return authorizeJobPortal(req, res, next);
      };
      console.log("[JobPortalBridgeMiddlewarePatch] session, onboarding and role switching bridge active");
    }
    return originalUse.call(this, path, ...handlers);
  };
} catch (error) {
  console.warn("[JobPortalBridgeMiddlewarePatch] middleware patch disabled:", error.message);
}

module.exports = { BRIDGE_PATHS };
