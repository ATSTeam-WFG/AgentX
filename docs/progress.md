# AgentX Backend — Build Progress

Tracks implementation status across each phase defined in [`backend.md`](./backend.md).

**Last updated:** 2026-05-25
**Current phase:** Phase 4 — Complete (admin panel fully implemented)

---

## Phase 1 — Foundation

Schema, auth, core content delivery. PWA reads everything from the API.

| Task | Status | Notes |
|---|---|---|
| Postgres schema + migrations | Done | Supabase |
| Auth: signup flow (invitee match + walk-in) | Done | `src/routes/auth.ts` |
| Auth: session JWT issue + refresh + revoke | Done | `src/routes/auth.ts` |
| Admin auth (separate table + bcrypt) | Done | `src/routes/admin/auth.ts` |
| `GET /v1/me` — profile endpoint | Done | `src/routes/profile.ts` |
| `GET /v1/agenda` — version-aware | Done | `src/routes/agenda.ts` |
| `GET /v1/agenda/:id` — single event | Done | `src/routes/agenda.ts` |
| `GET /v1/initiatives` | Done | `src/routes/initiatives.ts` |
| `GET /v1/sponsors` | Done | `src/routes/sponsors.ts` |
| `GET /v1/announcements` | Done | `src/routes/announcements.ts` |
| Admin: invitee CSV upload | Done | `src/routes/admin/invitees.ts` |
| Admin: basic login | Done | `src/routes/admin/auth.ts` |
| Hosting provider decision | Done | Supabase |

---

## Phase 2 — Activities

Trivia, Prompt Challenge, Touchpoints. Scoring and leaderboard.

| Task | Status | Notes |
|---|---|---|
| `POST /v1/activities/trivia/start` | Done | `src/routes/activities/trivia.ts` |
| `POST /v1/activities/trivia/complete` + dedupe | Done | `src/routes/activities/trivia.ts` |
| `GET /v1/activities/prompt-challenge/questions` | Done | `src/routes/activities/prompt-challenge.ts` |
| `POST /v1/activities/prompt-challenge/answer` + dedupe | Done | `src/routes/activities/prompt-challenge.ts` |
| `POST /v1/touchpoints/scan` + QR token verification | Done | `src/routes/touchpoints.ts` |
| Touchpoint HMAC token generation | Done | `src/lib/qr.ts` |
| `user_scores` atomic update | Done | Prisma transactions in activity routes |
| `GET /v1/leaderboard` | Done | `src/routes/leaderboard.ts` |
| `GET /v1/activities` — user completion state | Done | `src/routes/activities/index.ts` |
| `POST /v1/agenda-events/:id/feedback` — event feedback | Done | `src/routes/feedback.ts` |
| `POST /v1/feedback` — app feedback (anonymous support) | Done | `src/routes/feedback.ts` |
| One-shot constraint testing | Done | 95 tests passing |
| Dedupe_key retry simulation tests | Done | 95 tests passing |

---

## Phase 3 — AI Features

Avatar generation pipeline. Golden Points submission and AI scoring.

| Task | Status | Notes |
|---|---|---|
| `POST /v1/activities/avatar/upload` — multipart selfie + backdropId | Done | `src/routes/activities/avatar.ts`; validates type, uploads to R2, creates job, awards 50pts first-time |
| `GET /v1/activities/avatar/status/:jobId` — polling endpoint | Done | `src/routes/activities/avatar.ts`; returns avatarUrl when job complete |
| `POST /v1/activities/avatar/claim-print` — kiosk print claim | Done | `src/routes/activities/avatar.ts`; one-time, awards 100pts |
| Job worker: avatar generation (Gemini) | Done | `src/workers/avatar.ts`; Google Gemini 3 Pro image generation; downloads selfie from R2, composites with backdrop, uploads result, sends push |
| Object storage (Cloudflare R2) | Done | `src/lib/storage.ts`; upload, download, delete, public URL helpers |
| `POST /v1/activities/golden-points/submit` | Done | `src/routes/activities/golden-points.ts`; 50-word min, one-shot, activity-open checks |
| `GET /v1/activities/golden-points/:id` | Done | `src/routes/activities/golden-points.ts`; maps DB status → `pending` / `scored` |
| Job worker: Golden Points LLM scoring | Done | `src/workers/golden-points.ts` + `src/lib/scoring.ts`; Claude Haiku (`claude-haiku-4-5-20251001`), system prompt caching |
| Job worker: retry logic (3 attempts + backoff) | Done | `src/workers/index.ts` — pre-existing, confirmed in place |
| Job worker: concurrency (BATCH_SIZE=5) | Done | `src/workers/index.ts`; `Promise.allSettled`, `FOR UPDATE SKIP LOCKED LIMIT 5` |
| Golden Points score → points mapping | Done | 5 tiers: 0–29→0pts(rejected), 30–49→25pts, 50–74→50pts, 75–89→75pts, 90–100→100pts |
| Admin: Golden Points read-only view | Done | `src/routes/admin/golden-points.ts`; no human review — fully AI-automated |
| Admin: approve/reject/override submission | Removed | Design decision: no human review gate; admin view is read-only insights |
| Push notification on scoring complete | Done | `src/lib/push.ts` + `src/routes/push.ts`; VAPID Web Push, subscribe/unsubscribe, stale-sub cleanup |
| Fallback: AI provider down → base points | Partial | Job retries 3× then enters `failed` state; submission stays `pending` — no auto-base-points fallback |

---

## Phase 4 — Admin and Ops

Full admin control plane and observability.

| Task | Status | Notes |
|---|---|---|
| Admin dashboard (totals, queue depth) | Done | `src/routes/admin/dashboard.ts`; 4 live DB stats (users, GP pending, touchpoints engaged, avg score) |
| Admin: user support lookup | Done | `GET /v1/admin/users?search=`; name/email search, returns role + score |
| Admin: frontend login + auth guard | Done | `frontend/app/admin/login/page.tsx`; guards all `/admin/*` routes, separate `agentx_admin_token` key |
| Admin: manual point adjustment with reason | Done | `POST /v1/admin/users/:id/points { delta, reason }`; expandable user card in `frontend/app/admin/users/page.tsx`; writes `PointAdjustment` + `AuditLog` in transaction |
| Admin: walk-in approval queue | Done | Pending tab in `frontend/app/admin/users/page.tsx`; `POST /v1/admin/users/:id/approve`; writes `AuditLog` |
| Admin: retroactive point application on approval | Done | Backend `admin/users.ts` applies queued point awards on walk-in approval |
| Admin: agenda create/edit/delete + version bump | Done | `src/routes/admin/agenda.ts`; PUT increments `version: { increment: 1 }`; `frontend/app/admin/agenda/page.tsx` — inline edit/delete forms, grouped by day |
| Admin: initiatives management | Not started | Not needed for event |
| Admin: sponsors management | Not started | Not needed for event |
| Admin: activity toggle (open/close) | Done | `src/routes/admin/activities.ts`; `POST /v1/admin/activities/:id/toggle`; optimistic UI in `frontend/app/admin/activities/page.tsx` |
| Admin: publish announcement | Done | `src/routes/admin/announcements.ts`; `POST /v1/admin/announcements`; `DELETE /v1/admin/announcements/:id`; `frontend/app/admin/announcements/page.tsx` |
| Admin: audit log viewer | Done | `src/routes/admin/audit-log.ts`; paginated, includes admin email; `frontend/app/admin/audit-log/page.tsx` — color-coded dots, expandable JSON payload |
| Admin: invitees management | Done | `frontend/app/admin/invitees/page.tsx`; CSV upload + single add + paginated list with search; "Registered" badge if invitee has linked user |
| Admin: PWA block | Done | `frontend/app/admin/layout.tsx`; detects `(display-mode: standalone)` + iOS `navigator.standalone`; shows "Desktop Only" card in PWA mode |
| Push notification integration | Done | VAPID Web Push (no third-party); `src/lib/push.ts`, `src/routes/push.ts`; frontend subscribe flow in `frontend/lib/push.ts` |
| WebSocket: leaderboard, announcements, agenda, jobs | Not started | |
| `GET /v1/sync` — reconnect delta endpoint | Not started | |
| Observability dashboard | Not started | Sentry or equivalent |
| Alerting rules | Not started | Error rate, latency, queue depth, AI failures |

---

## Phase 5 — Hardening

Pre-event readiness. Must complete before event day.

### Deployment

| Task | Status | Notes |
|---|---|---|
| Railway deployment config | Done | `backend/railway.toml`; build: `npm ci && prisma generate && tsc`; start: `prisma migrate deploy && node dist/index.js` |
| Vercel deployment config | Done | `frontend/vercel.json`; Next.js auto-detected; root dir `frontend/` in Vercel dashboard |
| Backend health check endpoint | Done | `GET /health → { status: 'ok', ts }` — used by Railway healthcheck |
| Graceful shutdown (SIGTERM/SIGINT) | Done | `backend/src/index.ts`; `app.close()` before `process.exit(0)` |
| Frontend `.env.example` documented | Done | `frontend/.env.example`; documents all 4 `NEXT_PUBLIC_*` vars |
| Deployment guide written | Done | `docs/deployment.md`; step-by-step for Railway + Vercel + R2 + Supabase |

### PWA Readiness

| Task | Status | Notes |
|---|---|---|
| App icons (192, 512, apple-touch-icon, favicon) | Done | Derived from ES26logo.png via center-crop + resize; `frontend/public/icons/`; ICO wrapper for favicon |
| Web App Manifest | Done | `frontend/public/manifest.json`; correct `display: standalone`, split `any` + `maskable` icon entries, `theme_color: #06090f` |
| HTML meta tags (iOS + Android) | Done | `app/layout.tsx`; `apple-mobile-web-app-capable`, status-bar-style, `apple-mobile-web-app-title`, favicon link |
| Install prompt — Android/Chrome | Done | `components/PwaPromptBanner.tsx` + `hooks/usePwaPrompts.ts`; captures `beforeinstallprompt`, persistent localStorage dismissal |
| Install instructions — iOS | Done | Same banner component; detects iOS + non-standalone, shows 3-step Share → Add to Home Screen instructions |
| Push notification onboarding | Done | `PwaPromptBanner` on home page; shown after install prompt resolves; skips iOS non-standalone |
| Offline navigation fallback | Done | `frontend/public/offline.html`; branded static page (no deps); SW intercepts failed navigation requests |
| Service worker offline handler | Done | `app/sw.ts`; install handler caches `offline.html`; fetch handler (registered before Serwist) catches navigation failures |
| Offline/online indicator | Done | `components/OfflineBanner.tsx`; fixed bar below TopBar (`z-index: 99`); slide-in animation; auto-dismisses on reconnect |
| Outbox wired in app shell | Done | `app/(app)/layout.tsx`; `flushOutbox()` on mount + `initOutboxListeners()` for `online` event; proper cleanup |

### Still to do

| Task | Status | Notes |
|---|---|---|
| Load test at 2× expected peak (800 concurrent) | Not started | |
| Network outage simulation during peak trivia | Not started | Verify queue + retry + dedup behavior |
| Backup/restore drill | Not started | |
| Staging environment mirrors production | Not started | |
| Admin runbook written | Not started | |
| On-call rotation defined | Not started | |
| Post-event data retention plan documented | Not started | |
| JWT secrets + DB credentials rotation plan | Not started | |
| Avatar budget cap configured per day | Not started | ~$40/day cap for 400 users |

---

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-05-15 | Backend port changed `3000` → `3001`; CORS origin updated from `http://localhost:5173` → `http://localhost:3000` | Next.js dev server occupies port 3000; old CORS config was a leftover from the Vite prototype |
| 2026-05-15 | Frontend API types, request bodies, and response consumers fully rewritten from snake_case to camelCase to match backend conventions; Dexie schema bumped to version 2 | Backend returns camelCase throughout; systematic mismatch caused all API calls to silently fail — see `docs/connection.md` for full scope |
| 2026-05-20 | Trivia seed expanded 20→50 official questions; PC questions replaced with official bank (correctIndex 0 for all); trivia maxPoints corrected 200→500 | Question banks were placeholder stubs; official content now in `docs/content/trivia.md` and `docs/content/prompt-challenge.md` |
| 2026-05-20 | Added `POST /v1/touchpoints/checkin` backend endpoint; fixed frontend touchpoints page to use `apiFetch` + `dedupeKey` | Touchpoints page was silently 404-ing against a non-existent endpoint; now awards 30 pts per location with proper deduplication |
| 2026-05-25 | PWA hardening complete: icons (ES26 logo), install prompt (Android + iOS), offline.html fallback, OfflineBanner, outbox wiring | App is now installable on Android (beforeinstallprompt) and iOS (manual instructions); offline navigation no longer shows browser error |
| 2026-05-25 | Deployment config complete: Railway (`railway.toml`), Vercel (`vercel.json`), health check, graceful shutdown, `deployment.md` guide | See `docs/deployment.md` for full setup steps |
| 2026-05-25 | Avatar Studio fully implemented; provider chosen as Google Gemini 3 Pro (`gemini-3-pro-image-preview`); selfie + backdrop → composite avatar; 150pt max (50 upload + 100 print claim) | Gemini selected for image-generation quality and availability; R2 chosen for object storage; selfies deleted post-generation |
| 2026-05-22 | Golden Points AI scoring implemented end-to-end; provider chosen as Claude Haiku (`claude-haiku-4-5-20251001`); no human review gate | Fully async job worker with prompt caching; admin view is read-only insights panel |
| 2026-05-22 | Frontend–backend contract audit and fix pass | Fixed: admin URL (`/stats`→`/dashboard`), users params/response shape, agenda `speaker`→`speakerName` rename, missing `GET /agenda/:id`, admin auth not wired (no login page, no token save), `?q=`→`?search=` |
| 2026-05-22 | Design polish merged from teammate (3-colour system, profile hero, amber/navy); TopBar WFG logo aspect-ratio fix | `git checkout --theirs` for all conflict files — teammate's design is canonical |
| 2026-05-25 | Admin panel fully implemented — all backend stubs replaced + all frontend pages built | 5 backend routes implemented (`announcements`, `audit-log`, `activities`, `agenda`, `invitees`); 7 frontend pages built/overhauled; `AuditLog` written in same transaction as every mutating admin operation |
| 2026-05-25 | Admin panel blocked in PWA/standalone mode | `layout.tsx` detects `(display-mode: standalone)` + iOS `navigator.standalone`; renders "Desktop Only" card and stops rendering all routes — prevents staff accidentally using admin in the attendee app |
| 2026-05-25 | Admin panel color system: all CSS custom property references hardcoded for silver surface | Admin cards use `--surface: #CCDEE7` (silver) not the dark `--bg`; `var(--bg2)` on inputs + `var(--border-metal)` borders + `var(--gold)` status chips were invisible on silver. Fixed globally via `[class*="card"]` CSS var override in `layout.tsx` + per-page hardcoded hex for inputs, borders, and status colors |

---

## Blockers

| Blocker | Waiting on | Phase affected |
|---|---|---|
| Invitee list format | WFG Team | Phase 1 |
| `ANTHROPIC_API_KEY` in production `.env` | Engineering | Phase 3 — GP scoring will retry-fail until set |
| `GOOGLE_AI_API_KEY` in production `.env` | Engineering | Phase 3 — avatar generation will fail until set |
| `OBJECT_STORAGE_*` vars in production `.env` | Engineering | Phase 3 — R2 uploads/downloads will fail until set |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` in production `.env` | Engineering | Phase 3 — push notifications will fail until set |
| ~~AI avatar provider~~ | ~~Engineering~~ | ~~Phase 3~~ | Resolved 2026-05-25 — Google Gemini 3 Pro chosen and implemented |
| ~~AI scoring provider~~ | ~~Engineering~~ | ~~Phase 3~~ | Resolved 2026-05-22 — Claude Haiku chosen and implemented |
| ~~Trivia question bank~~ | ~~WFG Team~~ | ~~Phase 2~~ | Resolved 2026-05-20 — 50 questions seeded |
| ~~Prompt Challenge content~~ | ~~WFG Team~~ | ~~Phase 2~~ | Resolved 2026-05-20 — 5 official questions seeded |
