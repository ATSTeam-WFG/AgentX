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

describe('POST /v1/admin/announcements', () => {
  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/announcements',
      payload: { title: 'Test', body: 'Body' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 when title is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/announcements',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { body: 'Some body text' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when body is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/announcements',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { title: 'Test announcement' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('creates announcement and returns 201 with correct shape', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/announcements',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { title: 'Summit Schedule Update', body: 'The keynote has moved to Hall B.' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(typeof body.id).toBe('string')
    expect(body.title).toBe('Summit Schedule Update')
    expect(body.body).toBe('The keynote has moved to Hall B.')
    expect(body.expiresAt).toBeNull()

    // Verify in DB
    const record = await prisma.announcement.findUnique({ where: { id: body.id } })
    expect(record).not.toBeNull()

    // Cleanup
    await prisma.announcement.delete({ where: { id: body.id } })
  })

  it('creates announcement with optional expiresAt', async () => {
    const expiresAt = new Date(Date.now() + 86400000).toISOString()
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/announcements',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { title: 'Expiring Announcement', body: 'This expires soon.', expiresAt },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().expiresAt).not.toBeNull()

    await prisma.announcement.delete({ where: { id: res.json().id } })
  })
})

describe('DELETE /v1/admin/announcements/:id', () => {
  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/admin/announcements/00000000-0000-0000-0000-000000000000',
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 404 for nonexistent id', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/admin/announcements/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('deletes announcement and returns { ok: true }', async () => {
    const adminRecord = await prisma.adminUser.findFirstOrThrow()
    const announcement = await prisma.announcement.create({
      data: { title: 'To Delete', body: 'Ephemeral', publishedByAdminId: adminRecord.id },
    })

    const res = await app.inject({
      method: 'DELETE',
      url: `/v1/admin/announcements/${announcement.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })

    const record = await prisma.announcement.findUnique({ where: { id: announcement.id } })
    expect(record).toBeNull()
  })
})
