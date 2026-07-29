"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const recovery = fs.readFileSync(path.join(root, "jobPortalSessionRecoveryPatch.js"), "utf8");
const bootstrap = fs.readFileSync(path.join(root, "productionBootstrap.js"), "utf8");

test("instant role switching loads before legacy Job Portal auth routes", () => {
  const recoveryIndex = bootstrap.indexOf("jobPortalSessionRecoveryPatch.js");
  const authIndex = bootstrap.indexOf("jobPortalAuthPatch.js");
  assert.ok(recoveryIndex >= 0);
  assert.ok(authIndex > recoveryIndex);
});

test("one active Job Portal role is stored per verified citizen phone", () => {
  assert.match(recovery, /CREATE TABLE IF NOT EXISTS job_portal_role_locks/);
  assert.match(recovery, /phone VARCHAR\(20\) PRIMARY KEY/);
  assert.match(recovery, /saveActiveRole/);
  assert.match(recovery, /active_user_id = VALUES\(active_user_id\)/);
});

test("citizens switch roles directly without Super Admin approval", () => {
  assert.match(recovery, /\/api\/job-portal\/switch-role/);
  assert.match(recovery, /async function switchRole/);
  assert.match(recovery, /findOrCreateRoleProfile/);
  assert.match(recovery, /roleSwitchingEnabled: true/);
  assert.doesNotMatch(recovery, /JOB_ROLE_LOCKED|requireSuperAdmin|role-change-requests/);
});

test("seeker and employer profiles remain separate and reusable", () => {
  assert.match(recovery, /WHERE phone = \? AND role = \?/);
  assert.match(recovery, /requestedRole/);
  assert.match(recovery, /profile\.role/);
  assert.match(recovery, /token: signToken/);
});
