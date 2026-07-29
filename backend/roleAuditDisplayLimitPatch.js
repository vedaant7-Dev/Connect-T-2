"use strict";

// Keep the complete audit history in the database, but expose only the five
// newest entries on the Super Admin access-management screen.
let installed = false;

function limitRoleAuditDisplay(req, _res, next) {
  const nextQuery = { ...(req.query || {}), limit: "5" };

  try {
    Object.defineProperty(req, "query", {
      configurable: true,
      enumerable: true,
      value: nextQuery,
    });
  } catch {
    req.query = nextQuery;
  }

  return next();
}

try {
  const express = require("express");
  const originalGet = express.application.get;

  function install(app) {
    if (installed) return;
    installed = true;
    originalGet.call(app, "/api/super-admin/role-audit-logs", limitRoleAuditDisplay);
  }

  express.application.get = function patchedGet(path, ...handlers) {
    install(this);
    return originalGet.call(this, path, ...handlers);
  };

  console.log("[RoleAuditDisplayLimit] Super Admin audit list limited to five recent entries");
} catch (error) {
  console.warn("[RoleAuditDisplayLimit] route hook disabled", error?.message || "unknown_error");
}

module.exports = { limitRoleAuditDisplay };
