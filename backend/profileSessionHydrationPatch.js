"use strict";

let pool = null;
let installed = false;

function boolValue(value) {
  return value === true || value === 1 || value === "1";
}

function cleanMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function mapProfile(row, existing = {}) {
  const role = row.role === "nagarsevak" || row.role === "super_admin" ? row.role : "citizen";
  return {
    ...existing,
    id: String(row.id),
    name: row.name || existing.name || "User",
    mobile: cleanMobile(row.mobile),
    role,
    ward: row.ward || null,
    wardCode: row.ward_code || null,
    wardNumber: row.ward_number || null,
    officialDesignation: row.official_designation || null,
    isSuperAdmin: role === "super_admin" || boolValue(row.is_super_admin),
    approvalStatus: row.approval_status || "approved",
    age: row.age === undefined || row.age === null ? null : Number(row.age),
    dob: row.dob || null,
    email: row.email || null,
    address: row.address || null,
    avatarColor: row.avatar_color || existing.avatarColor || "#16A34A",
    profilePhoto: row.profile_photo || null,
    nagarsevakId: role === "nagarsevak" ? row.nagarsevak_id || null : null,
    notifyEmail: boolValue(row.notify_email),
    notifyWhatsapp: boolValue(row.notify_whatsapp),
    officeAddress: row.office_address || null,
    residenceAddress: row.residence_address || null,
    officeTimings: row.office_timings || null,
    contactName: row.contact_name || null,
    contactNumber: row.contact_number || null,
    wardChanged: boolValue(row.ward_changed),
    lastLoginAt: row.last_login_at || null,
    createdAt: row.created_at || existing.createdAt || null,
    updatedAt: row.updated_at || null,
  };
}

async function hydratePayload(payload) {
  const id = payload?.user?.id;
  if (!pool || !id) return payload;
  const [rows] = await pool.query("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
  if (!rows.length) return payload;
  return { ...payload, user: mapProfile(rows[0], payload.user) };
}

function wrapProfileJson(res) {
  const originalJson = res.json.bind(res);
  let used = false;
  res.json = (payload) => {
    if (used || !payload?.user) return originalJson(payload);
    used = true;
    Promise.resolve()
      .then(() => hydratePayload(payload))
      .then((hydrated) => originalJson(hydrated))
      .catch((error) => {
        console.warn("[ProfileSessionHydrationPatch] response hydration failed", error?.code || error?.name || "profile_error");
        originalJson(payload);
      });
    return res;
  };
}

try {
  const mysql = require("mysql2/promise");
  const originalCreatePool = mysql.createPool;
  mysql.createPool = function patchedCreatePool(...args) {
    pool = originalCreatePool.apply(this, args);
    return pool;
  };
} catch (error) {
  console.warn("[ProfileSessionHydrationPatch] database hook disabled", error.message);
}

try {
  const express = require("express");
  const originalGet = express.application.get;
  const originalPost = express.application.post;

  function wrapHandlers(handlers) {
    return handlers.map((handler) => async function hydratedProfileRoute(req, res, next) {
      wrapProfileJson(res);
      return handler(req, res, next);
    });
  }

  express.application.get = function patchedGet(routePath, ...handlers) {
    if (routePath === "/api/auth/session") handlers = wrapHandlers(handlers);
    return originalGet.call(this, routePath, ...handlers);
  };

  express.application.post = function patchedPost(routePath, ...handlers) {
    if (routePath === "/api/auth/unified-login") handlers = wrapHandlers(handlers);
    if (!installed && routePath === "/api/auth/unified-login") {
      installed = true;
      console.log("[ProfileSessionHydrationPatch] complete civic session profiles active");
    }
    return originalPost.call(this, routePath, ...handlers);
  };
} catch (error) {
  console.warn("[ProfileSessionHydrationPatch] express hook disabled", error.message);
}

module.exports = { mapProfile };
