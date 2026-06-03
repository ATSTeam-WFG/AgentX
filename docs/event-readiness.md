# Event Readiness Audit — WFG Executive Summit 2026

**Audit date:** 2026-06-02  
**Event:** WFG Executive Summit 2026 (June 3–5, Delray Beach FL)  
**Expected load:** ~300–500 concurrent attendees, peak ~800  
**Overall verdict:** Functionally ready, but **3 hard blockers** and **5 must-fix items** require action before opening doors.

---

## Architecture summary

| Layer | Provider | Notes |
|---|---|---|
| Backend API + Worker | Railway (single instance) | Fastify 4, Prisma 5, Node 20; worker runs in-process |
| Frontend | Vercel | Next.js 15 App Router, Serwist PWA |
| Database | Supabase Postgres | pgBouncer pooled (`connection_limit=10`) + direct URL for migrations |
| Redis | Railway | Used only for leaderboard cache (10s TTL); optional, graceful DB fallback |
| Object storage | Cloudflare R2 | Avatar selfies + generated portraits |
| Async jobs | DB-backed queue (`Job` table) | `FOR UPDATE SKIP LOCKED`, 5s poll, batch 20, 3 retries |
| External AI | Anthropic Haiku (scoring + chat), Google Gemini (avatars) | |

---

## Pre-event checklist

### Hard blockers (will break the event if not resolved)

- [ ] **Verify the Gemini model name end-to-end** — `workers/avatar.ts:58` calls `model: 'gemini-3-pro-image-preview'`. This identifier does not match any confirmed Google GenAI model name. If the string is wrong or the model is unavailable, every avatar job will throw at the Gemini call, exhaust all 3 retries, and leave users stuck with no avatar and an orphaned selfie on R2. **Test this with the live `GOOGLE_AI_API_KEY` against the real API before the event.**

- [ ] **Import the real invitee list before opening doors** — `lib/seeder.ts:18` only seeds 3 placeholder records (`alice@wfg.com`, `bob@wfg.com`, `carol@wfg.com`). Any attendee whose email is not in the `Invitee` table will be treated as a walk-in (`pendingAdminApproval=true`). If the full invitee CSV is not loaded first, admin will receive hundreds of approval requests on Day 1 and all invited guests will be blocked until manually approved.

- [ ] **Run `prisma migrate deploy` on production before launch** — migration `20260601000000_remove_touchpoint_tables` exists locally and the schema has been updated, but it has not been applied to the production DB. The ORM and DB will be out of sync until it runs. Execute `prisma migrate deploy` (not `migrate dev`) against the production `DIRECT_URL` before the first user logs in.

### Must decide / acknowledge (design-level)

- [ ] **Passwordless auth model accepted** — `/auth/login` requires only name + email, no verification. Anyone with a known attendee email can log in as them and overwrite their name/points. Intentional for frictionless onboarding; confirm this is acceptable for any prizes or leaderboard integrity requirements.
- [ ] **Non-revocable tokens accepted** — `authenticate` in `plugins/auth.ts` only calls `jwtVerify()`; it never checks the `Session` table. Logout sets `revokedAt` in the DB but the JWT keeps working for its 7-day life. No token expires mid-event, so low practical impact, but compromised tokens cannot be kicked. Acceptable for the event; note for post-event hardening.
- [ ] **Touchpoints feature status confirmed** — QR scan was removed (migration `20260601000000_remove_touchpoint_tables` drops `Touchpoint`/`TouchpointScan`). Manual touchpoint check-ins (written response, 30 pts) still work and are still in the seeder + frontend nav. Confirm whether this activity should remain open or be disabled via the `isOpen` flag.
- [ ] **Avatar backdrop hardcoded to `'1'`** — `app/(app)/activities/avatar/page.tsx:151` calls `uploadSelfieAndGenerate(photoFile, '1')`. The backend validates `['1', '2']` but there is no UI to pick backdrop 2. All users get backdrop 1. Confirm this is intentional or add a selector.

### Must fix before go-live

- [ ] **Rotate admin password from seeder default** — `lib/seeder.ts:7` hardcodes `executiveSum@26` as the super admin password. If the production `AdminUser` row was created by seeder and the password has not been changed, anyone who finds this source code can log into the admin panel. Update the hash directly in the DB (`bcryptjs.hash('<newpassword>', 10)`) before the event.

- [ ] **Chat cost cap** — `POST /v1/chat/message` (`routes/chat.ts`) makes uncapped Anthropic Haiku calls. A single user can send up to 300 messages/minute (global rate limit × 1 user). Add a Redis per-user daily quota (e.g. 50 messages) before the event. ~30 min effort.
  ```ts
  // Before the Anthropic call in chat.ts
  const key = `chat:msgs:${userId}`
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, 86400)
  if (count > 50) throw new AppError(429, 'RATE_LIMIT', 'Daily chat limit reached')
  ```

- [ ] **Add `requireMinRole` to user approval endpoints** — `POST /v1/admin/users/:id/approve` and `/users/bulk-approve` (`admin/users.ts:243`, ~76) have no role guard; any `support`-level admin can approve walk-in users. Add `requireMinRole('moderator', request)` to both handlers.

- [ ] **Add `requireMinRole` to `/system/seed`** — `POST /v1/admin/system/seed` (`admin/system.ts:53`) is ungated; any admin role can reinitialize event data mid-event. Add `requireSuperAdmin(request)` to match all other destructive system ops.

- [ ] **Set `CORS_ORIGIN` to the production Vercel URL** — `config.ts:11` defaults to `*` if the env var is not set. Leaving this unset allows any origin to make cross-origin requests to the backend. Must be explicitly set on Railway (e.g. `https://agentx.vercel.app`).

- [ ] **Production env vars confirmed on Railway + Vercel** (see env checklist below)

### Strongly recommended before go-live

- [ ] **Handle orphaned selfies on avatar worker final failure** — if avatar generation fails 3×, the selfie uploaded to R2 is never deleted (`workers/avatar.ts` only calls `deleteObject` on success, not on `failed` status in the error handler). The user is also left with no self-service retry path. Minimum fix: delete the selfie when `failed` status is set, and show a visible failure state with a "try again" button.
- [x] **Avatar failed-job state on app re-mount** — `app/(app)/activities/avatar/page.tsx:43` resumes a stored job on mount. If the job is `failed` it clears localStorage and silently falls back to the `intro` phase with no error message. Add a toast or inline error before resetting to intro.

### Nice-to-have / monitor during event

- [ ] WebSocket per-user connection cap (currently unlimited tabs → unbounded broadcast fan-out)
- [ ] Server-side WebSocket heartbeat/ping to detect dead connections
- [ ] Short Redis cache on `GET /v1/sync` (currently uncached; 4 DB queries per poll)
- [ ] 401-triggered token refresh in frontend `lib/api.ts` before logout (refresh endpoint exists but is never called)
- [ ] Tighter rate limit on admin/user login endpoints (currently shares global 300/min)
- [ ] Graceful worker drain on SIGTERM (currently `app.close()` exits immediately; jobs recover via lock expiry after 60s due to idempotent handlers — low impact but noisy on deploys)

---

## Environment variable checklist

### Backend (Railway)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Supabase pooled URL with `?pgbouncer=true&connection_limit=10` |
| `DIRECT_URL` | Yes | Supabase direct URL for migrations |
| `JWT_SECRET` | Yes | ≥32 chars; do not use default |
| `REDIS_URL` | Yes | Railway Redis service URL |
| `ANTHROPIC_API_KEY` | Yes | Golden points scoring + Agent X chat |
| `GOOGLE_AI_API_KEY` | Yes | Avatar generation (Gemini) |
| `VAPID_PUBLIC_KEY` | Yes | Must match frontend key |
| `VAPID_PRIVATE_KEY` | Yes | |
| `VAPID_CONTACT_EMAIL` | Yes | |
| `OBJECT_STORAGE_BUCKET` | Yes | R2 bucket name |
| `OBJECT_STORAGE_ENDPOINT` | Yes | `https://<account-id>.r2.cloudflarestorage.com` |
| `OBJECT_STORAGE_ACCESS_KEY` | Yes | R2 token (Object Read & Write) |
| `OBJECT_STORAGE_SECRET_KEY` | Yes | |
| `OBJECT_STORAGE_PUBLIC_URL` | Yes | Public CDN URL for generated avatars |
| `CORS_ORIGIN` | Yes | Must be set explicitly (e.g. `https://agentx.vercel.app`); **default is `*`** |
| `STRESS_BYPASS_SECRET` | Optional | Set if running k6 load tests against staging |

### Frontend (Vercel)

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | `https://your-backend.up.railway.app` |
| `NEXT_PUBLIC_WS_URL` | Yes | `wss://your-backend.up.railway.app` |
| `NEXT_PUBLIC_APP_ENV` | Yes | **Must be `production`** — service worker is disabled when value is not `production` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Yes | Must match backend `VAPID_PUBLIC_KEY` |

---

## Load test coverage

| Script | VUs | Duration | Coverage |
|---|---|---|---|
| `sync-storm.js` | 300 | 60s | `GET /sync` — 70% cold, 30% incremental |
| `trivia-peak.js` | 100 | 60s | Full trivia workflow (start + complete) |
| `leaderboard-reads.js` | 200 | 60s | High-freq leaderboard reads, cache validation |
| `dedupe-concurrency.js` | 50 | burst | TOCTOU race on trivia complete |

**Gaps (recommend manual smoke tests):**
- Avatar end-to-end with the live `GOOGLE_AI_API_KEY` — model name must be verified this way
- Golden points AI scoring under concurrent load (10 parallel submissions → watch job queue depth)
- Avatar job throughput (Gemini latency + retry behavior)
- WebSocket broadcast with 50+ concurrent connections
- Mixed-activity scenario (trivia + leaderboard + chat simultaneously)
- Admin panel under load

---

## Known issues (flagged, low severity)

| Area | File | Issue |
|---|---|---|
| Activities (trivia) | `routes/activities/trivia.ts` | `selectedIndex` validation allows `-1`; harmless but should be `min(0)` |
| Activities (trivia) | `routes/activities/trivia.ts` | No server-side timer; `startedAt` is recorded but never compared to `completedAt`. The 60-second countdown is client-side only — a slow or tampered client can submit answers after the timer expires |
| Activities (prompt challenge) | `routes/activities/prompt-challenge.ts` | `activitiesCompleted` can be double-incremented if the final answer is submitted twice concurrently (cosmetic counter, not points) |
| Activities (touchpoints) | `routes/activities/touchpoints.ts` | `activitiesCompleted` is never incremented on check-in (`upsert` create path sets it to `0`, update path omits it entirely) — touchpoint scans don't count toward the activity completion counter |
| Activities (avatar) | `routes/activities/avatar.ts` | `clientDedupeKey` is fetched from `Submission` but not used to short-circuit the upload; covered by the `avatarUrl`-exists check but the intent of the dedupe key is unused |
| Activities (avatar) | `routes/activities/avatar.ts:107` | `/claim-print` endpoint has no `activity.isOpen` guard — prints can be claimed even after the activity is closed. Compare with `/upload` which correctly checks `isOpen` |
| Activities (avatar) | `routes/activities/avatar.ts:133` | `claim-print` upsert sets `activitiesCompleted: 0` on create and never increments it on update — print claims don't count toward the activity counter |
| Scoring | `workers/avatar.ts:103` | Comment says "award 100 pts" but code awards 150 — confirm 150 is intended |
| Admin | `routes/admin/invitees.ts` | CSV import, single create/edit/delete have no audit log entries |
| Admin | `routes/admin/jobs.ts` | Job retry writes no audit log |
| Ops | Backend | `CORS_ORIGIN` defaults to `*` if env var not set (also listed in must-fix above) |
| Frontend | `lib/api.ts` | 401 immediately clears token + redirects; refresh endpoint exists but is never called |
| Frontend | Various | No global React error boundary; per-page error handling only |

---

## What's solid (no action needed)

- Idempotent point writes — all point awards are inside transactions with `clientDedupeKey` or unique constraints preventing double-submission
- DB indexes on hot queries — `UserScore.totalPoints DESC` and `Job.[status, lockedUntil]` both indexed
- Job recovery — `FOR UPDATE SKIP LOCKED` + 60s `lockedUntil` means orphaned jobs self-heal; handlers are idempotent
- Admin separation — user and admin JWTs use different `aud` claims and are cross-checked on every request
- Push notifications — VAPID configured, stale subscription auto-pruned on 410/404; 10s delay in golden-points worker covers the subscription registration race
- Offline PWA — Serwist SW + IndexedDB outbox + offline banner + exponential backoff retry
- WebSocket reconnect — client exponential backoff up to 30s, event-driven reconnect
- Leaderboard cache — Redis 10s TTL with graceful DB fallback
- Graceful 500 handling — `AppError`, P2002 (duplicate), and validation errors all map to clean HTTP responses
- Prompt caching on AI calls — both golden-points scoring (Claude Haiku) and Agent X chat use `cache_control: ephemeral`
- Health check — `GET /health` present and wired to Railway healthcheck config
- Client-side polling timeouts — avatar page has 8-min hard timeout (`avatar/page.tsx:87`); golden points has 5-min timeout (`golden-points/page.tsx:46`); both show user-facing error states on expiry
- Rate limiter keys by JWT `sub` not IP — prevents proxy bypass on auth-required endpoints

---

## Scaling notes (post-event)

The current architecture has a **single-instance ceiling** due to:
1. In-memory WebSocket connection map (`ws-connections.ts`) — broadcasts don't fan out across replicas
2. In-memory rate limiter (`@fastify/rate-limit` without Redis store)

To scale beyond one backend instance: add Redis pub/sub for WS broadcasts and switch rate limiter to Redis store. For this event, keep Railway at **one dyno**.
