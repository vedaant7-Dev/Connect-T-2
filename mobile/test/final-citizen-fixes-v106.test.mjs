import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("Job Portal role switching uses the unified civic session and persists the returned role", () => {
  const auth = read("context/JobsAuthContext.tsx");
  const unifiedAuth = read("lib/jobPortalUnifiedCivicAuth.ts");
  assert.match(auth, /apiPost<any>\("\/api\/job-portal\/switch-role"/);
  assert.match(auth, /response\.user\.role !== role/);
  assert.match(auth, /persist\(normalizeUser\(response\.user\)\)/);
  assert.match(unifiedAuth, /url\.includes\("\/api\/job-portal\/"\)/);
  assert.match(unifiedAuth, /getSessionSecret\(CIVIC_TOKEN_KEY\)/);
  assert.match(unifiedAuth, /withCivicToken\(init, civicToken\)/);
});

test("Home notifications do not include complaints", () => {
  const home = read("app/(tabs)/index.tsx");
  const block = home.slice(home.indexOf("const notifItems"), home.indexOf("useEffect", home.indexOf("const notifItems")));
  assert.doesNotMatch(block, /complaintNotifs\.map/);
  assert.match(block, /newsItems/);
});

test("registration and civic profile no longer expose email or WhatsApp notification choices", () => {
  const login = read("app/login.tsx");
  const profile = read("screens/CivicProfileScreen.tsx");
  assert.doesNotMatch(login, /step === "notifications"/);
  assert.doesNotMatch(login, /Email Notifications|WhatsApp Notifications/);
  assert.doesNotMatch(profile, /<Switch/);
  assert.doesNotMatch(profile, /c\("emailNotifications"\)|c\("whatsappNotifications"\)/);
});

test("all runtime logout labels use the simple Logout wording", () => {
  for (const file of ["i18n/profileCopy.ts", "i18n/jobsCopy.ts", "screens/CivicProfileScreen.tsx", "screens/LocalizedJobPortalProfileScreen.tsx", "app/super-admin/settings.tsx"]) {
    assert.doesNotMatch(read(file), /Logout from Connect-T/);
  }
});

test("citizen news feed autoplays only the visible video and allows user pause", () => {
  const feed = read("app/(tabs)/feed.tsx");
  const media = read("components/ComplaintMediaViewer.tsx");
  assert.match(feed, /onViewableItemsChanged/);
  assert.match(feed, /itemVisiblePercentThreshold: 65/);
  assert.match(feed, /autoPlay active=\{active\}/);
  assert.match(media, /function InlineFeedVideo/);
  assert.match(media, /if \(active && !pausedByUser\) player\.play\(\)/);
  assert.match(media, /setPausedByUser/);
  assert.match(media, /name=\{paused \? "play" : "pause"\}/);
});
