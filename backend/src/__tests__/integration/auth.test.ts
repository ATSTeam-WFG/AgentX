import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../helpers/app'
import { signTestToken, createTestUser } from '../helpers/tokens'
import { prisma } from '../../db'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

beforeAll(async () => { app = await getTestApp() })
afterAll(async () => { await closeTestApp() })

describe('POST /v1/auth/signup', () => {
  it('creates a walk-in user when email not in invitees', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: { name: 'New Walker', email: 'walker@example.com' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.token).toBeTruthy()
    expect(body.user.email).toBe('walker@example.com')
    expect(body.status).toBe('pending_approval')
  })

  it('creates an invited user when email is in invitees list', async () => {
    // alice@wfg.com is seeded as an invitee
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: { name: 'Alice Agent', email: 'alice@wfg.com' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.status).toBe('active')
    expect(body.user.attendeeType).toBe('invited')
  })

  it('returns 409 when email already registered', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: { name: 'Dup User', email: 'dup@example.com' },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: { name: 'Dup User', email: 'dup@example.com' },
    })
    expect(res.statusCode).toBe(409)
  })

  it('returns 400 when name is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: { email: 'noname@example.com' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when email is invalid', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: { name: 'Bad Email', email: 'not-an-email' },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /v1/auth/login', () => {
  it('returns token for existing user', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: { name: 'Login Test', email: 'logintest@example.com' },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { name: 'Login Test', email: 'logintest@example.com' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().token).toBeTruthy()
  })

  it('creates user when email not found', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { name: 'Brand New', email: 'brand-new@example.com' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().token).toBeTruthy()
  })

  it('returns 400 when email is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { name: 'No Email' },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /v1/auth/refresh', () => {
  it('returns a new token for a valid session', async () => {
    const { token } = await createTestUser()
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().token).toBeTruthy()
  })

  it('returns 401 for revoked session', async () => {
    const { user, session, token } = await createTestUser()
    await prisma.session.update({ where: { tokenId: session.tokenId }, data: { revokedAt: new Date() } })
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 with no auth header', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/auth/refresh' })
    expect(res.statusCode).toBe(401)
  })
})

describe('POST /v1/auth/logout', () => {
  it('revokes the session and returns ok', async () => {
    const { token, session } = await createTestUser()
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/logout',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().ok).toBe(true)

    const s = await prisma.session.findUnique({ where: { tokenId: session.tokenId } })
    expect(s?.revokedAt).not.toBeNull()
  })

  it('returns 401 when not authenticated', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/auth/logout' })
    expect(res.statusCode).toBe(401)
  })
})
