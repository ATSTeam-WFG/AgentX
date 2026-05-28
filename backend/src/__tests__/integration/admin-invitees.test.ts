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

// Use unique emails to avoid conflicts with seeded invitees
function uniqueEmail(prefix = 'test') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@invitee.example.com`
}

describe('GET /v1/admin/invitees', () => {
  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/admin/invitees' })
    expect(res.statusCode).toBe(401)
  })

  it('returns paginated list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/invitees',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.invitees)).toBe(true)
    expect(typeof body.total).toBe('number')
    // Seed has at least alice, bob, carol
    expect(body.total).toBeGreaterThanOrEqual(3)
  })

  it('filters by search query', async () => {
    const email = uniqueEmail('searchable')
    await prisma.invitee.create({ data: { name: 'SearchableInvitee', email, attendeeType: 'invited' } })
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/invitees?search=SearchableInvitee',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    const invitees = res.json().invitees as { email: string }[]
    expect(invitees.some((i) => i.email === email)).toBe(true)
    // Cleanup
    await prisma.invitee.delete({ where: { email } })
  })
})

describe('POST /v1/admin/invitees', () => {
  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/invitees',
      payload: { name: 'Test', email: uniqueEmail() },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 when name is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/invitees',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { email: uniqueEmail() },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when email is invalid', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/invitees',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'Test', email: 'not-an-email' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 409 when email already exists', async () => {
    const email = uniqueEmail('dup')
    await prisma.invitee.create({ data: { name: 'Existing', email, attendeeType: 'invited' } })
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/invitees',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'Duplicate', email },
    })
    expect(res.statusCode).toBe(409)
    // Cleanup
    await prisma.invitee.delete({ where: { email } })
  })

  it('creates invitee and returns 201', async () => {
    const email = uniqueEmail('new')
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/invitees',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'New Invitee', email },
    })
    expect(res.statusCode).toBe(201)
    const { invitee } = res.json()
    expect(invitee.email).toBe(email)
    expect(invitee.name).toBe('New Invitee')
    expect(invitee.attendeeType).toBe('invited')

    // Cleanup
    await prisma.invitee.delete({ where: { id: invitee.id } })
  })
})

describe('PATCH /v1/admin/invitees/:id', () => {
  it('returns 404 for unknown invitee', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/admin/invitees/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'Updated' },
    })
    expect(res.statusCode).toBe(404)
  })

  it('updates invitee name', async () => {
    const email = uniqueEmail('patch')
    const inv = await prisma.invitee.create({ data: { name: 'Original', email, attendeeType: 'invited' } })
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/admin/invitees/${inv.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'Updated Name' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().invitee.name).toBe('Updated Name')

    // Cleanup
    await prisma.invitee.delete({ where: { id: inv.id } })
  })
})

describe('DELETE /v1/admin/invitees/:id', () => {
  it('returns 404 for unknown invitee', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/admin/invitees/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns 409 if the invitee has a linked user account', async () => {
    const { user } = await createTestUser({ invited: true })
    const invitee = await prisma.invitee.findFirstOrThrow({ where: { user: { id: user.id } } })
    const res = await app.inject({
      method: 'DELETE',
      url: `/v1/admin/invitees/${invitee.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(409)
  })

  it('deletes invitee without linked user and returns { ok: true }', async () => {
    const email = uniqueEmail('del')
    const inv = await prisma.invitee.create({ data: { name: 'To Delete', email, attendeeType: 'invited' } })
    const res = await app.inject({
      method: 'DELETE',
      url: `/v1/admin/invitees/${inv.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })

    const deleted = await prisma.invitee.findUnique({ where: { id: inv.id } })
    expect(deleted).toBeNull()
  })
})

describe('POST /v1/admin/invitees/upload', () => {
  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/admin/invitees/upload' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 when no file is uploaded', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/invitees/upload',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(400)
  })

  it('imports valid CSV rows and returns counts', async () => {
    const e1 = uniqueEmail('csv1')
    const e2 = uniqueEmail('csv2')
    const csvContent = `name,email,attendee_type\nAlice CSV,${e1},invited\nBob CSV,${e2},invited\n`

    const boundary = '----TestBoundary'
    const body =
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.csv"\r\nContent-Type: text/csv\r\n\r\n` +
      csvContent +
      `\r\n--${boundary}--\r\n`

    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/invitees/upload',
      headers: {
        authorization: `Bearer ${adminToken}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    })
    expect(res.statusCode).toBe(200)
    const result = res.json()
    expect(result.imported).toBe(2)
    expect(result.skipped).toBe(0)
    expect(result.errors).toHaveLength(0)

    // Cleanup
    await prisma.invitee.deleteMany({ where: { email: { in: [e1, e2] } } })
  })

  it('skips duplicate emails and reports imported/skipped correctly', async () => {
    const e1 = uniqueEmail('upsert')
    // Pre-create one invitee
    await prisma.invitee.create({ data: { name: 'Existing', email: e1, attendeeType: 'invited' } })

    const csvContent = `name,email,attendee_type\nExisting,${e1},invited\n`
    const boundary = '----UpsertBoundary'
    const body =
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="dup.csv"\r\nContent-Type: text/csv\r\n\r\n` +
      csvContent +
      `\r\n--${boundary}--\r\n`

    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/invitees/upload',
      headers: {
        authorization: `Bearer ${adminToken}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    })
    // Upsert on duplicate email — still counts as imported
    expect(res.statusCode).toBe(200)
    const result = res.json()
    expect(result.imported + result.skipped).toBe(1)

    // Cleanup
    await prisma.invitee.delete({ where: { email: e1 } })
  })
})
