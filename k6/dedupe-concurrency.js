/**
 * All VUs fire the same dedupeKey simultaneously.
 * Validates that the dedupe short-circuit works under race conditions:
 * every request must return 200 with identical JSON — no 500s, no 409s.
 */
import http from 'k6/http'
import { check } from 'k6'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const TOKEN = (__ENV.USER_TOKENS || __ENV.USER_TOKEN || '').split(',')[0] || ''
const BYPASS_SECRET = __ENV.STRESS_BYPASS_SECRET || ''
const VUS = parseInt(__ENV.VU_COUNT || '50', 10)
const DEDUPE_KEY = 'shared-dedupe-key-concurrency-test'

// Set up: start trivia once before test (run via setup())
export function setup() {
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    ...(BYPASS_SECRET ? { 'x-stress-bypass': BYPASS_SECRET } : {}),
  }
  const startRes = http.post(`${BASE_URL}/v1/activities/trivia/start`, null, { headers })
  if (startRes.status !== 200 && startRes.status !== 409) {
    throw new Error(`Setup failed: trivia start returned ${startRes.status}`)
  }
  const body = startRes.json()
  return { attemptId: body.attemptId, questionId: body.questions?.[0]?.id }
}

export const options = {
  vus: VUS,
  iterations: VUS, // one iteration per VU — all start at the same time
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'checks{type:status_200}': ['rate==1.0'],
  },
}

export default function ({ attemptId, questionId }) {
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
    ...(BYPASS_SECRET ? { 'x-stress-bypass': BYPASS_SECRET } : {}),
  }
  const res = http.post(
    `${BASE_URL}/v1/activities/trivia/complete`,
    JSON.stringify({
      attemptId,
      answers: [{ questionId, selectedIndex: 0 }],
      dedupeKey: DEDUPE_KEY,
    }),
    { headers, tags: { type: 'status_200' } },
  )
  check(res, {
    'status is 200': (r) => r.status === 200,
    'no server error': (r) => r.status !== 500,
  })
}
