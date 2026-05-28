import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../helpers/app'
import { createTestUser } from '../helpers/tokens'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

beforeAll(async () => { app = await getTestApp() })
afterAll(async () => { await closeTestApp() })

async function adminLogin() {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/admin/auth/login',
    payload: { email: 'admin@es26.com', password: 'executiveSum@26' },
  })
  return res.json().token as string
}

describe('GET /v1/admin/dashboard', () => {
  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/admin/dashboard' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 403 with a user token', async () => {
    const { token } = await createTestUser()
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/dashboard',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns 200 with expected numeric fields for admin', async () => {
    const adminToken = await adminLogin()
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/dashboard',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(typeof body.totalUsers).toBe('number')
    expect(typeof body.goldenPointsPending).toBe('number')
    expect(typeof body.touchpointsEngaged).toBe('number')
    expect(typeof body.avgScore).toBe('number')
  })

  it('reflects newly created users in totalUsers', async () => {
    const adminToken = await adminLogin()
    await createTestUser()

    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/dashboard',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.json().totalUsers).toBeGreaterThanOrEqual(1)
  })
})
