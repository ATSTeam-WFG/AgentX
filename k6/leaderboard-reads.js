import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const VUS = parseInt(__ENV.VU_COUNT || '200', 10)

export const options = {
  vus: VUS,
  duration: '60s',
  thresholds: {
    http_req_duration: ['p(99)<200'],
    http_req_failed: ['rate==0'],
  },
}

export default function () {
  const res = http.get(`${BASE_URL}/v1/leaderboard`)
  check(res, {
    'status 200': (r) => r.status === 200,
    'has leaderboard array': (r) => Array.isArray(r.json('leaderboard')),
  })
  sleep(0.1)
}
