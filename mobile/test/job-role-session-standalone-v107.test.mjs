import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Job Portal onboarding has no role lock or Super Admin approval gate", () => {
  const setup = read("screens/LocalizedJobProfileSetupScreen.tsx");
  const copy = read("i18n/jobsCopy.ts");
  assert.doesNotMatch(setup, /showConfirm|pendingRole|<Modal visible=\{showConfirm\}/);
  assert.match(setup, /setRole\(nextRole\)/);
  assert.match(setup, /name="repeat"/);
  assert.doesNotMatch(copy, /selected role is locked|requires Super Admin approval|भूमिका लॉक होईल|सुपर ॲडमिनची मंजुरी आवश्यक|भूमिका लॉक हो जाएगी|सुपर एडमिन की मंजूरी जरूरी/);
});

test("Job setup and switching use the valid civic session and remove legacy Job Portal tokens", () => {
  const api = read("lib/api.ts");
  const unifiedAuth = read("lib/jobPortalUnifiedCivicAuth.ts");
  assert.match(api, /getSessionSecret\(AUTH_TOKEN_KEY\)/);
  assert.match(api, /headers\.Authorization = `Bearer \$\{civicToken\}`/);
  assert.match(api, /getStoredJobsAuthToken[\s\S]*deleteSessionSecret\(LEGACY_JOB_AUTH_TOKEN_KEY\)[\s\S]*return null/);
  assert.match(unifiedAuth, /getSessionSecret\(CIVIC_TOKEN_KEY\)/);
  assert.match(unifiedAuth, /headers\.set\("Authorization", `Bearer \$\{token\}`\)/);
});

test("Nagarsevak Dashboard does not render complaint cards", () => {
  const admin = read("app/(tabs)/admin.tsx");
  const returnIndex = admin.indexOf("  return (", admin.indexOf("export default function AdminScreen"));
  const rendered = admin.slice(returnIndex);
  assert.doesNotMatch(rendered, /<ComplaintCard/);
  assert.doesNotMatch(rendered, /filteredComplaints/);
  assert.match(rendered, /dashboardFilters\.map/);
});

test("Android includes a bundled optimized standalone APK variant", () => {
  const gradle = read("android/app/build.gradle");
  assert.match(gradle, /standalone \{/);
  assert.match(gradle, /initWith release/);
  assert.match(gradle, /signingConfig signingConfigs\.debug/);
  assert.match(gradle, /minifyEnabled true/);
  assert.match(gradle, /shrinkResources true/);
});
