# AgentX Backend — Build Progress

Tracks implementation status across each phase defined in [`backend.md`](./backend.md).

**Last updated:** 2026-05-14
**Current phase:** Phase 1 — In Progress

---

## Phase 1 — Foundation

Schema, auth, core content delivery. PWA reads everything from the API.

| Task | Status | Notes |
|---|---|---|
| Postgres schema + migrations | Blocked | Needs Supabase project + DATABASE_URL in .env |
| Auth: signup flow (invitee match + walk-in) | Done | `src/routes/auth.ts` |
| Auth: session JWT issue + refresh + revoke | Done | `src/routes/auth.ts` |
| Admin auth (separate table + bcrypt) | Done | `src/routes/admin/auth.ts` |
| `GET /v1/me` — profile endpoint | Done | `src/routes/profile.ts` |
| `GET /v1/agenda` — version-aware | Done | `src/routes/agenda.ts` |
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
| `POST /v1/activities/trivia/start` | Not started | |
| `POST /v1/activities/trivia/complete` + dedupe | Not started | |
| `GET /v1/activities/prompt-challenge/questions` | Not started | |
| `POST /v1/activities/prompt-challenge/answer` + dedupe | Not started | |
| `POST /v1/touchpoints/scan` + QR token verification | Not started | |
| Touchpoint HMAC token generation | Not started | |
| `user_scores` atomic update | Not started | |
| `GET /v1/leaderboard` | Not started | |
| `GET /v1/activities` — user completion state | Not started | |
| One-shot constraint testing | Not started | |
| Dedupe_key retry simulation tests | Not started | |

---

## Phase 3 — AI Features

Avatar generation pipeline. Golden Points submission and AI scoring.

| Task | Status | Notes |
|---|---|---|
| `POST /v1/activities/avatar/upload-url` — signed URL | Not started | |
| `POST /v1/activities/avatar/generate` — enqueue job | Not started | |
| Job worker: avatar generation (third-party model) | Not started | Provider TBD — see open question #2 |
| Job worker: retry logic (3 attempts + backoff) | Not started | |
| `GET /v1/jobs/:id` — polling endpoint | Not started | |
| `POST /v1/activities/golden-points/submit` | Not started | |
| `GET /v1/activities/golden-points/:id` | Not started | |
| Job worker: Golden Points LLM scoring | Not started | Provider TBD — see open question #3 |
| Golden Points score → points mapping | Not started | Bands tunable: 0–40 → 25pts, 41–70 → 60pts, 71–100 → 100pts |
| Admin: Golden Points moderation queue | Not started | |
| Admin: approve/reject/override submission | Not started | |
| Fallback: AI provider down → base points + flag | Not started | |

---

## Phase 4 — Admin and Ops

Full admin control plane and observability.

| Task | Status | Notes |
|---|---|---|
| Admin dashboard (totals, queue depth, error rates) | Not started | |
| Admin: manual point adjustment with reason | Not started | |
| Admin: walk-in approval queue | Not started | |
| Admin: retroactive point application on approval | Not started | |
| Admin: agenda create/edit/delete + version bump | Not started | |
| Admin: initiatives management | Not started | |
| Admin: sponsors management | Not started | |
| Admin: activity toggle (open/close) | Not started | |
| Admin: publish announcement | Not started | |
| Admin: user support lookup | Not started | |
| Admin: audit log viewer | Not started | |
| Push notification integration | Not started | Provider TBD — see open question #4 |
| WebSocket: leaderboard, announcements, agenda, jobs | Not started | |
| `GET /v1/sync` — reconnect delta endpoint | Not started | |
| Observability dashboard | Not started | Sentry or equivalent |
| Alerting rules | Not started | Error rate, latency, queue depth, AI failures |

---

## Phase 5 — Hardening

Pre-event readiness. Must complete before event day.

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
| — | — | — |

---

## Blockers

| Blocker | Waiting on | Phase affected |
|---|---|---|
| Invitee list format | WFG Team | Phase 1 |
| AI avatar provider | Engineering | Phase 3 |
| AI scoring provider | Engineering | Phase 3 |
| Hosting provider | Engineering | Phase 1 |
| Trivia question bank | WFG Team | Phase 2 |
| Prompt Challenge content | WFG Team | Phase 2 |
