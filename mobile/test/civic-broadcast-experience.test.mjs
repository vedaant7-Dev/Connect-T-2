import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Civic Home announcements open the exact item in the Citizen News tab", () => {
  const experience = read("components/CivicBroadcastExperience.tsx");
  const home = read("app/(tabs)/index.tsx");
  const feed = read("app/(tabs)/feed.tsx");
  const layout = read("app/_layout.tsx");

  assert.match(layout, /CivicBroadcastExperience/);
  assert.match(home, /item\.category === "announcement"/);
  assert.match(home, /pathname: "\/\(tabs\)\/feed"/);
  assert.match(feed, /broadcastId: item\.id/);
  assert.match(experience, /secondSegment === "feed"/);
  assert.match(experience, /selectedBroadcast/);
  assert.match(experience, /markBroadcastRead/);
  assert.doesNotMatch(experience, /floatingBar/);
});

test("broadcast detail displays original image URLs and provides video playback", () => {
  const experience = read("components/CivicBroadcastExperience.tsx");

  assert.match(experience, /item\.mediaType === "image"/);
  assert.match(experience, /source=\{\{ uri: item\.mediaUri \}\}/);
  assert.match(experience, /resizeMode="contain"/);
  assert.match(experience, /item\.mediaType === "video"/);
  assert.match(experience, /Linking\.openURL\(item\.mediaUri!/);
});

test("broadcast media picker keeps maximum image quality and video pass-through limits", () => {
  const picker = read("components/BroadcastMediaPicker.tsx");

  assert.match(picker, /quality: 1/);
  assert.match(picker, /allowsEditing: false/);
  assert.match(picker, /videoMaxDuration: 300/);
  assert.match(picker, /MAX_VIDEO_BYTES = 50 \* 1024 \* 1024/);
  assert.match(picker, /webFile: asset\.file \|\| null/);
});
