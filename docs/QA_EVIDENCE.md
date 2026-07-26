# Connect-T QA Evidence Ledger

## Baseline

- Repository: `vedaant7-Dev/Connect-T-2`
- Starting `main` commit: `5cb7e8227fee922cbc932bed3937d71e0c5f8190`
- Audit branch: `audit/connect-t-zero-assumption-production-recheck`
- Validated audit head: `7d2d11f21ffd605cd4c6e968108b93b6b9b536d1`
- Pull request: `#20`

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

## Source and automated evidence completed

### Repository and route inventory

The generated inventory for the current audit head reports:

- 62 Expo route files,
- 284 visible interaction handlers in route files,
- 57 extracted frontend API calls,
- 141 extracted backend routes,
- 58 dynamically installed production-patch routes,
- 0 frontend calls without an exact extracted backend method/path.

This proves source-level method/path coverage for the calls detected by the extractor. It does not prove live runtime reachability, response-schema compatibility or database persistence.

### Civic Broadcast delivery

- Source verified: Broadcast composer points to the media-enabled implementation.
- Source verified: Broadcast context sends JSON when no media is attached and multipart when media is attached.
- Source verified: image picker uses maximum image quality and preserves original web-file passthrough.
- Source verified: Civic Home displays sent official broadcasts as announcement tiles.
- Source verified: the exact Broadcast ID is carried into Alerts & News and the selected item is opened.
- Source verified: image presentation uses `contain` and attached video opens from the stored media URL.
- Automated-test verified: announcement delivery, exact-item deep linking, media rendering and picker behaviour are covered by regression tests.

### Authentication, roles and destructive actions

- Automated-test verified: unified login and retired privileged-login redirects.
- Automated-test verified: persistent OTP resend timing, restart recovery and duplicate-submit protection.
- Automated-test verified: Super Admin and Nagarsevak activate/deactivate/remove/revoke actions use the cross-platform confirmation modal.
- Automated-test verified: safe backend protection reasons remain visible while route, SQL and URL details are hidden.
- Automated-test verified: revoked Super Admin assignments disappear from the active list while audit history remains server-side.

### Complaints, Job Portal and Community Feed

- Automated-test verified: retry-safe image and text complaint submissions.
- Automated-test verified: complaint assignment excludes inactive officers.
- Automated-test verified: Job Portal dashboards, governed role selection/correction, profile fields and messaging contracts.
- Automated-test verified: legacy Job Portal authentication routes are disabled.
- Automated-test verified: Feed posts, comments, likes, sharing entry points, ownership checks and blocked-author filtering.
- Automated-test verified: Job message and Feed media validation rejects unsupported input safely.

### Security and release configuration

- Automated-test verified: production startup rejects a missing, placeholder or undersized `JWT_SECRET`.
- Automated-test verified: native bearer and OTP secrets use encrypted storage with legacy cleanup.
- Automated-test verified: current-tree and Git-history secret scan completed with zero findings.
- Source verified: Android production signing no longer silently falls back to the debug keystore.
- Source verified: Render backend and static web services are configured for automatic deployment from the repository.

## Commands and builds

| Area | Command/check | Result | Evidence level |
|---|---|---|---|
| Backend syntax/security | `npm run check`, `npm test`, production dependency audit | Passed | Automated-test verified |
| Mobile tests | `npm run test:api` | 54 passed, 0 failed | Automated-test verified |
| Expo Doctor | `npm run doctor` | 21/21 checks passed | Automated-test verified |
| Mobile TypeScript | `npm run typecheck` | Passed | Automated-test verified |
| Expo Android export | `npm run export:android` | Passed | Automated-test verified |
| Expo web export | `npm run export:web` | Passed | Automated-test verified |
| Legacy web | TypeScript and production build | Passed | Automated-test verified |
| Native Gradle APK | clean `assembleDebug` | Passed; debug APK artifact produced | Automated-test verified |
| Route/API inventory | repository and backend route extractors | Passed; evidence artifact produced | Source verified |
| Secret scan | current tree and Git history | Passed; zero findings | Automated-test verified |
| Quality workflow | GitHub Actions run `30181242306` | Success | Automated-test verified |
| Audit-evidence workflow | GitHub Actions run `30181241927` | Success | Automated-test verified |

## Static UI audit advisories

The static UI audit scanned 47 files and identified review targets including explicit accessibility metadata and a small number of keyboard/text-alignment advisories. These are heuristic findings, not confirmed runtime defects. Shared `AppScrollView` keyboard guarantees and Android `softwareKeyboardLayoutMode=resize` remain active. Device-level accessibility and keyboard behaviour are not claimed by this ledger.

## External verification still required

The following cannot be established from repository access or GitHub Actions alone:

1. Render is serving the merged backend and `/api/broadcasts/capabilities` returns `broadcast-media-v1`.
2. Production database migrations have been applied successfully.
3. uploaded complaint, Broadcast, Feed and Job Portal media survive backend restart and redeployment.
4. the real SMS provider completes OTP send/resend/verify flows.
5. the debug APK has been exercised on an emulator and physical Android devices.
6. a release-signed APK/AAB has been built with the production keystore and tested through a release channel.

## Strongest supported status

**Source and automated validation complete; live deployment and device verification pending.**

This ledger must not be used to claim staging or production verification until the external checks above are actually executed and recorded.
