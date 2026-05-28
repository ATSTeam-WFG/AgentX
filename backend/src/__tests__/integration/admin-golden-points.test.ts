import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../helpers/app'
import { createTestUser } from '../helpers/tokens'
import { prisma } from '../../db'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance
let adminToken: string

beforeAll(async () => {
  app = await getTestApp()
  const res = await app.inject({
    method: 'POST',
    url: '/v1/admin/auth/login',
    payload: { email: 'admin@es26.com', password: 'executiveSum@26' },
  })
  adminToken = res.json().token
})
afterAll(async () => { await closeTestApp() })

async function createSubmission(status = 'pending') {
  const { user } = await createTestUser()
  return prisma.goldenPointsSubmission.create({
    data: {
      userId: user.id,
      text: 'A long enough response about the title industry and how AI can transform it for the better.',
      wordCount: 22,
      status: status as never,
    },
  })
}

describe('GET /v1/admin/golden-points', () => {
  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/admin/golden-points' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 403 with user token', async () => {
    const { token } = await createTestUser()
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/golden-points',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns an array of submissions with expected shape', async () => {
    const sub = await createSubmission()
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/golden-points',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Record<string, unknown>[]
    expect(Array.isArray(body)).toBe(true)

    const found = body.find((s) => s.id === sub.id)
    expect(found).toBeTruthy()
    expect(typeof found!.userName).toBe('string')
    expect(typeof found!.userEmail).toBe('string')
    expect(typeof found!.wordCount).toBe('number')
    expect(typeof found!.status).toBe('string')
  })

  it('filters by status when provided', async () => {
    await createSubmission('ai_scored')
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/golden-points?status=ai_scored',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as { status: string }[]
    for (const s of body) {
      expect(s.status).toBe('ai_scored')
    }
  })

  it('respects limit and offset pagination', async () => {
    // Create 3 submissions
    await createSubmission()
    await createSubmission()
    await createSubmission()

    const pageOne = await app.inject({
      method: 'GET',
      url: '/v1/admin/golden-points?limit=2&offset=0',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(pageOne.json().length).toBe(2)

    const pageTwo = await app.inject({
      method: 'GET',
      url: '/v1/admin/golden-points?limit=2&offset=2',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(pageTwo.json().length).toBeGreaterThanOrEqual(1)
  })
})

describe('GET /v1/admin/golden-points/:id', () => {
  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/golden-points/00000000-0000-0000-0000-000000000000',
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 404 for unknown submission id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/golden-points/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns full submission with userName and userEmail', async () => {
    const sub = await createSubmission()
    const res = await app.inject({
      method: 'GET',
      url: `/v1/admin/golden-points/${sub.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.id).toBe(sub.id)
    expect(typeof body.userName).toBe('string')
    expect(typeof body.userEmail).toBe('string')
    expect(body.text).toBe(sub.text)
    expect(typeof body.wordCount).toBe('number')
    expect(body.status).toBe('pending')
  })
})
