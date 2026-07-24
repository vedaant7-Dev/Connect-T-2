# Connect-T Production Audit Architecture

## Active delivery branch

`fix/connect-t-complete-production-audit`, created from `main` commit `57aca459d358a766b73f9f4daff0ecae30ae7950`.

## Runtime architecture

- Mobile client: Expo SDK 56, React Native 0.85, React 19, TypeScript, Expo Router, TanStack Query, AsyncStorage, Expo Image Picker and Location.
- Web client: React 18, Vite, TypeScript, Tailwind/Radix UI.
- Backend: Node.js CommonJS, Express 5, MySQL 8-compatible access through mysql2/promise.
- Authentication: six-digit SMS OTP, server-issued OTP session, short-lived OTP proof, signed bearer tokens, unified mobile role resolution, server-side role assignment checks.
- Database: Hostinger MySQL. Runtime-safe schema upgrades coexist with `backend/schema-hostinger.sql` and role/job/alert patch migrations.
- Media storage: validated files written under `UPLOAD_DIR` and exposed through `/uploads`; `PUBLIC_BASE_URL` controls generated URLs.
- Deployment: Hostinger Node runtime through `backend/hostinger-entry.js`; EAS preview APK and production AAB; Codemagic and GitHub Actions are also checked in.
- Mobile API environment: `EXPO_PUBLIC_API_URL`; current EAS target is `https://newapp.e-bjp.in`.
- Existing validation: backend `npm run check`, `npm test`; mobile `npm run doctor`, `npm run test:api`, `npm run typecheck`, `npm run export:android`; web `npm run typecheck`, `npm run build`.

## Confirmed architectural risks before this audit

1. OTP resend exists only as a backend rate-limit rule; the mobile OTP screen has no resend control, persistent deadline or background-safe countdown.
2. The OTP client keeps the session token only in an in-memory Map, so process/navigation restoration cannot recover the OTP transaction.
3. A newly issued OTP does not explicitly invalidate older outstanding sessions for the same mobile and purpose.
4. Complaint images are converted to base64 data URIs and sent inside JSON. This inflates payload size, depends on native URI-to-Blob/FileReader behaviour, and provides no reliable upload progress or multipart validation.
5. Authentication and Job Portal bearer tokens are stored in AsyncStorage rather than platform secure storage.
6. Civic and Job Portal profile screens contain independent logout and portal-switch implementations. Some still route through `/portal-select`, causing the reported workflow regression.
7. The default English profile UI deliberately renders Marathi role subtitles, creating mixed-language screens even when English is selected.
8. Citizen profile editing exposes only name and ward even though registration stores email, DOB, address and notification preferences.
9. Alerts provide secure create/list/delete delivery, but broadcast delivery status, read receipts, push-provider transparency and duplicate-send idempotency are not represented as a dedicated workflow.
10. Several production modules use compatibility patches. New changes must preserve route order and must not bypass server-side authorization.

## Practical standards selected

- Use one clear confirmation dialog for portal changes, logout and irreversible actions; confirmation text names the destination or consequence.
- Keep focused form fields and validation visible above the keyboard through reusable keyboard-safe containers rather than per-screen margins.
- Use labelled controls, at least 44-point preferred touch areas, non-colour status labels and accessibility names for icon-only actions.
- Store bearer and OTP session secrets in platform secure storage; keep only non-sensitive UI preferences in AsyncStorage.
- Enforce OTP cooldown, maximum sends and verification attempts on the backend; the client countdown mirrors, but never replaces, backend enforcement.
- Upload complaint images as authenticated multipart data with MIME/signature/size checks, server-side ownership derivation and transactional cleanup.
- Use Feather as the primary mobile icon family and central semantic mappings for repeated actions.
- English is the default and fallback language. Hindi and Marathi are user-selected. Personal names and user-entered content are never automatically translated.
- In-app broadcast success and external push success are separate states. Missing push configuration must be shown as `not configured`, never as delivered.

## Audit scope order

1. Authentication and secure resend OTP.
2. Complaint multipart upload and role visibility.
3. Shared logout, portal switching and keyboard-safe forms.
4. Alerts, broadcasts and read/delivery state.
5. Profile field synchronization and backend mobile immutability.
6. English-default localization and critical three-language workflows.
7. Repository-wide API, authorization, error, accessibility and build review.
