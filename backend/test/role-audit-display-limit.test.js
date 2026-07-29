"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "roleAuditDisplayLimitPatch.js"), "utf8");
const bootstrap = fs.readFileSync(path.join(root, "productionBootstrap.js"), "utf8");

test("Super Admin access screen receives only five recent audit logs", () => {
  assert.match(source, /limit:\s*"5"/);
  assert.match(source, /\/api\/super-admin\/role-audit-logs/);
  assert.match(bootstrap, /roleAuditDisplayLimitPatch\.js/);
});

test("audit history is limited for display without deleting stored records", () => {
  assert.doesNotMatch(source, /DELETE\s+FROM\s+role_audit_logs/i);
  assert.doesNotMatch(source, /TRUNCATE\s+TABLE\s+role_audit_logs/i);
});
