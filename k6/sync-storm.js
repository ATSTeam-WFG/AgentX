import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const TOKENS = (__ENV.USER_TOKENS || __ENV.USER_TOKEN || '').split(',').filter(Boolean)
const BYPASS_SECRET = __ENV.STRESS_BYPASS_SECRET || ''
const VUS = parseInt(__ENV.VU_COUNT || '300', 10)
// One hour ago in epoch ms
const SINCE_1H = Date.now() - 60 * 60 * 1000

export const options = {
  vus: VUS,
  duration: '60s',
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
}

export default function () {
  const token = TOKENS[__VU % TOKENS.length] || ''
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(BYPASS_SECRET ? { 'x-stress-bypass': BYPASS_SECRET } : {}),
  }

  // 70% full load, 30% delta with since param
  const url = Math.random() < 0.7
    ? `${BASE_URL}/v1/sync`
    : `${BASE_URL}/v1/sync?since=${SINCE_1H}`

  const res = http.get(url, { headers })
  check(res, {
    'status 200': (r) => r.status === 200,
    'has serverTime': (r) => typeof r.json('serverTime') === 'string',
  })
  sleep(0.2)
}
