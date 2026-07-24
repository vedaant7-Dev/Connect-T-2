# Connect-T Production Deployment Checklist

This checklist is the required handoff from the source-level production audit to a real Hostinger and device release. Automated CI proves syntax, contracts, TypeScript, Expo compatibility, Android JavaScript export, web build, and production dependency audits. It does **not** replace a backed-up database migration, live provider verification, signed mobile build, or physical-device testing.

## 1. Release Inputs

Record these values before starting:

- Release branch/commit: `fix/connect-t-complete-production-audit`
- Pull request: `#12`
- Target environment: staging or production
- Database name and backup timestamp
- Upload-directory path and backup timestamp
- Backend public HTTPS URL
- Mobile `EXPO_PUBLIC_API_URL`
- Release operator and approval owner

Do not deploy from an uncommitted local folder or copy only `server.js`. The production runtime depends on the complete backend folder and the preload modules listed in `backend/productionBootstrap.js`.

## 2. Pre-Deployment Backup

- Put the application into an agreed maintenance window when production data is active.
- Export the full MySQL database, including routines, triggers, table structures, indexes, and data.
- Back up the persistent uploaded-media directory configured through `UPLOAD_DIR`.
- Confirm both backups can be downloaded and opened before continuing.
- Record the current deployed application commit/package for rollback.
- Do not delete existing user, complaint, alert, broadcast, job, application, message, or media records.

## 3. Required Environment Variables

Confirm deployment secrets are configured outside source control:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET` with a strong production-only value
- SMS-provider credentials required by the current provider integration
- `PUBLIC_BASE_URL` using the final HTTPS backend origin
- `UPLOAD_DIR` pointing to writable persistent storage
- `PORT`
- Allowed-origin/CORS configuration used by the deployment

Mobile build configuration:

- `EXPO_PUBLIC_API_URL` must point to the same final HTTPS API origin.
- Never place database, JWT, or SMS-provider secrets in Expo public environment variables.

External push is intentionally reported as **Not configured**. Do not advertise external push delivery until device-token lifecycle, provider credentials, invalid-token cleanup, retry behavior, and delivery receipts are implemented and tested.

## 4. Database Migration

1. Select the intended database explicitly.
2. Run `backend/migrations/20260723_complete_production_audit.sql` once.
3. Confirm the migration record exists in `schema_migrations`.
4. Confirm the following structures exist:
   - `complaints.client_request_id`
   - unique index `uniq_complaints_client_request`
   - alert lifecycle columns and indexes
   - `alert_receipts`
   - `broadcasts`
   - `broadcast_receipts`
5. Verify existing row counts for users, complaints, alerts, jobs, applications, and messages did not decrease.
6. Confirm existing alerts remain available with English/published defaults where lifecycle fields were previously absent.

The migration is additive. Follow `backend/migrations/20260723_complete_production_audit_ROLLBACK.md` for rollback principles; do not destroy audit/history tables merely to roll back application code.

## 5. Backend Deployment

- Upload or deploy the complete `backend` directory.
- Install locked production dependencies from `backend/package-lock.json`.
- Use the repository start command: `npm start`.
- Confirm `hostinger-entry.js` loads `productionBootstrap.js` before `server.js`.
- Confirm the process starts without syntax, missing-module, database, or filesystem errors.
- Confirm `UPLOAD_DIR` is writable by the application process and survives restart/redeploy.
- Confirm `/uploads/...` URLs resolve through `PUBLIC_BASE_URL` over HTTPS.
- Restart the Node process after environment or migration changes.
- Verify `/api/healthz` before any client release.

## 6. Backend Smoke Tests

Use staging/test accounts for all five roles where available.

### Authentication

- Request OTP once and confirm a real SMS arrives.
- Request resend only after the displayed cooldown.
- Confirm the previous OTP is invalid after resend.
- Confirm invalid OTP attempts are limited and user errors do not expose provider/database details.
- Confirm Citizen, Nagarsevak, and Super Admin role routing from the unified mobile number login.

### Complaints

- Submit a text-only complaint.
- Submit JPEG, PNG, and WebP complaint images below 8MB.
- Reject an unsupported or mismatched file type.
- Retry the same request after a simulated timeout and confirm only one complaint exists.
- Confirm uploaded images remain available after backend restart.
- Confirm Citizen, assigned Nagarsevak, and Super Admin see the expected complaint and image.

### Alerts, News, and Broadcasts

- Publish a global update as Super Admin.
- Publish a ward update as an approved Nagarsevak and confirm it is restricted to the assigned ward.
- Confirm invalid ward/audience values are rejected.
- Schedule a future update and reject a past schedule.
- Open an alert/broadcast as a Citizen and confirm unread/read counters update.
- Confirm archive hides the item without deleting audit history.
- Confirm external push status remains `not_configured` until a real provider exists.

### Profiles and Job Portal

- Edit every applicable Civic profile field except verified mobile.
- Restart/re-login and confirm all saved fields rehydrate.
- Add, replace, and remove profile photos.
- Complete Job Seeker onboarding from an existing Citizen session without a second OTP.
- Complete Employer onboarding from an existing Citizen session without a second OTP.
- Confirm direct role switching is blocked and the role-correction request reaches Super Admin.
- Confirm Job Seeker/Employer profile changes persist after logout/login.

## 7. Signed Mobile Build

Automated CI performs an Android Expo production export, not a signed APK/AAB installation.

- Produce a signed preview APK from the validated commit.
- Install it on at least one small-screen and one large-screen Android device.
- Produce the production AAB only after preview testing passes.
- Confirm the app package/application ID, version code, version name, signing key, and API URL are correct.
- Do not reuse a development API URL in the release build.

For iOS, run a real macOS/Xcode/EAS build and device test before an iOS release. The current Linux CI does not prove iOS build or runtime behavior.

## 8. Physical Android Role Matrix

Run each workflow with English, Marathi, and Hindi where applicable:

| Workflow | Citizen | Nagarsevak | Super Admin | Job Seeker | Employer |
|---|---:|---:|---:|---:|---:|
| Unified login and OTP resend | Required | Required | Required | Via Citizen | Via Citizen |
| Logout and protected back navigation | Required | Required | Required | Required | Required |
| Direct portal switching | Required | N/A | N/A | Required | Required |
| Profile view/edit/re-login persistence | Required | Required | Required | Required | Required |
| Text complaint | Required | View | View | N/A | N/A |
| Camera/gallery complaint image | Required | View | View | N/A | N/A |
| Alerts/news/broadcast read state | Required | Required | Required | Via Citizen | Via Citizen |
| Publish/ward governance | Read only | Required | Required | Read only | Read only |
| Keyboard does not hide fields/buttons | Required | Required | Required | Required | Required |
| Small-screen text wrapping | Required | Required | Required | Required | Required |

Also test:

- Android back button after logout and portal switch.
- App background/resume during OTP countdown and long forms.
- Slow, offline, timeout, and reconnect behavior.
- Camera denied, gallery denied, upload interrupted, and server unavailable states.
- Large font/display scaling and TalkBack labels.
- Marathi/Hindi text expansion without clipping or overlap.

## 9. Web/WebView Verification

When the Expo web build or a WebView deployment is shipped:

- Confirm HTTPS and API CORS origins.
- Confirm login, session expiry, logout, and portal switching.
- Confirm file selection and multipart complaint upload.
- Confirm browser refresh restores only valid sessions.
- Confirm no raw backend/provider messages appear in the UI.
- Recognize that browser storage does not provide native SecureStore guarantees.

## 10. Release Approval

Release only when all of the following are true:

- GitHub Actions is green on the exact release commit.
- Database and uploads backups are verified.
- Additive migration has been applied successfully.
- Backend health and live smoke tests pass.
- Signed preview APK has passed the five-role matrix.
- No unresolved critical/high security issue remains.
- External push claims match the actual configured capability.
- A named stakeholder approves production release.

## 11. Rollback

When a blocking issue appears:

1. Stop new release traffic or restore the previous application deployment.
2. Keep additive migration structures and audit history unless a database specialist approves otherwise.
3. Restore the upload backup only when files were corrupted or lost; do not overwrite newer valid uploads casually.
4. Restore the database backup only for a confirmed data-integrity incident and only after preserving the current failed-state snapshot.
5. Re-run `/api/healthz`, login, complaint, and profile smoke tests on the restored version.
6. Record the incident, affected commit, timestamps, user impact, and corrective action.

## 12. Evidence to Retain

- GitHub Actions run URL and release commit SHA
- Database migration output and migration-row query
- Backend health response
- Signed APK/AAB build identifier
- Device/OS matrix with pass/fail notes
- Screenshots or screen recordings for critical role workflows
- Live SMS and upload test timestamps
- Release approval and rollback owner
