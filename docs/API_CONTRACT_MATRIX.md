# Connect-T API Contract Matrix

> This matrix is rebuilt from active frontend callers and backend route registration. A listed route is not considered integration verified until request, response and resulting database state are checked.

| Feature | Frontend caller | Method/path | Authentication | Backend/runtime | Data effect | Status |
|---|---|---|---|---|---|---|
| Broadcast list | `mobile/context/BroadcastContext.tsx` | `GET /api/broadcasts` | Civic bearer token | Active backend plus broadcast patches | Reads role/ward-targeted broadcasts and receipts | Source verified |
| Broadcast create | `mobile/context/BroadcastContext.tsx` | `POST /api/broadcasts` JSON or multipart | Super Admin/Nagarsevak bearer token | `backend/broadcastMediaPatch.js` and delivery/governance patches | Inserts broadcast and optional media metadata/file | Source verified; live deployment pending |
| Broadcast capability | Deployment verification | `GET /api/broadcasts/capabilities` | Deployment-specific | Broadcast media patch | Reports `broadcast-media-v1` capability | Must be checked on deployed backend |
| Broadcast read receipt | `mobile/context/BroadcastContext.tsx` | `POST /api/broadcasts/:id/read` | Authenticated recipient | Broadcast receipt route | Upserts authenticated user receipt | Pending integration recheck |
| Alerts list | `mobile/context/AlertContext.tsx` | `GET /api/alerts?limit=100&page=1` | Civic bearer token | Active alerts routes/patches | Reads visible active alerts and receipts | Source verified; integration recheck pending |
| Alert create | `mobile/context/AlertContext.tsx` | `POST /api/alerts` | Nagarsevak/Super Admin | Active alerts mutation route | Inserts alert/media metadata | Pending integration recheck |
| Alert update | `mobile/context/AlertContext.tsx` | `PATCH /api/alerts/:id` | Owner/Super Admin according to governance | Active alerts mutation route | Updates authorised fields and media | Pending integration recheck |
| Alert delete/archive | `mobile/context/AlertContext.tsx` | `DELETE /api/alerts/:id` | Authorised publisher/Super Admin | Active alerts route | Removes/archives according to handler | Pending integration recheck |
| Alert read receipt | `mobile/context/AlertContext.tsx` | `POST /api/alerts/:id/read` | Authenticated recipient | Active receipt route | Stores per-user read state | Pending integration recheck |
| Super Admin access list | `mobile/hooks/useSuperAdminAccess.ts` | `GET /api/super-admin/access-management` | Super Admin bearer token | Active role-authorisation routes | Reads active/inactive assignments; revoked records hidden in UI | Source and automated regression verified previously |
| Super Admin access remove | `mobile/hooks/useSuperAdminAccess.ts` | `DELETE /api/super-admin/access-management/:id` | Recent valid Super Admin session | Active role-authorisation routes | Revokes access and retains audit history | Source and automated regression verified; live database recheck pending |

## Contract audit rules

The complete audit must flag:

- frontend paths without active backend handlers,
- method/path and parameter mismatches,
- wrong Civic versus Job Portal bearer token,
- response fields that consumers do not handle,
- client-controlled identity/role/ward fields,
- multipart boundary or file-shape errors,
- raw internal errors,
- non-idempotent retry risks,
- and database writes not represented by formal migrations.

Additional endpoints will be added only after their active caller and handler are independently located.
