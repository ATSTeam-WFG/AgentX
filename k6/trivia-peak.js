import http from 'k6/http'
import { check, sleep } from 'k6'
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const TOKENS = (__ENV.USER_TOKENS || __ENV.USER_TOKEN || '').split(',').filter(Boolean)
const BYPASS_SECRET = __ENV.STRESS_BYPASS_SECRET || ''
const VUS = parseInt(__ENV.VU_COUNT || '100', 10)

export const options = {
  vus: VUS,
  duration: '60s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
}

export default function () {
  const token = TOKENS[__VU % TOKENS.length] || ''
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(BYPASS_SECRET ? { 'x-stress-bypass': BYPASS_SECRET } : {}),
  }

  // Start trivia
  const startRes = http.post(`${BASE_URL}/v1/activities/trivia/start`, null, { headers })
  check(startRes, { 'start 200': (r) => r.status === 200 || r.status === 409 })

  if (startRes.status !== 200) return
  const { attemptId, questions } = startRes.json()
  if (!attemptId || !questions?.length) return

  // Submit answers for all questions
  const answers = questions.map((q) => ({ questionId: q.id, selectedIndex: 0 }))
  const completeRes = http.post(
    `${BASE_URL}/v1/activities/trivia/complete`,
    JSON.stringify({ attemptId, answers, dedupeKey: uuidv4() }),
    { headers },
  )
  check(completeRes, { 'complete 200': (r) => r.status === 200 })

  sleep(0.5)
}
