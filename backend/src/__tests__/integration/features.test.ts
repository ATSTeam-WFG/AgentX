import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../helpers/app'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

beforeAll(async () => { app = await getTestApp() })
afterAll(async () => { await closeTestApp() })

describe('GET /v1/features', () => {
  it('returns 200 with an object of key→boolean pairs', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/features' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(typeof body).toBe('object')
    expect(body).not.toBeNull()
    // All values should be booleans
    for (const val of Object.values(body)) {
      expect(typeof val).toBe('boolean')
    }
  })

  it('includes the expected seed flag keys', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/features' })
    const body = res.json()
    const expectedKeys = [
      'activities_open',
      'leaderboard_open',
      'checkin_open',
      'feedback_open',
      'explore_open',
      'golden_points_open',
    ]
    for (const key of expectedKeys) {
      expect(body).toHaveProperty(key)
      expect(typeof body[key]).toBe('boolean')
    }
  })

  it('requires no authentication', async () => {
    // Should succeed without Authorization header
    const res = await app.inject({ method: 'GET', url: '/v1/features' })
    expect(res.statusCode).toBe(200)
  })
})
