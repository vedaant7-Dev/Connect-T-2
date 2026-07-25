import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("official and legacy Nagarsevak records use English-script display names without deleting source names", () => {
  const names = read("data/nagarsevakEnglishNames.ts");
  const hook = read("hooks/useNagarsevakAssignments.ts");
  const screen = read("app/super-admin/officers.tsx");

  assert.match(names, /7: "Rasal Archana Charan"/);
  assert.match(names, /65: "Rohit Raju Mahadik"/);
  assert.match(names, /nagarsevakEnglishDisplayName/);
  assert.match(names, /[\u0900-\u097F]/);
  assert.match(hook, /nagarsevakEnglishDisplayName/);
  assert.match(hook, /originalName/);
  assert.match(hook, /matchesSearch/);
  assert.match(screen, /Search English name, mobile or designation/);
});

test("Citizen, Nagarsevak and Super Admin share the Civic profile language selector", () => {
  const civic = read("screens/CivicProfileScreen.tsx");
  assert.match(civic, /languageOptions/);
  assert.match(civic, /setLanguageVisible\(true\)/);
  assert.match(civic, /setLanguage\(option\.code\)/);
});

test("Job Seeker and Employer profiles expose the persisted language selector", () => {
  const route = read("app/jobs/(tabs)/profile.tsx");
  const control = read("components/ProfileLanguageButton.tsx");
  assert.match(route, /ProfileLanguageButton/);
  assert.match(route, /LocalizedJobPortalProfileScreen/);
  assert.match(control, /languageOptions/);
  assert.match(control, /void setLanguage\(option\.code\)/);
  assert.match(control, /accessibilityState=\{\{ selected: active \}\}/);
});
