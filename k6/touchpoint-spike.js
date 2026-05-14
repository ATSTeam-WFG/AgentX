import http from 'k6/http'
import { check } from 'k6'
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const TOKENS = (__ENV.USER_TOKENS || __ENV.USER_TOKEN || '').split(',').filter(Boolean)
const BYPASS_SECRET = __ENV.STRESS_BYPASS_SECRET || ''
const VUS = parseInt(__ENV.VU_COUNT || '150', 10)

// Seeded touchpoint IDs — each VU cycles through them
const TOUCHPOINT_IDS = ['seed-tp-01', 'seed-tp-02', 'seed-tp-03', 'seed-tp-04']

// QR tokens must be pre-generated outside k6 (k6 can't run HMAC natively).
// Set QR_TOKENS as a comma-separated env var, one per touchpoint.
const QR_TOKENS = (__ENV.QR_TOKENS || '').split(',').filter(Boolean)

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5s', target: VUS },
        { duration: '30s', target: VUS },
        { duration: '5s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.05'],
  },
}

export default function () {
  if (!QR_TOKENS.length) {
    // Skip gracefully if tokens not provided
    return
  }

  const token = TOKENS[__VU % TOKENS.length] || ''
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(BYPASS_SECRET ? { 'x-stress-bypass': BYPASS_SECRET } : {}),
  }
  const tokenIdx = __VU % QR_TOKENS.length
  const qrToken = QR_TOKENS[tokenIdx]

  const res = http.post(
    `${BASE_URL}/v1/touchpoints/scan`,
    JSON.stringify({ qrToken, dedupeKey: uuidv4() }),
    { headers },
  )
  // 200 = first scan, 409 = already scanned (both acceptable in spike)
  check(res, {
    'scan accepted or already scanned': (r) => r.status === 200 || r.status === 409,
    'no server error': (r) => r.status !== 500,
  })
}
