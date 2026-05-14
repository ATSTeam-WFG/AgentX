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
    payload: { email: 'admin@wfg.com', password: 'AdminPass123!' },
  })
  return res
}

describe('POST /v1/admin/auth/login', () => {
  it('returns token with aud=admin for valid credentials', async () => {
    const res = await adminLogin()
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.token).toBeTruthy()
    expect(body.admin.email).toBe('admin@wfg.com')
    expect(body.admin.role).toBe('super_admin')

    // Decode payload to verify aud claim
    const [, payloadB64] = body.token.split('.')
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString())
    expect(payload.aud).toBe('admin')
  })

  it('returns 401 for wrong password (same message — no enumeration)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/auth/login',
      payload: { email: 'admin@wfg.com', password: 'wrong' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 for unknown email (same message as wrong password)', async () => {
    const resUnknown = await app.inject({
      method: 'POST',
      url: '/v1/admin/auth/login',
      payload: { email: 'nobody@wfg.com', password: 'AdminPass123!' },
    })
    const resWrong = await app.inject({
      method: 'POST',
      url: '/v1/admin/auth/login',
      payload: { email: 'admin@wfg.com', password: 'wrong' },
    })
    expect(resUnknown.statusCode).toBe(401)
    expect(resWrong.statusCode).toBe(401)
    expect(resUnknown.json().message).toBe(resWrong.json().message)
  })

  it('admin token rejected on user route /v1/me with 403', async () => {
    const loginRes = await adminLogin()
    const adminToken = loginRes.json().token
    const res = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('user token rejected on admin route with 403', async () => {
    const { token } = await createTestUser()
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/users',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns 400 for missing password field', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/auth/login',
      payload: { email: 'admin@wfg.com' },
    })
    expect(res.statusCode).toBe(400)
  })
})
