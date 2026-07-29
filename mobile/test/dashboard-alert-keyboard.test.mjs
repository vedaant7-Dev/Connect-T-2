import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("job dashboards use authoritative refresh and strict database booleans", () => {
  const context = read("context/JobsContext.tsx");
  const home = read("app/jobs/(tabs)/index.tsx");
  const applied = read("app/jobs/(tabs)/applied.tsx");
  assert.match(context, /export function parseDbBoolean/);
  assert.match(context, /active", "all"/);
  assert.match(context, /await refreshJobs\(\)/);
  assert.match(context, /applications/);
  assert.match(home, /useFocusEffect/);
  assert.match(home, /employerJobs/);
  assert.match(home, /nearbyJobs/);
  assert.match(home, /errorBanner/);
  assert.match(applied, /applicationState/);
  assert.match(applied, /Job closed/);
});

test("citizen News combines alerts and broadcasts while publishing remains role restricted", () => {
  const context = read("context/AlertContext.tsx");
  const feed = read("app/(tabs)/feed.tsx");
  const form = read("screens/AlertComposerScreen.tsx");
  assert.match(context, /AppState\.addEventListener/);
  assert.match(context, /alertVisibleForWard/);
  assert.match(feed, /useAlerts/);
  assert.match(feed, /useBroadcasts/);
  assert.match(feed, /refreshAlerts/);
  assert.match(feed, /visibleAlerts/);
  assert.match(form, /const canPublish/);
  assert.match(form, /Publishing unavailable/);
  assert.match(form, /All citizens/);
  assert.match(form, /Ward residents/);
});

test("forms use keyboard-safe scroll behavior and adjustable insets", () => {
  const appScroll = read("components/AppScrollView.tsx");
  const alertForm = read("screens/AlertComposerScreen.tsx");
  const profileRoute = read("app/jobs/(tabs)/profile.tsx");
  const profile = read("screens/LocalizedJobPortalProfileScreen.tsx");
  assert.match(appScroll, /automaticallyAdjustKeyboardInsets/);
  assert.match(appScroll, /keyboardDismissMode/);
  assert.match(appScroll, /keyboardShouldPersistTaps/);
  assert.match(alertForm, /KeyboardAvoidingView/);
  assert.match(alertForm, /automaticallyAdjustKeyboardInsets/);
  assert.match(profileRoute, /LocalizedJobPortalProfileScreen/);
  assert.match(profile, /KeyboardAvoidingView/);
  assert.match(profile, /automaticallyAdjustKeyboardInsets/);
  assert.match(profile, /roleSwitchVisible/);
  assert.match(profile, /switchRoleLabel/);
});
