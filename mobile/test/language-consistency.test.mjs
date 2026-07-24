import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("English remains the default and all three supported languages are selectable", () => {
  const context = read("context/LanguageContext.tsx");
  assert.match(context, /useState<Language>\("en"\)/);
  assert.match(context, /code: "en"/);
  assert.match(context, /code: "hi"/);
  assert.match(context, /code: "mr"/);
  assert.match(context, /translations\[language\]\?\.\[key\] \?\? translations\.en\[key\]/);
});

test("Job Portal onboarding and profile use the shared localized copy", () => {
  const setupRoute = read("app/jobs/profile-setup.tsx");
  const profileRoute = read("app/jobs/(tabs)/profile.tsx");
  const setup = read("screens/LocalizedJobProfileSetupScreen.tsx");
  const profile = read("screens/LocalizedJobPortalProfileScreen.tsx");

  assert.match(setupRoute, /LocalizedJobProfileSetupScreen/);
  assert.match(profileRoute, /LocalizedJobPortalProfileScreen/);
  for (const source of [setup, profile]) {
    assert.match(source, /useLanguage/);
    assert.match(source, /jobsCopy/);
    assert.match(source, /lineHeight/);
    assert.match(source, /flexShrink/);
  }
  assert.match(setup, /accessibilityState=\{\{ selected/);
  assert.match(profile, /accessibilityLabel/);
});

test("Job Portal copy contains matching English Marathi and Hindi dictionaries", () => {
  const copy = read("i18n/jobsCopy.ts");
  for (const language of ["en", "mr", "hi"]) assert.match(copy, new RegExp(`${language}: \\{`));
  for (const key of ["setupTitle", "jobSeeker", "employer", "profileSavedTitle", "logoutTitle", "requestCorrection"]) {
    const matches = copy.match(new RegExp(`${key}:`, "g")) || [];
    assert.equal(matches.length, 3, `${key} must exist in all three dictionaries`);
  }
});
