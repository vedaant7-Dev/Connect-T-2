# Connect-T Job Portal Final QA Checklist

Use this checklist before creating the final APK/AAB.

## Backend source of truth

- Production backend must run from Render temporarily or Hostinger VPS finally.
- Replit must not be used as production backend.
- Mobile API base URL must point to the active backend through `EXPO_PUBLIC_API_URL` or `mobile/constants/api.ts`.

## Backend health

Open these URLs on the active backend:

```txt
/api/health
/api/job-portal/health
```

Expected:

```json
{"success":true}
```

If using the preloader patch start command, also test:

```txt
/api/job-portal/patch-health
```

Expected:

```json
{"success":true,"patch":"jobPortalProfilePatch","active":true}
```

## Job Portal seeker flow

1. Open Job Portal.
2. Register as Job Seeker.
3. Upload profile photo.
4. Enter DOB in DD/MM/YYYY style fields.
5. Fill location, qualification, skills, current status, experience, languages, and about.
6. Save profile.
7. Search jobs.
8. Open job detail.
9. Apply for a job.
10. Confirm Applied tab shows the job.
11. Confirm status changes to Shortlisted, Rejected, or Hired after employer action.
12. Open Resume tab.
13. Confirm resume preview shows profile data.
14. Confirm Chats tab shows job chat threads.

## Job Portal employer flow

1. Register as Employer.
2. Upload company logo/profile photo.
3. Fill company, contact person, WhatsApp, industry, GST, address, company type, size, year established, and description.
4. Save profile.
5. Post a job with:
   - title
   - category
   - type
   - urgent hiring
   - salary min/max
   - openings
   - shift
   - job mode
   - work start/end time
   - working days
   - weekly off
   - address
   - education/experience/skills
   - requirements
   - description
   - benefits
   - joining preference
   - last date to apply
6. Confirm job appears in employer Jobs screen.
7. Confirm seeker can see the job.
8. Confirm applicant appears in Active Job / Hiring Pipeline.
9. Test Shortlist.
10. Test Reject.
11. Test Hire.
12. Test in-app Chat.
13. Test WhatsApp button.

## Civic Service no-regression check

Do not accept final build if any Civic Service UI changes unexpectedly.

Check:

1. Citizen dashboard visual layout.
2. Civic service cards/colors.
3. Complaint submission screen.
4. Complaint list screen.
5. Nagarsevak dashboard.
6. Super admin dashboard.
7. Complaint status transitions.

## Build checks

Run from repository root when ready:

```bash
pnpm install
pnpm run typecheck
```

Run mobile locally:

```bash
cd mobile
npx expo start --clear
```

For Expo tunnel from Replit:

```bash
cd mobile
npx expo start --tunnel --clear
```

## Final production backend target

When switching to Hostinger VPS:

```bash
cd /var/www/connect-t/backend
git pull origin main
npm install
pm2 start ecosystem.config.cjs
pm2 save
```

Nginx should proxy the public API domain to:

```txt
localhost:3000
```

Final mobile build should use the permanent Hostinger API URL, not Replit and not temporary Render.
