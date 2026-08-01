"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const unifiedRole = fs.readFileSync(path.join(root, "jobPortalUnifiedRolePatch.js"), "utf8");
const civicAuth = fs.readFileSync(path.join(root, "jobPortalUnifiedCivicAuthPatch.js"), "utf8");
const bootstrap = fs.readFileSync(path.join(root, "productionBootstrap.js"), "utf8");

test("unified civic auth and direct role switching load before retired standalone auth", () => {
  const civicIndex = bootstrap.indexOf("jobPortalUnifiedCivicAuthPatch.js");
  const roleIndex = bootstrap.indexOf("jobPortalUnifiedRolePatch.js");
  const retiredIndex = bootstrap.indexOf("jobPortalLegacyAuthBlockPatch.js");
  assert.ok(civicIndex >= 0);
  assert.ok(roleIndex > civicIndex);
  assert.ok(retiredIndex > roleIndex);
});

test("one active Job Portal role is stored per verified citizen phone", () => {
  assert.match(unifiedRole, /CREATE TABLE IF NOT EXISTS job_portal_active_roles/);
  assert.match(unifiedRole, /phone VARCHAR\(20\) PRIMARY KEY/);
  assert.match(unifiedRole, /async function saveActiveRole/);
  assert.match(unifiedRole, /active_user_id = VALUES\(active_user_id\)/);
});

test("citizens switch roles directly without Super Admin approval", () => {
  assert.match(unifiedRole, /\/api\/job-portal\/switch-role/);
  assert.match(unifiedRole, /async function switchRole/);
  assert.match(unifiedRole, /findOrCreateRoleProfile/);
  assert.match(unifiedRole, /roleSwitchingEnabled: true/);
  assert.doesNotMatch(unifiedRole, /JOB_ROLE_LOCKED|requireSuperAdmin|role-change-requests/);
});

test("seeker and employer profiles remain separate and reuse the civic session", () => {
  assert.match(unifiedRole, /WHERE phone = \? AND role = \?/);
  assert.match(unifiedRole, /requestedRole/);
  assert.match(unifiedRole, /profile\.role/);
  assert.match(civicAuth, /No second token is returned to or stored by the app/);
  assert.match(civicAuth, /delete next\.token/);
});
