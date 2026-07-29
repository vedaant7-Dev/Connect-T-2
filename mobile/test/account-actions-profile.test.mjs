import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const jobsProfile = () => read("screens/LocalizedJobPortalProfileScreen.tsx");

test("all profile portal actions bypass portal selection after initial choice", () => {
  const civic = read("screens/CivicProfileScreen.tsx");
  const route = read("app/jobs/(tabs)/profile.tsx");
  const jobs = jobsProfile();
  const hook = read("hooks/useAccountActions.ts");
  assert.match(civic, /requestJobsPortal/);
  assert.match(route, /LocalizedJobPortalProfileScreen/);
  assert.match(jobs, /requestCivicPortal/);
  assert.doesNotMatch(jobs, /portal-select/);
  assert.ok(hook.includes('resetNavigation("/jobs")'));
  assert.ok(hook.includes('resetNavigation("/\(tabs\)")'));
});

test("shared logout confirmation is used by civic, nagarsevak, jobs and super admin profiles", () => {
  const civicProfile = read("screens/CivicProfileScreen.tsx");
  const civicProfileRoute = read("app/(tabs)/profile.tsx");
  assert.match(civicProfileRoute, /CivicProfileScreen/);
  assert.match(civicProfile, /ConfirmActionModal/);
  assert.match(civicProfile, /requestLogout/);
  for (const file of ["screens/LocalizedJobPortalProfileScreen.tsx", "app/super-admin/settings.tsx"]) {
    assert.match(read(file), /ConfirmActionModal/, file);
    assert.match(read(file), /requestLogout/, file);
    assert.doesNotMatch(read(file), /Logout from Connect-T/, file);
  }
});

test("logout also clears protected in-memory query data", () => {
  const layout = read("app/_layout.tsx");
  assert.match(layout, /ProtectedCacheResetter/);
  assert.match(layout, /useQueryClient/);
  assert.match(layout, /client\.clear\(\)/);
});

test("civic profile exposes registration, official and account fields without legacy notification toggles", () => {
  const screen = read("screens/CivicProfileScreen.tsx");
  const auth = read("context/AuthContext.tsx");
  assert.match(screen, /readOnlyMobile/);
  assert.doesNotMatch(screen, /notifyEmail|notifyWhatsapp|<Switch/);
  assert.match(screen, /officeTimings/);
  assert.match(screen, /residenceAddress/);
  assert.match(screen, /contactName/);
  assert.match(screen, /approvalStatus/);
  assert.match(screen, /DobDatePicker/);
  assert.match(screen, /profilePhoto: null/);
  assert.match(screen, /updateUser/);
  assert.match(auth, /nagarsevakId: role === "nagarsevak"/);
  assert.match(auth, /mobile: user\.mobile/);
  assert.match(auth, /responseHasPhoto/);
});

test("Job Portal profiles expose complete role-specific fields and verified mobile is read-only", () => {
  const screen = jobsProfile();
  const context = read("context/JobsAuthContext.tsx");
  for (const field of [
    "currentCompany", "currentRole", "previousCompany", "previousRole", "collegeName", "fieldOfStudy",
    "companyType", "companySize", "companyDescription", "pincode", "whatsapp", "gstNo", "yearEstablished",
  ]) assert.match(screen, new RegExp(field));
  assert.match(screen, /c\("verifiedMobile"\)/);
  assert.match(screen, /c\("mobileReadOnly"\)/);
  assert.match(screen, /setField\("profilePhoto", null\)/);
  assert.match(screen, /requestCivicPortal/);
  assert.doesNotMatch(screen, /role-change-requests|requestCorrection/);
  assert.match(context, /apiPost<any>\("\/api\/job-portal\/switch-role"/);
  assert.match(context, /delete payload\.phone/);
  assert.match(context, /delete payload\.role/);
  assert.match(context, /apiPatch<any>\(`\/api\/job-portal\/users\/\$\{jobsUser\.id\}`/);
});
