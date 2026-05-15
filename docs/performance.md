# AgentX Performance & Stress Testing

**Last updated:** 2026-05-14
**Audience:** Engineering

---

## 1. CI Workflow — `.github/workflows/stress.yml`

Stress tests run via k6 on a nightly schedule (2am UTC) and on manual `workflow_dispatch`.

### Issues Found and Fixed (2026-05-14)

| Issue | Fix |
|---|---|
| `|| true` silently suppressed all k6 failures — workflow always exited green | Replaced with a failure counter; step exits non-zero if any script fails, printing the failing script name |
| No concurrency control — scheduled and manual runs could overlap | Added `concurrency: group: stress-tests, cancel-in-progress: false` to queue rather than cancel |
| No job timeout — a hung k6 run would consume GitHub's 6-hour default | Added `timeout-minutes: 30` |

### Known Remaining Issues (not yet fixed)

- Actions not pinned to SHAs (`actions/checkout@v4`, `grafana/setup-k6-action@v1`) — supply-chain risk
- No artifact upload — k6 summaries are lost when the runner is torn down
- `VU_COUNT` env var is passed via `-e` but individual scripts may not read `__ENV.VU_COUNT` — verify per script

---

## 2. CI Test Workflow — `.github/workflows/test.yml`

### Issue Fixed (2026-05-14)

Prisma schema declares `directUrl = env("DIRECT_URL")` (used to bypass connection poolers for migrations). The test workflow only set `DATABASE_URL`, causing Prisma to fail at schema validation with error `P1012: Environment variable not found: DIRECT_URL`.

**Fix:** Added `DIRECT_URL` set to the same value as `DATABASE_URL` in the workflow env block. In CI there is no pooler, so both variables point to the same direct Postgres connection.

```yaml
DATABASE_URL: postgresql://test:test@localhost:5432/agentx_test
DIRECT_URL: postgresql://test:test@localhost:5432/agentx_test
```

In production, `DATABASE_URL` routes through the connection pooler (e.g. Supabase/PgBouncer) while `DIRECT_URL` connects directly — this distinction matters for migrations.

---

## 3. Stress Test Results — 2026-05-14

### Environment

- **Tool:** k6
- **VUs:** 100 per scenario
- **Log file:** `logs.txt` (~30MB, 101,760 lines)
- **Scripts run:** 5

### Summary

**0 of 5 scripts passed. All 5 failed.**

| Script | Status | Requests | Error Rate | Threshold Violations |
|---|---|---|---|---|
| dedupe-concurrency.js | FAILED | 101 | 100% | http_req_failed |
| leaderboard-reads.js | FAILED | 37,799 | 99.73% | http_req_failed |
| sync-storm.js | FAILED | 506 | 48.22% | http_req_failed, http_req_duration |
| touchpoint-spike.js | FAILED | 292 | 100% | http_req_failed, http_req_duration |
| trivia-peak.js | FAILED | 28,996 | 100% | http_req_failed |

### Warnings

| Type | Count | % of Total |
|---|---|---|
| EOF errors | 62,369 | 99.65% |
| I/O timeout errors | 218 | 0.35% |
| **Total** | **62,587** | |

All warnings were classified as "Request Failed".

### Latency Threshold Violations

| Script | Threshold | Actual p(95) | Over by |
|---|---|---|---|
| sync-storm.js | 300ms | 2,330ms | 7.8x |
| touchpoint-spike.js | 800ms | 19,000ms | 23.75x |

### Per-Script Metrics

#### dedupe-concurrency.js
- VUs: 100 max, ~31 avg
- Duration: ~2s
- Latency: avg=207ms, p(95)=241ms
- Checks passed: 50% (100/200)

#### leaderboard-reads.js
- VUs: 100 max, ~14 avg
- Duration: 60s+
- Latency: avg=43.79ms overall; avg=16.55s for successful responses, p(95)=18.82s
- Checks passed: 0.26% (200/75,598)
- Data sent: 59MB

#### sync-storm.js
- VUs: 100 max, ~1 avg
- Duration: 60s+
- Latency: avg=989ms, p(95)=2.33s
- Checks passed: 51.77% (524/1,012)

#### touchpoint-spike.js
- VUs: 100 max, ~11 avg
- Duration: 60s+
- Latency: avg=8.81s, p(95)=19s
- Checks passed: 93.32% (545/584) — note: high check rate despite 100% HTTP failure suggests checks are not validating response status

#### trivia-peak.js
- VUs: 100 max, ~1 avg
- Duration: 60s+
- Latency: avg=22ms, p(95)=139ms
- Checks passed: 0% (0/28,996)
- Data sent: 39MB

### Errors by Endpoint

| Endpoint | Errors | Type |
|---|---|---|
| `/v1/leaderboard` | 37,699 | EOF |
| `/v1/activities/trivia/start` | 24,605 | EOF |
| `/v1/sync` | 244 | Mixed (EOF + timeout) |
| `/v1/touchpoints/scan` | 39 | Timeout |

---

## 4. Root Cause Analysis

### Primary: Server Dropping Connections (EOF errors)

62,369 EOF errors indicate the server is terminating connections mid-request rather than responding slowly. This is distinct from a latency problem — the server is not just slow, it is failing to serve responses at all under concurrent load.

Likely causes (in order of probability):

1. **Prisma connection pool exhaustion** — default Prisma pool size is low (`connection_limit` defaults to `num_cpus * 2 + 1`). At 100 VUs, the pool saturates quickly and new requests are dropped. Check `DATABASE_URL` for `connection_limit` and `pool_timeout` parameters.
2. **Backend process crash under load** — if the Node.js process OOMs or hits an unhandled exception, all in-flight requests get EOF. Check server logs from the test window.
3. **Tunnel bottleneck** — if the test ran against an ngrok URL rather than a direct host, ngrok imposes its own connection limits which would cause mass EOF at high VU counts.

### Secondary: Latency on `/v1/sync` and `/v1/touchpoints/scan`

These endpoints show timeout errors rather than EOF, suggesting they do respond but too slowly. Likely candidates: missing indexes on sync-related queries, or the sync operation holding a long transaction.

---

## 5. Recommended Next Steps

1. **Fix connection pool settings** — add `?connection_limit=10&pool_timeout=10` to `DATABASE_URL` and tune based on available DB connections. Consider using PgBouncer in transaction mode.
2. **Run against a direct host** — eliminate the tunnel variable by pointing `BASE_URL` at the actual server IP/hostname during stress tests.
3. **Add server-side logging** — correlate backend logs with the test window to confirm whether the process crashed or the pool exhausted.
4. **Investigate `/v1/leaderboard` and `/v1/activities/trivia/start`** — these two endpoints account for 99% of errors. Audit their query plans under load.
5. **Fix `touchpoint-spike.js` checks** — the script passes 93% of checks despite 100% HTTP failures, which means checks are not asserting on HTTP status. Fix checks to fail on non-2xx responses so results are meaningful.
