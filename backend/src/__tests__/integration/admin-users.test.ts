import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../helpers/app'
import { createTestUser, signAdminToken } from '../helpers/tokens'
import { prisma } from '../../db'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance
let adminToken: string
let adminId: string

beforeAll(async () => {
  app = await getTestApp()
  const res = await app.inject({
    method: 'POST',
    url: '/v1/admin/auth/login',
    payload: { email: 'admin@es26.com', password: 'executiveSum@26' },
  })
  const body = res.json()
  adminToken = body.token
  // Decode JWT to get admin ID
  const payload = JSON.parse(Buffer.from(adminToken.split('.')[1], 'base64url').toString())
  adminId = payload.sub
})
afterAll(async () => { await closeTestApp() })

describe('GET /v1/admin/users', () => {
  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/admin/users' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 403 with a user token', async () => {
    const { token } = await createTestUser()
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/users',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns paginated list with total, limit, offset', async () => {
    await createTestUser()
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/users',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.users)).toBe(true)
    expect(typeof body.total).toBe('number')
    expect(body.limit).toBe(50)
    expect(body.offset).toBe(0)
    expect(body.total).toBeGreaterThanOrEqual(1)
  })

  it('filters by search query on email/name', async () => {
    const { user } = await createTestUser({ name: 'SearchableAlice' })
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/users?search=SearchableAlice',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    const { users } = res.json()
    expect(users.some((u: { id: string }) => u.id === user.id)).toBe(true)
  })

  it('filters pendingOnly=true to return only pending approval users', async () => {
    await createTestUser() // walk_in → pendingAdminApproval = true
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/users?pendingOnly=true',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    const { users } = res.json()
    for (const u of users) {
      expect(u.pendingAdminApproval).toBe(true)
    }
    expect(users.length).toBeGreaterThanOrEqual(1)
  })
})

describe('GET /v1/admin/users/export', () => {
  it('returns CSV content with correct headers', async () => {
    await createTestUser()
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/users/export',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/csv')
    const csv = res.payload
    const firstLine = csv.split('\n')[0]
    expect(firstLine).toContain('id')
    expect(firstLine).toContain('name')
    expect(firstLine).toContain('email')
    expect(firstLine).toContain('totalPoints')
  })
})

describe('POST /v1/admin/users/bulk-approve', () => {
  it('returns 400 for empty ids array', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/users/bulk-approve',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { ids: [] },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 for non-UUID ids', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/users/bulk-approve',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { ids: ['not-a-uuid'] },
    })
    expect(res.statusCode).toBe(400)
  })

  it('approves pending users and returns count', async () => {
    const { user: u1 } = await createTestUser()
    const { user: u2 } = await createTestUser()
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/users/bulk-approve',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { ids: [u1.id, u2.id] },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.ok).toBe(true)
    expect(body.approved).toBe(2)

    const u1Updated = await prisma.user.findUnique({ where: { id: u1.id } })
    expect(u1Updated?.pendingAdminApproval).toBe(false)
  })
})

describe('GET /v1/admin/users/:id', () => {
  it('returns 404 for unknown user', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/users/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns user with score and sessions', async () => {
    const { user } = await createTestUser()
    const res = await app.inject({
      method: 'GET',
      url: `/v1/admin/users/${user.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    const { user: returned } = res.json()
    expect(returned.id).toBe(user.id)
    expect(returned.userScore).toBeDefined()
    expect(Array.isArray(returned.sessions)).toBe(true)
  })
})

describe('PATCH /v1/admin/users/:id', () => {
  it('returns 400 when no fields are provided', async () => {
    const { user } = await createTestUser()
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/admin/users/${user.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {},
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 for unknown user', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/admin/users/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'New Name' },
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns 409 when updating to an email already in use', async () => {
    const { user: u1 } = await createTestUser({ email: `dup-target-${Date.now()}@example.com` })
    const { user: u2 } = await createTestUser()
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/admin/users/${u2.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { email: u1.email },
    })
    expect(res.statusCode).toBe(409)
  })

  it('updates user name and returns updated user', async () => {
    const { user } = await createTestUser()
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/admin/users/${user.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'Updated Name' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().user.name).toBe('Updated Name')
  })
})

describe('DELETE /v1/admin/users/:id', () => {
  it('returns 404 for unknown user', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/admin/users/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('deletes user and all related data, returns { ok: true }', async () => {
    const { user } = await createTestUser()
    const res = await app.inject({
      method: 'DELETE',
      url: `/v1/admin/users/${user.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })

    const deleted = await prisma.user.findUnique({ where: { id: user.id } })
    expect(deleted).toBeNull()
  })
})

describe('POST /v1/admin/users/:id/points', () => {
  it('returns 404 for unknown user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/users/00000000-0000-0000-0000-000000000000/points',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { delta: 50, reason: 'Test' },
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns 400 when reason is missing', async () => {
    const { user } = await createTestUser()
    const res = await app.inject({
      method: 'POST',
      url: `/v1/admin/users/${user.id}/points`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { delta: 50 },
    })
    expect(res.statusCode).toBe(400)
  })

  it('increments user score by delta', async () => {
    const { user } = await createTestUser()
    const res = await app.inject({
      method: 'POST',
      url: `/v1/admin/users/${user.id}/points`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { delta: 100, reason: 'Bonus points' },
    })
    expect(res.statusCode).toBe(200)
    const score = await prisma.userScore.findUnique({ where: { userId: user.id } })
    expect(score?.totalPoints).toBe(100)
  })

  it('accepts negative delta to reduce score', async () => {
    const { user } = await createTestUser()
    // Give 100 pts first
    await prisma.userScore.update({ where: { userId: user.id }, data: { totalPoints: 100 } })
    await app.inject({
      method: 'POST',
      url: `/v1/admin/users/${user.id}/points`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { delta: -25, reason: 'Penalty' },
    })
    const score = await prisma.userScore.findUnique({ where: { userId: user.id } })
    expect(score?.totalPoints).toBe(75)
  })
})

describe('POST /v1/admin/users/:id/approve', () => {
  it('returns 404 for unknown user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/users/00000000-0000-0000-0000-000000000000/approve',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('approves pending user and sets pendingAdminApproval to false', async () => {
    const { user } = await createTestUser() // walk_in → pending
    expect(user.pendingAdminApproval).toBe(true)

    const res = await app.inject({
      method: 'POST',
      url: `/v1/admin/users/${user.id}/approve`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().ok).toBe(true)

    const updated = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updated?.pendingAdminApproval).toBe(false)
  })

  it('returns 409 when user is already approved', async () => {
    const { user } = await createTestUser({ invited: true }) // invited → not pending
    const res = await app.inject({
      method: 'POST',
      url: `/v1/admin/users/${user.id}/approve`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(409)
  })
})
