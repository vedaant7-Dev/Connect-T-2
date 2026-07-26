import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { safeUserMessage } from "../lib/errorSafety.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("safe backend explanations may be displayed but route, SQL and URL details remain hidden", () => {
  assert.equal(
    safeUserMessage("The primary Super Admin cannot be removed.", "fallback"),
    "The primary Super Admin cannot be removed.",
  );
  assert.equal(safeUserMessage("SQL exception at /api/super-admin/access", "fallback"), "fallback");
  assert.equal(safeUserMessage("https://internal.example.test failed", "fallback"), "fallback");
});

test("403 responses retain a sanitised backend protection reason before using the generic fallback", () => {
  const api = read("lib/api.ts");

  assert.match(api, /if \(status === 403\) return safeMessage \|\| "You do not have permission to perform this action\."/);
  assert.doesNotMatch(api, /if \(status === 403\) return "You do not have permission to perform this action\."/);
});
