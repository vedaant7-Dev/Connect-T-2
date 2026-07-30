"use strict";

/*
 * Final unified-auth guard.
 *
 * The legacy authorizeJobPortal middleware still contains the retired
 * "Job Portal login required" check. Profile setup, active-profile loading and
 * role switching authenticate themselves with the main Connect-T Civic token,
 * so they must reach their route handlers without passing through that old
 * Job Portal session gate.
 */

const DIRECT_CIVIC_ROUTES = new Set([
  "/active-profile",
  "/onboarding",
  "/switch-role",
]);

let wrapped = false;

try {
  const express = require("express");
  const previousUse = express.application.use;

  express.application.use = function directCivicUse(path, ...handlers) {
    if (!wrapped && path === "/api/job-portal" && typeof handlers[0] === "function") {
      wrapped = true;
      const previousAuthorization = handlers[0];

      handlers[0] = function directCivicJobPortalAuthorization(req, res, next) {
        const method = String(req.method || "").toUpperCase();
        const routePath = String(req.path || "").split("?")[0];

        // These handlers perform their own Civic-token verification and never
        // create or require a separate Job Portal login/session.
        if (method === "POST" && DIRECT_CIVIC_ROUTES.has(routePath)) {
          return next();
        }

        return previousAuthorization(req, res, next);
      };

      console.log("[JobPortalDirectCivicBypass] legacy Job Portal login gate removed from unified routes");
    }

    return previousUse.call(this, path, ...handlers);
  };
} catch (error) {
  console.warn("[JobPortalDirectCivicBypass] route hook disabled:", error.message);
}

module.exports = { DIRECT_CIVIC_ROUTES };
