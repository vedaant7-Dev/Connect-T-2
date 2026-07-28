import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../lib/secureSessionStorage.ts", import.meta.url), "utf8");

test("native SecureStore keys encode OTP session separators", () => {
  assert.match(source, /export function toNativeSecureStoreKey/);
  assert.ok(source.includes('replace(/[^A-Za-z0-9._-]/g'));
  assert.match(source, /SecureStore\.setItemAsync\(secureKey/);
  assert.match(source, /SecureStore\.getItemAsync\(secureKey\)/);
  assert.match(source, /SecureStore\.deleteItemAsync\(toNativeSecureStoreKey\(key\)\)/);
  assert.doesNotMatch(source, /SecureStore\.setItemAsync\(key,/);
  assert.doesNotMatch(source, /SecureStore\.getItemAsync\(key\)/);
});
