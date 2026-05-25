# Load & Stress Tests — K6

**Framework:** [k6](https://k6.io/)  
**Location:** `k6/`  
**Run command:** `k6 run k6/<script>.js` (requires a running API server and `K6_BASE_URL` env var)  
**Status:** Not executed in CI — manual execution against staging/load environment only.

---

## Overview

K6 tests simulate concurrent user load against the live API. Each script targets a specific endpoint or workflow, with configurable VU (virtual user) counts and defined pass/fail thresholds.

---

## Test Table

| # | Script | Type | VUs (default) | Duration | Endpoint(s) Targeted | What It Tests | Thresholds |
|---|--------|------|--------------|----------|---------------------|---------------|------------|
| 1 | `sync-storm.js` | Stress | 300 | 60s | `GET /v1/sync` | High-volume concurrent sync — 70% full sync, 30% incremental (`?since=<v>`). Validates that the sync endpoint doesn't degrade under the expected peak load of attendees opening the app simultaneously. | p95 < 300ms · failure rate < 1% |
| 2 | `trivia-peak.js` | Peak Load | 100 | 60s | `POST /v1/activities/trivia/start`, `POST /v1/activities/trivia/complete` | Full trivia workflow under concurrent load: start attempt → submit 50 answers → complete. Validates DB write throughput during the trivia activity window. | p95 < 500ms · failure rate < 1% |
| 3 | `leaderboard-reads.js` | Read Throughput | 200 | 60s | `GET /v1/leaderboard` | High-frequency read-only leaderboard requests. Validates caching effectiveness and read scalability. Zero tolerance for failures (leaderboard is always-on during event). | p99 < 200ms · failure rate = 0% |
| 4 | `dedupe-concurrency.js` | Race Condition | 50 | Single burst | `POST /v1/activities/trivia/complete` (shared dedupeKey) | All 50 VUs fire the exact same request simultaneously with an identical `dedupeKey`. Validates that the deduplication mechanism is race-condition safe — every response must be 200 with the same body (no 500s or conflicting writes). | failure rate < 1% · 100% status-200 checks |
| 5 | `touchpoint-spike.js` | Spike | 150 | ~40s | `POST /v1/touchpoints/scan` | QR code scan spike with a ramp profile (0 → 150 VUs in 5s, hold 30s, ramp down 5s). Simulates a presenter showing a QR code to a full room simultaneously. | p95 < 800ms · failure rate < 5% |

---

## Execution Notes

| Setting | Value |
|---------|-------|
| Base URL env var | `K6_BASE_URL` (e.g., `http://localhost:3000`) |
| VU override | Pass `--env VU_COUNT=<n>` to each script |
| Auth setup | Scripts generate JWTs internally using a seeded test-user secret |
| Thresholds | Defined inline in each script's `options.thresholds` block |

### Running a single script

```bash
K6_BASE_URL=https://staging.example.com k6 run k6/sync-storm.js
```

### Running all scripts sequentially

```bash
for f in k6/*.js; do K6_BASE_URL=http://localhost:3000 k6 run "$f"; done
```

---

## Scenario Details

### sync-storm.js — Sync Endpoint Storm

Simulates the mass app-open scenario at session start when 300 attendees launch the PWA at the same time.

- **Scenario:** 70% of VUs call `GET /v1/sync` (full sync), 30% call `GET /v1/sync?since=<version>` (delta sync).
- **Goal:** Verify the sync endpoint's DB query + JSON serialization stays under 300ms p95.
- **Risk being tested:** N+1 query regression on agenda/sponsors/initiatives join.

---

### trivia-peak.js — Trivia Activity Peak

Simulates the trivia activity hour when all attendees play simultaneously.

- **Scenario:** Each VU executes: `POST /start` → collect `attemptId` + `questionIds` → `POST /complete` with 50 answered questions.
- **Goal:** Verify `ActivityAttempt` + `TriviaAnswer` batch-write throughput under 100 concurrent players.
- **Risk being tested:** Write contention on `UserScore.totalPoints` update.

---

### leaderboard-reads.js — Leaderboard Read Throughput

Simulates the leaderboard screen being polled by all connected devices.

- **Scenario:** 200 VUs each loop on `GET /v1/leaderboard` for the full 60s duration.
- **Goal:** Verify leaderboard response caching (or query performance) holds at near-zero failure rate.
- **Risk being tested:** Hot read path on `UserScore` aggregate without a materialized view.

---

### dedupe-concurrency.js — Deduplication Race Condition

Adversarial test for the `dedupeKey` idempotency mechanism.

- **Scenario:** 50 VUs all fire the same `POST /v1/activities/trivia/complete` with the same `dedupeKey` in a single synchronized burst.
- **Goal:** All 50 responses must be HTTP 200 with identical JSON bodies. No 409 conflicts, no 500 errors.
- **Risk being tested:** `upsert`-based dedup logic under TOCTOU race conditions.

---

### touchpoint-spike.js — QR Scan Spike

Simulates a presenter projecting a QR code to a full audience who all scan simultaneously.

- **Scenario:** Ramp 0 → 150 VUs in 5s, hold at 150 for 30s, ramp down in 5s. Each VU scans via `POST /v1/touchpoints/scan`.
- **Goal:** Verify point-award writes and dedup checks survive the spike without latency blowout.
- **Risk being tested:** Concurrent `INSERT ... ON CONFLICT` on `TouchpointScan` under sudden load.
- **Note:** Failure rate threshold is relaxed to 5% (vs 1% elsewhere) because legitimate 409 one-shot conflicts are expected when the same user re-scans.
