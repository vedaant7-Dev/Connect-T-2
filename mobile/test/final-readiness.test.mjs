import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("API requests have bounded low-network timeouts, safe errors, GET dedupe and mutation invalidation", () => {
  const api = read("lib/api.ts");
  const network = read("lib/networkStatus.ts");
  assert.match(api, /const REQUEST_TIMEOUT_MS = 30_000/);
  assert.match(api, /const UPLOAD_TIMEOUT_MS = 180_000/);
  assert.match(api, /new AbortController\(\)/);
  assert.match(api, /inFlightGets = new Map/);
  assert.match(api, /if \(pending\) return pending/);
  assert.match(api, /clearGetCache\(\)/);
  assert.match(api, /friendlyStatusMessage/);
  assert.match(api, /connectivityErrorMessage/);
  assert.match(network, /Internet connection lost/);
  assert.match(network, /quality: latencyMs >= 3_500 \? "slow" : "online"/);
  assert.doesNotMatch(api, /headers\["Content-Type"\] = "multipart\/form-data"/);
});

test("native bearer and OTP secrets use encrypted storage with legacy cleanup", () => {
  const storage = read("lib/secureSessionStorage.ts");
  const api = read("lib/api.ts");
  assert.match(storage, /SecureStore\.setItemAsync/);
  assert.match(storage, /SecureStore\.AFTER_FIRST_UNLOCK/);
  assert.match(storage, /AsyncStorage\.removeItem\(key\)/);
  assert.match(storage, /SecureStore\.deleteItemAsync/);
  assert.match(api, /isUsableToken/);
  assert.match(api, /deleteSessionSecret\(AUTH_TOKEN_KEY\)/);
  assert.match(api, /deleteSessionSecret\(OTP_VERIFICATION_KEY\)/);
  assert.match(api, /deleteSessionSecret\(LEGACY_JOB_AUTH_TOKEN_KEY\)/);
});

test("shared modal and localized role navigation meet minimum interaction contracts", () => {
  const modal = read("components/ConfirmActionModal.tsx");
  const civicTabs = read("app/(tabs)/_layout.tsx");
  const jobsTabs = read("app/jobs/(tabs)/_layout.tsx");
  const setup = read("screens/LocalizedJobProfileSetupScreen.tsx");
  const profile = read("screens/LocalizedJobPortalProfileScreen.tsx");

  assert.match(modal, /minHeight: 48/);
  assert.match(modal, /accessibilityViewIsModal/);
  assert.match(modal, /accessibilityState/);
  for (const source of [civicTabs, jobsTabs]) {
    assert.match(source, /accessibilityRole="tab"/);
    assert.match(source, /accessibilityState=\{\{ selected/);
    assert.match(source, /numberOfLines=\{2\}/);
  }
  for (const source of [setup, profile]) {
    assert.match(source, /KeyboardAvoidingView/);
    assert.match(source, /automaticallyAdjustKeyboardInsets/);
    assert.match(source, /keyboardShouldPersistTaps="handled"/);
    assert.match(source, /lineHeight/);
  }
});

test("release scripts retain production validation and Android export gates", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.scripts["test:api"], "node --import tsx --test test/*.test.mjs");
  assert.equal(pkg.scripts.typecheck, "tsc --noEmit -p tsconfig.json");
  assert.equal(pkg.scripts["export:android"], "expo export --platform android");
});
