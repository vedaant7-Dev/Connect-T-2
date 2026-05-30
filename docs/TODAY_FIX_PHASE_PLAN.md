# Connect-T Today Fix Plan

This plan is the source of truth for the next repair batch. It focuses on finishing the APK-tested app issues without changing the working Civic Service dashboard UI.

## Hard rules

1. Do not change Civic Service dashboard UI.
2. Use Civic Service screens as the design source for Job Portal.
3. Keep only Native Android Build for APK testing.
4. Do not use EAS/Expo cloud build.
5. Do not use Replit backend for production.
6. Render is temporary backend; Hostinger VPS is final later.
7. After each phase, run TypeScript/build sanity checks before moving forward.

---

## Phase 0 — Safety freeze and baseline

### Goal
Stop workflow confusion and prevent repeated install failures.

### Files / areas
- `.github/workflows/android-native-build.yml`
- `mobile/package.json`
- `mobile/scripts/verify-latest-ui.js`
- `mobile/android/settings.gradle`

### Tasks
- Keep only Native Android Build as the APK workflow.
- Confirm duplicate Build Android APK workflow is removed.
- Confirm `mobile/package.json` postinstall does not run brittle UI marker checks.
- Keep Hermes compiler setup.
- Confirm Android settings Node resolution works with current install layout.
- Confirm ARM64 APK artifact name is stable.

### Done when
- Native Android Build no longer fails during `npm install` because of UI marker checks.
- APK workflow reaches TypeScript or Gradle stage.

---

## Phase 1 — Correct app entry workflow

### Goal
Make the app flow exactly:

```txt
Splash screen
→ Select Civic Service / Job Portal
→ Civic Service selected: Civic login/register
→ Job Portal selected: Job Portal login/register
```

### Files / areas to inspect and patch
- `mobile/app/index.tsx`
- `mobile/app/_layout.tsx`
- `mobile/app/login.tsx`
- `mobile/app/register.tsx`
- `mobile/app/jobs/login.tsx`
- `mobile/app/secret-access.tsx`
- `mobile/app/super-admin-login.tsx`
- route guards / auth contexts

### Tasks
- Identify current first route after splash.
- Add or fix service selection screen.
- Store selected service safely if needed.
- Civic Service button opens existing Civic login/register flow.
- Job Portal button opens Job Portal login/register flow.
- Admin Access remains reachable without confusing normal users.
- Fix Job Portal login back button.

### Done when
- Fresh install starts at splash/select flow.
- Civic path works.
- Job Portal path works.
- Back navigation works from Job Portal login.
- Admin Access screen is still reachable.

---

## Phase 2 — Job Portal UI conversion to Civic orange theme

### Goal
Make Job Portal match Civic Service dashboard style 100% visually.

### Civic source files to copy style from
- `mobile/app/(tabs)/index.tsx`
- Civic Complaints tab
- Civic News tab
- Civic Profile tab
- Shared components:
  - `mobile/components/DecorativeCircles.tsx`
  - `mobile/components/TopShade.tsx`
  - `mobile/components/SectionHeader.tsx`
  - Civic card/button styles

### Job Portal files to patch
- `mobile/app/jobs/login.tsx`
- `mobile/app/jobs/(tabs)/index.tsx`
- `mobile/app/jobs/search.tsx`
- `mobile/app/jobs/(tabs)/applied.tsx`
- `mobile/app/jobs/(tabs)/profile.tsx`
- `mobile/app/jobs/(tabs)/post.tsx`
- `mobile/app/jobs/resume.tsx`
- `mobile/app/jobs/detail/[id].tsx`
- `mobile/app/jobs/active/[id].tsx`
- `mobile/app/jobs/chat/[id].tsx`

### Design requirements
- Replace green gradients with Civic orange gradient:
  - `#C2410C`
  - `#EA580C`
  - `#F97316`
  - `#FB923C`
- Use Civic light page background: `#ebeffc`.
- Use same rounded header radius as Civic.
- Use `TopShade` and `DecorativeCircles` where matching Civic header.
- Reduce Job Portal font sizes to Civic scale:
  - large header around 18
  - section title around 14
  - card title around 13–16
  - labels/meta around 8–12
- Use compact spacing like Civic dashboard.
- Keep Job Portal screens professional but visually consistent with Civic.

### Done when
- Job Portal no longer feels like separate green app.
- Job Portal visually matches Civic dashboard screenshots.
- Civic Service UI files are untouched unless only imported/shared components are reused safely.

---

## Phase 3 — Simplify Job Portal login/register

### Goal
Make Job Portal auth like Civic auth: simple, short, fast.

### Current problem
Job Portal registration asks too many fields. Full details should be filled later in Profile.

### New registration fields
For Job Seeker:
- role
- name
- mobile number
- basic location / area

For Employer:
- role
- company/shop name
- contact person name
- mobile number
- basic location / area

### Move to Profile screen
- profile photo
- DOB
- education
- skills
- current status
- experience
- languages
- about
- current company/current role
- previous company/previous role
- college/field of study
- company type
- company size
- year established
- GST/business registration
- website
- full address
- company description

### Files / areas
- `mobile/app/jobs/login.tsx`
- `mobile/app/jobs/(tabs)/profile.tsx`
- `mobile/context/JobsAuthContext.tsx`
- backend Job Portal profile endpoints if needed

### Done when
- Job Portal login/register is short like Civic.
- No long registration form.
- Full details remain editable in Profile.
- Registration still creates correct seeker/employer user.

---

## Phase 4 — Fix Job Portal button/navigation issues

### Goal
Every visible button must work.

### Known broken / reported
- Back button on Job Portal login.
- Resume Builder button.
- Resume route / missing feature.

### Files / areas
- `mobile/app/jobs/login.tsx`
- `mobile/app/jobs/(tabs)/index.tsx`
- `mobile/app/jobs/(tabs)/applied.tsx`
- `mobile/app/jobs/(tabs)/profile.tsx`
- `mobile/app/jobs/resume.tsx`
- route definitions under `mobile/app/jobs/**`

### Tasks
- Test every `router.push` path in Job Portal.
- Ensure all routes exist.
- Fix invalid route strings.
- Add fallback/back behavior if route history is empty.
- Ensure employer-only and seeker-only buttons respect role.

### Done when
- Back works.
- Resume opens.
- Search opens.
- Applied opens.
- Profile opens.
- Post job opens.
- Applicant dashboard opens.
- Chat opens.
- WhatsApp button opens correct URL.

---

## Phase 5 — Resume Builder complete

### Goal
Make a usable resume builder, not just a placeholder.

### Required features
- Resume preview using profile data.
- Editable sections.
- Job seeker photo/name/contact/details.
- Education.
- Skills.
- Experience.
- Languages.
- Career objective/about.
- Download/share as image.
- Download/share as PDF if supported by existing dependencies or lightweight added dependency.

### Files / areas
- `mobile/app/jobs/resume.tsx`
- `mobile/app/jobs/(tabs)/profile.tsx`
- `mobile/context/JobsAuthContext.tsx`
- `mobile/package.json` if export dependency is needed

### Implementation approach
- First make resume screen fully functional with preview and edit/save.
- Then add image export.
- Then add PDF export if dependency and native build are safe.
- Avoid heavy dependency if it risks APK build today.

### Done when
- Resume button opens resume builder.
- Resume preview shows user profile data.
- User can update missing profile data.
- Export/share works at least as image.
- PDF export is added if stable in native build.

---

## Phase 6 — Super Admin / Admin Access route cleanup

### Goal
Make Admin Access and Super Admin reachable and not confusing.

### Requirements
- Admin Access screen exists.
- Super Admin Login exists.
- Nagarsevak Login exists.
- Nagarsevak Register exists.
- Tejashree / Super Admin restriction stays intact.
- Super Admin dashboard opens correctly after authorized login.

### Files / areas
- `mobile/app/secret-access.tsx`
- `mobile/app/super-admin-login.tsx`
- `mobile/app/admin.tsx`
- `mobile/app/super-admin/**`
- `mobile/app/nagarsevak/**`
- `mobile/context/AuthContext.tsx`

### Done when
- Admin Access can be reached from intended hidden/secure entry.
- Super Admin flow works.
- Nagarsevak flow works.
- Civic/Job Portal normal users are not sent there accidentally.

---

## Phase 7 — Backend/MySQL final QA for Job Portal

### Goal
Confirm Job Portal is not local-only and data persists.

### Areas
- `mobile/context/JobsAuthContext.tsx`
- `mobile/context/JobsContext.tsx`
- backend Job Portal routes
- backend DB schema patch files

### Tests
- Register seeker.
- Save profile.
- Kill app/reopen; profile persists.
- Register employer.
- Save company profile.
- Post job.
- Seeker sees job.
- Seeker applies.
- Employer sees applicant.
- Shortlist/reject/hire persists.
- Chat persists if implemented.

### Done when
- Key Job Portal data round-trips through backend/MySQL.
- No hardcoded-only final behavior for jobs/applications/profile.

---

## Phase 8 — Build and APK verification

### Goal
Produce final test APK after code fixes.

### Workflow
Use only:

```txt
Actions → Native Android Build
```

### Build requirements
- No EAS.
- No Expo cloud.
- ARM64 native APK.
- Artifact name: `connect-t-arm64-native-apk`.

### Local/GitHub checks
- TypeScript check passes.
- Native Android Build passes.
- APK installs.

### Manual app QA
- Splash/select flow.
- Civic login/register.
- Civic home, complaints, news, profile unchanged.
- Job Portal login/register.
- Job Portal home/search/applied/profile/resume.
- Employer post/manage applicants.
- Admin Access/Super Admin/Nagarsevak.

### Done when
- APK installs and the reported UI/function issues are fixed.

---

## Today's priority order

1. Phase 0 safety freeze.
2. Phase 1 app workflow.
3. Phase 2 Job Portal Civic-orange UI conversion.
4. Phase 3 simplified Job Portal auth.
5. Phase 4 button/navigation fixes.
6. Phase 5 resume builder functional export.
7. Phase 6 Admin Access cleanup.
8. Phase 7 backend persistence QA.
9. Phase 8 Native Android APK build.

## Non-negotiable acceptance checklist

- Civic Service dashboard visually unchanged.
- Job Portal visually matches Civic orange design.
- Job Portal fonts and spacing are compact like Civic.
- Login/register is simple.
- Full details are in Profile.
- Back button works.
- Resume builder opens and exports.
- Splash/select workflow is correct.
- Super Admin/Admin Access is reachable.
- Native Android Build produces APK.
