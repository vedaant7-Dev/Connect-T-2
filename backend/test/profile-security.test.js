"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("normal civic profile endpoint rejects mobile-number changes", () => {
  const server = read("server.js");
  assert.match(server, /MOBILE_CHANGE_REQUIRES_REVERIFICATION/);
  assert.match(server, /Mobile number cannot be changed from the normal profile form/);
});

test("unified login and session responses hydrate complete civic profile fields", () => {
  const bootstrap = read("productionBootstrap.js");
  const hydration = read("profileSessionHydrationPatch.js");
  assert.match(bootstrap, /profileSessionHydrationPatch\.js/);
  assert.match(hydration, /\/api\/auth\/unified-login/);
  assert.match(hydration, /\/api\/auth\/session/);
  assert.match(hydration, /notifyEmail/);
  assert.match(hydration, /notifyWhatsapp/);
  assert.match(hydration, /officeAddress/);
  assert.match(hydration, /residenceAddress/);
  assert.match(hydration, /contactName/);
  assert.match(hydration, /contactNumber/);
  assert.match(hydration, /role === "nagarsevak" \? row\.nagarsevak_id/);
});

test("Job Portal profile updates keep verified mobile and role immutable", () => {
  const source = read("jobPortalProfilePatch.js");
  assert.match(source, /VERIFIED_MOBILE_IMMUTABLE/);
  assert.match(source, /JOB_ROLE_IMMUTABLE/);
  assert.match(source, /delete req\.body\.phone/);
  assert.match(source, /delete req\.body\.mobile/);
  assert.match(source, /delete req\.body\.role/);
  assert.match(source, /incompatibleRoleField/);
});

test("Job Portal extra fields are persisted only after the accepted base response", () => {
  const source = read("jobPortalProfilePatch.js");
  const preparePosition = source.indexOf("const prepared = await prepareProfileUpdate");
  const wrapperPosition = source.indexOf("wrapUserJson(res, {", preparePosition);
  const handlerPosition = source.indexOf("return handler(req, res, next)", wrapperPosition);
  assert.ok(preparePosition >= 0 && wrapperPosition > preparePosition && handlerPosition > wrapperPosition);
  assert.match(source, /beforeEnrich: async \(\) => updateExtraFields/);
  assert.doesNotMatch(source, /await updateExtraFields\(req\.params\.id, req\.body\);\s*await ensureExtraOnlyPatchCanPassServerRoute/);
});

test("Job Portal profile photo replacement and failures clean managed files", () => {
  const source = read("jobPortalProfilePatch.js");
  assert.match(source, /managedProfilePath/);
  assert.match(source, /removeManagedProfile/);
  assert.match(source, /cleanupFailedPhoto/);
  assert.match(source, /afterSuccess/);
});
