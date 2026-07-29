import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("citizen official updates combine alerts news and broadcasts", () => {
  const screen = read("screens/OfficialUpdatesScreen.tsx");
  assert.match(screen, /useAlerts/);
  assert.match(screen, /useBroadcasts/);
  assert.match(screen, /markBroadcastRead/);
  assert.match(screen, /alertVisibleForWard/);
  assert.match(screen, /user\.ward \|\| user\.wardCode/);
  assert.match(screen, /visibleAlerts\.filter\(\(item\) => !item\.isRead\)/);
  assert.match(screen, /!item\.isRead && styles\.unreadCard/);
  assert.match(screen, /externalPushStatus === "not_configured"/);
});

test("broadcast center supports audience language media schedule and compact pause/delete controls", () => {
  const screen = read("screens/BroadcastCenterMediaScreen.tsx");
  assert.match(screen, /AUDIENCES/);
  assert.match(screen, /LANGUAGES/);
  assert.match(screen, /SCHEDULE \(OPTIONAL\)/);
  assert.match(screen, /BroadcastMediaPicker/);
  assert.match(screen, /pauseBroadcast/);
  assert.match(screen, /resumeBroadcast/);
  assert.match(screen, /deleteBroadcast/);
  assert.match(screen, /showInlineViewAction=\{false\}/);
  assert.match(screen, /rightActions=\{adminActions\}/);
  assert.doesNotMatch(screen, /archiveBroadcast/);
  assert.doesNotMatch(screen, />Delivered<\/Text>|>Delivery<\/Text>/);
});

test("alert details hide destructive controls from citizens, recover deep links, and sync read state", () => {
  const detail = read("app/alert/[id].tsx");
  assert.match(detail, /canManage/);
  assert.match(detail, /markAlertRead/);
  assert.match(detail, /refreshAttemptedFor/);
  assert.match(detail, /refreshAlerts/);
  assert.match(detail, /loading \|\| recovering/);
  assert.match(detail, /canManage \?/);
  assert.match(detail, /removeAlert/);
});

test("official update copy exists in all supported languages", () => {
  const copy = read("i18n/updatesCopy.ts");
  for (const language of ["en", "mr", "hi"]) assert.match(copy, new RegExp(`${language}: \\{`));
  assert.match(copy, /externalPushMissing/);
});
