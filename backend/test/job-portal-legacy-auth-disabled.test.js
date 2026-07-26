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

test("legacy standalone Job Portal register and login return a clear retired-route response", () => {
  const res = responseRecorder();
  retiredAuthRoute({}, res);

  assert.equal(res.statusCode, 410);
  assert.equal(res.body.code, "JOB_PORTAL_LEGACY_AUTH_DISABLED");
  assert.match(res.body.message, /verified Connect-T Civic login/i);
});

test("the legacy auth block is loaded before the old compatibility auth routes", () => {
  const bootstrap = fs.readFileSync(path.resolve(__dirname, "..", "productionBootstrap.js"), "utf8");
  const blockIndex = bootstrap.indexOf("jobPortalLegacyAuthBlockPatch.js");
  const legacyIndex = bootstrap.indexOf("jobPortalAuthPatch.js");

  assert.ok(blockIndex >= 0);
  assert.ok(legacyIndex > blockIndex);
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
