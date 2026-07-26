# Connect-T Route and Feature Matrix

> Generated and maintained from active Expo Router files, navigation layouts, context providers, frontend API callers and backend route registration. “Source/automated verified” does not mean that a live deployment or physical device was exercised.

## Inventory summary

- Expo route files: 62
- Visible interaction handlers in route files: 284
- Extracted frontend API calls: 57
- Extracted backend routes: 141
- Dynamically installed production-patch routes: 58
- Frontend calls without an exact extracted backend method/path: 0

| Surface | Route | Role | Entry source | Primary data/API | Current evidence |
|---|---|---|---|---|---|
| Authentication | `/login` | Public | Root stack | OTP/auth APIs | Source and automated regression verified; live SMS verification pending |
| Portal selection | `/portal-select` | Authenticated Citizen | Root stack/auth redirects | Civic and Job Portal sessions | Source and automated regression verified |
| Civic Home | `/(tabs)` / `/(tabs)/index` | Citizen | Civic tab layout | Alerts, broadcasts, complaints, services, utility status | Source and automated regression verified; live data pending |
| Civic complaints | `/(tabs)/complaints` | Citizen | Civic tab layout | Complaint list API | Source/method-path verified; live database verification pending |
| Civic feed | `/(tabs)/feed` | Citizen | Civic tab layout | Feed APIs | Source and automated mutation/ownership regression verified |
| Civic profile | `/(tabs)/profile` | Citizen/Nagarsevak | Civic/Nagarsevak tab layouts | Civic profile/session APIs | Source and automated profile/language regression verified |
| Civic Alerts & News | `/alert/list` | Authenticated roles | Home/profile/news entry points | Alerts and broadcasts APIs | Source and automated media/deep-link regression verified |
| Alert detail | `/alert/[id]` | Authenticated roles | Alerts & News | Alert detail/read APIs | Source and automated deep-link/read-state regression verified |
| Create official update | `/alert/new` | Nagarsevak/Super Admin | Alerts & News | Alert mutation/upload APIs | Source/method-path and role-control regression verified; live persistence pending |
| New complaint | `/complaint/new` | Citizen/officer where allowed | Home/complaints | Complaint JSON/multipart APIs | Source and automated retry/image contracts verified; live storage pending |
| Complaint detail | `/complaint/[id]` | Owner/ward officer/Super Admin | Complaint lists | Complaint detail/status APIs | Source/method-path and role-return regression verified |
| Complaint list | `/complaint/list` | Authenticated role-scoped | Profile/admin entries | Complaint list API | Source/method-path verified; live database verification pending |
| Nagarsevak dashboard | `/(tabs)/admin` | Nagarsevak | Role redirect/tab layout | Ward complaints and metrics | Source and automated role/navigation regression verified |
| Nagarsevak ward | `/(tabs)/ward` | Nagarsevak | Nagarsevak tab layout | Ward citizen/complaint data | Source inventory verified; device/accessibility acceptance pending |
| Nagarsevak news | `/(tabs)/news` | Nagarsevak | Nagarsevak tab layout | Official updates | Source/method-path verified; live data pending |
| Super Admin | `/super-admin/*` | Super Admin | Role redirect/layout | Admin, officers, jobs, roles, broadcasts, reports, access | Source and automated role-action/access regression verified |
| Broadcast Center | `/super-admin/broadcast` | Super Admin/Nagarsevak according to governance | Super Admin/official-update entry | Broadcast JSON/multipart APIs | Source and automated media/governance regression verified; live capability pending |
| Job Portal | `/jobs/*` | Citizen with Job Portal profile | Portal switch | Job session/profile/job/application/message APIs | Source and automated onboarding/profile/dashboard/message regression verified |
| Public service detail | `/service/[id]` | Authenticated Civic user | Services/Home | Service catalogue APIs | Source route inventory verified; live catalogue data pending |
| Feed comments | `/feed/comments/[id]` | Authenticated Civic user | Feed post actions | Feed comment APIs | Source and automated authenticated mutation regression verified |

## Route and interaction evidence

The automated inventory confirms route existence, visible handler counts and exact detected frontend method/path matches. Regression tests additionally cover the highest-risk behaviours:

1. unified login, logout and retired login redirects,
2. OTP resend persistence and duplicate-submit guards,
3. portal switching and governed Job Portal roles,
4. complaint image/text idempotency,
5. official update and Broadcast media delivery,
6. exact Broadcast/alert deep links and read state,
7. Feed post/comment/like ownership,
8. destructive Super Admin and Nagarsevak confirmation actions,
9. safe error sanitisation,
10. profile fields and English/Marathi/Hindi language controls.

## Static UI audit boundary

The static UI audit scans code patterns only. It reports heuristic accessibility, keyboard and absolute-layout review targets but cannot reproduce overlap, screen-reader behaviour, Android back behaviour or keyboard behaviour on a device. Shared `AppScrollView` keyboard handling and Android resize mode are present; emulator/physical-device acceptance remains an external verification gate.

## Completion status

**Route inventory and automated high-risk workflow coverage are complete. Live backend/database/media/SMS and device verification remain pending.**
