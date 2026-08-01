"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const backendRoot = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(backendRoot, file), "utf8");

test("server.js loads the complete production bootstrap before Express", () => {
  const server = read("server.js");
  const bootstrapIndex = server.indexOf('require("./productionBootstrap")');
  const expressIndex = server.indexOf('require("express")');

  assert.ok(bootstrapIndex >= 0, "server.js must load the production bootstrap");
  assert.ok(expressIndex > bootstrapIndex, "production bootstrap must load before Express");
});

test("production bootstrap includes current civic and Job Portal route protections", () => {
  const bootstrap = read("productionBootstrap.js");
  for (const patch of [
    "otpProductionPatch.js",
    "profileSessionHydrationPatch.js",
    "internalCommunityAndUsersPatch.js",
    "utilityStatusPatch.js",
    "jobPortalUnifiedCivicAuthPatch.js",
    "jobPortalUnifiedRolePatch.js",
    "jobPortalLegacyAuthBlockPatch.js",
    "jobPortalOnboardingPatch.js",
    "jobPortalMessagePatch.js",
    "jobPortalProfilePatch.js",
  ]) {
    assert.match(bootstrap, new RegExp(patch.replace(".", "\\.")));
  }

  assert.match(read("jobPortalUnifiedCivicAuthPatch.js"), /DIRECT_CIVIC_PATHS/);
  assert.match(read("jobPortalUnifiedRolePatch.js"), /\/api\/job-portal\/active-profile/);
  assert.match(read("jobPortalUnifiedRolePatch.js"), /\/api\/job-portal\/switch-role/);
  assert.match(read("jobPortalLegacyAuthBlockPatch.js"), /JOB_PORTAL_STANDALONE_AUTH_REMOVED/);
  assert.match(read("jobPortalOnboardingPatch.js"), /\/api\/job-portal\/onboarding/);
  assert.match(read("utilityStatusPatch.js"), /\/api\/utility-status/);
  assert.match(read("jobPortalMessagePatch.js"), /sent_count[^]*>=\s*2/);
});

test("job portal onboarding uses the verified civic session without OTP registration", () => {
  const onboarding = read("jobPortalOnboardingPatch.js");

  assert.match(onboarding, /verifyRequestToken\(req\)/);
  assert.match(onboarding, /civicUser\.role\s*!==\s*"citizen"/);
  assert.match(onboarding, /qualification/);
  assert.match(onboarding, /skills/);
  assert.match(onboarding, /company_description/);
  assert.doesNotMatch(onboarding, /verifyOtpProof/);
  assert.doesNotMatch(onboarding, /err\.message\s*}/);
});

test("all supported startup files share the same bootstrap", () => {
  assert.match(read("hostinger-entry.js"), /require\("\.\/productionBootstrap\.js"\)/);
  assert.match(read("hostinger-server.js"), /require\("\.\/hostinger-entry\.js"\)/);
  assert.match(read("server.js"), /backend-server-production-ready-v4/);
});
