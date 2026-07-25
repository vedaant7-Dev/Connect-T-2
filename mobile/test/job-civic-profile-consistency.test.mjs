import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Job Portal profile uses the Civic profile visual structure", () => {
  const civic = read("screens/CivicProfileScreen.tsx");
  const jobs = read("screens/LocalizedJobPortalProfileScreen.tsx");
  const route = read("app/jobs/(tabs)/profile.tsx");

  for (const contract of [
    /paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28/,
    /width: 70, height: 70, borderRadius: 24/,
    /editHeaderButton/,
    /backgroundColor: "rgba\(255,255,255,0\.16\)"/,
    /borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "#E2E8F0"/,
    /minHeight: 68, flexDirection: "row", alignItems: "center"/,
    /editorSheet/,
    /logoutButton/,
  ]) {
    assert.match(civic, contract);
    assert.match(jobs, contract);
  }

  assert.match(jobs, /Section title=\{p\("personalInfo"\)\}/);
  assert.match(jobs, /Section title=\{p\("preferences"\)\}/);
  assert.match(jobs, /Section title=\{p\("accountInfo"\)\}/);
  assert.match(jobs, /Section title=\{p\("quickActions"\)\}/);
  assert.match(jobs, /KeyboardAvoidingView/);
  assert.match(jobs, /automaticallyAdjustKeyboardInsets/);
  assert.doesNotMatch(jobs, /DecorativeCircles|TopShade/);
  assert.doesNotMatch(route, /ProfileLanguageButton/);
});

test("unified Job Portal profile preserves job fields and governed role correction", () => {
  const jobs = read("screens/LocalizedJobPortalProfileScreen.tsx");
  for (const field of [
    "qualification", "skills", "currentCompany", "currentRole", "previousCompany", "previousRole",
    "collegeName", "fieldOfStudy", "company", "companyType", "companySize", "companyDescription",
    "pincode", "whatsapp", "website", "gstNo", "yearEstablished",
  ]) assert.match(jobs, new RegExp(field));

  assert.match(jobs, /\/api\/job-portal\/role-change-requests/);
  assert.match(jobs, /requestCivicPortal/);
  assert.match(jobs, /requestLogout/);
  assert.match(jobs, /c\("mobileReadOnly"\)/);
  assert.doesNotMatch(jobs, /switchJobsRole|portal-select/);
});
