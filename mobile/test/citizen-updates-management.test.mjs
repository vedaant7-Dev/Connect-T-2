import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("citizen News tab includes every sent broadcast category", () => {
  const feed = read("app/(tabs)/feed.tsx");
  assert.match(feed, /useBroadcasts/);
  assert.match(feed, /item\.status === "sent"/);
  assert.match(feed, /BroadcastCard/);
  assert.match(feed, /broadcastId/);
  for (const category of ["Emergency", "Information", "Notice", "Announcement"]) assert.match(feed, new RegExp(category));
});

test("Home keeps complaint activity out while the News tab owns public updates", () => {
  const home = read("app/(tabs)/index.tsx");
  const feed = read("app/(tabs)/feed.tsx");
  const notifBlock = home.slice(home.indexOf("const notifItems"), home.indexOf("useEffect", home.indexOf("const notifItems")));
  assert.doesNotMatch(notifBlock, /complaintNotifs\.map/);
  assert.match(home, /REPORT AN ISSUE CTA/);
  assert.match(feed, /News Feed/);
  assert.match(feed, /NewsAlertCard/);
  assert.match(feed, /BroadcastCard/);
  assert.match(feed, /onViewableItemsChanged/);
});

test("broadcast center uses pause resume delete and no archive action", () => {
  const screen = read("screens/BroadcastCenterMediaScreen.tsx");
  const context = read("context/BroadcastContext.tsx");
  for (const word of ["Pause", "Resume", "Delete"]) assert.match(screen, new RegExp(word));
  assert.doesNotMatch(screen, /Archive broadcast/);
  assert.match(context, /pauseBroadcast/);
  assert.match(context, /resumeBroadcast/);
  assert.match(context, /deleteBroadcast/);
  assert.doesNotMatch(context, /archiveBroadcast/);
});

test("Nagarsevak can review edit and delete current utility statuses", () => {
  const admin = read("app/(tabs)/admin.tsx");
  const manager = read("components/UtilityStatusManager.tsx");
  const api = read("lib/utilityStatusApi.ts");
  assert.match(admin, /UtilityStatusManager/);
  assert.match(manager, /Current Utility Updates/);
  assert.match(manager, /updateUtilityStatus/);
  assert.match(manager, /deleteUtilityStatus/);
  assert.match(api, /subscribeUtilityStatusChanges/);
});
