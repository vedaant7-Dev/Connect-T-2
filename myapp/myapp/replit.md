# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Connect T — BJP Member Services Platform (Ambernath)

### Branding
- App name: **Connect T**
- Party: **Bharatiya Janata Party (BJP)**
- City: **Ambernath, Thane District, Maharashtra**
- Municipal body: **Ambernath Municipal Council (AMC)**, helpline 0251-2604100
- Tagline: "सबका साथ, सबका विकास"
- Splash footer: "Powered by BJP · Bharatiya Janata Party · Connect T 2025"

### Design System
- Colors: Saffron-orange gradient `#7C2D12 → #C2410C → #EA580C` (BJP saffron), SOS red `#DC2626`
- Colors defined in `constants/colors.ts` — DO NOT change these values
- Font: Inter (400/500/600/700 Bold)

### City Data (Ambernath-specific)
- **Wards**: 15 Ambernath wards (Ward 1 Shivaji Chowk → Ward 15 Ambernath General)
- **PIN codes**: 421501 (East), 421502 (West)
- **Areas**: Shivaji Chowk, Station Area East/West, MIDC Area, Vithalwadi, Shelar Colony, Old Ambernath, New Ambernath, Gupte Colony, Udayanagar, Vallabhwadi, Sahakar Nagar, Gopini, Chikhloli
- **Wards export**: `ambernathWards` (primary) + `ulhasnagarWards` alias for backward compat in `mumbaiServices.ts`

### Architecture
- **No backend** — all data in AsyncStorage via Context providers
- `AuthContext` — user session + multi-user registry (janseva_users in AsyncStorage)
- `ComplaintContext` — grievance data with Ambernath seed complaints
- `FeedContext` — community feed posts with Ambernath seed posts

### Auth Flow (tabbed Register/Login)
- Splash → Login screen with Register/Login tabs
- **Register**: name(req), age, email(opt), address, phone, ward → mock OTP → notification prefs → success → home
- **Login**: phone + optional Nagarsevak ID → mock OTP → routes to home (BJP Member) or admin panel (nagarsevak)
- Registered/logged-in users are remembered with the saved session and are routed directly to their correct home/admin screen on app reopen
- Valid Nagarsevak IDs (demo): NS001–NS005
- Methods: `checkPhone(mobile)`, `register(userData)`, `loginWithPhone(mobile)`, `loginWithNagarsevakId(mobile, id)`

### Navigation
- 5 tabs: Home | Complaints (edit icon) | **SOS** (red circle, centred, floating) | Feed | Profile
- Admin & Services are hidden screens (`href: null`) accessed via Profile card
- SOS is tab 3 of 5 (true centre)
- Nagarsevak dashboard status cards open `/complaint/list?status=...` for status-specific complaint rows
- Alerts/news expire automatically after 12 hours; the post form shows a read-only valid-until time

### Dual Portal System (v2)
- **Splash → Portal Select**: After "Continue", users choose between two portals:
  - **Civic Services** (saffron orange, home icon) → normal login → main civic app
  - **Job Portal** (dark orange, briefcase icon) → `/jobs/login` → job portal
- `AppSplash.tsx` has 2 steps: `splash` (logo) → `choose` (two portal cards)
- `_layout.tsx` AuthGate skips jobs routes (`segments[0] === "jobs"`)

### Job Portal (Connect T Jobs)
- **Theme**: Same saffron-orange `#C2410C → #EA580C → #F97316 → #FB923C`
- **Roles**: Job Seeker (find jobs) / Employer (post & manage jobs)
- **Auth**: Separate `JobsAuthContext` with AsyncStorage key `connectt_jobs_user`
- **Data**: `JobsContext` with 7 seeded Ambernath/MIDC jobs, AsyncStorage key `connectt_jobs_listings`
- **Categories**: manufacturing, it, retail, healthcare, construction, transport, education, security, other
- **Job Types**: full-time, part-time, contract, apprentice
- **Screens**:
  - `app/jobs/login.tsx` — role selection + OTP login/register
  - `app/jobs/(tabs)/index.tsx` — job listings with category filters + apply flow
  - `app/jobs/(tabs)/post.tsx` — employer-only job posting form
  - `app/jobs/(tabs)/profile.tsx` — profile with stats, edit, logout

### Key Files
- `artifacts/janseva/app/_layout.tsx` — Root layout, AuthGate, AppSplash overlay, Feather font loading
- `artifacts/janseva/app/login.tsx` — Phone-first auth (register/login) with ambernathWards picker
- `artifacts/janseva/app/(tabs)/_layout.tsx` — Custom AnimatedTabBar (hides on scroll, shows on stop)
- `artifacts/janseva/context/AuthContext.tsx` — Auth + multi-user registry
- `artifacts/janseva/context/TabBarVisibilityContext.tsx` — Scroll-aware tab bar hide/show with Reanimated
- `artifacts/janseva/components/AppSplash.tsx` — BJP-branded animated splash (saffron LinearGradient)
- `artifacts/janseva/data/mumbaiServices.ts` — All Ambernath service data, wards, emergency contacts
- `artifacts/janseva/constants/colors.ts` — Saffron-orange theme tokens

### Tab Bar Behavior
- Custom `AnimatedTabBar` component using `react-native-reanimated`
- Hides on scroll down, reappears on scroll up or when scrolling stops (800ms timeout)
- All tab screens wire `onScroll={handleScroll}` and `scrollEventThrottle={16}`
- Hidden screens filtered by both `options.href === null` AND explicit route name check

### Feed Compose Bar
- Persistent bottom bar on feed screen with user avatar, placeholder text, image icon, and send button
- Tapping opens the NewPostModal for creating posts

### Splash Screen
- Saffron LinearGradient: `#7C2D12 → #C2410C → #EA580C`
- "BJP Member Services Platform", "सबका साथ, सबका विकास", "Powered by BJP"
- `useNativeDriver: Platform.OS !== "web"` — no warnings on web

### Language System
- `LanguageContext` — supports English, Hindi (हिन्दी), Marathi (मराठी)
- Language selector pills on login screen (top)
- Language change option in Profile → Language section (opens modal)
- Saved to AsyncStorage (`janseva_language` key)
- All UI strings available via `t("key")` from `useLanguage()` hook
- Translations file: `context/LanguageContext.tsx` (includes all translations inline)

### Alerts Detail
- Home screen alerts are clickable → opens modal with full details, metadata, and media preview
- Nagarsevak admin uses `/alert/new` for a full-screen Post Alert / News workflow
- Nagarsevak admin Alerts & News panel opens `/alert/list`, showing all posted alerts/news in vertical rows with counts and remove actions
- Alerts support: type, priority, category, area/ward, validity, target audience, optional contact, and one photo or video attachment
- Video attachment picker enforces a maximum of 2 minutes when duration metadata is available

### Roles (app only — 2 roles)
- `citizen` / BJP Member — submit/track complaints, view feed
- `nagarsevak` — ward officer, resolve complaints, admin panel (saffron gradient header)
- `head_admin` — REMOVED from app (future separate website)
