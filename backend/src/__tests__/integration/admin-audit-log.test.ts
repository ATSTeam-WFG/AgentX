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

describe('GET /v1/admin/audit-log', () => {
  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/admin/audit-log' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 403 with a user token', async () => {
    const { token } = await createTestUser()
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/audit-log',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns paginated log structure', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/audit-log',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.logs)).toBe(true)
    expect(typeof body.total).toBe('number')
    expect(typeof body.limit).toBe('number')
    expect(typeof body.offset).toBe('number')
  })

  it('each log entry has expected shape', async () => {
    // Trigger an action that generates an audit log
    const { user } = await createTestUser()
    await app.inject({
      method: 'POST',
      url: `/v1/admin/users/${user.id}/approve`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/audit-log',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    const logs = res.json().logs as Record<string, unknown>[]
    expect(logs.length).toBeGreaterThan(0)

    const entry = logs[0]
    expect(typeof entry.id).toBe('string')
    expect(typeof entry.adminEmail).toBe('string')
    expect(typeof entry.action).toBe('string')
    expect(typeof entry.targetType).toBe('string')
    expect(typeof entry.targetId).toBe('string')
  })

  it('filters by action substring', async () => {
    // Create a log entry with a known action
    const { user } = await createTestUser()
    await app.inject({
      method: 'POST',
      url: `/v1/admin/users/${user.id}/approve`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/audit-log?action=approve_user',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    const logs = res.json().logs as { action: string }[]
    for (const log of logs) {
      expect(log.action).toContain('approve')
    }
  })

  it('respects limit pagination', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/audit-log?limit=1',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().logs.length).toBeLessThanOrEqual(1)
    expect(res.json().limit).toBe(1)
  })

  it('respects offset pagination', async () => {
    // Get total count first
    const allRes = await app.inject({
      method: 'GET',
      url: '/v1/admin/audit-log',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    const total = allRes.json().total as number

    const res = await app.inject({
      method: 'GET',
      url: `/v1/admin/audit-log?offset=${total}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.json().logs.length).toBe(0)
  })

  it('admin action creates audit log that appears in the log', async () => {
    const countBefore = (await app.inject({
      method: 'GET',
      url: '/v1/admin/audit-log',
      headers: { authorization: `Bearer ${adminToken}` },
    })).json().total as number

    // Perform an auditable action
    const { user } = await createTestUser()
    await app.inject({
      method: 'DELETE',
      url: `/v1/admin/users/${user.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    const countAfter = (await app.inject({
      method: 'GET',
      url: '/v1/admin/audit-log',
      headers: { authorization: `Bearer ${adminToken}` },
    })).json().total as number

    expect(countAfter).toBeGreaterThan(countBefore)
  })
})
