import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../helpers/app'
import { createTestUser, signAdminToken } from '../helpers/tokens'
import { prisma } from '../../db'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance
let superAdminToken: string
let regularAdminToken: string

beforeAll(async () => {
  app = await getTestApp()
  // Get super_admin token via login (seeded admin has role = super_admin)
  const res = await app.inject({
    method: 'POST',
    url: '/v1/admin/auth/login',
    payload: { email: 'admin@es26.com', password: 'executiveSum@26' },
  })
  superAdminToken = res.json().token

  // Craft a regular admin token (role = 'admin') using any fake admin ID
  // requireSuperAdmin checks role from JWT claim before any DB operation
  regularAdminToken = signAdminToken('00000000-0000-0000-0000-000000000099', 'admin')
})
afterAll(async () => { await closeTestApp() })

describe('GET /v1/admin/system/status', () => {
  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/admin/system/status' })
    expect(res.statusCode).toBe(401)
  })

  it('returns table counts with expected keys', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/system/status',
      headers: { authorization: `Bearer ${superAdminToken}` },
    })
    expect(res.statusCode).toBe(200)
    const { tables } = res.json()
    const expectedKeys = [
      'users', 'invitees', 'agendaEvents', 'sponsors', 'initiatives',
      'announcements', 'activities', 'triviaQuestions', 'promptChallengeQuestions',
      'touchpoints', 'activityAttempts', 'submissions', 'goldenPointsSubmissions',
      'sessions', 'auditLogs', 'jobs',
    ]
    for (const key of expectedKeys) {
      expect(typeof tables[key]).toBe('number')
    }
  })
})

describe('POST /v1/admin/system/seed', () => {
  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/admin/system/seed' })
    expect(res.statusCode).toBe(401)
  })

  it('runs seed idempotently and returns { ok: true }', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/system/seed',
      headers: { authorization: `Bearer ${superAdminToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().ok).toBe(true)
    // Seed upserts 5 activities — count must be exactly the seeded set
    const after = await prisma.activity.count()
    expect(after).toBe(5)
  }, 90_000)
})

describe('POST /v1/admin/system/wipe-users', () => {
  it('returns 403 for regular admin (non super_admin)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/system/wipe-users',
      headers: { authorization: `Bearer ${regularAdminToken}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('wipes all users and returns { ok: true }', async () => {
    await createTestUser()
    await createTestUser()

    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/system/wipe-users',
      headers: { authorization: `Bearer ${superAdminToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().ok).toBe(true)

    const userCount = await prisma.user.count()
    expect(userCount).toBe(0)
  })
})

describe('POST /v1/admin/system/reset-scores', () => {
  it('returns 403 for regular admin', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/system/reset-scores',
      headers: { authorization: `Bearer ${regularAdminToken}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('resets all user scores to zero', async () => {
    const { user } = await createTestUser()
    await prisma.userScore.update({ where: { userId: user.id }, data: { totalPoints: 500, activitiesCompleted: 5 } })

    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/system/reset-scores',
      headers: { authorization: `Bearer ${superAdminToken}` },
    })
    expect(res.statusCode).toBe(200)

    const score = await prisma.userScore.findUnique({ where: { userId: user.id } })
    expect(score?.totalPoints).toBe(0)
    expect(score?.activitiesCompleted).toBe(0)
  })
})

describe('POST /v1/admin/system/reset-activity/:id', () => {
  it('returns 403 for regular admin', async () => {
    const activity = await prisma.activity.findFirstOrThrow({ where: { type: 'trivia' } })
    const res = await app.inject({
      method: 'POST',
      url: `/v1/admin/system/reset-activity/${activity.id}`,
      headers: { authorization: `Bearer ${regularAdminToken}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns 404 for unknown activity id', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/system/reset-activity/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${superAdminToken}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('resets activity data and returns affectedUsers count', async () => {
    const activity = await prisma.activity.findFirstOrThrow({ where: { type: 'trivia' } })
    const res = await app.inject({
      method: 'POST',
      url: `/v1/admin/system/reset-activity/${activity.id}`,
      headers: { authorization: `Bearer ${superAdminToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.ok).toBe(true)
    expect(typeof body.affectedUsers).toBe('number')
  })
})

describe('POST /v1/admin/system/reset-database', () => {
  it('returns 403 for regular admin', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/system/reset-database',
      headers: { authorization: `Bearer ${regularAdminToken}` },
      payload: { confirmation: 'RESET' },
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns 400 when confirmation body is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/system/reset-database',
      headers: { authorization: `Bearer ${superAdminToken}` },
      payload: {},
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when confirmation string is wrong', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/system/reset-database',
      headers: { authorization: `Bearer ${superAdminToken}` },
      payload: { confirmation: 'DELETE' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('wipes and reseeds database with correct confirmation', async () => {
    // Create a sentinel user — verify it's gone after the wipe
    const { user: sentinel } = await createTestUser()

    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/system/reset-database',
      headers: { authorization: `Bearer ${superAdminToken}` },
      payload: { confirmation: 'RESET' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().ok).toBe(true)

    // Sentinel user must be gone
    const deleted = await prisma.user.findUnique({ where: { id: sentinel.id } })
    expect(deleted).toBeNull()

    // Reference data must be reseeded
    const activitiesAfter = await prisma.activity.count()
    expect(activitiesAfter).toBe(5)

    const triviaAfter = await prisma.triviaQuestion.count()
    expect(triviaAfter).toBeGreaterThanOrEqual(50)
  }, 120_000)
})
