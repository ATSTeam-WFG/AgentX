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

const VALID_EVENT_PAYLOAD = {
  day: 2,
  name: 'Test Session',
  location: 'Hall A',
  startsAt: '2026-06-15T09:00:00.000Z',
  endsAt:   '2026-06-15T10:00:00.000Z',
}

describe('POST /v1/admin/agenda', () => {
  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/agenda',
      payload: VALID_EVENT_PAYLOAD,
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 when name is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/agenda',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { ...VALID_EVENT_PAYLOAD, name: undefined },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when location is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/agenda',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { ...VALID_EVENT_PAYLOAD, location: undefined },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when day is out of range', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/agenda',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { ...VALID_EVENT_PAYLOAD, day: 4 },
    })
    expect(res.statusCode).toBe(400)
  })

  it('creates agenda event and returns 201 with mapped shape', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/agenda',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { ...VALID_EVENT_PAYLOAD, description: 'Test description', speaker: 'Jane Doe' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(typeof body.id).toBe('string')
    expect(body.day).toBe(2)
    expect(body.name).toBe('Test Session')
    expect(body.location).toBe('Hall A')
    expect(body.speakerName).toBe('Jane Doe')
    expect(body.description).toBe('Test description')
    expect(body.version).toBe(1)

    // Cleanup
    await prisma.agendaEvent.delete({ where: { id: body.id } })
  })
})

describe('PUT /v1/admin/agenda/:id', () => {
  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/admin/agenda/00000000-0000-0000-0000-000000000000',
      payload: { name: 'New Name' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 404 for unknown event id', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/admin/agenda/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'New Name' },
    })
    expect(res.statusCode).toBe(404)
  })

  it('updates fields and increments version', async () => {
    // Create a test event to update
    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/admin/agenda',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: VALID_EVENT_PAYLOAD,
    })
    const { id } = createRes.json()

    const res = await app.inject({
      method: 'PUT',
      url: `/v1/admin/agenda/${id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'Updated Session Name' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.name).toBe('Updated Session Name')
    expect(body.version).toBe(2)

    // Cleanup
    await prisma.agendaEvent.delete({ where: { id } })
  })
})

describe('DELETE /v1/admin/agenda/:id', () => {
  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/admin/agenda/00000000-0000-0000-0000-000000000000',
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 404 for unknown event id', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/admin/agenda/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('deletes the event and returns { ok: true }', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/admin/agenda',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: VALID_EVENT_PAYLOAD,
    })
    const { id } = createRes.json()

    const res = await app.inject({
      method: 'DELETE',
      url: `/v1/admin/agenda/${id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })

    const record = await prisma.agendaEvent.findUnique({ where: { id } })
    expect(record).toBeNull()
  })
})
