"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { test } = require("node:test");

const backendDir = path.resolve(__dirname, "..");

function runWithSecret(secret) {
  const env = { ...process.env, NODE_ENV: "production" };
  if (secret === undefined) delete env.JWT_SECRET;
  else env.JWT_SECRET = secret;
  env.ADMIN_API_KEY = "an-admin-api-key-must-never-become-the-jwt-signing-secret";

  return spawnSync(
    process.execPath,
    ["-e", "require('./authSecurity'); process.stdout.write('loaded')"],
    { cwd: backendDir, env, encoding: "utf8" },
  );
}

test("production startup rejects a missing JWT secret instead of borrowing the admin API key", () => {
  const result = runWithSecret(undefined);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /JWT_SECRET must be configured with at least 32 characters/);
});

test("production startup rejects weak JWT secrets", () => {
  const result = runWithSecret("too-short");
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /JWT_SECRET must be configured with at least 32 characters/);
});

test("production startup accepts a dedicated strong JWT secret", () => {
  const result = runWithSecret("connect-t-production-test-secret-that-is-long-enough-123456");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "loaded");
});
