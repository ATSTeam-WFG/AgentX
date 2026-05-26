import Redis from 'ioredis'
import { config } from './config'

export const redis = new Redis(config.REDIS_URL ?? 'redis://localhost:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => (times > 3 ? null : Math.min(times * 100, 500)),
})

redis.on('error', (err) => {
  console.error('[redis] connection error:', err.message)
})
