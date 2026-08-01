"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("broadcast edit pause resume and delete management loads before delivery", () => {
  const bootstrap = read("productionBootstrap.js");
  assert.ok(
    bootstrap.indexOf('"./broadcastActionsPatch.js"') < bootstrap.indexOf('"./broadcastDeliveryPatch.js"'),
    "management routes must load before delivery routes",
  );

  const source = read("broadcastActionsPatch.js");
  assert.match(source, /\["pause", "resume", "edit"\]\.includes\(action\)/);
  assert.match(source, /BROADCAST_ARCHIVE_REMOVED/);
  assert.match(source, /action === "edit"/);
  assert.match(source, /DELETE FROM broadcast_receipts/);
  assert.match(source, /DELETE FROM broadcasts/);
  assert.match(source, /removeManagedMedia/);
  assert.match(source, /originalDelete\.call\(app, "\/api\/broadcasts\/:id"/);
});
