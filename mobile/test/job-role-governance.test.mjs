import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const setupRoute = await readFile(new URL("../app/jobs/profile-setup.tsx", import.meta.url), "utf8");
const setup = await readFile(new URL("../screens/LocalizedJobProfileSetupScreen.tsx", import.meta.url), "utf8");
const profileRoute = await readFile(new URL("../app/jobs/(tabs)/profile.tsx", import.meta.url), "utf8");
const profile = await readFile(new URL("../screens/LocalizedJobPortalProfileScreen.tsx", import.meta.url), "utf8");
const auth = await readFile(new URL("../context/JobsAuthContext.tsx", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/jobs/_layout.tsx", import.meta.url), "utf8");
const adminLayout = await readFile(new URL("../app/super-admin/_layout.tsx", import.meta.url), "utf8");

test("first-time Job Portal users select a role directly before profile creation", () => {
  assert.match(setupRoute, /LocalizedJobProfileSetupScreen/);
  assert.match(setup, /setRole\(nextRole\)/);
  assert.match(setup, /roleConfirmed/);
  assert.doesNotMatch(setup, /showConfirm|pendingRole|c\("confirmRole"\)/);
  assert.match(setup, /\/api\/job-portal\/onboarding/);
});

test("returning users go directly to their active role dashboard", () => {
  assert.match(layout, /jobsUser && inSetup/);
  assert.match(layout, /router\.replace\("\/jobs\/\(tabs\)"/);
  assert.match(layout, /\/jobs\/profile-setup/);
});

test("citizens can switch between seeker and employer without approval", () => {
  assert.match(profileRoute, /LocalizedJobPortalProfileScreen/);
  assert.match(profile, /activateJobs/);
  assert.match(profile, /targetRole/);
  assert.match(profile, /No approval is required/);
  assert.match(profile, /ConfirmActionModal/);
  assert.match(profile, /Switch to/);
  assert.match(auth, /\/api\/job-portal\/switch-role/);
  assert.match(auth, /persist\(normalizeUser\(response\.user\)\)/);
  assert.doesNotMatch(profile, /role-change-requests|requestCorrection/);
});

test("Super Admin role-request tab is removed from navigation", () => {
  assert.doesNotMatch(adminLayout, /label: "Roles"/);
  assert.match(adminLayout, /name="role-requests" options=\{\{ href: null \}\}/);
  assert.match(adminLayout, /label: "Jobs"/);
  assert.match(adminLayout, /label: "Broadcast"/);
});
