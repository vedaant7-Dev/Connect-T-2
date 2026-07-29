import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Citizen News opens and highlights the exact broadcast item", () => {
  const feed = read("app/(tabs)/feed.tsx");
  const layout = read("app/(tabs)/_layout.tsx");

  assert.match(layout, /name="feed" options=\{\{ title: t\("feed"\)/);
  assert.match(feed, /useLocalSearchParams/);
  assert.match(feed, /broadcastId/);
  assert.match(feed, /requestedId/);
  assert.match(feed, /highlighted=\{item\.item\.id === requestedId\}/);
  assert.match(feed, /BroadcastCard/);
  assert.match(feed, /markBroadcastRead|Official update/);
});

test("citizen feed displays original images and supports in-app video playback", () => {
  const feed = read("app/(tabs)/feed.tsx");
  const viewer = read("components/ComplaintMediaViewer.tsx");

  assert.match(feed, /item\.mediaUri/);
  assert.match(feed, /item\.media\?\.uri/);
  assert.match(feed, /autoPlay active=\{active\}/);
  assert.match(viewer, /VideoView/);
  assert.match(viewer, /InlineFeedVideo/);
  assert.match(viewer, /setPausedByUser/);
});

test("broadcast media picker keeps maximum image quality and video pass-through limits", () => {
  const picker = read("components/BroadcastMediaPicker.tsx");

  assert.match(picker, /quality: 1/);
  assert.match(picker, /allowsEditing: false/);
  assert.match(picker, /videoMaxDuration: 300/);
  assert.match(picker, /MAX_VIDEO_BYTES = 50 \* 1024 \* 1024/);
  assert.match(picker, /webFile: asset\.file \|\| null/);
});
