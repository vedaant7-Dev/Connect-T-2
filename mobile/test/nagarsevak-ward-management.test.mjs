import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("Nagarsevak Home removes ward guide banners and does not submit a client ward", () => {
  const screen = read("app/(tabs)/admin.tsx");
  assert.doesNotMatch(screen, /Assigned ward is automatic/);
  assert.doesNotMatch(screen, /Please ask the Super Admin to assign your ward/);
  assert.doesNotMatch(screen, /ward:\s*assignedWard/);
  assert.match(screen, /Ward Not Assigned/);
  assert.match(screen, /apiGet<any>\("\/api\/auth\/session"\)/);
});

test("Super Admin can assign or change Ward 1 to Ward 29", () => {
  const screen = read("app/super-admin/officers.tsx");
  const hook = read("hooks/useNagarsevakAssignments.ts");
  assert.match(screen, /Assign Ward/);
  assert.match(screen, /Array\.from\(\{ length: 29 \}/);
  assert.match(screen, /saveWard/);
  assert.match(hook, /nagarsevaks\/\$\{encodeURIComponent\(id\)\}\/ward/);
});
