"use strict";

let pool = null;
let installed = false;

async function preserveAlertScope(req, res, next) {
  try {
    if (req.body?.action === "archive") return next();
    const id = String(req.params?.id || "").trim().slice(0, 80);
    if (!id || !pool) return next();

    const [rows] = await pool.query(
      "SELECT target_audience, ward FROM alerts WHERE id = ? LIMIT 1",
      [id],
    );
    const existing = rows[0];
    if (!existing) return next();

    req.body = { ...(req.body || {}) };
    if (req.body.target_audience === undefined && req.body.targetAudience === undefined) {
      req.body.target_audience = existing.target_audience;
    }
    if (req.body.ward === undefined) req.body.ward = existing.ward;
    return next();
  } catch (error) {
    console.warn("[AlertPartialUpdatePatch] scope merge failed", error?.code || error?.name || "alert_scope_error");
    return res.status(500).json({ success: false, message: "This update could not be prepared right now." });
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
  console.warn("[AlertPartialUpdatePatch] database hook disabled", error.message);
}

try {
  const express = require("express");
  const originalPatch = express.application.patch;

  function install(app) {
    if (installed) return;
    installed = true;
    originalPatch.call(app, "/api/alerts/:id", preserveAlertScope);
    console.log("[AlertPartialUpdatePatch] partial alert scope preservation active");
  }

  express.application.patch = function patchedPatch(path, ...handlers) {
    install(this);
    return originalPatch.call(this, path, ...handlers);
  };
} catch (error) {
  console.warn("[AlertPartialUpdatePatch] route hook disabled", error.message);
}

module.exports = { preserveAlertScope };
