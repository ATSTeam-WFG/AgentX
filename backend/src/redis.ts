import Redis from 'ioredis'
import { config } from './config'

export const redis = new Redis(config.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

redis.on('error', (err) => {
  console.error('[redis] connection error:', err.message)
})
