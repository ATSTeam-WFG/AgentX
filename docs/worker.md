# AgentX — Worker & Job Queue

## Overview

AgentX uses a **Postgres-backed polling job queue** rather than a dedicated message broker. The `Job` table in the database is the queue. A worker loop embedded in the API server process polls for pending jobs on a fixed interval and processes them in batches.

This design was chosen because:

- **Transactional atomicity**: jobs are enqueued inside the same Prisma transaction as the triggering write, so a submission can never exist without a corresponding job (and vice versa).
- **Single failure domain**: if Postgres is down, both the data layer and the queue are down together — no split-brain state.
- **Scale ceiling fits the workload**: ~400 attendees, all activities one-shot. Peak queue depth will never exceed a few dozen rows.
- **Operational simplicity**: no additional persistent infrastructure beyond the Supabase Postgres instance that already exists. Redis is present but used only for rate limiting.

---

## Job Table Schema

Defined in `backend/prisma/schema.prisma`.

```prisma
enum JobType {
  avatar_generation
  golden_points_scoring
  push_notification
}

enum JobStatus {
  pending
  running
  done
  failed
}

model Job {
  id          String    @id @default(uuid())
  type        JobType
  payloadJson Json
  status      JobStatus @default(pending)
  attempts    Int       @default(0)
  lastError   String?
  lockedBy    String?
  lockedUntil DateTime?
  createdAt   DateTime  @default(now())
  completedAt DateTime?

  @@index([status, lockedUntil])
}
```

| Column | Purpose |
|---|---|
| `type` | Determines which handler runs |
| `payloadJson` | Arbitrary data passed to the handler |
| `status` | Lifecycle state: `pending → running → done / failed` |
| `attempts` | Incremented on each pickup; used for retry cutoff |
| `lastError` | Last error message; preserved across retries for debugging |
| `lockedBy` | `worker-<pid>` of the process that claimed the job |
| `lockedUntil` | Timestamp after which a stale lock can be stolen |
| `completedAt` | Set when status moves to `done` |

The composite index on `(status, lockedUntil)` is what makes the poll query fast — it filters `pending` rows whose lock has expired in a single index scan.

---

## Worker Lifecycle

### Startup

`backend/src/index.ts` calls `startWorker()` on server boot. The worker runs **in-process** alongside the API server — no separate process or container needed.

```
npm run dev  →  buildApp() + startWorker()
```

`startWorker()` sets up a `setInterval` that fires `processNextBatch()` every **5 seconds**.

### Poll Loop

`backend/src/workers/index.ts`

```
constants:
  POLL_INTERVAL_MS = 5000    (poll every 5 seconds)
  LOCK_DURATION_MS = 60000   (hold the lock for 60 seconds)
  BATCH_SIZE       = 5       (claim up to 5 jobs per tick)
  WORKER_ID        = worker-<process.pid>
```

On each tick:

1. **Claim batch** — raw SQL with `FOR UPDATE SKIP LOCKED`:
   ```sql
   SELECT id, type, "payloadJson"
   FROM "Job"
   WHERE status = 'pending'
     AND ("lockedUntil" IS NULL OR "lockedUntil" < NOW())
   ORDER BY "createdAt" ASC
   LIMIT 5
   FOR UPDATE SKIP LOCKED
   ```
   `FOR UPDATE SKIP LOCKED` means concurrent worker processes skip rows another process already locked — no double-processing, no blocking.

2. **Mark running** — bulk `updateMany` sets `status = running`, `lockedBy`, `lockedUntil`, and increments `attempts`.

3. **Dispatch** — `Promise.allSettled` fans the batch out to individual handler calls. Jobs in the same batch run concurrently; failures in one do not cancel others.

4. **Each handler** is responsible for marking its own job `done` (inside its own transaction where possible).

### Priority

Jobs have no explicit priority field. The queue is **FIFO by `createdAt`**. The `ORDER BY "createdAt" ASC` in the poll query ensures older jobs are picked up first.

If priority becomes necessary (e.g., admin-triggered push notifications should jump the queue ahead of background AI scoring), add a `priority INT DEFAULT 5` column and change the `ORDER BY` to `priority ASC, createdAt ASC`. Lower numbers = higher priority. No other code changes required.

---

## Retry & Failure Logic

`backend/src/workers/index.ts:22-34`

On any unhandled exception thrown by a handler:

1. The caught error message is written to `lastError`.
2. `attempts` (already incremented on pickup) is checked against the cutoff of **3**.
3. If `attempts < 3`: status resets to `pending`, `lockedBy`/`lockedUntil` cleared → job re-enters the queue on the next poll.
4. If `attempts >= 3`: status is set to `failed` → job is dead, manual inspection required.

```
attempt 1 → error → back to pending
attempt 2 → error → back to pending
attempt 3 → error → failed (terminal)
```

**Stale lock recovery**: if a worker process crashes mid-job without updating the row, `lockedUntil` prevents any other worker from claiming it until 60 seconds after the lock was set. After that, the next poll treats it as a fresh `pending` job. The `attempts` counter was already incremented before the crash, so the retry budget is consumed correctly.

There is currently **no exponential backoff** — retried jobs re-enter the queue immediately. At this event's scale and workload (AI scoring jobs that take ~1–3 seconds) that is acceptable.

---

## Job Types

### `golden_points_scoring`

**Handler**: `backend/src/workers/golden-points.ts`

**Enqueued by**: `POST /v1/activities/golden-points/submit` inside a transaction alongside the `GoldenPointsSubmission` insert.

**Payload**:
```json
{
  "submissionId": "<uuid>",
  "questionText": "<question string from activity config or default>"
}
```

**What it does**:
1. Loads the `GoldenPointsSubmission` by `submissionId`. Skips and marks done if not found or already scored (idempotent).
2. Calls `scoreGoldenPoints(text, questionText)` — hits the Anthropic API (Claude Haiku with a cached system prompt).
3. In a single transaction: updates the submission with `aiScore`, `aiFeedback`, `status`, `pointsAwarded`; upserts `UserScore` to add points; marks the job `done`.
4. Fire-and-forgets a push notification to the user (never throws, never blocks job completion).

**Scoring model**: `claude-haiku-4-5-20251001` with a ~1,100-token system prompt using `cache_control: { type: "ephemeral" }` for prompt caching. The cache window is 5 minutes; under normal event load every subsequent scoring call is a cache hit.

**Score → points mapping**:
| AI score | Points awarded | Submission status |
|---|---|---|
| 0–29 | 0 | `rejected` |
| 30–49 | 25 | `ai_scored` |
| 50–74 | 50 | `ai_scored` |
| 75–89 | 75 | `ai_scored` |
| 90–100 | 100 | `ai_scored` |

**Failure mode**: if `ANTHROPIC_API_KEY` is not set, the handler throws on every attempt. After 3 attempts the job reaches `failed` status and the submission stays `pending` indefinitely. There is no auto-base-points fallback — the admin would need to apply a manual point adjustment.

---

### `avatar_generation`

**Handler**: `backend/src/workers/avatar.ts`

**Status**: stub — immediately marks job `done`. Implementation is Phase 3 (AI provider TBD).

**Enqueued by**: `POST /v1/activities/avatar/generate` (not yet implemented).

**Planned payload**:
```json
{
  "userId": "<uuid>",
  "uploadKey": "<object-storage key of the uploaded photo>"
}
```

**Planned behavior**: call AI image generation provider, store result in S3-compatible object storage (R2/S3 via env vars), update `User.avatarUrl`.

---

### `push_notification`

**Handler**: not yet implemented.

**Status**: job type exists in the schema enum; no handler registered in `workers/index.ts`.

**Planned use**: admin-triggered broadcast announcements, or other fan-out notification scenarios where the push send itself should be queued rather than fire-and-forget. (Currently individual post-scoring push calls are fire-and-forget directly in the `golden_points_scoring` handler — not queued jobs.)

---

## Enqueuing a New Job

The canonical pattern — always wrap the triggering write and the job insert in one transaction:

```typescript
await prisma.$transaction(async (tx) => {
  const record = await tx.someModel.create({ data: { ... } })
  await tx.job.create({
    data: {
      type: 'your_job_type',        // must be a value in the JobType enum
      payloadJson: { id: record.id, ...otherData },
    },
  })
  return record
})
```

Never enqueue outside a transaction unless the triggering write has already committed and idempotency in the handler covers the gap.

---

## Adding a New Job Type

1. **Schema**: add the new value to the `JobType` enum in `schema.prisma` and run `prisma migrate dev`.
2. **Handler**: create `backend/src/workers/your-job.ts` exporting `async function handleYourJob(jobId: string, payload: Record<string, unknown>)`. The handler must either call `prisma.job.update({ where: { id: jobId }, data: { status: 'done', completedAt: new Date() } })` on success, or throw on failure (the worker loop handles the retry/failed transition).
3. **Register**: add a branch in `workers/index.ts → processSingleJob`:
   ```typescript
   } else if (type === 'your_job_type') {
     await handleYourJob(id, payload)
   }
   ```
4. **Enqueue**: use the transaction pattern above from whatever route triggers the job.

---

## Scaling the Worker

**Horizontal scale (works today)**: run multiple server replicas (e.g., Railway/Fly scale-out). Each replica gets a unique `WORKER_ID` via `worker-<process.pid>`. `FOR UPDATE SKIP LOCKED` prevents double-processing at the Postgres level — no coordination needed between replicas.

**Tune throughput**: adjust `BATCH_SIZE` (currently 5) and `POLL_INTERVAL_MS` (currently 5000ms) in `workers/index.ts`. Larger batch + shorter interval = higher throughput, more DB load per second.

**Separate worker process**: if AI scoring latency degrades API response times or you want to scale workers independently:
```typescript
// backend/src/worker-process.ts
import { startWorker } from './workers/index'
startWorker()
```
Add `"worker": "tsx src/worker-process.ts"` to `package.json` scripts. Remove `startWorker()` from `src/index.ts`. Deploy as a separate service pointing at the same DB.

**Future: BullMQ on Redis**: `ioredis` is already a dependency. If job volume grows to thousands per minute, or if priority queues, rate-limited dispatch, or delayed scheduling become necessary, BullMQ is the natural upgrade path. Migration involves replacing `prisma.job.create()` calls with `queue.add()` and swapping handler registration. The `Job` table could become an audit log rather than the live queue.

---

## Observability

Job state is directly queryable in the same database as all other app data. The admin dashboard (`GET /v1/admin/dashboard`) already queries queue depth via `prisma.job.count({ where: { status: 'pending' } })`.

Useful queries for debugging:

```sql
-- Jobs stuck in running (possible crashed worker)
SELECT * FROM "Job"
WHERE status = 'running' AND "lockedUntil" < NOW();

-- Failed jobs with error detail
SELECT id, type, attempts, "lastError", "createdAt"
FROM "Job"
WHERE status = 'failed'
ORDER BY "createdAt" DESC;

-- Current queue depth by type
SELECT type, status, COUNT(*)
FROM "Job"
GROUP BY type, status
ORDER BY type, status;
```

Worker activity is logged to stdout with the prefix `[worker]`, `[worker:golden-points]`, or `[worker:avatar]`.

---

## Testing

Three layers exist or should exist:

### 1. Pure unit tests — scoring logic

`backend/src/__tests__/unit/golden-points-scoring.test.ts`

No DB, no worker, no network. Tests score tier mapping, status derivation, clamping, and JSON fence stripping. Run fast, always deterministic.

### 2. Integration tests — enqueue behavior

`backend/src/__tests__/integration/golden-points.test.ts`

Verifies that a `Job` row is created in the DB when a user submits. Does **not** run the worker or call the AI — just checks the DB side effect from the route.

### 3. Worker handler unit tests (missing — worth adding)

Mock Prisma and the scoring lib; call `handleGoldenPointsScoring` directly. Cover:
- Happy path: submission scored, `UserScore` upserted, job marked done
- Submission not found: job skipped and marked done (idempotent)
- Submission already scored: job skipped and marked done (idempotent)
- Scoring throws: job reset to pending, `lastError` set

### 4. Worker poll loop integration tests (missing — worth adding)

Requires exporting `processNextBatch` from `workers/index.ts`. Cover:
- `pending` job gets picked up and completed
- Job with `lockedUntil` in the future is not touched
- After 3 failed attempts, job reaches `failed` status

---

## File Reference

| File | Purpose |
|---|---|
| `backend/prisma/schema.prisma` | `Job` model, `JobType` and `JobStatus` enums |
| `backend/src/workers/index.ts` | Poll loop, claim/dispatch/retry logic |
| `backend/src/workers/golden-points.ts` | Handler for `golden_points_scoring` |
| `backend/src/workers/avatar.ts` | Handler stub for `avatar_generation` |
| `backend/src/lib/scoring.ts` | Anthropic API call, scoring rubric, score→points mapping |
| `backend/src/lib/push.ts` | Fire-and-forget push notification helper (used post-scoring) |
| `backend/src/routes/activities/golden-points.ts` | Route that enqueues `golden_points_scoring` jobs |
| `backend/src/routes/jobs.ts` | `GET /v1/jobs/:id` stub (not yet implemented) |
| `backend/src/index.ts` | Calls `startWorker()` on server boot |
