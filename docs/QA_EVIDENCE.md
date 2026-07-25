# Connect-T QA Evidence Ledger

## Baseline

- Repository: `vedaant7-Dev/Connect-T-2`
- Starting `main` commit: `5cb7e8227fee922cbc932bed3937d71e0c5f8190`
- Audit branch: `audit/connect-t-zero-assumption-production-recheck`
- Open pull requests at baseline: none

## Evidence levels

| Level | Meaning |
|---|---|
| Source verified | Active code/configuration inspected. |
| Automated-test verified | Repository test or build completed successfully. |
| Integration verified | Frontend/backend/database flow executed and resulting state checked. |
| Emulator verified | Native package installed and exercised on an emulator. |
| Physical-device verified | Native package exercised on a real device. |
| Staging verified | Deployed staging services exercised. |
| Production verified | Live production deployment and resulting state exercised. |

## Current work log

### Civic Broadcast delivery

- Source verified: Broadcast composer route points to the media-enabled screen.
- Source verified: Broadcast context sends JSON or multipart requests and maps image/video metadata.
- Source verified: Alerts & News lists broadcast images and provides attached-video playback.
- Repair in progress: Civic Home announcement bar and exact-item News deep link.
- Repair in progress: maximum image-picker quality (`quality: 1`) while keeping video passthrough and server-side validation.
- Live blocker: the deployed backend must expose `/api/broadcasts/capabilities`; repository inspection alone cannot prove the currently running Render instance has the latest route or migration.

## Commands and builds

This table is updated only after an actual workflow or local command result is available.

| Area | Command/check | Result | Evidence level |
|---|---|---|---|
| Backend | Pending current-head CI | Pending | — |
| Mobile | Pending current-head CI | Pending | — |
| Expo web | Pending current-head CI | Pending | — |
| Android export | Pending current-head CI | Pending | — |
| Native Gradle APK | Not yet run on current audit head | Pending | — |
| Live Render API | Requires deployed environment | Blocked externally | — |
