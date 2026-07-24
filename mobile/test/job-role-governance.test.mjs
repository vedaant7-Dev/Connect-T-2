import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const setupRoute = await readFile(new URL("../app/jobs/profile-setup.tsx", import.meta.url), "utf8");
const setup = await readFile(new URL("../screens/LocalizedJobProfileSetupScreen.tsx", import.meta.url), "utf8");
const profileRoute = await readFile(new URL("../app/jobs/(tabs)/profile.tsx", import.meta.url), "utf8");
const profile = await readFile(new URL("../screens/LocalizedJobPortalProfileScreen.tsx", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/jobs/_layout.tsx", import.meta.url), "utf8");
const adminLayout = await readFile(new URL("../app/super-admin/_layout.tsx", import.meta.url), "utf8");
const adminRequests = await readFile(new URL("../app/super-admin/role-requests.tsx", import.meta.url), "utf8");

test("first-time Job Portal users confirm a role before profile creation", () => {
  assert.match(setupRoute, /LocalizedJobProfileSetupScreen/);
  assert.match(setup, /c\("confirmRole"\)/);
  assert.match(setup, /c\("roleLockWarning"\)/);
  assert.match(setup, /roleConfirmed/);
  assert.match(setup, /\/api\/job-portal\/onboarding/);
});

test("returning users go directly to their active role dashboard", () => {
  assert.match(layout, /jobsUser && inSetup/);
  assert.match(layout, /router\.replace\("\/jobs\/\(tabs\)"/);
  assert.match(layout, /\/jobs\/profile-setup/);
});

test("profile removes direct switching and uses admin-reviewed requests", () => {
  assert.match(profileRoute, /LocalizedJobPortalProfileScreen/);
  assert.doesNotMatch(profile, /switchJobsRole/);
  assert.match(profile, /role-change-requests/);
  assert.match(profile, /c\("requestCorrection"\)/);
  assert.match(profile, /requestCivicPortal/);
  assert.doesNotMatch(profile, /portal-select/);
});

test("Super Admin has a dedicated role governance screen", () => {
  assert.match(adminLayout, /role-requests/);
  assert.match(adminRequests, /Approve Change/);
  assert.match(adminRequests, /Reject Role Change/);
  assert.match(adminRequests, /admin\/role-change-requests/);
});
