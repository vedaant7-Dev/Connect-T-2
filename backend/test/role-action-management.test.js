"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");

const source = fs.readFileSync(path.resolve(__dirname, "..", "server.js"), "utf8");

test("Super Admin restriction endpoints preserve audit history and block unsafe lockout", () => {
  assert.match(source, /app\.patch\("\/api\/super-admin\/access-management\/:id"/);
  assert.match(source, /app\.delete\("\/api\/super-admin\/access-management\/:id"/);
  assert.match(source, /assertAdminCanRestrictTarget/);
  assert.match(source, /PRIMARY_ADMIN_PROTECTED/);
  assert.match(source, /SELF_LOCKOUT_BLOCKED/);
  assert.match(source, /LAST_ADMIN_PROTECTED/);
  assert.match(source, /SUPER_ADMIN_DEACTIVATED/);
  assert.match(source, /SUPER_ADMIN_REMOVED/);
  assert.match(source, /recordRoleAudit/);
});

test("Nagarsevak status endpoint supports activate, deactivate and revoke without deleting official records", () => {
  assert.match(source, /app\.patch\("\/api\/super-admin\/nagarsevaks\/:id"/);
  assert.match(source, /\["active", "inactive", "revoked"\]\.includes\(nextStatus\)/);
  assert.match(source, /UPDATE role_assignments SET status = \?/);
  assert.match(source, /NAGARSEVAK_STATUS_CHANGED/);
  assert.doesNotMatch(source, /DELETE FROM role_assignments WHERE role = 'nagarsevak'/);
});
