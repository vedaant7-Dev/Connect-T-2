import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("Nagarsevak home keeps news in the dedicated News tab", () => {
  const screen = read("app/(tabs)/admin.tsx");
  const layout = read("app/(tabs)/_layout.tsx");
  assert.doesNotMatch(screen, /Alerts & News/);
  assert.doesNotMatch(screen, /Post Alert/);
  assert.doesNotMatch(screen, /useAlerts/);
  assert.match(layout, /orderedNames = \["admin", "ward", "news", "profile"\]/);
});

test("Complaint status cards stay above Ward Utility Status", () => {
  const screen = read("app/(tabs)/admin.tsx");
  const complaintSummaryIndex = screen.indexOf("styles.dashboardGrid");
  const utilityStatusIndex = screen.indexOf("styles.utilityPanel");

  assert.notEqual(complaintSummaryIndex, -1, "Complaint status summary must exist");
  assert.notEqual(utilityStatusIndex, -1, "Ward Utility Status panel must exist");
  assert.ok(
    complaintSummaryIndex < utilityStatusIndex,
    "Complaint status cards must render before Ward Utility Status",
  );
});

test("Ward utility form uses exact start and end time pickers", () => {
  const screen = read("app/(tabs)/admin.tsx");
  const picker = read("components/AppTimePicker.tsx");
  assert.match(screen, /AppTimePicker/);
  assert.match(screen, /utilityStartTime/);
  assert.match(screen, /utilityEndTime/);
  assert.match(screen, /utilityDurationHours/);
  assert.match(screen, /utilityScheduleLabel/);
  assert.match(picker, /type: "time"/);
  assert.match(picker, /Select time/);
  assert.match(picker, /AM \/ PM/);
});

test("Nagarsevak utility posts rely on authenticated server ward assignment", () => {
  const screen = read("app/(tabs)/admin.tsx");
  const backend = read("../backend/utilityStatusPatch.js");
  assert.doesNotMatch(screen, /Assigned ward is automatic/);
  assert.doesNotMatch(screen, /Please ask the Super Admin to assign your ward/);
  assert.match(screen, /Ward Not Assigned/);
  assert.doesNotMatch(screen, /ward: user\.ward/);
  assert.doesNotMatch(screen, /wardCode: user\.wardCode/);
  assert.match(backend, /const finalWard = isSuperAdmin \? normalizeWard\(req\.body\.ward \|\| user\.ward\) : normalizeWard\(user\.ward\)/);
  assert.match(backend, /const finalWardCode = normalizeWardCode/);
});
