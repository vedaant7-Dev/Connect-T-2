# Connect-T API Contract Matrix

> Rebuilt from active frontend callers, backend route registration and current regression coverage. Exact method/path matching is source evidence; it is not live integration or database-persistence evidence.

## Inventory result

The current automated extractor found 57 frontend API calls, 141 backend routes and 58 dynamically installed production-patch routes. It found **zero frontend calls without an exact extracted backend method/path**.

| Feature | Frontend caller | Method/path | Authentication | Backend/runtime | Data effect | Status |
|---|---|---|---|---|---|---|
| Authentication OTP send | Unified login context/screen | OTP send route | Public with rate/attempt controls | Active auth/OTP routes | Sends OTP and creates controlled verification state | Source and automated UI/security contracts verified; live SMS pending |
| Authentication OTP verify | Unified login context/screen | OTP verify route | OTP proof | Active auth/OTP routes | Establishes Civic identity/role session | Source and automated regression verified; live SMS pending |
| Broadcast list | `mobile/context/BroadcastContext.tsx` | `GET /api/broadcasts` | Civic bearer token | Broadcast delivery/governance patches | Reads role/ward-targeted broadcasts and receipts | Source/method-path verified |
| Broadcast create | `mobile/context/BroadcastContext.tsx` | `POST /api/broadcasts` JSON or multipart | Super Admin/Nagarsevak bearer token | Broadcast media, delivery and governance patches | Inserts broadcast and optional media metadata/file | Source and automated media/governance contracts verified; live persistence pending |
| Broadcast capability | Deployment verification | `GET /api/broadcasts/capabilities` | Deployment-specific | Broadcast media patch | Reports `broadcast-media-v1` | Must be checked after production deployment |
| Broadcast read receipt | `mobile/context/BroadcastContext.tsx` | `POST /api/broadcasts/:id/read` | Authenticated recipient | Broadcast receipt route | Upserts authenticated user receipt | Source/method-path and UI regression verified; live database pending |
| Alerts list | `mobile/context/AlertContext.tsx` | `GET /api/alerts?limit=100&page=1` | Civic bearer token | Alert delivery/governance patches | Reads visible active alerts and receipts | Source/method-path and media/deep-link regression verified |
| Alert create | `mobile/context/AlertContext.tsx` | `POST /api/alerts` | Nagarsevak/Super Admin | Alert mutation/governance routes | Inserts alert/media metadata | Source and automated role/media contracts verified; live persistence pending |
| Alert update | `mobile/context/AlertContext.tsx` | `PATCH /api/alerts/:id` | Owner/Super Admin according to governance | Alert mutation/partial-update routes | Updates authorised fields and media | Source/method-path verified; live persistence pending |
| Alert delete/archive | `mobile/context/AlertContext.tsx` | `DELETE /api/alerts/:id` | Authorised publisher/Super Admin | Alert mutation route | Archives/removes according to handler | Source/method-path and destructive-control regression verified |
| Alert read receipt | `mobile/context/AlertContext.tsx` | `POST /api/alerts/:id/read` | Authenticated recipient | Alert receipt route | Stores per-user read state | Source/method-path and UI read-state regression verified |
| Complaint create, JSON | Complaint context/new complaint | Complaint JSON route | Civic bearer token | Retry-safe complaint JSON patch | Creates text-only complaint with server identity/ward | Source and automated idempotency contracts verified; live database pending |
| Complaint create, multipart | Complaint context/new complaint | Complaint upload route | Civic bearer token | Complaint upload/media patches | Creates complaint and managed image | Source and automated MIME/signature/idempotency contracts verified; live storage pending |
| Complaint assignment | Complaint backend workflow | Assignment/status routes | Officer/Super Admin governance | Complaint assignment patches | Assigns only active authorised officer | Automated active-officer regression verified; live database pending |
| Feed post list/create | Feed screen/context | `GET/POST /api/feed/posts` | Civic bearer token | Community preflight/feed patches | Lists and creates authenticated posts | Source and automated validation/auth contracts verified |
| Feed post delete | Feed screen/context | `DELETE /api/feed/posts/:id` | Owner or Super Admin | Community Feed patch | Deletes authorised post and related records/media | Automated ownership/mutation safety verified |
| Feed comments | Feed comments screen | Feed comment routes | Civic bearer token | Community Feed patch and migration | Lists/creates/deletes authenticated comments | Source and automated contracts verified; production migration pending |
| Feed likes | Feed screen/context | Feed like routes | Civic bearer token | Community Feed patch | Toggles authenticated user like | Source and automated UI/backend contracts verified |
| Job Portal session/profile | Job Portal context/screens | Job session/profile routes | Job Portal bearer token tied to Civic identity | Job session/onboarding/governance patches | Reads/updates governed seeker/employer profile | Source and automated onboarding/profile regression verified |
| Job Portal legacy login | Retired clients only | Legacy auth paths | Not allowed | Legacy-auth block patch | Rejects separate legacy login/register entry | Automated disabled-route regression verified |
| Job messages | Job chat/context | Job message routes | Job Portal bearer token | Job message/media patch | Creates/edits/deletes authorised messages/media | Source and automated safety contracts verified; live storage pending |
| Super Admin access list | `mobile/hooks/useSuperAdminAccess.ts` | `GET /api/super-admin/access-management` | Super Admin bearer token | Role-authorisation routes | Reads active/inactive assignments; revoked records hidden in UI | Source and automated regression verified |
| Super Admin access remove | `mobile/hooks/useSuperAdminAccess.ts` | `DELETE /api/super-admin/access-management/:id` | Recent valid Super Admin session | Role-authorisation routes | Revokes access and retains audit history | Source and automated protection/error regression verified; live database pending |
| Nagarsevak role actions | Officer management screens/hooks | Role action routes | Super Admin bearer token | Role-authorisation routes | Activate/deactivate/revoke authorised roster assignment | Source and automated confirmation/protection regression verified |

## Contract controls verified by source/tests

- Civic and Job Portal tokens are kept in their intended scopes.
- client-controlled identity/role fields are rejected or replaced by verified server identity where applicable.
- multipart is used only when media is present.
- image/video MIME, signature, size and duration controls remain server-side.
- mutation retries use request IDs/idempotency where required.
- destructive operations enforce ownership or privileged role checks.
- safe validation/protection messages may reach the UI; raw route, SQL and internal URL details are sanitised.
- production startup requires a dedicated strong `JWT_SECRET`.
- database writes introduced by this audit include a formal migration for Feed comments/audit hardening.

## Remaining integration checks

After the merged revision is deployed, execute request/response/database-state verification for:

1. OTP send/resend/verify using the real SMS provider,
2. Broadcast capability, creation, read receipt and managed media,
3. alert creation/update/archive/read receipt,
4. complaint JSON/multipart creation and assignment,
5. Feed comments/likes/deletion after migration,
6. Job messaging/media persistence,
7. Super Admin and Nagarsevak role changes against production data.

## Completion status

**Source method/path coverage and automated high-risk API contracts are complete. Live integration and persistence verification remain deployment gates.**
