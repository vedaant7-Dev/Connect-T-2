"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  composeWardDesignation,
  designationWithoutWard,
  normalizeWardCode,
} = require("../nagarsevakWardAssignmentPatch");

test("ward assignment accepts only Ward 1 to Ward 29", () => {
  assert.equal(normalizeWardCode("Ward 1"), "1");
  assert.equal(normalizeWardCode("29"), "29");
  assert.equal(normalizeWardCode("Ward 30"), null);
  assert.equal(normalizeWardCode("Not assigned"), null);
});

test("ward assignment preserves the existing designation without duplicating ward text", () => {
  assert.equal(composeWardDesignation("7", "Nominated member"), "Ward 7 · Nominated member");
  assert.equal(composeWardDesignation("12", "Ward 3 · Nominated member"), "Ward 12 · Nominated member");
  assert.equal(designationWithoutWard("Ward 9 - Councillor"), "Councillor");
});
