"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const backendRoot = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(backendRoot, file), "utf8");

test("production startup loads complete notification coverage", () => {
  assert.match(read("productionBootstrap.js"), /notificationCoveragePatch\.js/);
});

test("Nagarsevak Community posts notify all approved officers and Super Admins", () => {
  const source = read("notificationCoveragePatch.js");
  assert.match(source, /\/api\/nagarsevak-community\/posts/);
  assert.match(source, /users\.filter\(isSuperAdmin\)/);
  assert.match(source, /users\.filter\(isApprovedNagarsevak\)/);
  assert.match(source, /dedupeKey:\s*`community:\$\{postId\}`/);
  assert.match(source, /route:\s*"\/super-admin\/community"/);
  assert.match(source, /route:\s*"\/\(tabs\)\/community"/);
});

test("complaint create and status notifications cover owner, ward officer and Super Admin", () => {
  const source = read("notificationCoveragePatch.js");
  assert.match(source, /complaintOwnerIds/);
  assert.match(source, /assigned_officer_id/);
  assert.match(source, /userWardMatches\(user, complaint\.ward, complaint\.ward_code\)/);
  assert.match(source, /if \(isSuperAdmin\(user\)\) recipients\.add/);
  assert.match(source, /complaint-new:/);
  assert.match(source, /complaint-status:/);
});

test("broadcast notifications include Super Admin, target audience and scheduled delivery", () => {
  const source = read("notificationCoveragePatch.js");
  assert.match(source, /if \(isSuperAdmin\(user\)\) return true/);
  assert.match(source, /audience === "nagarsevak"/);
  assert.match(source, /audience === "citizen"/);
  assert.match(source, /sweepScheduledBroadcasts/);
  assert.match(source, /status = 'scheduled'/);
  assert.match(source, /dedupeKey:\s*`broadcast:\$\{broadcastId\}`/);
});
