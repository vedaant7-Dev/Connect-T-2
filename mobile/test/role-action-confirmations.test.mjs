import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Super Admin deactivate and remove actions use the shared cross-platform confirmation modal", () => {
  const screen = read("app/super-admin/access.tsx");
  const hook = read("hooks/useSuperAdminAccess.ts");

  assert.match(screen, /ConfirmActionModal/);
  assert.match(screen, /openAction\(\{ kind: "status"/);
  assert.match(screen, /openAction\(\{ kind: "remove"/);
  assert.match(screen, /runPendingAction/);
  assert.match(screen, /setAssignmentStatus/);
  assert.match(screen, /removeAssignment/);
  assert.match(screen, /audit history has been retained/);
  assert.match(screen, /errorMessage=\{actionError\}/);
  assert.match(screen, /setActionError\(getUserErrorMessage/);
  assert.doesNotMatch(screen, /catch[\s\S]{0,300}setPendingAction\(null\)/);
  assert.doesNotMatch(screen, /Alert\.alert/);
  assert.match(hook, /apiPatch<any>\(`\/api\/super-admin\/access-management\/\$\{id\}`/);
  assert.match(hook, /apiDelete<any>\(`\/api\/super-admin\/access-management\/\$\{id\}`/);
});

test("removed Super Admin assignments disappear from the authorised list while audit data remains server-side", () => {
  const hook = read("hooks/useSuperAdminAccess.ts");

  assert.match(hook, /filter\(\(item\) => item\.status !== "revoked"\)/);
  assert.match(hook, /setAssignments\(\(current\) => current\.filter\(\(item\) => item\.id !== id\)\)/);
  assert.match(hook, /await fetchAssignments\(\)/);
});

test("Nagarsevak deactivate and revoke actions require confirmation and refresh the roster", () => {
  const screen = read("app/super-admin/officers.tsx");
  const hook = read("hooks/useNagarsevakAssignments.ts");

  assert.match(screen, /ConfirmActionModal/);
  assert.match(screen, /openAction\(\{ item, status:/);
  assert.match(screen, /status: "revoked"/);
  assert.match(screen, /runPendingAction/);
  assert.match(screen, /await refetch\(search\)/);
  assert.match(screen, /will lose Nagarsevak authorization/i);
  assert.match(screen, /errorMessage=\{actionError\}/);
  assert.match(screen, /setActionError\(getUserErrorMessage/);
  assert.doesNotMatch(screen, /Alert\.alert/);
  assert.match(hook, /apiPatch\(`\/api\/super-admin\/nagarsevaks\/\$\{encodeURIComponent\(id\)\}`/);
});

test("shared confirmation modal supports action-specific icons, visible safe errors and duplicate-submit blocking", () => {
  const modal = read("components/ConfirmActionModal.tsx");

  assert.match(modal, /confirmIcon\?:/);
  assert.match(modal, /errorMessage\?: string/);
  assert.match(modal, /accessibilityLiveRegion="assertive"/);
  assert.match(modal, /const actionIcon = confirmIcon/);
  assert.match(modal, /disabled=\{busy\}/);
  assert.match(modal, /accessibilityState=\{\{ disabled: busy \}\}/);
});
