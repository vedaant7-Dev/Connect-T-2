"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("official update guards and mutations load before their delivery handlers", () => {
  const bootstrap = read("productionBootstrap.js");
  const partial = bootstrap.indexOf('"./alertPartialUpdatePatch.js"');
  const alertGuard = bootstrap.indexOf('"./alertGovernancePatch.js"');
  const alertMutation = bootstrap.indexOf('"./alertMutationPatch.js"');
  const alertDelivery = bootstrap.indexOf('"./alertDeliveryPatch.js"');
  const broadcastGuard = bootstrap.indexOf('"./broadcastGovernancePatch.js"');
  const broadcastDelivery = bootstrap.indexOf('"./broadcastDeliveryPatch.js"');

  assert.ok(partial >= 0 && partial < alertGuard);
  assert.ok(alertGuard >= 0 && alertGuard < alertMutation);
  assert.ok(alertMutation >= 0 && alertMutation < alertDelivery);
  assert.ok(broadcastGuard >= 0 && broadcastGuard < broadcastDelivery);
});

test("alert governance uses exact global audiences, valid wards, and owner-bound request ids", () => {
  const source = read("alertGovernancePatch.js");
  assert.match(source, /\["all", "all citizen", "all citizens", "all ward", "all wards", "global"\]/);
  assert.doesNotMatch(source, /\/all\/i/);
  assert.match(source, /number >= 1 && number <= 29/);
  assert.match(source, /ALERT_REQUEST_CONFLICT/);
  assert.match(source, /SELECT \* FROM alerts WHERE id/);
  assert.match(source, /duplicate: true/);
  assert.match(source, /posted_by_id/);
  assert.match(source, /Scheduled updates require a future publish date and time/);
  assert.match(source, /The expiry must be later than the publish time/);
  assert.match(source, /guardRead/);
  assert.match(source, /sameWard/);
});

test("partial alert edits preserve the existing audience and ward", () => {
  const source = read("alertPartialUpdatePatch.js");
  assert.match(source, /SELECT target_audience, ward FROM alerts/);
  assert.match(source, /req\.body\.target_audience = existing\.target_audience/);
  assert.match(source, /req\.body\.ward = existing\.ward/);
});

test("alert mutations persist attachment fields and clean managed media after failures or replacement", () => {
  const source = read("alertMutationPatch.js");
  assert.match(source, /media_uri = \?/);
  assert.match(source, /media_type = \?/);
  assert.match(source, /media_file_name = \?/);
  assert.match(source, /media_mime_type = \?/);
  assert.match(source, /media_duration = \?/);
  assert.match(source, /newlyStored/);
  assert.match(source, /removeManagedMedia/);
  assert.match(source, /beginTransaction/);
  assert.match(source, /rollback/);
  assert.match(source, /Upload the attachment from this device/);
});

test("broadcast governance binds idempotency to the publisher and rejects invalid targets", () => {
  const source = read("broadcastGovernancePatch.js");
  assert.match(source, /BROADCAST_REQUEST_CONFLICT/);
  assert.match(source, /SELECT created_by FROM broadcasts WHERE idempotency_key/);
  assert.match(source, /number >= 1 && number <= 29/);
  assert.match(source, /Scheduled broadcasts require a future date and time/);
  assert.match(source, /req\.body\.audienceRole = "citizen"/);
});
