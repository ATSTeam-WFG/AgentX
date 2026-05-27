import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../helpers/app'
import { createTestUser } from '../helpers/tokens'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

beforeAll(async () => { app = await getTestApp() })
afterAll(async () => { await closeTestApp() })

describe('GET /v1/me', () => {
  it('returns user profile and score for authenticated user', async () => {
    const { token, user } = await createTestUser({ name: 'Profile Test' })
    const res = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.user.id).toBe(user.id)
    expect(body.user.name).toBe('Profile Test')
    expect(body.score.totalPoints).toBe(0)
    expect(body.score.rank).toBe(1)
    expect(body.score.activitiesCompleted).toBe(0)
  })

  it('returns 401 with no token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/me' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 403 when admin token used on user route', async () => {
    const { token } = await createTestUser()
    // get admin token by logging in
    const adminRes = await app.inject({
      method: 'POST',
      url: '/v1/admin/auth/login',
      payload: { email: 'admin@es26.com', password: 'executiveSum@26' },
    })
    const adminToken = adminRes.json().token
    const res = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(403)
  })
})

describe('PATCH /v1/me', () => {
  it('updates only the provided fields', async () => {
    const { token, user } = await createTestUser({ name: 'Original Name' })

    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/me',
      headers: { authorization: `Bearer ${token}` },
      payload: { avatarUrl: 'https://example.com/avatar.jpg' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().user.avatarUrl).toBe('https://example.com/avatar.jpg')
    expect(res.json().user.name).toBe('Original Name')
  })

  it('returns 400 for invalid avatarUrl', async () => {
    const { token } = await createTestUser()
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/me',
      headers: { authorization: `Bearer ${token}` },
      payload: { avatarUrl: 'not-a-url' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/v1/me', payload: {} })
    expect(res.statusCode).toBe(401)
  })
})

describe('GET /v1/me/history', () => {
  it('returns empty history for a new user', async () => {
    const { token } = await createTestUser()
    const res = await app.inject({
      method: 'GET',
      url: '/v1/me/history',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.submissions).toEqual([])
    expect(body.limit).toBe(20)
    expect(body.offset).toBe(0)
  })

  it('returns 401 when not authenticated', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/me/history' })
    expect(res.statusCode).toBe(401)
  })
})
