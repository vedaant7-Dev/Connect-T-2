import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("job onboarding uses civic authentication and clears retired Job Portal tokens", () => {
  const api = read("lib/api.ts");
  const unifiedAuth = read("lib/jobPortalUnifiedCivicAuth.ts");
  const setup = read("screens/LocalizedJobProfileSetupScreen.tsx");
  assert.match(api, /getSessionSecret\(AUTH_TOKEN_KEY\)/);
  assert.match(api, /deleteSessionSecret\(LEGACY_JOB_AUTH_TOKEN_KEY\)/);
  assert.match(unifiedAuth, /url\.includes\("\/api\/job-portal\/"\)/);
  assert.match(unifiedAuth, /getSessionSecret\(CIVIC_TOKEN_KEY\)/);
  assert.match(unifiedAuth, /withCivicToken\(init, civicToken\)/);
  assert.doesNotMatch(setup, /clearJobsAuthToken/);
  assert.doesNotMatch(setup, /setupSubtitle/);
});

test("temporary network failures do not log out a valid cached civic session", () => {
  const auth = read("context/AuthContext.tsx");
  assert.match(auth, /sessionRejected/);
  assert.match(auth, /setUser\(cachedUser\)/);
  assert.match(auth, /normalizedDob/);
});

test("unchanged profile photos are not re-uploaded", () => {
  const auth = read("context/AuthContext.tsx");
  assert.match(auth, /profilePhotoSpecified \? profilePhoto : undefined/);
  assert.match(auth, /updates\.profilePhoto \?\? null/);
});
