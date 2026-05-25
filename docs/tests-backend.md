# Backend Test Suite — Unit & Integration

**Framework:** Vitest 2.1.9  
**Run command:** `cd backend && npx vitest run`  
**Last run:** 2026-05-25  
**Overall:** 56 unit tests PASS · 84 integration tests PASS · **140/140**

---

## Unit Tests

All unit tests run against pure logic with no DB or network dependencies.

| # | Test Name | File | What It Tests | Status |
|---|-----------|------|---------------|--------|
| 1 | `notFound produces 404 NOT_FOUND` | `unit/errors.test.ts` | `AppError.notFound()` factory returns correct status + code | ✅ PASS |
| 2 | `notFound accepts a custom message` | `unit/errors.test.ts` | Custom message propagates through factory | ✅ PASS |
| 3 | `conflict produces 409 CONFLICT` | `unit/errors.test.ts` | `AppError.conflict()` factory | ✅ PASS |
| 4 | `badRequest produces 400 BAD_REQUEST` | `unit/errors.test.ts` | `AppError.badRequest()` factory | ✅ PASS |
| 5 | `forbidden produces 403 FORBIDDEN` | `unit/errors.test.ts` | `AppError.forbidden()` factory | ✅ PASS |
| 6 | `unauthorized produces 401 UNAUTHORIZED` | `unit/errors.test.ts` | `AppError.unauthorized()` factory | ✅ PASS |
| 7 | `AppError is an instance of Error` | `unit/errors.test.ts` | `AppError` correctly extends `Error` | ✅ PASS |
| 8 | `returns a non-empty string` | `unit/qr.test.ts` | `signToken()` produces non-empty output | ✅ PASS |
| 9 | `round-trips a touchpoint ID` | `unit/qr.test.ts` | `signToken` → `verifyToken` recovers original ID | ✅ PASS |
| 10 | `returns null for empty string` | `unit/qr.test.ts` | `verifyToken("")` returns null safely | ✅ PASS |
| 11 | `returns null for non-base64 garbage` | `unit/qr.test.ts` | Malformed input rejected | ✅ PASS |
| 12 | `returns null when payload is tampered` | `unit/qr.test.ts` | HMAC detects data tampering | ✅ PASS |
| 13 | `returns null for valid base64 lacking HMAC structure` | `unit/qr.test.ts` | Structurally valid but unsigned token rejected | ✅ PASS |
| 14 | `different IDs produce different tokens` | `unit/qr.test.ts` | Token uniqueness per touchpoint ID | ✅ PASS |
| 15 | `all correct: full points` | `unit/trivia-scoring.test.ts` | 20/20 correct = 200 pts (10 pts/question) | ✅ PASS |
| 16 | `half correct: half points` | `unit/trivia-scoring.test.ts` | 10/20 correct = 100 pts | ✅ PASS |
| 17 | `none correct: zero points` | `unit/trivia-scoring.test.ts` | 0/20 correct = 0 pts | ✅ PASS |
| 18 | `one correct: exactly one question worth of points` | `unit/trivia-scoring.test.ts` | Single correct answer scores exactly 1× pointsPerQuestion | ✅ PASS |
| 19 | `custom pointsPerQuestion` | `unit/trivia-scoring.test.ts` | Scoring formula respects configurable point value | ✅ PASS |
| 20 | `preserves all elements` | `unit/trivia-scoring.test.ts` | Fisher-Yates shuffle doesn't drop elements | ✅ PASS |
| 21 | `slice to 20 produces exactly 20 elements when bank has 20` | `unit/trivia-scoring.test.ts` | Shuffle + slice truncation | ✅ PASS |
| 22 | `does not mutate the original array` | `unit/trivia-scoring.test.ts` | Shuffle is non-destructive | ✅ PASS |
| 23 | `produces different orderings (probabilistic)` | `unit/trivia-scoring.test.ts` | Shuffle randomness (expected fail rate ~1/120) | ✅ PASS |
| 24 | `score 0 → 0 points` | `unit/golden-points-scoring.test.ts` | `mapScoreToPoints`: bottom band (0–29) → 0 pts | ✅ PASS |
| 25 | `score 1 → 0 points` | `unit/golden-points-scoring.test.ts` | `mapScoreToPoints`: 0–29 band | ✅ PASS |
| 26 | `score 29 → 0 points` | `unit/golden-points-scoring.test.ts` | `mapScoreToPoints`: 0–29 boundary | ✅ PASS |
| 27 | `score 30 → 25 points` | `unit/golden-points-scoring.test.ts` | `mapScoreToPoints`: 30–49 band → 25 pts | ✅ PASS |
| 28 | `score 40 → 25 points` | `unit/golden-points-scoring.test.ts` | `mapScoreToPoints`: mid-band | ✅ PASS |
| 29 | `score 49 → 25 points` | `unit/golden-points-scoring.test.ts` | `mapScoreToPoints`: 30–49 upper boundary | ✅ PASS |
| 30 | `score 50 → 50 points` | `unit/golden-points-scoring.test.ts` | `mapScoreToPoints`: 50–74 band → 50 pts | ✅ PASS |
| 31 | `score 60 → 50 points` | `unit/golden-points-scoring.test.ts` | `mapScoreToPoints`: mid-band | ✅ PASS |
| 32 | `score 74 → 50 points` | `unit/golden-points-scoring.test.ts` | `mapScoreToPoints`: 50–74 upper boundary | ✅ PASS |
| 33 | `score 75 → 75 points` | `unit/golden-points-scoring.test.ts` | `mapScoreToPoints`: 75–89 band → 75 pts | ✅ PASS |
| 34 | `score 80 → 75 points` | `unit/golden-points-scoring.test.ts` | `mapScoreToPoints`: mid-band | ✅ PASS |
| 35 | `score 89 → 75 points` | `unit/golden-points-scoring.test.ts` | `mapScoreToPoints`: 75–89 upper boundary | ✅ PASS |
| 36 | `score 90 → 100 points` | `unit/golden-points-scoring.test.ts` | `mapScoreToPoints`: 90–100 band → 100 pts | ✅ PASS |
| 37 | `score 95 → 100 points` | `unit/golden-points-scoring.test.ts` | `mapScoreToPoints`: mid-band | ✅ PASS |
| 38 | `score 100 → 100 points` | `unit/golden-points-scoring.test.ts` | `mapScoreToPoints`: ceiling | ✅ PASS |
| 39 | `score 0 → rejected` | `unit/golden-points-scoring.test.ts` | `deriveStatus`: score < 30 → `rejected` | ✅ PASS |
| 40 | `score 29 → rejected` | `unit/golden-points-scoring.test.ts` | `deriveStatus`: boundary check | ✅ PASS |
| 41 | `score 30 → ai_scored` | `unit/golden-points-scoring.test.ts` | `deriveStatus`: score ≥ 30 → `ai_scored` | ✅ PASS |
| 42 | `score 75 → ai_scored` | `unit/golden-points-scoring.test.ts` | `deriveStatus`: mid-range | ✅ PASS |
| 43 | `score 100 → ai_scored` | `unit/golden-points-scoring.test.ts` | `deriveStatus`: maximum | ✅ PASS |
| 44 | `clamps above max to max` | `unit/golden-points-scoring.test.ts` | `clamp()`: upper bound enforcement | ✅ PASS |
| 45 | `clamps below min to min` | `unit/golden-points-scoring.test.ts` | `clamp()`: lower bound enforcement | ✅ PASS |
| 46 | `passes through in-range value unchanged` | `unit/golden-points-scoring.test.ts` | `clamp()`: no-op for valid input | ✅ PASS |
| 47 | `rounds floats to nearest integer` | `unit/golden-points-scoring.test.ts` | `clamp()`: float → integer rounding | ✅ PASS |
| 48 | `accepts boundary values as-is` | `unit/golden-points-scoring.test.ts` | `clamp()`: exact boundaries pass through | ✅ PASS |
| 49 | `sums four clamped dimensions correctly` | `unit/golden-points-scoring.test.ts` | Total = specificity + relevance + depth + authenticity (all clamped) | ✅ PASS |
| 50 | `clamps out-of-range dimensions before summing` | `unit/golden-points-scoring.test.ts` | Over-range inputs clamped before aggregation | ✅ PASS |
| 51 | `all zeros → 0 pts, rejected` | `unit/golden-points-scoring.test.ts` | Zero-score edge case produces `rejected` status | ✅ PASS |
| 52 | `all 25s → 100 pts, ai_scored` | `unit/golden-points-scoring.test.ts` | Max-score edge case produces `ai_scored` status | ✅ PASS |
| 53 | `strips \`\`\`json fence` | `unit/golden-points-scoring.test.ts` | Markdown code fence removal from AI response | ✅ PASS |
| 54 | `strips plain \`\`\` fence` | `unit/golden-points-scoring.test.ts` | Generic fence removal | ✅ PASS |
| 55 | `passes through plain JSON unchanged` | `unit/golden-points-scoring.test.ts` | No-fence JSON returned as-is | ✅ PASS |
| 56 | `trims surrounding whitespace` | `unit/golden-points-scoring.test.ts` | Leading/trailing whitespace stripped | ✅ PASS |

**Unit total: 56/56 PASS**

---

## Integration Tests

Integration tests spin up the full Fastify app against a real Postgres database. A global `beforeEach` truncates all user-data tables and flushes Redis between every test. Seed fixtures (activities, touchpoints, trivia questions, etc.) are left intact.

### auth.test.ts — `POST /v1/auth/*`

| # | Test Name | What It Tests | Status |
|---|-----------|---------------|--------|
| 1 | `creates a walk-in user when email not in invitees` | New user created + session returned for non-invited email | ✅ PASS |
| 2 | `creates an invited user when email is in invitees list` | Invited user links to `inviteeId`; `attendeeType` set to `invited` | ✅ PASS |
| 3 | `returns 409 when email already registered` | Duplicate email rejected with conflict | ✅ PASS |
| 4 | `returns 400 when name is missing` | Request validation for required `name` field | ✅ PASS |
| 5 | `returns 400 when email is invalid` | Request validation for email format | ✅ PASS |
| 6 | `returns token for existing user` | Login returns JWT for pre-existing user | ✅ PASS |
| 7 | `creates user when email not found` | Login auto-creates user on first access | ✅ PASS |
| 8 | `returns 400 when email is missing` | Request validation for required `email` field | ✅ PASS |
| 9 | `returns a new token for a valid session` | `/refresh` issues new JWT with valid session | ✅ PASS |
| 10 | `returns 401 for revoked session` | `/refresh` rejects revoked session token | ✅ PASS |
| 11 | `returns 401 with no auth header` | `/refresh` requires auth header | ✅ PASS |
| 12 | `revokes the session and returns ok` | `/logout` invalidates session | ✅ PASS |
| 13 | `returns 401 when not authenticated` | `/logout` requires auth | ✅ PASS |

**auth: 13/13 PASS**

---

### admin-auth.test.ts — `POST /v1/admin/auth/login`

| # | Test Name | What It Tests | Status |
|---|-----------|---------------|--------|
| 1 | `returns token with aud=admin for valid credentials` | Admin JWT includes `aud: admin` claim | ✅ PASS |
| 2 | `returns 401 for wrong password (same message — no enumeration)` | Failed auth returns same message regardless of reason | ✅ PASS |
| 3 | `returns 401 for unknown email (same message as wrong password)` | Anti-enumeration: unknown email = wrong password response | ✅ PASS |
| 4 | `admin token rejected on user route /v1/me with 403` | Admin JWT cannot access user-audience routes | ✅ PASS |
| 5 | `user token rejected on admin route with 403` | User JWT cannot access admin-audience routes | ✅ PASS |
| 6 | `returns 400 for missing password field` | Request validation for required `password` field | ✅ PASS |

**admin-auth: 6/6 PASS**

---

### profile.test.ts — `GET /PATCH /v1/me` and `GET /v1/me/history`

| # | Test Name | What It Tests | Status |
|---|-----------|---------------|--------|
| 1 | `returns user profile and score for authenticated user` | Profile returns user fields + score + rank | ✅ PASS |
| 2 | `returns 401 with no token` | Profile requires auth | ✅ PASS |
| 3 | `returns 403 when admin token used on user route` | Admin JWT rejected on user-audience route | ✅ PASS |
| 4 | `updates only the provided fields` | PATCH applies partial update without nulling other fields | ✅ PASS |
| 5 | `returns 400 for invalid avatarUrl` | `avatarUrl` validated as URL format | ✅ PASS |
| 6 | `returns 401 when not authenticated (PATCH)` | PATCH requires auth | ✅ PASS |
| 7 | `returns empty history for a new user` | History endpoint returns `[]` for user with no activity | ✅ PASS |
| 8 | `returns 401 when not authenticated (history)` | History requires auth | ✅ PASS |

**profile: 8/8 PASS**

---

### content.test.ts — Agenda, Sponsors, Initiatives, Announcements, Sync

| # | Test Name | What It Tests | Status |
|---|-----------|---------------|--------|
| 1 | `returns seeded agenda events` | Agenda endpoint returns events from seed | ✅ PASS |
| 2 | `returns all events with since=0` | `?since=0` returns full event list | ✅ PASS |
| 3 | `returns no events with since=large version number` | `?since=<large>` returns empty (incremental sync) | ✅ PASS |
| 4 | `returns sponsors in tier order: title, gold, silver, partner` | Sponsors ordered by tier hierarchy | ✅ PASS |
| 5 | `POST /v1/sponsors/:id/impression records impression` | Impression event tracked for authenticated user | ✅ PASS |
| 6 | `POST impression returns 404 for unknown sponsor` | Missing sponsor ID returns 404 | ✅ PASS |
| 7 | `returns seeded initiatives in displayOrder` | Initiatives sorted by `displayOrder` field | ✅ PASS |
| 8 | `returns active seeded announcement` | Announcements endpoint returns active record | ✅ PASS |
| 9 | `returns all collections on full load (no since)` | `/sync` with no param returns all content | ✅ PASS |
| 10 | `returns empty initiatives and sponsors when since is provided` | `/sync?since=<v>` returns only newer records | ✅ PASS |

**content: 10/10 PASS**

---

### leaderboard.test.ts — `GET /v1/leaderboard`

| # | Test Name | What It Tests | Status |
|---|-----------|---------------|--------|
| 1 | `returns leaderboard with currentUser=null when unauthenticated` | Unauthenticated request omits `currentUser` | ✅ PASS |
| 2 | `populates currentUser when authenticated` | Authenticated user appears in `currentUser` field | ✅ PASS |
| 3 | `currentUser is null when admin token is used` | Admin JWT excluded from user leaderboard | ✅ PASS |
| 4 | `respects ?limit param` | `?limit=N` constrains leaderboard length | ✅ PASS |
| 5 | `leaderboard entries do NOT include userId or email` | PII fields stripped from leaderboard response | ✅ PASS |
| 6 | `rank ordering: higher points ranked first` | Leaderboard sorted descending by points | ✅ PASS |

**leaderboard: 6/6 PASS**

---

### touchpoints.test.ts — `POST /v1/touchpoints/scan`

| # | Test Name | What It Tests | Status |
|---|-----------|---------------|--------|
| 1 | `awards points on valid scan and returns touchpoint info` | QR scan awards configured points + returns touchpoint metadata | ✅ PASS |
| 2 | `does NOT increment activitiesCompleted for touchpoint scans` | QR scans are separate from activity completion counter | ✅ PASS |
| 3 | `dedupe: same dedupeKey returns identical response without new TouchpointScan row` | Idempotent re-submit returns cached result | ✅ PASS |
| 4 | `one-shot: second scan of same touchpoint (different dedupeKey) returns 409` | Per-touchpoint one-shot enforcement | ✅ PASS |
| 5 | `different users can scan the same touchpoint` | Per-user scan tracking (multi-user QR sharing allowed) | ✅ PASS |
| 6 | `returns 400 for invalid QR token` | Malformed/tampered QR token rejected | ✅ PASS |
| 7 | `returns 401 without auth` | Scan endpoint requires authentication | ✅ PASS |

**touchpoints: 7/7 PASS**

---

### trivia.test.ts — `POST /v1/activities/trivia/*`

| # | Test Name | What It Tests | Status |
|---|-----------|---------------|--------|
| 1 | `returns attemptId and 50 questions without correctIndex` | Start returns attempt ID + shuffled questions with answers hidden | ✅ PASS |
| 2 | `resumes with same attemptId and same question order on second call` | Idempotent start: same attempt returned on re-call | ✅ PASS |
| 3 | `returns 401 without token` | Start requires authentication | ✅ PASS |
| 4 | `scores correctly and increments UserScore` | Complete awards correct points and updates score | ✅ PASS |
| 5 | `awards 0 points for all wrong answers` | All-incorrect answers result in 0 points | ✅ PASS |
| 6 | `dedupe: same dedupeKey returns identical response without new DB rows` | Idempotent complete with same dedupeKey | ✅ PASS |
| 7 | `one-shot: second complete (different dedupeKey) returns idempotent result` | One-shot per attempt: second complete blocked | ✅ PASS |
| 8 | `returns 403 for wrong user attemptId` | Attempt ownership validated | ✅ PASS |
| 9 | `filters out foreign questionIds not in the attempt` | Question IDs outside the attempt are ignored in scoring | ✅ PASS |

**trivia: 9/9 PASS**

---

### golden-points.test.ts — `POST/GET /v1/activities/golden-points/*`

| # | Test Name | What It Tests | Status |
|---|-----------|---------------|--------|
| 1 | `returns 401 without token` | Submit requires authentication | ✅ PASS |
| 2 | `returns 400 when text is fewer than 50 words` | Word count validation on submission | ✅ PASS |
| 3 | `returns 400 when activity is closed` | Closed activity rejects new submissions | ✅ PASS |
| 4 | `returns 201 with submission id for valid 50+ word text` | Valid text accepted, returns submission ID | ✅ PASS |
| 5 | `creates a Job record for the worker on submit` | Async AI scoring job enqueued on submission | ✅ PASS |
| 6 | `one-shot: second submit returns existing id without creating new rows` | One-shot deduplication for duplicate submissions | ✅ PASS |
| 7 | `returns 401 without token (GET)` | Result fetch requires authentication | ✅ PASS |
| 8 | `returns 404 for non-existent id` | Unknown submission ID returns 404 | ✅ PASS |
| 9 | `returns { status: pending } for newly submitted response` | Submission in queue returns pending status | ✅ PASS |
| 10 | `returns scored result when status is ai_scored` | Completed AI scoring exposed via GET | ✅ PASS |
| 11 | `returns pointsAwarded: 0 when status is rejected` | Rejected submission returns 0 points | ✅ PASS |
| 12 | `returns 403 when a different user tries to read the submission` | Submission ownership validated on GET | ✅ PASS |

**golden-points: 12/12 PASS**

---

### prompt-challenge.test.ts — `GET/POST /v1/activities/prompt-challenge/*`

| # | Test Name | What It Tests | Status |
|---|-----------|---------------|--------|
| 1 | `returns questions without correctIndex or explanation for unanswered` | Unanswered questions hide correct answer + explanation | ✅ PASS |
| 2 | `reveals correctIndex and explanation after answering` | Answered questions expose correct answer | ✅ PASS |
| 3 | `returns 401 without token` | Questions require authentication | ✅ PASS |
| 4 | `correct answer awards 20 points (configJson.pointsCorrect)` | Correct answer awards configured point value | ✅ PASS |
| 5 | `wrong answer awards 10 points (configJson.pointsWrong)` | Incorrect answer awards partial credit | ✅ PASS |
| 6 | `idempotent: second answer to same question returns same response without re-awarding` | Re-answering same question idempotent | ✅ PASS |
| 7 | `dedupe: same dedupeKey returns identical response without new Submission row` | Deduplication on duplicate request key | ✅ PASS |
| 8 | `increments activitiesCompleted only after all 5 questions answered` | Activity completion only triggers after all questions done | ✅ PASS |
| 9 | `returns 401 without token` | Answer requires authentication | ✅ PASS |

**prompt-challenge: 9/9 PASS**

---

### activities.test.ts — `GET /v1/activities`

| # | Test Name | What It Tests | Status |
|---|-----------|---------------|--------|
| 1 | `returns all 5 activities with isCompleted=false and pointsEarned=0 for new user` | Activity list reflects zero-state for fresh user | ✅ PASS |
| 2 | `trivia shows isCompleted=true after trivia is completed` | Activity status updates post-completion | ✅ PASS |
| 3 | `prompt_challenge shows isCompleted=true after all 5 questions answered` | Multi-step activity completion flag | ✅ PASS |
| 4 | `returns 401 without token` | Activity list requires authentication | ✅ PASS |

**activities: 4/4 PASS**

---

## Integration Test Summary

| File | Pass | Total |
|------|------|-------|
| `auth.test.ts` | 13 | 13 |
| `admin-auth.test.ts` | 6 | 6 |
| `profile.test.ts` | 8 | 8 |
| `content.test.ts` | 10 | 10 |
| `leaderboard.test.ts` | 6 | 6 |
| `touchpoints.test.ts` | 7 | 7 |
| `trivia.test.ts` | 9 | 9 |
| `golden-points.test.ts` | 12 | 12 |
| `prompt-challenge.test.ts` | 9 | 9 |
| `activities.test.ts` | 4 | 4 |
| **Total** | **84** | **84** |

---

## Test Infrastructure Notes

### Setup

| Setting | Value |
|---------|-------|
| Pool mode | `forks` with `singleFork: true` — all test files run sequentially in one process |
| Global `beforeEach` | `TRUNCATE TABLE ... CASCADE` on all user-data tables + `redis.flushdb()` |
| Global `afterAll` | `prisma.$disconnect()` + `redis.quit()` |
| Seed tables (never truncated) | `Activity`, `TriviaQuestion`, `Touchpoint`, `Sponsor`, `AgendaEvent`, `Initiative`, `Announcement`, `Invitee` |
| Test timeout | 30 000 ms per test |

### Key Design Decisions

- **`createTestUser()`** (`helpers/tokens.ts`) creates `User` + `UserScore` + `Session` in sequential awaited calls, then returns a signed JWT. Seed invitees (`alice@wfg.com`, `bob@wfg.com`, `carol@wfg.com`) are preserved between runs — they are not in the truncation list.
- **`getTestApp()` / `closeTestApp()`** (`helpers/app.ts`) provides a shared Fastify instance across all tests in a file, rebuilt between files via `afterAll`.
- **Fire-and-forget operations are not safe in tests.** `profile.ts` awaits `prisma.user.update` for `lastSeenAt` rather than using `.catch(() => {})`, preventing background `RowExclusiveLock` from deadlocking with the `beforeEach` TRUNCATE.
