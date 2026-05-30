# Connect-T Complete Master Scope

This document expands the phase plan and captures all fixes and changes discussed, including older Civic Service/backend/admin items and the latest APK Job Portal feedback.

## Non-negotiable rules

1. Civic Service dashboard UI must not be changed.
2. Job Portal UI may be changed fully, but must match the Civic Service orange dashboard theme.
3. Use real backend/MySQL persistence for production features.
4. Replit is not production backend.
5. Render is temporary; Hostinger VPS is final production backend target.
6. Build APK through Native Android Build only, not EAS/Expo cloud.
7. Keep changes controlled and avoid touching unrelated files.

---

## A. Current APK feedback fixes

### A1. Job Portal UI must match Civic Service

- Change Job Portal from green to Civic orange gradient.
- Reuse Civic gradient colors: `#C2410C`, `#EA580C`, `#F97316`, `#FB923C`.
- Reuse Civic light background: `#ebeffc`.
- Match Civic rounded header, compact cards, shadows, icon blocks, and spacing.
- Match Civic font scale; current Job Portal fonts are too large.
- Use Civic dashboard source as visual reference:
  - `mobile/app/(tabs)/index.tsx`
  - Civic complaints tab
  - Civic news tab
  - Civic profile tab
  - shared components like `TopShade`, `DecorativeCircles`, `SectionHeader`.

### A2. Job Portal login/register must be simplified

- Login/register should look and feel like Civic login/register.
- Registration must only ask basic details.
- Job seeker basic registration:
  - role
  - name
  - phone
  - area/location if required
- Employer basic registration:
  - role
  - company/shop name
  - contact person
  - phone
  - area/location if required
- Move full details to Profile.

### A3. Job Portal profile must hold full details

- Profile photo.
- DOB picker like citizen registration.
- Qualification.
- Skills.
- Current status.
- Experience.
- Languages.
- About/objective.
- Current company/current role.
- Previous company/previous role.
- College name/field of study.
- Employer company type.
- Company size.
- Year established.
- GST/business registration.
- Website.
- Full address.
- Company description.

### A4. Job Portal navigation/buttons

- Back button on Job Portal login must work.
- Resume Builder button must work.
- Search button must work.
- Applied button must work.
- Profile button must work.
- Post Job button must work.
- Employer applicant dashboard button must work.
- Chat button must work.
- WhatsApp button must open WhatsApp/contact flow.

### A5. Resume Builder

- Resume screen must not be placeholder.
- Use profile data to generate resume.
- Allow editing missing sections.
- Show professional resume preview.
- Export/share resume as image.
- Export/share resume as PDF if dependency is safe for native APK.
- Avoid heavy dependency that breaks today’s APK if PDF export can be deferred behind a stable implementation.

### A6. App entry workflow

Final flow must be:

```txt
Splash screen
→ Select Civic Service / Job Portal
→ Civic selected: Civic login/register
→ Job Portal selected: Job Portal login/register
```

- Admin Access / Super Admin must still be reachable.
- Job Portal auth should not accidentally enter Civic auth.
- Civic auth should not accidentally enter Job Portal auth.

---

## B. Job Portal feature scope

### B1. Job seeker flow

- Register/login as job seeker.
- Create and edit profile.
- Upload profile photo.
- DOB support.
- Search jobs.
- Filter jobs.
- Nearby jobs.
- Open job detail.
- Apply for job.
- Track applied jobs.
- Track application status.
- Receive notifications.
- Chat with employer.
- WhatsApp contact.
- Resume builder and export.

### B2. Employer flow

- Register/login as employer.
- Create and edit company/employer profile.
- Upload company logo/profile photo.
- Post job.
- Job title/category/type.
- Salary min/max.
- Openings.
- Urgent hiring.
- Job mode.
- Shift.
- Work start/end time.
- Working days.
- Weekly off.
- Education/experience/skills requirements.
- Job description.
- Benefits.
- Joining preference.
- Last date to apply.
- Manage posted jobs.
- Activate/deactivate job.
- View applicants.
- Shortlist applicant.
- Reject applicant.
- Hire applicant.
- Chat with applicant.
- WhatsApp applicant.

### B3. Job Portal backend/data

- Job Portal users must persist in MySQL.
- Job seeker profile must persist.
- Employer/company profile must persist.
- Jobs must persist.
- Applications must persist.
- Applicant status must persist.
- Chat/messages must persist if implemented.
- No hardcoded/local arrays as final production source.

---

## C. Civic Service fixes and no-regression requirements

### C1. Civic Service UI no-regression

Must remain visually unchanged:

- Citizen dashboard.
- Civic orange header.
- Report an Issue CTA.
- Utility cards.
- Quick Services.
- Complaints tab.
- News tab.
- Profile tab.
- Civic login/register UI.

### C2. Complaint system fixes discussed earlier

- Real `wardCode` saved in login/user system.
- All 58 wards available: A 1–29 and B 1–29.
- All 65 officers mapped properly.
- Auto officer assignment by ward.
- Auto GPS/location to ward detection.
- Remove fake/default location behavior near old Ambarnath.
- Complaint submitted from location should route to correct ward officer.
- Ward examples like Shivaji Chowk / Ward 6 must map correctly.
- Citizen complaint should save user/phone identity correctly.
- Session isolation must work so complaints from one phone do not appear under another phone after logout/login.

### C3. Complaint status lifecycle

Nagarsevak/officer dashboards must support:

- Assigned.
- In progress.
- Resolved.
- Rejected.

Complaints must move between sections correctly when status changes.

### C4. Complaint analytics/admin

- Officer live analytics dashboard.
- Super admin analytics dashboard.
- View analysis link.
- Category-wise charts.
- Advanced analysis instead of bottom complaint list where requested.
- Remove unwanted bottom complaint list from super-admin dashboard.
- Show Connect-T branding in freed area.

---

## D. Super Admin / Nagarsevak / Admin Access scope

### D1. Super Admin

- Tejashree is true Super Admin, not Nagarsevak.
- Super Admin access must be limited strictly to her allowed mobile/unique ID.
- Other users must not see Super Admin dashboard.
- Super Admin dashboard should be distinct and professional.
- Super Admin screen should not look like citizen home.
- Admin Access screen must be reachable and clear.

### D2. Nagarsevak/officer

- Nagarsevak login works.
- Nagarsevak register works.
- Registration waits for approval if required.
- Approved ward officers can login.
- Ward officer mapping must be correct.
- 65 officer mapping must be handled.
- Ward 4C/nominated member exception must not break assumptions.
- Nagarsevak complaint detail screen must support status transitions.

---

## E. Backend/deployment scope

### E1. Backend source of truth

- Backend must be Render temporarily.
- Final backend must move to Hostinger VPS.
- Replit backend should not be used as production.
- Mobile app API URL must point to active backend.

### E2. MySQL

- Hostinger MySQL connection must work.
- Hardcoded DB credentials must be moved to environment variables.
- Existing exposed credentials should be rotated where applicable.
- Schema patches must be applied safely.

### E3. Required schema areas

- `users.ward_code`.
- `users.is_super_admin`.
- `complaints.ward_code`.
- `complaints.assigned_officer_id`.
- Job Portal profile fields.
- Job Portal jobs/applications/status/messages tables or columns.

### E4. Backend route health

- `/api/health` works.
- Job Portal health route works.
- Job Portal routes are mounted in real server startup, not only preloader patch if possible.
- Render start command and Hostinger PM2 start should run same production server.

---

## F. Build/APK scope

### F1. Build method

- Use Native Android Build workflow.
- Do not use EAS/Expo cloud.
- ARM64 native APK.
- APK artifact stable name.
- Avoid duplicate/conflicting workflows.

### F2. Build blockers already seen

- Root TypeScript config compiled mobile TSX incorrectly.
- `files: []` in TypeScript build failed.
- TypeScript emitted unwanted JS files.
- Old workflows used wrong install process.
- Duplicate workflows caused confusion.
- `verify-latest-ui.js` in postinstall broke `npm install` with wrong marker.
- Android settings Node resolution failed once under pnpm layout.

### F3. Final build checks

- TypeScript check passes.
- Native Android Build passes.
- APK installs.
- APK opens.
- Civic Service still works.
- Job Portal updated UI/features work.
- Admin Access/Super Admin/Nagarsevak reachable.

---

## G. Final QA checklist

### G1. Civic user QA

- Splash/select screen.
- Select Civic Service.
- Civic login/register.
- Citizen dashboard unchanged.
- Submit complaint.
- Complaint list.
- Complaint detail/status.
- News tab.
- Profile tab.

### G2. Job seeker QA

- Select Job Portal.
- Job seeker login/register basic flow.
- Job Portal orange UI.
- Search jobs.
- Filter jobs.
- Apply job.
- Applied jobs.
- Profile update.
- Resume builder.
- Export resume.
- Chat/WhatsApp.

### G3. Employer QA

- Employer login/register basic flow.
- Employer profile.
- Post job.
- Manage job.
- View applicants.
- Shortlist/reject/hire.
- Chat/WhatsApp.

### G4. Admin QA

- Admin Access screen.
- Super Admin login restriction.
- Super Admin dashboard.
- Nagarsevak login/register.
- Officer complaint status update.
- Analytics.

---

## Execution principle

Implement in the phase order from `docs/TODAY_FIX_PHASE_PLAN.md`, but do not forget this master scope. If time is limited, fix in this priority:

1. Build stability.
2. Entry workflow.
3. Job Portal Civic-orange UI.
4. Simplified Job Portal auth.
5. Broken buttons/navigation.
6. Resume builder export.
7. Super Admin/Admin Access route cleanup.
8. Job Portal backend persistence QA.
9. Civic complaint/admin older backend fixes.
10. Final APK.
