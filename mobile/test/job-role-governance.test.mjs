import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const setupRoute = await readFile(new URL("../app/jobs/profile-setup.tsx", import.meta.url), "utf8");
const setup = await readFile(new URL("../screens/LocalizedJobProfileSetupScreen.tsx", import.meta.url), "utf8");
const profileRoute = await readFile(new URL("../app/jobs/(tabs)/profile.tsx", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/jobs/_layout.tsx", import.meta.url), "utf8");
const adminLayout = await readFile(new URL("../app/super-admin/_layout.tsx", import.meta.url), "utf8");

 test("first-time Job Portal users confirm a role before profile creation", () => {
  assert.match(setupRoute, /LocalizedJobProfileSetupScreen/);
  assert.match(setup, /c\("confirmRole"\)/);
  assert.match(setup, /roleConfirmed/);
  assert.match(setup, /\/api\/job-portal\/onboarding/);
});

test("returning users go directly to their active role dashboard", () => {
  assert.match(layout, /jobsUser && inSetup/);
  assert.match(layout, /router\.replace\("\/jobs\/\(tabs\)"/);
  assert.match(layout, /\/jobs\/profile-setup/);
});

test("citizens can switch between seeker and employer without approval", () => {
  assert.match(profileRoute, /activateJobs/);
  assert.match(profileRoute, /targetRole/);
  assert.match(profileRoute, /No Super Admin approval is required/);
  assert.match(profileRoute, /ConfirmActionModal/);
  assert.match(profileRoute, /Switch to/);
});

test("Super Admin role-request tab is removed from navigation", () => {
  assert.doesNotMatch(adminLayout, /label: "Roles"/);
  assert.match(adminLayout, /name="role-requests" options=\{\{ href: null \}\}/);
  assert.match(adminLayout, /label: "Jobs"/);
  assert.match(adminLayout, /label: "Broadcast"/);
});
