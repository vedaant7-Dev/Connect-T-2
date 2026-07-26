import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Civic Home shows sent broadcasts and opens the exact item on Alerts & News", () => {
  const experience = read("components/CivicBroadcastExperience.tsx");
  const layout = read("app/_layout.tsx");

  assert.match(layout, /CivicBroadcastExperience/);
  assert.match(experience, /item\.status === "sent"/);
  assert.match(experience, /pathname: "\/alert\/list"/);
  assert.match(experience, /broadcastId: item\.id/);
  assert.match(experience, /selectedBroadcast/);
  assert.match(experience, /markBroadcastRead/);
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
