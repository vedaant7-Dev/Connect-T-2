# Connect-T Current Runtime Architecture

> Baseline branch: `audit/connect-t-zero-assumption-production-recheck`
>
> Starting `main` commit: `5cb7e8227fee922cbc932bed3937d71e0c5f8190`
>
> This document is being rebuilt from active package scripts, deployment manifests, imports and route registrations. It must not be treated as production verification.

## Active runtime surfaces

### Expo Router mobile and web application

- Root: `mobile/`
- Router entry: `expo-router/entry`
- Root navigation: `mobile/app/_layout.tsx`
- Android export command: `npm run export:android`
- Expo web export command: `npm run export:web`
- Authentication, alerts, broadcasts, complaints and feed state are mounted by root context providers.
- The same Expo source is exported for Android and the Render testing web application.

### Node.js / Express backend

- Root: `backend/`
- Render root directory: `backend`
- Render start command: `npm start`
- Main server entry: `backend/server.js`
- `backend/server.js` loads `backend/productionBootstrap.js` before route registration. Production patch modules therefore participate in the active server runtime and must be reviewed as executable code, not documentation.
- MySQL is configured through environment variables and `mysql2/promise`.
- Uploaded media is served from `/uploads` using `UPLOAD_DIR` or `backend/uploads` by default.

### Render deployment

- Manifest: `render.yaml`
- Backend service: `connect-t-2`
- Expo static web service: `connect-t-web-testing`
- Static web root: `mobile`
- Static publish directory: `dist`
- SPA rewrite: `/*` to `/index.html`
- Web API URL is derived from the Render backend service external URL.

## Active data flow

1. Expo UI calls helpers under `mobile/lib/` and context providers under `mobile/context/`.
2. Bearer tokens are selected by the Civic or Job Portal session context.
3. Requests are sent to the configured backend base URL.
4. Express routes and production patch modules enforce authentication and role/ward/ownership rules.
5. MySQL stores users, role assignments, complaints, job data, alerts, broadcasts and related receipts.
6. Media metadata is stored in MySQL while files are served from the configured upload directory.

## Current deployment limitation

Render's default filesystem is ephemeral unless a persistent disk or external object storage is configured. Repository code can validate and serve media, but durable production media retention cannot be claimed without deployment-level persistent storage verification.

## Implementations requiring classification

The repository contains multiple server- or client-related directories and compatibility patches. Each must be classified through package scripts, imports and deployment references before removal or consolidation. This audit will maintain the classification in this document as evidence is collected.

## Verification levels

- **Source verified:** confirmed by active imports, package scripts or deployment configuration.
- **Automated-test verified:** confirmed by repository tests or build checks.
- **Integration verified:** requires a test backend and database with resulting state inspection.
- **Device verified:** requires installation and runtime checks on an emulator or physical device.
- **Production verified:** requires live deployment, credentials and production-state checks.

Current status at document creation: source verification in progress; live production verification not claimed.
