# Connect-T Current Runtime Architecture

> Baseline branch: `audit/connect-t-zero-assumption-production-recheck`
>
> Starting `main` commit: `5cb7e8227fee922cbc932bed3937d71e0c5f8190`
>
> This document is rebuilt from active package scripts, deployment manifests, imports and route registrations. It is not production verification.

## Authoritative runtime diagram

```text
Citizen / Nagarsevak / Super Admin / Job Portal user
                         |
                         v
          mobile/ Expo Router application
       Android native target + Expo web export
                         |
       Civic or Job Portal bearer-token request
                         |
                         v
        backend/hostinger-entry.js (startup)
              -> productionBootstrap.js
              -> backend/server.js
                         |
                         v
          MySQL + configured upload storage
```

## Active runtime surfaces

### Expo Router mobile and web application — active production source

- Root: `mobile/`
- Package entry: `expo-router/entry`
- Root navigation: `mobile/app/_layout.tsx`
- Android export: `npm run export:android`
- Expo web export: `npm run export:web`
- Authentication, alerts, broadcasts, complaints and feed state are mounted by root context providers.
- The same Expo source is used by the Android build and Render testing web application.
- `mobile/android/` is the active native Android project.

### Node.js / Express backend — authoritative active server

- Root: `backend/`
- Render root directory: `backend`
- Render command: `npm start`
- Actual startup file: `backend/hostinger-entry.js`
- `hostinger-entry.js` loads `productionBootstrap.js` and then `server.js`.
- `server.js` also requires the bootstrap; Node's module cache prevents duplicate patch execution.
- Production patch modules are executable runtime code and register or intercept active routes before the legacy monolithic route declarations.
- MySQL is configured through environment variables and `mysql2/promise`.
- Uploaded media is served from `/uploads` using `UPLOAD_DIR` or `backend/uploads` by default.

### Root package — active Hostinger-compatible backend wrapper

- Root `package.json` starts `node backend/hostinger-entry.js`.
- This exists so a host that installs and starts from the repository root still launches the same authoritative backend.
- Root and `backend/` package locks must therefore remain compatible with the same backend source.

### Render deployment — active deployment manifest

- Manifest: `render.yaml`
- Backend service: `connect-t-2`
- Expo static web service: `connect-t-web-testing`
- Static web root: `mobile`
- Static publish directory: `dist`
- SPA rewrite: `/*` to `/index.html`
- Web API URL is derived from the Render backend service external URL.

### Codemagic — active native build tooling

- Manifest: `codemagic.yaml`
- Installs `mobile/` dependencies and runs native Gradle tasks.
- Builds arm64-only APK/AAB outputs.
- **Release blocker:** `mobile/android/app/build.gradle` currently signs the release build with the debug keystore. Outputs can be used as preview/test artefacts but must not be represented as production-signed Play Store artefacts.

### GitHub Actions — active test/build tooling

- Workflow: `.github/workflows/quality.yml`
- Backend syntax/tests/audit, mobile doctor/tests/typecheck/exports, and the standalone client build are active checks.
- The audit branch adds a clean Gradle `assembleDebug` job and APK artefact because Expo export alone is not native APK proof.
- The audit branch also generates route/API inventory evidence.

## Legacy and duplicate implementations

### `server/` — legacy duplicate backend

- Has its own `package.json` and `server.js`.
- Exposes only a small jobs/complaints surface and uses a separate dependency/security model.
- It is not referenced by `render.yaml`, the root start command, or `backend/hostinger-entry.js`.
- `server/src/` contains another TypeScript server entry that is also not selected by the active deployment manifests.
- Classification: **legacy/experimental duplicate; not authoritative production runtime**.

### `mobile/server/` — legacy local backend copy

- Contains separate Express startup files and limited complaints/auth routes.
- It is not referenced by `mobile/package.json`, Render, the root package, or the active backend package.
- Its generic `ROUTE_NOT_FOUND` message matches errors that can occur when an obsolete server is deployed accidentally.
- Classification: **legacy duplicate; must not be deployed as Connect-T production backend**.

### `client/` — standalone legacy/mock-up web client

- Package name is `mockup-sandbox` and it builds with Vite/React.
- It is still typechecked/built in GitHub Actions, so it remains active build tooling.
- It is not the web application selected by `render.yaml`; Render deploys the Expo export from `mobile/`.
- Classification: **legacy/standalone web client retained for build compatibility, not the authoritative Connect-T web deployment**.

### `pnpm-workspace.yaml` — legacy workspace tooling

- Includes `server`, `client`, `myapp-new`, `artifacts/*`, `lib/*` and `scripts`.
- It does not include the active `mobile/` or `backend/` packages.
- Current active CI and deployment use folder-specific npm lockfiles instead.
- Classification: **legacy workspace configuration; not the authoritative install path for production services**.

### `.replit` — active development launcher only

- Starts Expo from `mobile/` on port 8081.
- It does not define the Render production topology.
- Classification: **development runtime configuration**.

## Active data flow

1. Expo UI calls helpers under `mobile/lib/` and context providers under `mobile/context/`.
2. Bearer tokens are selected by Civic or Job Portal session state.
3. Requests are sent to the configured backend base URL.
4. Express routes and production patch modules enforce authentication and role/ward/ownership rules.
5. MySQL stores users, role assignments, complaints, job data, alerts, broadcasts and receipts.
6. Media metadata is stored in MySQL while files are served from the configured upload directory.

## Deployment and media limitations

- Render's default filesystem is ephemeral unless a persistent disk or external object storage is configured.
- Repository code can validate and serve media, but durable production media retention cannot be claimed without deployment-level persistent storage verification.
- The deployed backend must expose `/api/broadcasts/capabilities` with `broadcast-media-v1` before Broadcast attachment tests are meaningful.
- The backend must be deployed before the static Expo web application so the web bundle points to an API with matching routes.

## Verification levels

- **Source verified:** active imports, package scripts or deployment configuration inspected.
- **Automated-test verified:** repository test or build completed successfully.
- **Integration verified:** frontend/backend/database flow executed and resulting state checked.
- **Emulator verified:** APK installed and exercised on an emulator.
- **Physical-device verified:** APK exercised on a real device.
- **Staging verified:** deployed staging services exercised.
- **Production verified:** live production deployment and resulting state exercised.

Current status: active runtime is source verified; live production deployment and persistent media storage are not yet verified.
