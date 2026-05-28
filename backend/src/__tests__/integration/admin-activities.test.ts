import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../helpers/app'
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

describe('GET /v1/admin/activities', () => {
  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/admin/activities' })
    expect(res.statusCode).toBe(401)
  })

  it('returns all activities as an array', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/activities',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThanOrEqual(5)
    for (const act of body) {
      expect(typeof act.id).toBe('string')
      expect(typeof act.isOpen).toBe('boolean')
    }
  })
})

describe('POST /v1/admin/activities/:id/toggle', () => {
  it('returns 401 without token', async () => {
    const activity = await prisma.activity.findFirstOrThrow()
    const res = await app.inject({
      method: 'POST',
      url: `/v1/admin/activities/${activity.id}/toggle`,
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 404 for unknown activity id', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/activities/00000000-0000-0000-0000-000000000000/toggle',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('toggles isOpen and returns new state', async () => {
    const activity = await prisma.activity.findFirstOrThrow({ where: { type: 'trivia' } })
    const originalIsOpen = activity.isOpen

    const res = await app.inject({
      method: 'POST',
      url: `/v1/admin/activities/${activity.id}/toggle`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.id).toBe(activity.id)
    expect(body.isOpen).toBe(!originalIsOpen)

    // Verify DB updated
    const updated = await prisma.activity.findUnique({ where: { id: activity.id } })
    expect(updated?.isOpen).toBe(!originalIsOpen)

    // Restore
    await prisma.activity.update({ where: { id: activity.id }, data: { isOpen: originalIsOpen } })
  })

  it('toggling twice restores original state', async () => {
    const activity = await prisma.activity.findFirstOrThrow({ where: { type: 'trivia' } })
    const originalIsOpen = activity.isOpen

    await app.inject({
      method: 'POST',
      url: `/v1/admin/activities/${activity.id}/toggle`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    const res = await app.inject({
      method: 'POST',
      url: `/v1/admin/activities/${activity.id}/toggle`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.json().isOpen).toBe(originalIsOpen)
  })
})
