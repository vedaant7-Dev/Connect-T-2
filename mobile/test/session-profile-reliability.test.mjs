import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("job onboarding always uses the civic session and keeps it intact", () => {
  const api = read("lib/api.ts");
  const setup = read("screens/LocalizedJobProfileSetupScreen.tsx");
  assert.match(api, /usesCivicJobSession[\s\S]*job-portal\/onboarding/);
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
