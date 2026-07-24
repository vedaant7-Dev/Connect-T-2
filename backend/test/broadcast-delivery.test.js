"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { audienceMatches, normalizeWard, wardMatches } = require("../broadcastDeliveryPatch");

test("broadcast ward normalization supports global and numbered wards", () => {
  assert.equal(normalizeWard("All Wards"), "");
  assert.equal(normalizeWard("Ward 7"), "7");
  assert.equal(normalizeWard("07"), "7");
});

test("ward broadcast delivery excludes citizens outside the target ward", () => {
  assert.equal(wardMatches({ ward: "Ward 12" }, { ward_code: "12" }), true);
  assert.equal(wardMatches({ ward: "Ward 12" }, { ward: "Ward 13" }), false);
  assert.equal(wardMatches({ ward: null }, { ward: "Ward 13" }), true);
});

test("role-targeted broadcast delivery differentiates civic and job roles", () => {
  const citizen = { role: "citizen" };
  assert.equal(audienceMatches("all", citizen, null), true);
  assert.equal(audienceMatches("citizen", citizen, null), true);
  assert.equal(audienceMatches("nagarsevak", citizen, null), false);
  assert.equal(audienceMatches("seeker", citizen, "seeker"), true);
  assert.equal(audienceMatches("employer", citizen, "seeker"), false);
});

test("broadcast API never reports external push success when provider is absent", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "broadcastDeliveryPatch.js"), "utf8");
  assert.match(source, /external_push_status[^\n]+not_configured/);
  assert.match(source, /External push provider and device-token registration are not configured/);
  assert.doesNotMatch(source, /external_push_status[^\n]+DEFAULT 'sent'/);
});

test("production audit migration is additive and idempotent", () => {
  const migration = fs.readFileSync(path.join(__dirname, "..", "migrations", "20260723_complete_production_audit.sql"), "utf8");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS broadcasts/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS broadcast_receipts/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS alert_receipts/);
  assert.match(migration, /uniq_complaints_client_request/);
  assert.doesNotMatch(migration, /DROP TABLE/i);
  assert.doesNotMatch(migration, /DELETE FROM/i);
});
