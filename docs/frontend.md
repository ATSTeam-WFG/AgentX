# AgentX Frontend — Documentation

**Status:** v1 (aligned with backend.md v1, design prototype AgentX_v7.html)
**Audience:** Frontend engineering, design handoff, QA
**Scope:** Next.js 15 PWA for attendees + `/admin` console. Everything that calls the Fastify `/v1` API.

---

## 1. Overview

AgentX is a Progressive Web App for the WFG Executive Summit 2026 (June 3–5, Opal Grand Resort, Delray Beach FL). The frontend is a Next.js 15 App Router application with a dark-theme design system derived from the v7 prototype. It supports 300–400 attendees aged 40–60 across a 2–3 day event.

The app is served as a static PWA shell (pre-rendered at build time) with all authed routes rendered entirely client-side after JWT hydration. There is no server-side rendering of user data. Backend business logic lives exclusively in the Fastify API at `NEXT_PUBLIC_API_URL`.

---

## 2. Tech Stack

| Concern | Library | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) | Static export for PWA shell |
| Language | TypeScript strict | `noImplicitAny`, `strictNullChecks` |
| Styling | Tailwind CSS v4 + CSS custom properties | Dark theme tokens in `globals.css`; Tailwind utilities for layout and spacing |
| Component library | shadcn/ui (Radix UI + Tailwind) | Full component suite — reskinned to dark AgentX tokens |
| State (server) | TanStack Query v5 | All API fetches; IndexedDB-backed offline cache |
| State (client) | Zustand | Auth slice, WebSocket slice, UI slice |
| Offline storage | Dexie.js (IndexedDB) | Agenda, profile, outbox, announcements |
| Forms | React Hook Form + Zod | Signup form, feedback forms |
| Animation | Framer Motion (sparingly) | Tab transitions, toast enter/exit only |
| Icons | Lucide React | Consistent icon set |
| PWA / Service Worker | Serwist (`@serwist/next`) | Workbox-based, precache + runtime caching |
| Testing | Vitest + Playwright | Unit components + E2E flows |

---

## 3. Design Tokens (Dark Theme from v7)

Dark theme tokens are defined as CSS custom properties inside `app/globals.css` (Tailwind's `@layer base`) and referenced via `var()` throughout the app. Tailwind utilities handle layout, spacing, and responsive behavior; custom properties handle brand colors and theme values that don't map cleanly to Tailwind's default scale.

```css
:root {
  /* Background layers */
  --bg:           #06090f;
  --bg2:          #0d1117;
  --bg3:          rgba(255, 255, 255, 0.04);

  /* Accent colors */
  --ac:           #5B8FF9;   /* primary blue */
  --ac2:          #8B74F7;   /* purple */
  --amber:        #F5A623;
  --rose:         #f43f5e;
  --green:        #22c55e;

  /* Foreground */
  --t:            #eef1fa;              /* primary text */
  --mute:         rgba(238, 241, 250, 0.62);
  --dim:          rgba(238, 241, 250, 0.38);

  /* Structural */
  --r:            14px;                /* card border-radius */
  --r-sm:         8px;
  --shadow-card:  0 2px 12px rgba(0, 0, 0, 0.4);

  /* Typography scale (4-level ladder only) */
  --text-title:   clamp(22px, 5vw, 26px);
  --text-subhead: 15px;
  --text-body:    16px;   /* minimum for 40-60 audience */
  --text-caption: 12px;

  /* Tap targets */
  --tap-min:      48px;   /* minimum height/width for all interactive elements */
}
```

**Typography usage:**
| Level | Token | Weight | Use |
|---|---|---|---|
| Title | `--text-title` | 700 | Screen titles, modal headings |
| Subhead | `--text-subhead` | 600 | Card titles, section headers |
| Body | `--text-body` | 400 | All content text |
| Caption | `--text-caption` | 500 | Timestamps, labels, helper text |

**Tap targets:** every interactive element must be at minimum `var(--tap-min)` (48px) in both dimensions.

---

## 4. Folder Structure

```
AgentX/frontend/
├── app/
│   ├── layout.tsx                    # Root layout: QueryProvider, ZustandProvider, PWA meta, SW registration
│   ├── page.tsx                      # Boot redirect: → /onboarding (first time) or /home (authed)
│   ├── onboarding/
│   │   ├── page.tsx                  # Step 1: name + email signup
│   │   ├── interests/
│   │   │   └── page.tsx              # Step 2: interest picker (6 options, multi-select)
│   │   └── tour/
│   │       └── page.tsx              # Step 3: skippable 4-step coach marks
│   ├── (app)/
│   │   ├── layout.tsx                # Tab bar + Owl FAB (all app routes)
│   │   ├── home/
│   │   │   └── page.tsx              # NOW card + For You cards + DayArcRing
│   │   ├── agenda/
│   │   │   ├── page.tsx              # Full schedule grouped by day
│   │   │   └── [eventId]/
│   │   │       └── page.tsx          # Session detail + per-session feedback
│   │   ├── explore/
│   │   │   └── page.tsx              # AI Concierge chat + ATS initiatives accordion
│   │   ├── activities/
│   │   │   ├── page.tsx              # 5 activity cards with completion state
│   │   │   ├── trivia/
│   │   │   │   └── page.tsx
│   │   │   ├── prompt-challenge/
│   │   │   │   └── page.tsx
│   │   │   ├── golden-points/
│   │   │   │   └── page.tsx
│   │   │   ├── touchpoints/
│   │   │   │   └── page.tsx
│   │   │   └── book-session/
│   │   │       └── page.tsx
│   │   └── profile/
│   │       ├── page.tsx              # Points + 3-ring progress + leaderboard (top 5 + self)
│   │       └── feedback/
│   │           └── page.tsx          # App-wide feedback form
│   ├── scan/
│   │   └── page.tsx                  # QR scan landing (/scan?tp=<id>&sig=<hmac>)
│   └── admin/
│       ├── layout.tsx                # Admin shell, separate auth guard
│       ├── page.tsx                  # Dashboard: totals, active users, queue depth
│       ├── users/
│       │   └── page.tsx              # User search, walk-in approval queue
│       ├── golden-points/
│       │   └── page.tsx              # Moderation queue (pending → approve/reject/override)
│       ├── agenda/
│       │   └── page.tsx              # Create/edit/delete agenda events
│       ├── activities/
│       │   └── page.tsx              # Open/close activities live
│       ├── announcements/
│       │   └── page.tsx              # Publish announcements
│       └── audit-log/
│           └── page.tsx              # Read-only admin action log
│
├── components/
│   ├── layout/
│   │   ├── TabBar.tsx                # 5-tab bottom nav bar
│   │   ├── OwlFab.tsx                # Persistent QR scan FAB (Owl mascot)
│   │   └── TopNav.tsx                # Back button + screen title header
│   ├── home/
│   │   ├── NowCard.tsx               # Time-aware current session card
│   │   ├── ForYouCard.tsx            # Interest-matched session suggestion
│   │   └── DayArcRing.tsx            # SVG ambient progress ring
│   ├── agenda/
│   │   ├── SessionCard.tsx           # Compact session list item
│   │   └── SessionDetail.tsx         # Full session detail + feedback trigger
│   ├── activities/
│   │   ├── ActivityCard.tsx          # Activity tile with points + completion badge
│   │   ├── PointsToast.tsx           # Milestone-only points notification
│   │   └── ProgressRings.tsx         # 3-ring Attend/Engage/Connect SVG
│   ├── onboarding/
│   │   ├── RolePill.tsx              # Selectable role button
│   │   ├── InterestCard.tsx          # Selectable interest card (48px+ tap target)
│   │   └── TourStep.tsx              # Coach mark overlay step
│   └── ui/
│       ├── Button.tsx                # Primary/secondary/ghost variants
│       ├── Card.tsx                  # Base card with --r, --shadow-card
│       ├── Toast.tsx                 # Milestone toast (milestone-only, not every point event)
│       └── BottomSheet.tsx           # Mobile-native bottom sheet (safe-area aware)
│
├── lib/
│   ├── api.ts                        # Typed fetch wrapper (attaches Bearer JWT)
│   ├── api/
│   │   ├── auth.ts                   # signup, login, refresh, logout
│   │   ├── agenda.ts                 # getAgenda, getAgendaEvent, postFeedback
│   │   ├── activities.ts             # getActivities, trivia, promptChallenge, goldenPoints
│   │   ├── touchpoints.ts            # scanTouchpoint
│   │   ├── profile.ts                # getMe, patchMe, getHistory
│   │   ├── leaderboard.ts            # getLeaderboard
│   │   └── admin.ts                  # all /v1/admin/* calls
│   ├── auth.ts                       # JWT read/write (localStorage), decode claims, expiry check
│   ├── dexie.ts                      # Dexie schema + db singleton
│   ├── outbox.ts                     # Offline write queue + flush logic
│   ├── ws.ts                         # WebSocket singleton with exponential-backoff reconnect
│   └── qr.ts                         # HMAC token decode (mirrors backend/src/lib/qr.ts)
│
├── store/
│   ├── auth.ts                       # Zustand: { user, token, setAuth, clearAuth }
│   ├── ws.ts                         # Zustand: { connected, lastEvent, setConnected }
│   └── ui.ts                         # Zustand: { toastQueue, pushToast, dismissToast }
│
├── hooks/
│   ├── useMe.ts                      # TanStack Query: GET /v1/me
│   ├── useAgenda.ts                  # TanStack Query: GET /v1/agenda (Dexie fallback)
│   ├── useLeaderboard.ts             # TanStack Query: GET /v1/leaderboard?limit=5
│   ├── useActivities.ts              # TanStack Query: GET /v1/activities
│   └── useWebSocket.ts               # WebSocket effect + Zustand sync
│
├── styles/
│   ├── globals.css                   # Reset, body background, base typography
│   ├── tokens.css                    # All CSS custom properties (see Section 3)
│   └── components.css                # Shared utility classes (.card, .btn, .sticky-cta, etc.)
│
├── public/
│   ├── manifest.json                 # PWA manifest
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── owl.svg                       # Owl FAB mascot asset
│
├── next.config.ts                    # Serwist plugin + Next.js config
├── tsconfig.json                     # strict: true, paths: { "@/*": ["./*"] }
└── vitest.config.ts
```

---

## 5. Authentication Flow

No Auth.js. No Supabase Auth. Custom JWT issued by the Fastify backend.

### Signup (onboarding Step 1)

```
POST /v1/auth/signup
Body: { name: string, email: string }
Response: { token: string, user: User, status: 'active' | 'pending_approval' }
```

- Store `token` in `localStorage` under key `agentx_token`
- Store `user` in Zustand `auth` slice
- If `status === 'pending_approval'`: show persistent "Pending approval" banner; app is readable but activity scoring is disabled until admin approves. On approval, points are retroactively applied by the backend.

### Login (returning user)

```
POST /v1/auth/login
Body: { name: string, email: string }
Response: same shape as signup
```

### All authed requests

`Authorization: Bearer <token>` header injected by `lib/api.ts` wrapper. On `401` response, clear auth state and redirect to `/onboarding`.

### Token lifecycle

- 7-day JWT with sliding refresh
- On app boot (`app/page.tsx`): read token from localStorage, check expiry, hydrate Zustand `auth` slice, then redirect to `/home` or `/onboarding`
- Refresh via `POST /v1/auth/refresh` on each successful authed response (backend handles sliding window)

### Admin auth

Separate. `POST /v1/admin/auth/login { email, password }` → admin JWT stored as `agentx_admin_token`. Admin layout checks for this token and redirects to `/admin/login` if absent. 24-hour expiry, no sliding refresh.

---

## 6. API Client

`lib/api.ts` — typed fetch wrapper used by all domain modules:

```typescript
export class ApiError extends Error {
  constructor(public status: number, public body: unknown, message: string) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { skipAuth?: boolean }
): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token && !options?.skipAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body, `${res.status} ${path}`);
  }
  return res.json() as Promise<T>;
}
```

Domain modules in `lib/api/` export typed functions (e.g. `getAgenda()`, `completeTrivia(payload)`) that call `apiFetch`. TanStack Query hooks in `hooks/` wrap these functions.

---

## 7. Offline Strategy (Dexie + Outbox)

### Dexie schema (`lib/dexie.ts`)

```typescript
import Dexie, { type Table } from 'dexie';

export interface CachedAgendaEvent { id: string; [key: string]: unknown }
export interface CachedActivity    { id: string; [key: string]: unknown }
export interface CachedProfile     { id: string; [key: string]: unknown }
export interface CachedAnnouncement { id: string; [key: string]: unknown }

export interface OutboxEntry {
  id: string;          // crypto.randomUUID() — also used as dedupeKey
  endpoint: string;    // e.g. '/v1/activities/trivia/complete'
  method: 'POST' | 'PATCH';
  body: Record<string, unknown>;
  createdAt: number;   // Date.now()
  attempts: number;
  failedAt?: number;
}

class AgentXDb extends Dexie {
  agenda!:        Table<CachedAgendaEvent, string>;
  activities!:    Table<CachedActivity, string>;
  outbox!:        Table<OutboxEntry, string>;
  profile!:       Table<CachedProfile, string>;
  announcements!: Table<CachedAnnouncement, string>;

  constructor() {
    super('agentx-db');
    this.version(1).stores({
      agenda:        'id, day, starts_at',
      activities:    'id, type',
      outbox:        'id, createdAt, attempts',
      profile:       'id',
      announcements: 'id, published_at',
    });
  }
}

export const db = new AgentXDb();
```

### Outbox flush (`lib/outbox.ts`)

- Triggered on: `window` `online` event + WebSocket reconnect
- Process entries sorted by `createdAt` ascending (oldest-first)
- Per entry:
  - **Success (2xx):** delete from outbox
  - **409 Conflict:** delete from outbox (backend already processed — idempotent success)
  - **4xx (not 409):** mark `failedAt`, surface error to user via toast, skip retry
  - **5xx / network timeout:** increment `attempts`, retry with exponential backoff up to 5 attempts (`1s, 2s, 4s, 8s, 16s`); after 5 failures, mark `failedAt` and alert user

### Cache-first reads

All `useAgenda`, `useActivities`, `useMe` hooks:
1. TanStack Query attempts network fetch (`staleTime`: 60s for agenda, 300s for activities)
2. On network failure: fall back to Dexie cache and show stale-data indicator
3. On successful fetch: write response to Dexie for future offline use

### Sync on reconnect

`useWebSocket` hook calls `GET /v1/sync?since=<last_sync_timestamp>` on WS reconnect to pull deltas across agenda, sponsors, initiatives, announcements. Merges results into Dexie.

---

## 8. WebSocket Integration

`lib/ws.ts` — singleton with exponential-backoff reconnect (max 30s interval):

```typescript
// Connection: ws(s)://<host>/v1/ws?token=<jwt>
// Message shape: { event: string; data: unknown }
```

Events and frontend reactions:

| Server Event | Frontend Action |
|---|---|
| `leaderboard.update` | Invalidate TanStack Query `['leaderboard']` |
| `announcements.new` | Prepend to Dexie `announcements` table + push milestone toast |
| `agenda.changed` | Invalidate TanStack Query `['agenda']` + update Dexie |
| `jobs.{id}.complete` | Resolve avatar generation polling; push "Your avatar is ready!" toast |

`useWebSocket` hook (`hooks/useWebSocket.ts`):
- Instantiates `lib/ws.ts` singleton on mount (authed routes only)
- Syncs connection state to Zustand `ws` slice
- On connect: flush outbox + call `/v1/sync`
- On disconnect: clear `ws.connected`, schedule reconnect

---

## 9. Navigation (5 tabs + Owl FAB)

`TabBar.tsx` renders on all `/(app)/*` routes via the group layout.

| Tab | Lucide Icon | Route |
|---|---|---|
| Home | `House` | `/home` |
| Agenda | `Calendar` | `/agenda` |
| Explore AI | `Sparkles` | `/explore` |
| Activities | `Trophy` | `/activities` |
| Profile | `User` | `/profile` |

Active tab: derived from `usePathname()` — no Zustand slice needed.

**Owl FAB (`OwlFab.tsx`):**
- Fixed position, right thumb zone (`right: 20px`)
- `bottom: calc(88px + env(safe-area-inset-bottom, 0px))` — 88px above tab bar
- 64px diameter, `--ac` glow ring animation
- Tap: opens camera overlay for QR scan
- Hidden on: `/onboarding/*`, `/admin/*`

---

## 10. Gamification

### 5 Activities — 1,000 points total maximum

| Activity | API Endpoint | Points | One-shot |
|---|---|---|---|
| Title Trivia | `POST /v1/activities/trivia/complete` | ≤ 250 (1pt/correct, 50 questions) | Yes |
| Prompt Challenge | `POST /v1/activities/prompt-challenge/answer` | 50 × 5 questions = 250 | Yes per question |
| Meet the ATS Team | `POST /v1/activities/golden-points/submit` | 25–100 (AI-scored) | Yes |
| Touchpoint QR Scans | `POST /v1/touchpoints/scan` | 50 × N locations | Yes per touchpoint |
| Book a 1:1 Session | booking endpoint (TBD) | 50–100 | Yes |

All write calls include `dedupeKey: crypto.randomUUID()`. The backend's UNIQUE constraint on `submissions.client_dedupe_key` makes retries idempotent — the same key is stored in the outbox entry `id` so retries send the same key.

### 3-Ring Progress Model (`ProgressRings.tsx`)

SVG concentric rings rendered in `Profile` screen. Day arc on `Home` is a single simplified ring.

| Ring | Tracks |
|---|---|
| **Attend** | Sessions checked into ÷ total sessions |
| **Engage** | Concierge questions asked + challenges completed |
| **Connect** | ATS team touchpoints scanned + 1:1 session booked |

### Leaderboard

`Profile` screen only. `GET /v1/leaderboard?limit=5` returns top 5 + current user's rank. Never shown on Home.

### Points toasts

Milestone-only (ring closed, day complete, booking confirmed). `PointsToast.tsx` receives events from Zustand `ui.toastQueue`. Silent point accrual for everything else.

---

## 11. Screen Reference

### Home (`/home`)

1. **Greeting** — "Good morning, [name]" + Day 1 / Day 2 badge (derived from event dates + `new Date()`)
2. **NowCard** — time-aware current session: title, speaker, location, live progress bar. Taps to `/agenda/[eventId]`
3. **ForYouCards** (2 cards) — agenda events matching `user.onboarding_interests`. If no match, show next upcoming sessions
4. **DayArcRing** — ambient SVG ring, % of today's sessions attended. No numeric points shown on Home.

No leaderboard. No total points.

### Onboarding (`/onboarding`)

Target: QR scan → home in ≤ 12 seconds.

```
/onboarding           → Step 1: name + email → POST /v1/auth/signup
/onboarding/interests → Step 2: 6 interest cards, multi-select → PATCH /v1/me { onboarding_interests }
/onboarding/tour      → Step 3: 4-step skippable coach marks
/home                 → Done (+50 pts, awarded server-side on interests save)
```

- Step 1: single name field + single email field + 5 role pills. Sticky "Continue →" CTA.
- Step 2: interest cards full-width, 56px height, tap to toggle. Role-based 2 pre-selected. Sticky "Looks good →" CTA.
- Step 3: "Skip tour" link top-right. 4 coach marks highlighting each tab. Final step: "You're ready. Let's go →"
- No fake spinners between steps.

### QR Scan (`/scan`)

Entry: `agentx.wfg.app/scan?tp=<id>&sig=<hmac>`

1. If not authed → redirect to `/onboarding?redirect=/scan?tp=...`
2. Verify HMAC signature (`lib/qr.ts`)
3. If valid: `POST /v1/touchpoints/scan { qr_token, dedupeKey }` (enqueued in outbox if offline)
4. Show points awarded animation
5. Redirect to `/activities` after 2 seconds

### Profile (`/profile`)

- Total points + rank
- `ProgressRings` (3-ring SVG)
- Leaderboard: top 5 + "You · Nth place"
- Badges earned
- Link to `/profile/feedback`

---

## 12. Admin Console (`/admin`)

Separate auth (`agentx_admin_token`). Light utility surface (no dark theme requirement). All calls via `lib/api/admin.ts`.

| Route | Purpose | Key API call |
|---|---|---|
| `/admin` | Dashboard: totals, active users, queue depth | `GET /v1/admin/dashboard` |
| `/admin/users` | Search users, approve walk-ins | `GET /v1/admin/users`, `POST /v1/admin/users/:id/approve` |
| `/admin/golden-points` | Moderation queue | `GET /v1/admin/golden-points?status=pending`, `POST /v1/admin/golden-points/:id/decision` |
| `/admin/agenda` | CRUD sessions | `POST /v1/admin/agenda` |
| `/admin/activities` | Open/close activities | `POST /v1/admin/activities/:id/toggle` |
| `/admin/announcements` | Publish announcements | `POST /v1/admin/announcements` |
| `/admin/audit-log` | Read-only audit trail | `GET /v1/admin/audit-log` |

---

## 13. PWA Configuration

### Serwist (`@serwist/next`)

Configure in `next.config.ts`:

```typescript
import withSerwist from '@serwist/next';

export default withSerwist({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
})(nextConfig);
```

Cache strategies:

| Strategy | Applied to |
|---|---|
| `precache` | App shell: HTML, CSS, JS, icons, manifest |
| `CacheFirst` | Static assets: images, fonts, SVGs |
| `StaleWhileRevalidate` | `/v1/agenda`, `/v1/sponsors`, `/v1/initiatives` |
| `NetworkFirst` | `/v1/me`, `/v1/activities`, `/v1/leaderboard` |

### `public/manifest.json`

```json
{
  "name": "AgentX — WFG Executive Summit",
  "short_name": "AgentX",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#06090f",
  "background_color": "#06090f",
  "start_url": "/",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Additional PWA hardening

- `overscroll-behavior: contain` on `<body>` — disables pull-to-refresh
- `padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px))` on tab bar and all bottom sheets
- Landscape rotation overlay: show "Please rotate your device" on `orientation: landscape`
- **Install prompt:** defer until user views 2 session detail pages, then show soft bottom-sheet: "Add AgentX to your home screen for the best experience."
- **Haptics:** `navigator.vibrate(8)` on QR scan success + booking confirm. iOS: no-op (navigator.vibrate not supported — graceful fail).

---

## 14. Performance Budgets

| Metric | Target |
|---|---|
| LCP | ≤ 2s on 4G |
| TTI | ≤ 3s |
| Lighthouse PWA score | ≥ 90 |
| JS bundle (initial, gzipped) | ≤ 200KB |
| Offline agenda render | Must work with no network connection |

Enforce with CI: `next build` + `@lhci/cli` (Lighthouse CI) on every PR.

---

## 15. Environment Variables

```bash
# .env.local (development)
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_APP_ENV=development

# Production
NEXT_PUBLIC_API_URL=https://api.agentx.wfg.app
NEXT_PUBLIC_WS_URL=wss://api.agentx.wfg.app
NEXT_PUBLIC_APP_ENV=production
```

No secrets in the frontend. All business logic, JWT signing, and AI inference happen in Fastify.

---

## 16. Testing Strategy

### Unit tests (Vitest)

- `components/ui/*` — render tests, accessibility (role queries)
- `lib/outbox.ts` — flush logic, deduplication, retry backoff
- `lib/auth.ts` — token expiry check, decode

### E2E tests (Playwright)

Golden paths:
1. Onboarding: load `/onboarding` → fill name+email → select interests → skip tour → land on `/home`
2. Agenda: tap Agenda tab → see sessions → tap session → see detail
3. QR scan: navigate to `/scan?tp=test&sig=valid` → see points awarded
4. Offline: disable network → navigate to Agenda → content renders from cache

### Verification checklist (after scaffold)

- `npm run dev` starts at `localhost:3000` without errors
- `npm run build` produces no TypeScript errors
- `/onboarding` renders (Step 1 form visible)
- `/home` redirects to `/onboarding` when not authed
- `/admin` redirects to `/admin/login` when not authed
- Lighthouse PWA audit ≥ 90 (run `npx @lhci/cli autorun`)

---

## 17. Backend Alignment Notes

This frontend doc is intentionally paired with `docs/backend.md`. Critical contract points:

- **Auth:** `POST /v1/auth/signup` and `/v1/auth/login` accept `{ name, email }` — **no password**
- **dedupeKey:** every write endpoint expects `dedupeKey` (camelCase, not `dedupe_key`) — confirm with backend team before implementation
- **Agenda versioning:** `GET /v1/agenda?since=<version>` returns delta or full payload. Frontend must persist last-seen version in Dexie.
- **Walk-in flow:** status `pending_approval` means user can browse but not earn points. Frontend must gate activity submission with a clear "Approval pending" state.
- **WebSocket is optional:** every feature must degrade gracefully to polling. `useWebSocket` failing silently is correct behavior.
- **Admin endpoints** use a separate JWT audience claim — the same `apiFetch` function reads from `agentx_admin_token` for `/v1/admin/*` paths.
