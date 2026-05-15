# AgentX — Frontend / Backend Connection Reference

Authoritative guide for wiring the Next.js PWA to the Fastify API.  
Read alongside [`backend.md`](./backend.md) (API spec) and [`frontend.md`](./frontend.md) (screen designs).  
Phases 1–2 are fully implemented and the frontend is aligned to this spec. Phases 3–4 entries are skeletons — path + purpose only.

**Frontend alignment completed:** 2026-05-15  
All frontend API types, request bodies, and response consumers updated to match the backend's camelCase conventions. Environment is configured for local development.

---

## 1. Connection Rules

### Base URL
```
NEXT_PUBLIC_API_URL=http://localhost:3001        # dev
NEXT_PUBLIC_API_URL=https://api.agentx.wfg.app  # prod
```
All paths below are relative to this base. All routes are prefixed `/v1`.

### API Client (`frontend/lib/api.ts`)
`apiFetch<T>(path, options?)` is the single fetch wrapper. It:
- Sets `Content-Type: application/json` on every request
- Injects `Authorization: Bearer <token>` automatically (reads from `readToken()`)
- Passes `skipAuth: true` for public endpoints (no token needed)
- Passes `useAdminToken: true` for all `/v1/admin/*` routes (reads from `readAdminToken()`)
- Throws `ApiError(status, body, message)` on any non-2xx response

### Token Storage
| Token | localStorage key | Expiry | Refresh |
|---|---|---|---|
| User JWT | `agentx_token` | 7 days | POST /v1/auth/refresh (sliding) |
| Admin JWT | `agentx_admin_token` | 24 hours | None — re-login required |

### Error Handling by Status Code

| Status | Frontend Action |
|---|---|
| 400 | Show validation message on the offending field; fallback to error toast |
| 401 | `clearAuth()` → redirect to `/onboarding` |
| 403 | Show "Not authorized" — typically a token audience mismatch (user token on admin route or vice versa) |
| 404 | Show not-found state (e.g. inactive touchpoint, missing agenda event) |
| 409 | **Treat as success** — backend already processed this request (idempotent) |
| 429 | Show "Too many requests" toast; back off 60 seconds before retrying |
| 5xx | Reads: error toast. Writes: queue in offline outbox for retry |

### Dedupe Key Rule
Every mutating write (`POST`) that affects user scores or submissions must include a dedupe key:
```typescript
const dedupeKey = crypto.randomUUID()  // generated at button-press
// same UUID is used as the outbox entry id
body: { ..., dedupeKey }
```
The backend enforces a UNIQUE constraint on `submissions.client_dedupe_key`. Retrying with the same key returns the cached response without re-awarding points.

### Offline Outbox (`frontend/lib/outbox.ts`)
Writes are enqueued to Dexie `outbox` when offline. Flushed on:
- `window` `online` event
- WebSocket reconnect
- App boot (if outbox is non-empty)

Retry behavior:
| Response | Outbox Action |
|---|---|
| 2xx | Delete entry |
| 409 | Delete entry (idempotent — already done) |
| 4xx (not 409) | Mark `failedAt`, surface error toast |
| 5xx / timeout | Exponential backoff: 1s → 2s → 4s → 8s → 16s, max 5 attempts |

---

## 2. Authentication

### Signup — `POST /v1/auth/signup`
Used on `/onboarding` for first-time attendees.

**Auth:** None (`skipAuth: true`)

**Request body:**
```json
{ "name": "Jane Smith", "email": "jane@example.com" }
```

**Response `201`:**
```json
{
  "token": "<jwt>",
  "user": {
    "id": "uuid",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "attendeeType": "invited" | "walk_in",
    "pendingAdminApproval": false
  },
  "status": "active" | "pending_approval"
}
```

**Frontend action:** Save `token` to `localStorage.agentx_token`, hydrate Zustand `auth` slice.  
If `status === 'pending_approval'`: show approval-pending banner, disable all scoring UI. Submissions are still preserved and points applied retroactively when admin approves.

**Error cases:**
- `409` — email already has an account → redirect to login flow

### Login — `POST /v1/auth/login`
Used on `/onboarding` for returning attendees. Identical contract to signup.  
If the email is not found, the backend creates the account (behaves as signup). Response is always `201` for new accounts or `200` for returning users. Same response shape as signup.

### Refresh — `POST /v1/auth/refresh`
**Auth:** User JWT required

**Response `200`:** `{ "token": "<new_jwt>" }`

Call before the current token expires to get a fresh 7-day window.

### Logout — `POST /v1/auth/logout`
**Auth:** User JWT required

**Response `200`:** `{ "ok": true }`

After success: call `clearAuth()` (clears `auth` Zustand slice + removes `agentx_token`) then redirect to `/onboarding`.

### Admin Login — `POST /v1/admin/auth/login`
**Auth:** None

**Request body:**
```json
{ "email": "admin@wfg.com", "password": "..." }
```

**Response `200`:**
```json
{ "token": "<admin_jwt>", "admin": { "id": "uuid", "email": "...", "role": "super_admin" | "moderator" | "support" } }
```

Save token to `localStorage.agentx_admin_token`. No refresh — re-login after 24h.

### Boot Sequence (`app/page.tsx`)
1. Read `agentx_token` from `localStorage`
2. If missing or expired → redirect `/onboarding`
3. Decode and hydrate Zustand `auth` slice
4. Redirect to `/home`

---

## 3. Screen → Endpoint Map

| Screen | Primary Fetches | Mutations | WS Events |
|---|---|---|---|
| `/onboarding` | — | POST /v1/auth/signup | — |
| `/onboarding/interests` | — | PATCH /v1/me | — |
| `/home` | GET /v1/sync, GET /v1/announcements | POST /v1/sponsors/:id/impression | `announcements.new`, `agenda.changed` |
| `/agenda` | GET /v1/agenda | — | `agenda.changed` |
| `/agenda/[eventId]` | GET /v1/agenda | POST /v1/feedback/agenda-events/:id/feedback *(Phase 3)* | — |
| `/explore` | GET /v1/initiatives | — | — |
| `/activities` | GET /v1/activities | — | — |
| `/activities/trivia` | GET /v1/activities | POST /v1/activities/trivia/start, POST /v1/activities/trivia/complete | — |
| `/activities/prompt-challenge` | GET /v1/activities/prompt-challenge/questions | POST /v1/activities/prompt-challenge/answer | — |
| `/activities/golden-points` | GET /v1/activities/golden-points/:id *(Phase 3)* | POST /v1/activities/golden-points/submit *(Phase 3)* | `jobs.{id}.complete` |
| `/activities/touchpoints` | — | POST /v1/touchpoints/scan | — |
| `/activities/book-session` | — | *(TBD — Phase 3+)* | — |
| `/scan` | — | POST /v1/touchpoints/scan | — |
| `/profile` | GET /v1/me, GET /v1/leaderboard | PATCH /v1/me | `leaderboard.update` |
| `/profile/feedback` | — | POST /v1/feedback *(Phase 3)* | — |
| `/admin` | GET /v1/admin/dashboard *(Phase 4)* | — | — |
| `/admin/users` | GET /v1/admin/users | POST /v1/admin/users/:id/approve, POST /v1/admin/users/:id/points | — |
| `/admin/golden-points` | GET /v1/admin/golden-points *(Phase 4)* | POST /v1/admin/golden-points/:id/decision *(Phase 4)* | — |
| `/admin/agenda` | GET /v1/agenda | POST/PUT/DELETE /v1/admin/agenda *(Phase 4)* | — |
| `/admin/activities` | GET /v1/activities | POST /v1/admin/activities/:id/toggle *(Phase 4)* | — |
| `/admin/announcements` | GET /v1/announcements | POST /v1/admin/announcements *(Phase 4)* | — |
| `/admin/audit-log` | GET /v1/admin/audit-log *(Phase 4)* | — | — |

---

## 4. API Reference — Phase 1 (Foundation) ✓

### Auth Routes — `/v1/auth`
See Section 2 above for full auth contracts.

---

### Profile — `/v1/me`

#### `GET /v1/me`
**Auth:** User JWT

**Response `200`:**
```json
{
  "user": {
    "id": "uuid",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "attendeeType": "invited" | "walk_in",
    "avatarUrl": "https://..." | null,
    "onboardingInterests": ["string"],
    "pendingAdminApproval": false,
    "createdAt": "ISO8601"
  },
  "score": {
    "totalPoints": 150,
    "activitiesCompleted": 2,
    "rank": 7
  }
}
```

#### `PATCH /v1/me`
**Auth:** User JWT  
Updates only the fields provided.

**Request body** (all optional):
```json
{ "avatarUrl": "https://...", "onboardingInterests": ["leadership", "tech"] }
```

**Response `200`:** `{ "user": { ...full user object... } }`

#### `GET /v1/me/history`
**Auth:** User JWT

**Query params:** `limit` (1–100, default 20), `offset` (default 0)

**Response `200`:**
```json
{
  "submissions": [
    {
      "id": "uuid",
      "userId": "uuid",
      "activityId": "uuid",
      "kind": "trivia_complete" | "prompt_answer" | "touchpoint_scan" | ...,
      "payloadJson": {},
      "createdAt": "ISO8601",
      "activity": { "name": "Trivia", "type": "trivia" }
    }
  ],
  "limit": 20,
  "offset": 0
}
```

---

### Content Routes

#### `GET /v1/agenda`
**Auth:** None (`skipAuth: true`)

**Query params:** `since` (optional — Unix timestamp in ms)

**Response `200`:**
```json
{
  "version": 3,
  "events": [
    {
      "id": "uuid",
      "title": "Keynote",
      "description": "...",
      "day": 1,
      "startsAt": "ISO8601",
      "endsAt": "ISO8601",
      "location": "Main Hall",
      "speakers": ["Jane Smith"],
      "tags": ["keynote"],
      "updatedAt": "ISO8601"
    }
  ]
}
```

If `?since=<timestamp>` is provided, returns only events updated after that time. Always returns current `version`.

#### `GET /v1/initiatives`
**Auth:** None

**Response `200`:**
```json
{
  "initiatives": [
    {
      "id": "uuid",
      "title": "ATS Growth Initiative",
      "description": "...",
      "imageUrl": "https://..." | null,
      "displayOrder": 1
    }
  ]
}
```

#### `GET /v1/announcements`
**Auth:** None

**Response `200`:**
```json
{
  "announcements": [
    {
      "id": "uuid",
      "title": "Lunch is served",
      "body": "...",
      "publishedAt": "ISO8601",
      "expiresAt": "ISO8601" | null,
      "publishedBy": { "email": "admin@wfg.com" }
    }
  ]
}
```

Filters out expired announcements (where `expiresAt < now`).

#### `GET /v1/sponsors`
**Auth:** None

**Response `200`:**
```json
{
  "sponsors": [
    {
      "id": "uuid",
      "name": "Acme Corp",
      "tier": "title" | "gold" | "silver" | "partner",
      "logoUrl": "https://...",
      "websiteUrl": "https://...",
      "description": "...",
      "displayOrder": 1
    }
  ]
}
```

Sorted by tier (title → gold → silver → partner), then `displayOrder`.

#### `POST /v1/sponsors/:id/impression`
**Auth:** User JWT

**Request body:**
```json
{ "surface": "home" | "profile" | "agenda" }
```

**Response `201`:** `{ "ok": true }`

No dedupe — impressions are not idempotent by design.

---

### Sync — `GET /v1/sync`
**Auth:** None (`skipAuth: true`)  
Use on app boot and on WebSocket reconnect to reconcile local Dexie state.

**Query params:** `since` (optional — Unix timestamp in ms)

**Response `200`:**
```json
{
  "agenda": [ ...AgendaEvent[] ],
  "announcements": [ ...Announcement[] ],
  "initiatives": [ ...Initiative[] ],
  "sponsors": [ ...Sponsor[] ],
  "serverTime": "ISO8601"
}
```

If `?since=<timestamp>`: only `agenda` (updated after `since`) and `announcements` (published after `since`, non-expired) are populated. `initiatives` and `sponsors` are always empty on delta requests — only returned on full sync (no `since`).

---

### Admin — Users — `/v1/admin/users`
All admin routes require `useAdminToken: true` in `apiFetch`.

#### `GET /v1/admin/users`
**Query params:** `search?` (email substring or name), `limit` (1–200, default 50), `offset`, `pendingOnly?` (boolean)

**Response `200`:**
```json
{
  "users": [
    {
      "id": "uuid",
      "name": "Jane Smith",
      "email": "...",
      "attendeeType": "invited" | "walk_in",
      "pendingAdminApproval": false,
      "createdAt": "ISO8601",
      "userScore": { "totalPoints": 100, "activitiesCompleted": 2 }
    }
  ],
  "total": 47,
  "limit": 50,
  "offset": 0
}
```

#### `GET /v1/admin/users/:id`
**Response `200`:** Full user record including `sessions` (latest 5) and `invitee` relation.

#### `POST /v1/admin/users/:id/points`
**Request body:** `{ "delta": 50, "reason": "Walk-in bonus" }` (`delta` can be negative)  
**Response `200`:** `{ "ok": true }`  
Creates `PointAdjustment` and `AuditLog` entries atomically.

#### `POST /v1/admin/users/:id/approve`
**Response `200`:** `{ "ok": true, "message": "User approved" }`  
Sets `pendingAdminApproval = false`, creates audit log. Points from prior submissions are applied retroactively.

---

### Admin — Invitees — `/v1/admin/invitees`

#### `POST /v1/admin/invitees/upload`
**Content-Type:** `multipart/form-data`  
CSV file with columns: `name`, `email`, `attendee_type` (`invited` or `walk_in`).

**Response `200`:**
```json
{ "imported": 42, "skipped": 3, "errors": ["Row 5: invalid email"] }
```

Upserts on email — does not overwrite existing records.

#### `GET /v1/admin/invitees`
**Query params:** `search?`, `limit`, `offset`  
**Response `200`:** `{ "invitees": [...], "total": N, "limit": 50, "offset": 0 }`  
Each invitee includes `user` relation if the invitation has been claimed.

#### `POST /v1/admin/invitees`
**Request body:** `{ "name": "...", "email": "...", "attendeeType": "invited" | "walk_in" }`  
**Response `201`:** `{ "invitee": { ...invitee object... } }`  
Returns `409` if email already exists.

---

## 5. API Reference — Phase 2 (Activities) ✓

### Activities List — `GET /v1/activities`
**Auth:** User JWT

**Response `200`:**
```json
{
  "activities": [
    {
      "id": "uuid",
      "type": "trivia" | "prompt_challenge" | "golden_points" | "touchpoint" | "book_session",
      "name": "Trivia Challenge",
      "maxPoints": 200,
      "isOneShot": true,
      "isOpen": true,
      "pointsEarned": 80,
      "isCompleted": false
    }
  ]
}
```

`isCompleted` logic per type:
- `trivia`: `activityAttempt.completedAt` is not null
- `prompt_challenge`: all questions have been answered
- Others: any submission exists for this user + activity

---

### Trivia

#### `POST /v1/activities/trivia/start`
**Auth:** User JWT

**Response `200`:**
```json
{
  "attemptId": "uuid",
  "questions": [
    {
      "id": "seed-trivia-01",
      "questionText": "What is ...",
      "optionsJson": ["A", "B", "C", "D"],
      "category": "general",
      "difficulty": "medium"
    }
  ]
}
```

Returns up to 50 questions shuffled from the active bank (actual count = min(50, bank size)).  
`correctIndex` is **never** returned here — only on `complete`.  
If an in-progress attempt exists, resumes it (same question set in original order).  
Returns `400` if activity is closed. Returns `409` if already completed.

#### `POST /v1/activities/trivia/complete`
**Auth:** User JWT

**Request body:**
```json
{
  "attemptId": "uuid",
  "answers": [
    { "questionId": "seed-trivia-01", "selectedIndex": 2 }
  ],
  "dedupeKey": "client-generated-uuid"
}
```

**Response `200`:**
```json
{
  "pointsAwarded": 60,
  "correctCount": 6,
  "totalQuestions": 10,
  "answers": [
    { "questionId": "seed-trivia-01", "isCorrect": true }
  ]
}
```

**Scoring:** `correctCount × pointsPerQuestion`. `pointsPerQuestion` comes from `activity.configJson.pointsPerQuestion` (default `10`).  
**One-shot:** Returns `409` if already completed.  
**Dedupe:** Second call with same `dedupeKey` returns cached response without re-scoring.  
**Validation:** `questionId` values must match the IDs from `start`; answers for unlisted questions are rejected.

---

### Prompt Challenge

#### `GET /v1/activities/prompt-challenge/questions`
**Auth:** User JWT

**Response `200`:**
```json
{
  "questions": [
    {
      "id": "seed-pc-01",
      "category": "leadership",
      "scenarioText": "A client says...",
      "optionsJson": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 1 | null,
      "explanation": "Because..." | null,
      "userAnswer": {
        "selectedIndex": 1,
        "isCorrect": true,
        "pointsAwarded": 20
      } | null
    }
  ],
  "totalPoints": 100
}
```

`correctIndex` and `explanation` are `null` for unanswered questions. They are revealed on the `answer` response and also appear here on subsequent `GET` calls after answering.

#### `POST /v1/activities/prompt-challenge/answer`
**Auth:** User JWT

**Request body:**
```json
{
  "questionId": "seed-pc-01",
  "selectedIndex": 2,
  "dedupeKey": "client-generated-uuid"
}
```

**Response `200`:**
```json
{
  "isCorrect": true,
  "pointsAwarded": 20,
  "explanation": "Because...",
  "correctIndex": 1
}
```

**Scoring:** Configurable via `activity.configJson`:
- `pointsCorrect` (default: `activity.maxPoints / totalQuestions`)
- `pointsWrong` (default: `0` — but can be set to award partial credit)

**One-shot per question:** `409` if the same user has already answered this question.  
**Dedupe:** Same `dedupeKey` returns cached response.  
**`activitiesCompleted` increment:** Applied when the last unanswered question is answered.

---

### Touchpoints — `POST /v1/touchpoints/scan`
**Auth:** User JWT

**Request body:**
```json
{
  "qrToken": "<hmac-signed-token-from-qr-code>",
  "dedupeKey": "client-generated-uuid"
}
```

**Response `201`:**
```json
{
  "pointsAwarded": 50,
  "touchpoint": {
    "name": "Booth A — ATS Innovation",
    "locationDescription": "Expo hall, north wing"
  }
}
```

**QR token format:** HMAC-signed string generated by `backend/src/lib/qr.ts`. The `/scan?tp=<id>&sig=<hmac>` deep link is the scan entry point; the frontend constructs `qrToken` from those query params.  
**One-shot per touchpoint:** `409` if this user already scanned this touchpoint.  
**Dedupe:** Same `dedupeKey` returns cached response.  
**Inactive touchpoint:** `404`.  
**Note:** Touchpoint scans do **not** increment `activitiesCompleted`.

---

### Leaderboard — `GET /v1/leaderboard`
**Auth:** Optional (pass token if available; `skipAuth` is **not** needed — endpoint handles missing/invalid tokens gracefully)

**Query params:** `limit` (1–50, default 5)

**Response `200`:**
```json
{
  "leaderboard": [
    { "rank": 1, "name": "Jane Smith", "totalPoints": 850, "avatarUrl": "https://..." | null }
  ],
  "currentUser": { "rank": 12, "totalPoints": 150 } | null
}
```

`currentUser` is `null` when unauthenticated or when an admin token is used.  
`userId` and `email` are **never** included in leaderboard entries.

---

## 6. API Reference — Phase 3 (AI Features) — Skeleton

> These routes exist as stubs returning `{ ok: true, message: 'not implemented' }`. Contracts are not yet finalized.

| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/activities/avatar/upload-url` | Get a pre-signed S3/R2 URL for avatar image upload |
| POST | `/v1/activities/avatar/generate` | Enqueue avatar generation job; returns `{ jobId }` |
| GET | `/v1/jobs/:id` | Poll async job status (avatar generation, golden points scoring) |
| POST | `/v1/activities/golden-points/submit` | Submit free-text response for AI scoring |
| GET | `/v1/activities/golden-points/:id` | Poll AI scoring result for a submission |
| POST | `/v1/feedback/agenda-events/:id/feedback` | Per-session feedback (user_id stripped when `isAnonymous: true`) |
| POST | `/v1/feedback` | App-wide feedback (always anonymous — user_id stripped at API layer) |
| GET | `/v1/admin/golden-points` | Admin moderation queue of pending AI-scored submissions |
| POST | `/v1/admin/golden-points/:id/decision` | Approve / reject / override the AI score for a submission |

---

## 7. API Reference — Phase 4 (Admin/Ops) — Skeleton

> Not yet implemented. Path + purpose reference only.

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/admin/dashboard` | Totals: active users, queue depth, error rates |
| POST | `/v1/admin/agenda` | Create a new agenda event |
| PUT | `/v1/admin/agenda/:id` | Edit an agenda event (bumps version for delta sync) |
| DELETE | `/v1/admin/agenda/:id` | Remove an agenda event |
| POST | `/v1/admin/initiatives` | Create an initiative |
| PUT | `/v1/admin/initiatives/:id` | Edit an initiative |
| DELETE | `/v1/admin/initiatives/:id` | Remove an initiative |
| POST | `/v1/admin/sponsors` | Create a sponsor |
| PUT | `/v1/admin/sponsors/:id` | Edit a sponsor |
| DELETE | `/v1/admin/sponsors/:id` | Remove a sponsor |
| POST | `/v1/admin/announcements` | Publish a new announcement |
| POST | `/v1/admin/activities/:id/toggle` | Open or close an activity live |
| GET | `/v1/admin/audit-log` | Paginated log of all admin actions |

### WebSocket — `GET /v1/ws` (Phase 4)
Connect: `ws://<host>/v1/ws?token=<jwt>`  
Server-push events and their frontend reactions:

| Event | Payload | Frontend Action |
|---|---|---|
| `leaderboard.update` | `{ leaderboard, currentUser }` | Invalidate TanStack Query `['leaderboard']` |
| `announcements.new` | `{ announcement }` | Prepend to Dexie `announcements`, show milestone toast |
| `agenda.changed` | `{ version }` | Invalidate `['agenda']`, update Dexie |
| `jobs.{id}.complete` | `{ jobId, result }` | Resolve avatar/golden-points polling, show toast |

WebSocket is **optional** — every feature must degrade gracefully. Poll `GET /v1/sync?since=<lastServerTime>` on reconnect. Use TanStack Query polling as leaderboard fallback.

---

## 8. Key Integration Patterns

### One-Shot Enforcement
The backend enforces one-shot rules via DB UNIQUE constraints, not application logic. The frontend should:
1. Disable the submit button after a successful response
2. On `409` — treat as success, show the cached result
3. Never assume `isCompleted: false` from `GET /v1/activities` means the action is safe to retry without a dedupe key

### Walk-In Users (`pendingAdminApproval: true`)
- Show a persistent "Pending approval" banner on all app screens
- Disable points-earning UI (trivia submit button, touchpoint scan, prompt challenge submit)
- Allow browsing agenda, sponsors, initiatives
- All submissions are stored and points applied retroactively when admin approves via `POST /v1/admin/users/:id/approve`

### WebSocket Degradation
The WS connection is a performance enhancement, not a requirement. Build every feature to work on polling first:
- Leaderboard: `useLeaderboard` re-fetches on a poll interval; WS invalidation speeds it up
- Announcements: fetch on mount + on `window.focus`; WS provides real-time push
- Agenda: fetch with `since` on reconnect; WS signals when a re-fetch is needed

### Rate Limiting
Global: 300 requests/minute per IP or JWT subject. On `429`: back off 60 seconds. The `x-stress-bypass` header skips this in test environments only.

---

## 9. Environment Variables

```bash
# Frontend (frontend/.env.local) — in place
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_APP_ENV=development

# Frontend (production)
NEXT_PUBLIC_API_URL=https://api.agentx.wfg.app
NEXT_PUBLIC_WS_URL=wss://api.agentx.wfg.app
NEXT_PUBLIC_APP_ENV=production

# Backend (backend/.env) — dev values in place
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

No secrets belong in the frontend. JWT signing, AI inference, and QR HMAC generation all happen in the Fastify backend.

> **Local dev ports:** Backend runs on `3001`, Next.js dev server on `3000`. Both must be running simultaneously.
