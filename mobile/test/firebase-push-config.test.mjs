import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const readJson = (file) => JSON.parse(read(file));

test("Firebase Android client configuration matches the Connect-T package", () => {
  const rootConfig = readJson("google-services.json");
  const nativeConfig = readJson("android/app/google-services.json");
  const appConfig = readJson("app.json");

  assert.deepEqual(nativeConfig, rootConfig);
  assert.equal(rootConfig.project_info.project_id, "connect-t-4e5a3");
  assert.equal(rootConfig.project_info.project_number, "777172886078");
  assert.equal(rootConfig.client[0].client_info.android_client_info.package_name, "com.connectt.app");
  assert.equal(appConfig.expo.android.package, "com.connectt.app");
  assert.equal(appConfig.expo.android.googleServicesFile, "./google-services.json");
});

test("native Android Gradle processes google-services.json", () => {
  const rootGradle = read("android/build.gradle");
  const appGradle = read("android/app/build.gradle");

  assert.match(rootGradle, /com\.google\.gms:google-services:4\.5\.0/);
  assert.match(appGradle, /apply plugin: "com\.google\.gms\.google-services"/);
});
