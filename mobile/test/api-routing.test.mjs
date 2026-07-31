import assert from "node:assert/strict";
import test from "node:test";

import { buildApiUrl, normalizeApiBaseUrl } from "../lib/apiUrl.ts";
import { safeUserMessage } from "../lib/errorSafety.ts";

test("API URL construction never duplicates the /api prefix", () => {
  const expected = "https://newapp.e-bjp.in/api/auth/send-otp";
  const configuredBases = [
    "https://newapp.e-bjp.in",
    "https://newapp.e-bjp.in/",
    "https://newapp.e-bjp.in/api",
    "https://newapp.e-bjp.in/api/",
    "https://newapp.e-bjp.in/api/api",
  ];

  for (const base of configuredBases) {
    assert.equal(buildApiUrl("/api/auth/send-otp", base), expected);
  }
  assert.equal(normalizeApiBaseUrl(""), "https://newapp.e-bjp.in");
});

test("raw routing errors are replaced while useful validation remains", () => {
  assert.equal(safeUserMessage("API route not found", "Please try again."), "Please try again.");
  assert.equal(
    safeUserMessage("Cannot POST /api/auth/send-otp", "Please try again."),
    "Please try again.",
  );
  assert.equal(
    safeUserMessage("Enter valid 10-digit mobile number", "Please try again."),
    "Enter valid 10-digit mobile number",
  );
});
