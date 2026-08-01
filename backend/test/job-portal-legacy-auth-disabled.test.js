"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const { retiredAuthRoute } = require("../jobPortalLegacyAuthBlockPatch");

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
}

test("legacy standalone Job Portal register login and session routes are retired", () => {
  const res = responseRecorder();
  retiredAuthRoute({}, res);

  assert.equal(res.statusCode, 410);
  assert.equal(res.body.code, "JOB_PORTAL_STANDALONE_AUTH_REMOVED");
  assert.equal(res.body.authMode, "unified_civic");
  assert.match(res.body.message, /main Connect-T login/i);
});

test("unified civic authentication and role selection load before the legacy auth block", () => {
  const bootstrap = fs.readFileSync(path.resolve(__dirname, "..", "productionBootstrap.js"), "utf8");
  const civicAuthIndex = bootstrap.indexOf("jobPortalUnifiedCivicAuthPatch.js");
  const roleIndex = bootstrap.indexOf("jobPortalUnifiedRolePatch.js");
  const blockIndex = bootstrap.indexOf("jobPortalLegacyAuthBlockPatch.js");

  assert.ok(civicAuthIndex >= 0);
  assert.ok(roleIndex > civicAuthIndex);
  assert.ok(blockIndex > roleIndex);
  assert.equal(bootstrap.includes("jobPortalAuthPatch.js"), false);
});

test("current mobile source does not call retired Job Portal register or login APIs", () => {
  const root = path.resolve(__dirname, "..", "..", "mobile");
  const stack = [root];
  const callers = [];
  while (stack.length) {
    const directory = stack.pop();
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (["node_modules", "dist", ".expo", "android"].includes(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) stack.push(absolute);
      else if (/\.(?:ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
        const source = fs.readFileSync(absolute, "utf8");
        if (/\/api\/job-portal\/(?:register|login)/.test(source)) callers.push(path.relative(root, absolute));
      }
    }
  }
  assert.deepEqual(callers, []);
});
