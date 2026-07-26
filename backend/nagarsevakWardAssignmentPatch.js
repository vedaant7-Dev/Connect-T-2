"use strict";

const mysql = require("mysql2/promise");
const { verifyRequestToken, normalizeMobile } = require("./authSecurity");
const { ensureRoleAuthorizationSchema, recordRoleAudit } = require("./roleAuthorization");

const db = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

let installed = false;

function normalizeWardCode(value) {
  const match = String(value || "").match(/(\d{1,2})/);
  if (!match) return null;
  const ward = Number(match[1]);
  return ward >= 1 && ward <= 29 ? String(ward) : null;
}

function designationWithoutWard(value) {
  return String(value || "")
    .replace(/^\s*Ward\s+\d{1,2}\s*(?:[·|\-–—:]\s*)?/i, "")
    .trim();
}

function composeWardDesignation(wardCode, currentValue) {
  const designation = designationWithoutWard(currentValue);
  return designation ? `Ward ${wardCode} · ${designation}` : `Ward ${wardCode}`;
}

async function requireSuperAdmin(req, res) {
  const auth = verifyRequestToken(req);
  if (!auth?.sub) {
    res.status(401).json({ success: false, message: "Super Admin login required." });
    return null;
  }

  const [rows] = await db.query(
    `SELECT id, name, mobile, role, is_super_admin
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [auth.sub],
  );
  const user = rows[0] || null;
  if (!user || (user.role !== "super_admin" && !user.is_super_admin)) {
    res.status(403).json({ success: false, message: "Super Admin access required." });
    return null;
  }
  return user;
}

async function assignNagarsevakWard(req, res) {
  let connection;
  try {
    await ensureRoleAuthorizationSchema(db);
    const actor = await requireSuperAdmin(req, res);
    if (!actor) return;

    const wardCode = normalizeWardCode(req.body?.wardCode || req.body?.ward || req.body?.ward_code);
    if (!wardCode) {
      return res.status(400).json({ success: false, message: "Select a ward from Ward 1 to Ward 29." });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [assignmentRows] = await connection.query(
      `SELECT * FROM role_assignments
       WHERE id = ? AND role = 'nagarsevak'
       LIMIT 1 FOR UPDATE`,
      [String(req.params.id || "")],
    );
    const assignment = assignmentRows[0] || null;
    if (!assignment) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Nagarsevak record not found." });
    }

    const ward = `Ward ${wardCode}`;
    const wardOrDesignation = composeWardDesignation(wardCode, assignment.ward_or_designation);
    const mobile = normalizeMobile(assignment.normalized_phone);
    let userId = assignment.user_id || null;

    if (!userId && mobile.length === 10) {
      const [userRows] = await connection.query(
        `SELECT id FROM users
         WHERE role = 'nagarsevak'
           AND RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(mobile, ''), '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', ''), 10) = ?
         ORDER BY created_at ASC
         LIMIT 1`,
        [mobile],
      );
      userId = userRows[0]?.id || null;
    }

    await connection.query(
      `UPDATE role_assignments
       SET ward_or_designation = ?, user_id = COALESCE(?, user_id)
       WHERE id = ?`,
      [wardOrDesignation, userId, assignment.id],
    );

    if (userId) {
      await connection.query(
        `UPDATE users
         SET ward = ?, ward_code = ?, ward_number = ?, official_designation = COALESCE(NULLIF(official_designation, ''), ?)
         WHERE id = ? AND role = 'nagarsevak'`,
        [ward, wardCode, wardCode, designationWithoutWard(assignment.ward_or_designation) || "Nagarsevak", userId],
      );
    }

    await recordRoleAudit(connection, {
      actorUserId: actor.id,
      actorPhone: actor.mobile,
      actorRole: "super_admin",
      action: "NAGARSEVAK_WARD_ASSIGNED",
      targetAssignmentId: assignment.id,
      targetPhone: assignment.normalized_phone,
      previousStatus: assignment.status,
      newStatus: assignment.status,
      details: {
        ward,
        wardCode,
        previousWardOrDesignation: assignment.ward_or_designation || null,
        wardOrDesignation,
        linkedUserId: userId,
      },
      requestId: req.requestId,
    });

    await connection.commit();
    return res.json({
      success: true,
      assignmentId: String(assignment.id),
      userId,
      ward,
      wardCode,
      wardOrDesignation,
    });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => null);
    console.error("[NagarsevakWardAssignmentPatch] assignment failed:", error);
    return res.status(500).json({ success: false, message: "Ward could not be assigned right now." });
  } finally {
    if (connection) connection.release();
  }
}

try {
  const express = require("express");
  const originalPatch = express.application.patch;

  function install(app) {
    if (installed) return;
    installed = true;
    originalPatch.call(app, "/api/super-admin/nagarsevaks/:id/ward", assignNagarsevakWard);
  }

  express.application.patch = function patchedWardAssignment(path, ...handlers) {
    install(this);
    return originalPatch.call(this, path, ...handlers);
  };

  console.log("[NagarsevakWardAssignmentPatch] secure ward assignment API active");
} catch (error) {
  console.warn("[NagarsevakWardAssignmentPatch] disabled:", error.message);
}

module.exports = {
  composeWardDesignation,
  designationWithoutWard,
  normalizeWardCode,
};
