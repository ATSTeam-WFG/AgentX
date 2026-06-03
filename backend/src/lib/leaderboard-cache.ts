import { redis } from '../redis'

const CACHE_KEYS: [string, ...string[]] = [
  'lb:top:1', 'lb:top:2', 'lb:top:3', 'lb:top:4', 'lb:top:5',
  'lb:top:10', 'lb:top:20', 'lb:top:50',
]

export function invalidateLeaderboardCache(): void {
  redis.del(...CACHE_KEYS).catch(() => {})
}
