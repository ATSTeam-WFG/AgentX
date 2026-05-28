import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../helpers/app'
import { createTestUser } from '../helpers/tokens'
import { prisma } from '../../db'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

beforeAll(async () => { app = await getTestApp() })
afterAll(async () => { await closeTestApp() })

const FAKE_SUBSCRIPTION = {
  endpoint: 'https://push.example.com/unique-endpoint-1',
  keys: {
    p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlqHHQyguTLkv_X3TzKQ1S6TxXYa',
    auth:   'tBHItJI5svbpez7KI4CCXg',
  },
}

describe('POST /v1/push/subscribe', () => {
  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/push/subscribe', payload: FAKE_SUBSCRIPTION })
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 when endpoint is missing', async () => {
    const { token } = await createTestUser()
    const res = await app.inject({
      method: 'POST',
      url: '/v1/push/subscribe',
      headers: { authorization: `Bearer ${token}` },
      payload: { keys: FAKE_SUBSCRIPTION.keys },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when keys are missing', async () => {
    const { token } = await createTestUser()
    const res = await app.inject({
      method: 'POST',
      url: '/v1/push/subscribe',
      headers: { authorization: `Bearer ${token}` },
      payload: { endpoint: 'https://push.example.com/ep' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when endpoint is not a URL', async () => {
    const { token } = await createTestUser()
    const res = await app.inject({
      method: 'POST',
      url: '/v1/push/subscribe',
      headers: { authorization: `Bearer ${token}` },
      payload: { endpoint: 'not-a-url', keys: FAKE_SUBSCRIPTION.keys },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 201 and creates subscription', async () => {
    const { token, user } = await createTestUser()
    const sub = { ...FAKE_SUBSCRIPTION, endpoint: `https://push.example.com/sub-create-${user.id}` }
    const res = await app.inject({
      method: 'POST',
      url: '/v1/push/subscribe',
      headers: { authorization: `Bearer ${token}` },
      payload: sub,
    })
    expect(res.statusCode).toBe(201)
    expect(res.json()).toEqual({ ok: true })

    const record = await prisma.pushSubscription.findUnique({ where: { endpoint: sub.endpoint } })
    expect(record).not.toBeNull()
    expect(record?.userId).toBe(user.id)
  })

  it('upserts on duplicate endpoint without error', async () => {
    const { token, user } = await createTestUser()
    const sub = { ...FAKE_SUBSCRIPTION, endpoint: `https://push.example.com/upsert-${user.id}` }

    const first = await app.inject({
      method: 'POST',
      url: '/v1/push/subscribe',
      headers: { authorization: `Bearer ${token}` },
      payload: sub,
    })
    expect(first.statusCode).toBe(201)

    // Second call with same endpoint — upsert, should not 409
    const second = await app.inject({
      method: 'POST',
      url: '/v1/push/subscribe',
      headers: { authorization: `Bearer ${token}` },
      payload: sub,
    })
    expect(second.statusCode).toBe(201)

    const count = await prisma.pushSubscription.count({ where: { endpoint: sub.endpoint } })
    expect(count).toBe(1)
  })
})

describe('DELETE /v1/push/subscribe', () => {
  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/push/subscribe',
      payload: { endpoint: 'https://push.example.com/ep' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 when endpoint is missing', async () => {
    const { token } = await createTestUser()
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/push/subscribe',
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 200 and removes subscription', async () => {
    const { token, user } = await createTestUser()
    const endpoint = `https://push.example.com/delete-${user.id}`

    // Create subscription first
    await prisma.pushSubscription.create({
      data: { userId: user.id, endpoint, p256dh: 'fake-p256dh', auth: 'fake-auth' },
    })

    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/push/subscribe',
      headers: { authorization: `Bearer ${token}` },
      payload: { endpoint },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })

    const record = await prisma.pushSubscription.findUnique({ where: { endpoint } })
    expect(record).toBeNull()
  })

  it('returns 200 even if endpoint does not exist (idempotent)', async () => {
    const { token } = await createTestUser()
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/push/subscribe',
      headers: { authorization: `Bearer ${token}` },
      payload: { endpoint: 'https://push.example.com/nonexistent' },
    })
    expect(res.statusCode).toBe(200)
  })
})
