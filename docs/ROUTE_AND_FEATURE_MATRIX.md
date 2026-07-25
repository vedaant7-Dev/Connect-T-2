# Connect-T Route and Feature Matrix

> Generated and maintained from active Expo Router files, navigation layouts, context providers and backend callers. Rows are marked pending until their handler, permission and test evidence are independently checked.

| Surface | Route | Role | Entry source | Primary data/API | Current evidence |
|---|---|---|---|---|---|
| Authentication | `/login` | Public | Root stack | OTP/auth APIs | Pending recheck |
| Portal selection | `/portal-select` | Authenticated Citizen | Root stack/auth redirects | Civic session and Job Portal session | Pending recheck |
| Civic Home | `/(tabs)` / `/(tabs)/index` | Citizen | Civic tab layout | Alerts, broadcasts, complaints, public services, utility status | Source inspected; broadcast announcement repair in progress |
| Civic complaints | `/(tabs)/complaints` | Citizen | Civic tab layout | Complaint list API | Pending recheck |
| Civic feed | `/(tabs)/feed` | Citizen | Civic tab layout | Feed APIs | Pending recheck |
| Civic profile | `/(tabs)/profile` | Citizen/Nagarsevak | Civic/Nagarsevak tab layouts | Civic profile/session APIs | Pending recheck |
| Civic Alerts & News | `/alert/list` | Authenticated roles | Home/profile/news entry points | Alerts and broadcasts APIs | Source verified for media list; exact broadcast deep link in progress |
| Alert detail | `/alert/[id]` | Authenticated roles | Alerts & News | Alert detail/read APIs | Pending recheck |
| Create official update | `/alert/new` | Nagarsevak/Super Admin | Alerts & News | Alert mutation/upload APIs | Pending recheck |
| New complaint | `/complaint/new` | Citizen/officer where allowed | Home/complaints | Complaint JSON/multipart APIs | Pending recheck |
| Complaint detail | `/complaint/[id]` | Owner/ward officer/Super Admin | Complaint lists | Complaint detail/status APIs | Pending recheck |
| Complaint list | `/complaint/list` | Authenticated role-scoped | Profile/admin entries | Complaint list API | Pending recheck |
| Nagarsevak dashboard | `/(tabs)/admin` | Nagarsevak | Role redirect/tab layout | Ward complaints and metrics | Pending recheck |
| Nagarsevak ward | `/(tabs)/ward` | Nagarsevak | Nagarsevak tab layout | Ward data | Pending recheck |
| Nagarsevak news | `/(tabs)/news` | Nagarsevak | Nagarsevak tab layout | Official updates | Pending recheck |
| Super Admin | `/super-admin/*` | Super Admin | Role redirect/layout | Admin, officers, jobs, roles, broadcasts, reports, access | Pending recheck |
| Broadcast Center | `/super-admin/broadcast` | Super Admin | Super Admin tab/layout | Broadcast JSON/multipart APIs | Source verified for image/video picker; live API deployment pending |
| Job Portal | `/jobs/*` | Citizen with Job Portal profile | Portal switch | Job session/profile/job/application/message APIs | Pending recheck |
| Public service detail | `/service/[id]` | Authenticated Civic user | Services/Home | Service catalogue APIs | Pending recheck |

## Interaction coverage method

For each route, the audit records:

1. route existence and guard,
2. visible entry controls,
3. required parameters,
4. frontend request,
5. backend route and permission,
6. success/error/empty/loading states,
7. duplicate-action behaviour,
8. Android back and direct web refresh behaviour,
9. automated and live verification level.

The complete button inventory is still in progress and must not be represented as finished.
