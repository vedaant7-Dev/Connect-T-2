"use strict";

const { verifyRequestToken } = require("./authSecurity");
const { isPrivilegedRoleActive } = require("./roleAuthorization");

let pool = null;
let installed = false;

function sendJson(res, status, payload) {
  if (res.headersSent) return res;
  return res.status(status).json(payload);
}

function normalizeWard(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  const match = raw.match(/(?:ward\s*)?(\d{1,2})/i);
  return match ? String(Number(match[1])) : raw.replace(/[^a-z0-9]/g, "");
}

function cleanMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

async function currentOfficer(req) {
  const auth = verifyRequestToken(req);
  if (!auth?.sub || auth.scope === "job_portal" || !pool) return null;

  const [rows] = await pool.query(
    `SELECT id, name, mobile, role, ward, ward_code, ward_number,
            is_super_admin, approval_status
       FROM users
      WHERE id = ?
      LIMIT 1`,
    [auth.sub],
  );
  const user = rows[0] || null;
  if (!user) return null;

  const privileged = user.role === "nagarsevak" || user.role === "super_admin" || !!user.is_super_admin;
  if (!privileged) return null;

  const active = await isPrivilegedRoleActive(pool, {
    userId: user.id,
    mobile: user.mobile,
    role: user.role,
  });
  return active ? user : null;
}

function mapCitizen(row) {
  return {
    id: String(row.id),
    name: row.name || "Citizen",
    mobile: cleanMobile(row.mobile),
    role: "citizen",
    ward: row.ward || (row.ward_code ? `Ward ${row.ward_code}` : row.ward_number ? `Ward ${row.ward_number}` : ""),
    wardCode: row.ward_code || null,
    wardNumber: row.ward_number || null,
    address: row.address || "",
    email: row.email || "",
    dob: row.dob || "",
    age: row.age || null,
    avatarColor: row.avatar_color || "#16A34A",
    profilePhoto: row.profile_photo || null,
    createdAt: row.created_at || null,
  };
}

async function listWardMembers(req, res) {
  try {
    const officer = await currentOfficer(req);
    if (!officer) {
      return sendJson(res, 401, {
        success: false,
        code: "WARD_MEMBERS_LOGIN_REQUIRED",
        message: "Your Nagarsevak login could not be verified.",
      });
    }

    const isSuperAdmin = officer.role === "super_admin" || !!officer.is_super_admin;
    const requestedWard = isSuperAdmin ? req.query?.ward : null;
    const officerWard = normalizeWard(requestedWard || officer.ward_code || officer.ward_number || officer.ward);

    if (!officerWard) {
      return sendJson(res, 400, {
        success: false,
        code: "WARD_NOT_ASSIGNED",
        message: "This account does not have an assigned ward.",
      });
    }

    if (officer.role === "nagarsevak" && String(officer.approval_status || "") !== "approved") {
      return sendJson(res, 403, {
        success: false,
        code: "NAGARSEVAK_NOT_APPROVED",
        message: "This Nagarsevak account is not approved.",
      });
    }

    const [rows] = await pool.query(
      `SELECT id, name, mobile, role, ward, ward_code, ward_number,
              address, email, dob, age, avatar_color, profile_photo, created_at
         FROM users
        WHERE role = 'citizen'
        ORDER BY created_at DESC`,
    );

    const users = rows
      .filter((row) => normalizeWard(row.ward_code || row.ward_number || row.ward) === officerWard)
      .map(mapCitizen);

    return sendJson(res, 200, {
      success: true,
      ward: `Ward ${officerWard}`,
      count: users.length,
      users,
    });
  } catch (error) {
    console.warn("[WardMembersPatch] list failed", error?.code || error?.name || "ward_members_error");
    return sendJson(res, 500, {
      success: false,
      message: "Ward members could not be loaded right now.",
    });
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
  console.warn("[WardMembersPatch] database hook disabled", error.message);
}

try {
  const express = require("express");
  const originalGet = express.application.get;

  function install(app) {
    if (installed) return;
    installed = true;
    originalGet.call(app, "/api/ward-members", listWardMembers);
    console.log("[WardMembersPatch] secure ward member listing active");
  }

  express.application.get = function patchedGet(path, ...handlers) {
    install(this);
    return originalGet.call(this, path, ...handlers);
  };
} catch (error) {
  console.warn("[WardMembersPatch] route hook disabled", error.message);
}

module.exports = { normalizeWard };
