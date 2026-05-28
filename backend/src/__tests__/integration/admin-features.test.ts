import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../helpers/app'
import { signAdminToken } from '../helpers/tokens'
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
  const body = res.json()
  adminToken = body.token
})
afterAll(async () => { await closeTestApp() })

describe('GET /v1/admin/features', () => {
  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/admin/features' })
    expect(res.statusCode).toBe(401)
  })

  it('returns all AppConfig records ordered by key', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/features',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThanOrEqual(6)
    // Each record has key and value
    for (const item of body) {
      expect(typeof item.key).toBe('string')
      expect(typeof item.value).toBe('boolean')
    }
    // Keys should be in ascending alphabetical order
    const keys = body.map((i: { key: string }) => i.key)
    expect(keys).toEqual([...keys].sort())
  })
})

describe('PATCH /v1/admin/features/:key', () => {
  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/admin/features/activities_open',
      payload: { value: false },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 404 for a nonexistent flag key', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/admin/features/nonexistent_flag',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { value: true },
    })
    expect(res.statusCode).toBe(404)
  })

  it('updates the flag value and returns the updated record', async () => {
    // Read current value
    const beforeRes = await app.inject({
      method: 'GET',
      url: '/v1/admin/features',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    const flags = beforeRes.json() as { key: string; value: boolean }[]
    const flag = flags.find((f) => f.key === 'activities_open')!
    const newValue = !flag.value

    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/admin/features/activities_open',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { value: newValue },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().value).toBe(newValue)

    // Verify in DB
    const record = await prisma.appConfig.findUnique({ where: { key: 'activities_open' } })
    expect(record?.value).toBe(newValue)

    // Restore original
    await prisma.appConfig.update({ where: { key: 'activities_open' }, data: { value: flag.value } })
  })

  it('creates an audit log entry on successful update', async () => {
    const logCountBefore = await prisma.auditLog.count()
    await app.inject({
      method: 'PATCH',
      url: '/v1/admin/features/leaderboard_open',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { value: true },
    })
    const logCountAfter = await prisma.auditLog.count()
    expect(logCountAfter).toBeGreaterThan(logCountBefore)
  })
})
