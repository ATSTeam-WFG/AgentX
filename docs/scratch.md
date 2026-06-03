CRITICAL — Must fix before launch

  1. Touchpoints have no location validation
    Lets have no location validation for touchpoints. 

  2. Push notifications never fire for announcements
    Lets fix this

  3. Avatar worker: unknown Gemini errors retry forever
    Lets look into this

  5. Golden Points double-submit possible
    Lets fix this

  6. No admin logout / token revocation
    Lets add logout and token revocation

  7. Worker crash = duplicate side effects
    Lets fix this

  ---
  HIGH PRIORITY — Real risk during the event

  Auth & Access

  - WebSocket auth is one-time only (ws.ts:6–35): Tokens are verified on connect but never revalidated. A revoked token stays connected for the session lifetime.
  - Tokens in localStorage (frontend/lib/auth.ts:48–62): Auth tokens stored in localStorage are vulnerable to XSS. Admin token too.
  - No session cleanup cron: Sessions expire after 7 days but are never automatically purged from the DB.

  Real-time / Notifications
  - Synchronous broadcast blocks event loop (ws-connections.ts:26–30): broadcastAll() is a tight synchronous loop. With 500 connected users, the request thread is blocked until all sends complete.
  - No WebSocket heartbeat: No keepalive mechanism. Load balancers and proxies will silently kill idle connections.

  Activity Integrity
  - Trivia: no server-side time limit (trivia.ts:74–171): startedAt is stored but never checked on completion. Users can take unlimited time.
  - Scoring not atomic with leaderboard cache (leaderboard.ts:26–50): Points write to DB in a transaction but the Redis leaderboard update happens outside. A failed
  Redis write leaves the leaderboard stale until next poll.
  - Avatar claim-print double-claim via fresh dedupeKey (avatar.ts:114): The print claim endpoint checks clientDedupeKey but a new unique key bypasses the check. No
  DB-level uniqueness constraint on (userId, kind: 'avatar_print').

  Workers

  - Dead jobs accumulate silently: Failed jobs sit in the DB with no alerting, no TTL, no dead-letter queue. Ops must manually poll /v1/admin/jobs?status=failed.
  - Golden Points: race condition on retry (golden-points.ts:18–26): The retry check reads submission status, then opens a transaction — there's a window where two
  concurrent workers both see pending and both score.

  Frontend

  - No root error boundary: Any unhandled component throw crashes the entire app with a blank screen. No error.tsx exists.
  - Avatar polling orphaned after timeout: After the 40s foreground cap, the user has no indication the job is still running. If they navigate away, they lose the job
  context on return.
  - Golden Points timeout triggers retry: After 5-minute timeout the UI shows "taking longer than expected" with no notification, leading users to resubmit and create
  duplicate submissions.
  - Push subscription failure is silent (golden-points/page.tsx:93–97): State updates to 'granted' even if the backend save failed. User thinks they're subscribed but
  isn't.

  Database

  - No indexes on activity tables: ActivityAttempt, TriviaAnswer, PromptChallengeAnswer, GoldenPointsSubmission — all missing userId indexes. Full-table scans on every
  user profile load.
  - No connection pool config (db.ts): Prisma uses Postgres driver defaults. Under event-day load (concurrent activities + admin SSE analytics stream), pool exhaustion
  is possible.
  - Pending migration unclear: 20260601000000_remove_touchpoint_tables exists in the migrations directory but deployment status is unknown. Run prisma migrate status
  before launch.
  - Dashboard count query is O(n) (admin/dashboard.ts:9): findMany() + .length to count distinct users loads every submission row into memory. Use count(distinct: 
  ['userId']).

  ---
  MEDIUM PRIORITY — Degrade UX but won't break the event
  
  - No rate limiting on activity submissions (queue flood risk with bad actors)
  - Trivia answers: unauthorized question IDs silently dropped, not rejected
  - Golden Points admin panel has no approve/reject endpoints despite the schema having those statuses
  - Outbox entries not retried if user closes app before coming back online
  - Photo size check happens after upload, not before (wasted bandwidth)
  - Service worker push URLs hardcoded to specific routes (sw.ts:87,96)
  - Token refresh never implemented (tokens expire silently mid-session)
  - Notes save race condition in explore page (explore/page.tsx:112–124)
  - 5-entry backoff array for 5-attempt max but index 3 is reused on attempt 5

  ---
  Deployment Checklist

  CRITICAL
  [ ] Add requireSuperAdmin() to /system/seed
  [ ] Add push notification fanout to announcement creation
  [ ] Fix isTransientError() default to return false
  [ ] Store clientDedupeKey in golden points submission creation
  [ ] Add admin session record + logout endpoint
  [ ] Add idempotency guards to avatar and golden-points workers
  [ ] Set CORS_ORIGIN explicitly, reject '*' in production

  HIGH
  [ ] Add unique constraint on (userId, kind) for avatar print claims
  [ ] Enforce time limit in trivia complete handler
  [ ] Make WS broadcast async (non-blocking)
  [ ] Add indexes: userId on ActivityAttempt, TriviaAnswer, PromptChallengeAnswer, GoldenPointsSubmission
  [ ] Configure Postgres connection pool
  [ ] Run `prisma migrate status` and confirm 20260601 is applied
  [ ] Add root error boundary (error.tsx) in Next.js app
  [ ] Remove hardcoded admin password from seeder.ts; use env var
  [ ] Add push notification call in announcement create handler (or wire up existing push.lib)
  [ ] Add WS keepalive/heartbeat