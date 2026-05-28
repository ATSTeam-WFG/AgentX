# AgentX Backend PRD — Executive Summit 2026

**Status:** Draft v1
**Audience:** Engineering (backend), with handoff context for frontend/PWA team
**Scope:** Backend services, data model, APIs, and operational plan for the AgentX summit companion app

---

## 1. Overview

AgentX is the engagement app for WFG's Executive Summit 2026. The backend supports a Progressive Web App used by 300–400 title agents over a 2–3 day event. It handles attendee onboarding, agenda delivery, gamified activities, leaderboard, AI-generated avatars, AI-scored pain-point submissions, and an admin control plane.

The backend is deliberately small: one API service, one Postgres, one Redis, one CDN. Everything else is managed (push, AI inference, object storage). The system is designed to be operable by 1–2 engineers on event day.

---

## 2. Goals and Non-Goals

### Goals

- Support 300–400 concurrent users during peak sessions (live trivia, keynotes) without degradation.
- Survive flaky venue Wi-Fi gracefully — the app must remain usable when the network is intermittent.
- Enforce one-shot activity rules at the database level so retries and race conditions cannot grant duplicate points.
- Provide an admin surface for invitee management, Golden Points review override, manual point adjustment, and live troubleshooting.
- Be exportable and auditable after the event — every point awarded has a traceable submission.

### Non-Goals

- Multi-event tenancy. This is built for one event.
- Real-time fan-out of trivia tallies to other users. Trivia is solo.
- A separate WebSocket gateway service. WebSockets, if used, live in the API process.
- Building our own push notification infrastructure. We use a managed provider.
- Avatar printing integration. Parked until the kiosk vendor is confirmed.

---

## 3. Context and Constraints

| Factor | Detail |
|---|---|
| Audience | 300–400 users, ages 40–60, title agents and award winners. Moderate tech tolerance. |
| Event shape | 2–3 days. High traffic during sessions, near-zero at night. Peak writes during 60-second trivia. |
| Network | Venue Wi-Fi quality unknown. Plan for long stalls, partial outages, mid-request disconnects. |
| Team | Small. Operational simplicity is a feature. |
| Timeline | Invitee list arriving soon. AI avatar pipeline depends on a third-party model API. Printer integration deferred. |

---

## 4. System Architecture

### 4.1 Components

| Component | Role |
|---|---|
| **API service** | Node.js or Python. Single deploy unit. Handles all HTTP traffic, holds WebSocket connections, runs in-process job worker. Two instances behind a load balancer for zero-downtime deploys. |
| **Postgres (managed)** | Source of truth. All durable state. Single database, single schema. Connection pool ~20 per API instance. |
| **Redis (managed)** | Session token cache, rate limit counters, idempotency keys (short TTL), optional leaderboard cache. Not a primary write path — losing Redis must not lose data. |
| **Cloudflare (CDN + edge)** | Fronts the API. Caches static assets (PWA shell, sponsor logos, initiative splashes, avatar outputs). Handles TLS and DDoS protection. |
| **Object storage (S3 / R2)** | Stores uploaded user photos, generated avatars, sponsor media. Signed URLs for uploads, public CDN URLs for reads. |
| **AI inference (third-party)** | Two model calls: avatar generation (image-to-image) and Golden Points scoring (LLM text classification). Both called from the job worker, never from the request path. |
| **Push notifications (managed)** | OneSignal or FCM. Triggered when admins publish announcements or agenda changes. |

### 4.2 What We Deliberately Don't Build

- **Redis-as-primary-write-path.** Postgres handles our write volume without strain.
- **Separate WebSocket gateway.** WS scales fine inside the API process at this user count.
- **Heavyweight job queue.** Postgres-backed job table with `SELECT … FOR UPDATE SKIP LOCKED` is sufficient. No BullMQ, no Celery, no SQS.
- **Microservices.** One service. Modular code inside it.

### 4.3 Data Flow Examples

**User completes a trivia attempt.**
PWA writes attempt to local IndexedDB outbox → POSTs to `/activities/trivia/complete` with a client-generated UUID as `dedupe_key` → API validates, inserts into `activity_attempts` and `submissions` in one transaction, updates `user_scores` in the same transaction → returns 200 → PWA clears outbox entry. If the request fails or times out, PWA retries with the same `dedupe_key` and the unique constraint makes the retry a no-op.

**User scans a touchpoint QR.**
QR encodes a signed token → PWA POSTs token to `/touchpoints/scan` → API verifies signature, inserts into `touchpoint_scans` with unique `(user_id, touchpoint_id)` → awards points → returns confirmation. Duplicate scans hit the unique constraint and return "already scanned" without double-awarding.

**User uploads a photo for avatar generation.**
PWA requests a signed upload URL → uploads directly to object storage → POSTs `/activities/avatar/generate` with the storage key → API enqueues a job in `jobs` table, returns job ID → worker picks it up, calls the AI provider, writes the result back to object storage, updates the user's `avatar_url`, marks job complete → PWA polls `/jobs/:id` or receives a WS notification.

**Venue Wi-Fi drops mid-event.**
PWA continues serving cached agenda, sponsors, initiatives, and user profile from IndexedDB. New submissions queue in the outbox. WebSocket disconnects silently. On reconnect, PWA flushes the outbox (idempotent by `dedupe_key`), pulls a sync delta from `/sync?since=<version>`, and reopens the WS.

---

## 5. Authentication and Identity

### 5.1 Model

No passwords. No SSO. Identity is established by matching name and email against a pre-loaded invitee list. Sessions are long-lived tokens issued at signup.

### 5.2 Flow

1. User scans summit QR code, lands on signup screen.
2. PWA POSTs `name` and `email` to `/auth/signup`.
3. API normalizes email (lowercase, trim), looks up `invitees` table:
   - **Match found, not yet claimed:** create `user` record, link to invitee, issue session token.
   - **Match found, already claimed:** reject with a clear error — admin will resolve.
   - **No match:** create `user` record with `attendee_type = 'walk_in'` and `pending_admin_approval = true`. Issue a session token with limited access (can view agenda and sponsors; cannot earn points until approved). Admin sees these in a queue.
4. Session token is a signed JWT, 7-day expiry, refreshed on each authenticated request.
5. Token stored in PWA's localStorage, sent as `Authorization: Bearer <token>`.

### 5.3 Walk-in Handling

Walk-ins sign up the same way, are flagged for admin review, and get full access once approved. Submissions made while pending are preserved — on approval, points are retroactively awarded in one transaction. Legitimate attendees are not penalized for not being on the list.

### 5.4 Admin Auth

Separate `admin_users` table with email + password (bcrypt). Admin sessions expire in 24 hours, require re-login. All admin actions are audit-logged.

---

## 6. Data Model

Postgres schema. UUIDs as primary keys throughout. All timestamps are `timestamptz`.

### 6.1 Core Identity

**`invitees`** — pre-loaded list, admin-uploadable.
`id`, `email` (unique, normalized), `name`, `attendee_type`, `claimed_by_user_id` (nullable FK), `created_at`

**`users`** — actual app users.
`id`, `name`, `email` (unique), `attendee_type` (`invited` | `walk_in`), `invitee_id` (nullable FK), `pending_admin_approval` (bool), `avatar_url` (nullable), `onboarding_interests` (jsonb array), `created_at`, `last_seen_at`

**`sessions`** — issued tokens. For revocation and audit; JWT carries the claims.
`token_id`, `user_id`, `expires_at`, `revoked_at` (nullable), `last_used_at`

**`admin_users`** — separate auth.
`id`, `email`, `password_hash`, `role` (`super_admin` | `moderator` | `support`), `created_at`

### 6.2 Content

**`agenda_events`** — the summit schedule.
`id`, `day` (1 | 2 | 3), `name`, `description`, `location`, `speaker`, `starts_at`, `ends_at`, `version` (int, bumps on edit), `created_at`, `updated_at`

**`initiatives`** — Explore page content.
`id`, `name`, `team`, `short_description`, `what_it_does`, `audience`, `why_built`, `rollout_notes`, `demo_url` (nullable), `kiosk_location` (nullable), `splash_url` (nullable), `display_order`

**`sponsors`** — sponsor cards.
`id`, `name`, `tier` (`title` | `gold` | `silver` | `partner`), `logo_url`, `description`, `display_order`

**`sponsor_impressions`** — for sponsor reporting.
`id`, `sponsor_id`, `user_id`, `surface` (`home` | `profile` | `agenda`), `created_at`

### 6.3 Activity Definitions

**`activities`** — definition table.
`id`, `type` (`trivia` | `avatar` | `prompt_challenge` | `golden_points` | `touchpoint`), `name`, `max_points`, `is_one_shot` (bool), `is_open` (bool — admin can close), `config_json`, `created_at`

**`trivia_questions`** — bank of questions.
`id`, `question_text`, `options_json` (4 options), `correct_index`, `category`, `difficulty`, `is_active`

**`prompt_challenge_questions`** — 5 categories, one MCQ each.
`id`, `category`, `scenario_text`, `options_json` (4 prompt options), `correct_index`, `explanation`, `display_order`

**`touchpoints`** — QR locations.
`id`, `name`, `qr_token` (unique, HMAC-signed), `points`, `location_description`, `is_active`

### 6.4 Activity User Data

**`activity_attempts`** — one row per user per one-shot activity.
`id`, `user_id`, `activity_id`, `started_at`, `completed_at` (nullable), `points_awarded` (int), `payload_json`
**Unique constraint:** `(user_id, activity_id)` where `is_one_shot = true`. DB-level guarantee — no user earns points twice for the same activity.

**`submissions`** — append-only event log. Every scoreable action lands here.
`id` (client-generated UUID), `user_id`, `activity_id`, `kind`, `payload_json`, `client_dedupe_key` (unique), `created_at`
Unique constraint on `client_dedupe_key` makes PWA retries safe.

**`trivia_answers`** — individual question responses within a trivia attempt.
`id`, `attempt_id` (FK → `activity_attempts`), `question_id`, `selected_index`, `is_correct`, `answered_at`

**`prompt_challenge_answers`** — per-question responses.
`id`, `user_id`, `question_id`, `selected_index`, `is_correct`, `points_awarded`, `answered_at`
**Unique constraint:** `(user_id, question_id)`

**`golden_points_submissions`** — pain point text submissions.
`id`, `user_id`, `text`, `word_count`, `ai_score` (nullable, 0–100), `ai_feedback` (nullable), `ai_scored_at` (nullable), `status` (`pending` | `ai_scored` | `flagged_for_review` | `approved` | `rejected`), `points_awarded` (int), `reviewed_by_admin_id` (nullable), `reviewed_at` (nullable), `created_at`

**`touchpoint_scans`** — QR scans.
`id`, `user_id`, `touchpoint_id`, `scanned_at`, `points_awarded`
**Unique constraint:** `(user_id, touchpoint_id)`

### 6.5 Scoring

**`user_scores`** — denormalized totals for fast leaderboard reads.
`user_id` (PK), `total_points`, `activities_completed`, `rank` (computed on read or refreshed periodically), `updated_at`
Updated in the same transaction as the awarding submission.

**`point_adjustments`** — admin manual changes and audit trail.
`id`, `user_id`, `delta`, `reason`, `admin_user_id`, `created_at`

### 6.6 Feedback

**`event_feedback`** — per-session feedback after an agenda event.
`id`, `agenda_event_id`, `user_id` (nullable for anonymous), `ratings_json`, `comment` (nullable), `created_at`

**`app_feedback`** — overall app/summit feedback from profile page.
`id`, `user_id` (nullable), `answers_json` (5 questions), `comment`, `is_anonymous`, `created_at`
When `is_anonymous = true`, `user_id` is **never written** — stripped at the API layer before insert. Rate limiting happens before the strip.

### 6.7 Operational

**`jobs`** — Postgres-backed job queue.
`id`, `type` (`avatar_generation` | `golden_points_scoring` | `push_notification`), `payload_json`, `status` (`pending` | `running` | `done` | `failed`), `attempts`, `last_error`, `locked_by` (worker ID), `locked_until`, `created_at`, `completed_at`

**`audit_log`** — every admin action.
`id`, `admin_user_id`, `action`, `target_type`, `target_id`, `payload_json`, `created_at`

**`announcements`** — admin-published messages pushed to clients.
`id`, `title`, `body`, `published_at`, `published_by_admin_id`, `expires_at`

### 6.8 Key Indexes

| Index | Reason |
|---|---|
| `users(email)` unique | Signup lookup |
| `invitees(email)` unique | Match on signup |
| `activity_attempts(user_id, activity_id)` unique where one-shot | Duplicate prevention |
| `submissions(client_dedupe_key)` unique | Retry idempotency |
| `submissions(user_id, created_at desc)` | User history queries |
| `touchpoint_scans(user_id, touchpoint_id)` unique | Duplicate scan prevention |
| `user_scores(total_points desc)` | Leaderboard reads |
| `jobs(status, locked_until)` | Worker polling |

---

## 7. API Surface

REST + JSON, versioned at `/v1`. WebSocket endpoint at `/v1/ws` for live updates.

### 7.1 Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/v1/auth/signup` | `{name, email}` → `{token, user, status}`. Status: `active` or `pending_approval`. |
| POST | `/v1/auth/login` | Same shape as signup; returns existing user if email matches. |
| POST | `/v1/auth/refresh` | Refreshes token. |
| POST | `/v1/auth/logout` | Revokes token. |

### 7.2 Profile

| Method | Endpoint | Description |
|---|---|---|
| GET | `/v1/me` | Current user, score, activities completed, rank. |
| PATCH | `/v1/me` | Update profile (`avatar_url`, `onboarding_interests`). |
| GET | `/v1/me/history` | Submission history for the current user. |

### 7.3 Content

All mostly cacheable and version-aware.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/v1/agenda?since=<version>` | Full agenda or delta. |
| GET | `/v1/initiatives` | Explore content. |
| GET | `/v1/sponsors` | Sponsor list. |
| GET | `/v1/announcements` | Active announcements. |
| POST | `/v1/sponsors/:id/impression` | Log a sponsor view (fire-and-forget). |

### 7.4 Activities

| Method | Endpoint | Description |
|---|---|---|
| GET | `/v1/activities` | List with user's completion state and points earned. |
| POST | `/v1/activities/trivia/start` | Creates an `activity_attempt`, returns 50 randomized questions. |
| POST | `/v1/activities/trivia/complete` | `{attempt_id, answers, dedupe_key}` → score + points. |
| GET | `/v1/activities/prompt-challenge/questions` | Returns 5 questions with user's existing answers. |
| POST | `/v1/activities/prompt-challenge/answer` | `{question_id, selected_index, dedupe_key}` → points awarded. |
| POST | `/v1/activities/golden-points/submit` | `{text, dedupe_key}` → submission ID. AI scoring runs async. |
| GET | `/v1/activities/golden-points/:id` | Submission status and score. |
| POST | `/v1/activities/avatar/upload-url` | Returns a signed object storage upload URL. |
| POST | `/v1/activities/avatar/generate` | `{photo_key, prompt_style, dedupe_key}` → job ID. |
| GET | `/v1/jobs/:id` | Job status. Used for polling avatar generation. |
| POST | `/v1/touchpoints/scan` | `{qr_token, dedupe_key}` → points + touchpoint info. |
| POST | `/v1/touchpoints/checkin` | `{location_id, response, dedupe_key}` → 30 pts. Text response, one per location. |
| GET | `/v1/touchpoints/checkins` | Returns all checkins for the authenticated user (locationId + pointsAwarded). |

### 7.5 Feedback

| Method | Endpoint | Description |
|---|---|---|
| POST | `/v1/agenda-events/:id/feedback` | Per-session feedback. Upserts on re-submit. |
| GET | `/v1/agenda-events/:id/feedback` | Returns `{ submitted, rating? }` for the authenticated user. |
| POST | `/v1/feedback` | App feedback. Honors `is_anonymous` flag. |

### 7.5a Initiative Notes

| Method | Endpoint | Description |
|---|---|---|
| GET | `/v1/initiative-notes` | Returns all saved notes for the authenticated user. |
| POST | `/v1/initiative-notes` | `{initiativeName, noteText}` — upserts by (userId, initiativeName). |

### 7.6 Leaderboard

| Method | Endpoint | Description |
|---|---|---|
| GET | `/v1/leaderboard?limit=5` | Top N + current user's position. |

### 7.7 WebSocket

Single connection at `/v1/ws`, authenticated by token. Subscriptions:

| Event | Trigger |
|---|---|
| `leaderboard.update` | Sent when top 5 changes (admin point edit, any activity completion). |
| `announcements.new` | Admin publishes an announcement. |
| `agenda.changed` | Admin edits agenda. |
| `activity.changed` | Admin toggles activity open/closed. |
| `scores.update` | User earns points (trivia, prompt-challenge, touchpoint, admin adjustment). |
| `jobs.done` | Async job complete — avatar generation or golden points scoring. |
| `features.updated` | Admin toggles a feature flag. |

WebSocket is a nice-to-have. Every feature must work with polling as a fallback.

### 7.8 Sync

| Method | Endpoint | Description |
|---|---|---|
| GET | `/v1/sync?since=<timestamp>` | Returns deltas across agenda, sponsors, initiatives, announcements. Called by PWA on reconnect. |

### 7.9 Admin (`/v1/admin`, separate auth)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/v1/admin/auth/login` | Admin login. |
| GET | `/v1/admin/users` | Search, filter, pagination. |
| GET | `/v1/admin/users/:id` | Full profile, point history, submissions. |
| POST | `/v1/admin/users/:id/points` | Manual point adjustment with reason. |
| POST | `/v1/admin/users/:id/approve` | Approve a walk-in. |
| POST | `/v1/admin/invitees/upload` | CSV upload. |
| GET | `/v1/admin/golden-points?status=pending` | Moderation queue. |
| POST | `/v1/admin/golden-points/:id/decision` | Approve/reject with override score. |
| GET | `/v1/admin/leaderboard` | Full leaderboard. |
| POST | `/v1/admin/agenda` | Create/update/delete agenda events. |
| POST | `/v1/admin/initiatives` | Manage initiatives. |
| POST | `/v1/admin/sponsors` | Manage sponsors. |
| POST | `/v1/admin/activities/:id/toggle` | Open/close an activity live. |
| POST | `/v1/admin/announcements` | Publish announcement. |
| GET | `/v1/admin/dashboard` | Totals, active users, activity attempts, queue depth. |
| GET | `/v1/admin/audit-log` | Recent admin actions. |

---

## 8. Critical Invariants

These must never be wrong. Each is enforced at the database level, not just the application layer.

1. **One-shot activities are one-shot.** Unique constraints on `activity_attempts`, `prompt_challenge_answers`, and `touchpoint_scans`.
2. **Retries are idempotent.** Every scoreable POST takes a `client_dedupe_key`. Unique constraint on `submissions.client_dedupe_key`. Duplicate POSTs return the original result without re-awarding points.
3. **Scores are reconciled atomically.** `user_scores` is updated in the same transaction as the submission. No eventual consistency on point totals.
4. **Anonymous feedback is anonymous.** `user_id` is stripped at the API layer before insert when `is_anonymous = true`. Rate limiting happens before the strip.
5. **Walk-ins don't lose work.** Submissions made while pending are preserved. On admin approval, points are applied retroactively in one transaction.
6. **Touchpoint QR tokens are signed.** Tokens are HMAC-signed; users can't manufacture fake QRs. Rotation is possible if a code leaks.
7. **Admin actions are audited.** Every admin write goes through middleware that logs to `audit_log` in the same transaction.

---

## 9. Offline and Network Resilience

The PWA handles most of this, but the backend must cooperate.

- **Every write endpoint accepts a `dedupe_key`.** No exceptions. PWA generates UUIDs client-side and queues writes in an outbox.
- **Version-aware content endpoints.** Agenda, initiatives, sponsors, and announcements return a `version`. PWA passes `?since=` to get deltas, falls back to full payload if disconnected too long.
- **`/v1/sync` is the catch-all reconciliation route.** PWA calls this on reconnect.
- **WebSocket loss is silent and recoverable.** Clients reconnect with exponential backoff. No message replay needed — the next sync call covers it.
- **Long polling fallback.** For environments where WS is blocked, `/v1/sync` with a 30-second timeout serves the same purpose.
- **Read endpoints aggressively cached at Cloudflare** with short TTLs (30–60s) and stale-while-revalidate.

**Pre-event test:** simulate a 60-second network outage during peak trivia. Submissions must queue, retries must succeed, no duplicate points, leaderboard must converge within 30 seconds of reconnection.

---

## 10. AI Inference

### 10.1 Avatar Generation

Triggered when a user uploads a photo. The photo lands in object storage, a job is enqueued, and a worker calls the third-party model. On completion, the result is stored in object storage and the user's `avatar_url` is updated.

- **Expected latency:** 10–60 seconds. PWA shows a progress state.
- **Points:** 50 awarded on successful generation. 100-point print reward deferred until kiosk integration is defined.
- **Worker behavior:** retry on transient errors (up to 3 times with backoff), mark `failed` after that, surface to admin. A failed avatar must not block the user.

### 10.2 Golden Points Scoring

Triggered on text submission. Job worker calls an LLM with a structured prompt:

> Score this title-industry pain point on a 0–100 scale for specificity, actionability, and relevance to WFG's business. Return JSON with `score`, `category`, and `feedback`.

Score maps to points:

| AI Score | Points Awarded |
|---|---|
| 0–40 | 25 |
| 41–70 | 60 |
| 71–100 | 100 |

Exact bands are tunable. Submissions that are very short, off-topic, or contain profanity are flagged with `status = flagged_for_review` for admin override.

- **Latency target:** under 10 seconds. PWA shows "scoring…" then reveals points.
- **Fallback:** if AI provider is down, award 40 base points and flag for human review. The user is not penalized for infrastructure failure.

### 10.3 Cost and Rate Limiting

- **Avatar generation:** ~$0.10 per image. Cap at one per user (max 400 total). Daily budget cap configured. If exceeded, the activity closes gracefully with an admin alert.
- **Golden Points scoring:** cheap. No practical cap.

---

## 11. Admin Surface

A separate small web app served from the same backend. Used by the WFG team during the event.

| Flow | Description |
|---|---|
| Invitee management | Upload CSV, view list, manually add invitees, search. |
| Walk-in approval queue | Pending walk-ins surfaced for one-click approval. Approval triggers retroactive point application. |
| Golden Points moderation | Queue of flagged submissions with AI score and feedback. Approve, reject, or override score. |
| Live activity control | Open/close any activity. Admin can pause trivia if it causes issues. |
| Manual point adjustment | Award or deduct points with a required reason. Logged to audit trail. |
| Agenda editing | Live edits trigger a `version` bump and push notification. |
| Announcements | Publish a message; fans out via WS and push notification. |
| Support lookup | Find a user by email, see their state, troubleshoot. |
| Dashboard | Totals, queue depth, error rates, recent admin actions. |

---

## 12. Observability

One dashboard covering:

- API request rate, error rate, p50/p95/p99 latency per endpoint (RED metrics).
- Postgres connection pool usage, slow query count.
- Redis hit rate, memory.
- Job queue depth, oldest pending job age, failure rate.
- WebSocket connection count.
- Active users in the last 5 minutes.
- Cumulative submissions, points awarded, activities completed.
- AI provider latency and error rate.
- Recent errors with stack traces (Sentry or equivalent).

**Alerts:** error rate > 1%, p95 latency > 1s, job queue depth > 100, AI provider failures, Postgres connection pool exhaustion.

---

## 13. Security and Privacy

- All traffic over HTTPS, enforced at Cloudflare.
- JWT secrets and DB credentials in environment variables, never in code. Rotated post-event.
- User-uploaded photos in private object storage. Generated avatars public-readable via CDN. Original photos deleted 30 days post-event.
- Anonymous feedback is genuinely anonymous — no recoverable link to `user_id`.
- Admin endpoints require admin JWT with a separate audience claim. IP allowlist optional.
- Rate limits on all write endpoints (e.g. 10/minute per user for feedback, 60/minute for general writes). Stricter limits on auth endpoints.
- CORS locked to the PWA domain.
- All admin actions audit-logged.
- PII (name, email) handled per WFG's standard data policy. Post-event data export and retention plan documented.

---

## 14. Deployment

- Two API instances behind a load balancer. Rolling deploys. Hosting TBD (Railway, Fly, or Vercel — see Open Questions).
- Managed Postgres with daily backups + PITR. Snapshots taken at event start and end.
- Managed Redis. Persistence enabled but not relied on — losing Redis is recoverable.
- Object storage in a region close to the venue.
- CDN with edge caching for static assets and short-TTL caching for read endpoints.
- Staging environment mirroring production. Load tested before the event at 2× expected peak.

---

## 15. Open Questions

| # | Question | Owner |
|---|---|---|
| 1 | Hosting provider (Vercel, Railway, Fly, self-managed)? Affects WebSocket support. | Engineering |
| 2 | AI provider for avatars (Replicate, Fal, OpenAI, in-house)? Affects latency, cost, prompt engineering. | Engineering |
| 3 | AI provider for Golden Points scoring (Claude or OpenAI)? | Engineering |
| 4 | Push notification provider (OneSignal vs. FCM directly)? OneSignal is faster to ship. | Engineering |
| 5 | Invitee list format and delivery cadence. Need a clear CSV schema once received. | WFG Team |
| 6 | Printer integration. 100-point hook needs a defined trigger when ready. | WFG Team |
| 7 | Sponsor analytics expectations. Are we reporting impressions? If yes, in what format? | WFG Team |
| 8 | Trivia question bank. Who's authoring? Pool size? (50 random per attempt implies 100+ in pool.) | WFG Team |
| 9 | Prompt Challenge content. Who's authoring the 5 categories and correct answers? | WFG Team |

---

## 16. Phased Build Plan

See [`progress.md`](./progress.md) for current status on each phase.

| Phase | Focus | Key Deliverables |
|---|---|---|
| **Phase 1 — Foundation** | Schema, auth, core content | Migrations, auth flow, profile, agenda, sponsors, initiatives. Basic admin login + invitee upload. PWA reads everything from the API. |
| **Phase 2 — Activities** | Games and scoring | Trivia, Prompt Challenge, Touchpoints. Scoring + leaderboard. One-shot enforcement and dedupe_key flow tested. |
| **Phase 3 — AI Features** | Avatar + Golden Points | Avatar generation pipeline. Golden Points submission + AI scoring. Job worker. Admin moderation surface. |
| **Phase 4 — Admin and Ops** | Full admin control plane | Dashboard, manual point adjustment, walk-in approval, announcements, audit log, observability. |
| **Phase 5 — Hardening** | Pre-event readiness | Load testing at 2× peak. Network outage simulation. Backup/restore drill. Admin runbook. On-call rotation. |
