"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
test("profile save preserves an unchanged managed photo and hides internal errors", () => {
  assert.match(source, /requestedProfilePhoto === String\(existing\?\.profile_photo/);
  assert.match(source, /Profile could not be saved right now/);
});
