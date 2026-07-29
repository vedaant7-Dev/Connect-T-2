import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Civic home restores Report an Issue above Utility Status", () => {
  const home = read("app/(tabs)/index.tsx");
  const cta = home.indexOf("REPORT AN ISSUE CTA");
  const utility = home.indexOf("UTILITY STATUS");
  assert.ok(cta >= 0);
  assert.ok(utility > cta);
  assert.match(home, /router\.push\(\"\/complaint\/new\"\)/);
});

test("Broadcast posts hide delivery metrics and use one combined action row", () => {
  const screen = read("screens/BroadcastCenterMediaScreen.tsx");
  const viewer = read("components/ComplaintMediaViewer.tsx");
  assert.doesNotMatch(screen, />Delivered<\/Text>/);
  assert.doesNotMatch(screen, />Delivery<\/Text>/);
  assert.match(screen, /showInlineViewAction=\{false\}/);
  assert.match(screen, /rightActions=\{adminActions\}/);
  assert.match(viewer, /showInlineViewAction \? <ActionButton icon=\"eye\"/);
  assert.match(viewer, /rightActions \? <View style=\{styles\.rightActions\}>/);
});
