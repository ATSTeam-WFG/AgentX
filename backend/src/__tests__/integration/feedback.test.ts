import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../helpers/app'
import { createTestUser } from '../helpers/tokens'
import { prisma } from '../../db'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

beforeAll(async () => { app = await getTestApp() })
afterAll(async () => { await closeTestApp() })

async function getFirstAgendaEventId(): Promise<string> {
  const event = await prisma.agendaEvent.findFirstOrThrow({ orderBy: { createdAt: 'asc' } })
  return event.id
}

describe('POST /v1/agenda-events/:id/feedback', () => {
  it('returns 401 without token', async () => {
    const eventId = await getFirstAgendaEventId()
    const res = await app.inject({
      method: 'POST',
      url: `/v1/agenda-events/${eventId}/feedback`,
      payload: { ratings: { overall: 4 } },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 404 for a nonexistent agenda event id', async () => {
    const { token } = await createTestUser()
    const res = await app.inject({
      method: 'POST',
      url: '/v1/agenda-events/00000000-0000-0000-0000-000000000000/feedback',
      headers: { authorization: `Bearer ${token}` },
      payload: { ratings: { overall: 4 } },
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns 400 when ratings contain a value below 1', async () => {
    const { token } = await createTestUser()
    const eventId = await getFirstAgendaEventId()
    const res = await app.inject({
      method: 'POST',
      url: `/v1/agenda-events/${eventId}/feedback`,
      headers: { authorization: `Bearer ${token}` },
      payload: { ratings: { overall: 0 } },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when ratings contain a value above 5', async () => {
    const { token } = await createTestUser()
    const eventId = await getFirstAgendaEventId()
    const res = await app.inject({
      method: 'POST',
      url: `/v1/agenda-events/${eventId}/feedback`,
      headers: { authorization: `Bearer ${token}` },
      payload: { ratings: { overall: 6 } },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 201 and stores feedback on happy path', async () => {
    const { token, user } = await createTestUser()
    const eventId = await getFirstAgendaEventId()
    const res = await app.inject({
      method: 'POST',
      url: `/v1/agenda-events/${eventId}/feedback`,
      headers: { authorization: `Bearer ${token}` },
      payload: { ratings: { overall: 5, content: 4 }, comment: 'Excellent session' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json()).toEqual({ ok: true })

    const record = await prisma.eventFeedback.findFirst({ where: { agendaEventId: eventId, userId: user.id } })
    expect(record).not.toBeNull()
    expect((record?.ratingsJson as Record<string, number>)?.overall).toBe(5)
    expect(record?.comment).toBe('Excellent session')
  })

  it('returns 400 when comment exceeds 2000 characters', async () => {
    const { token } = await createTestUser()
    const eventId = await getFirstAgendaEventId()
    const res = await app.inject({
      method: 'POST',
      url: `/v1/agenda-events/${eventId}/feedback`,
      headers: { authorization: `Bearer ${token}` },
      payload: { ratings: { overall: 3 }, comment: 'a'.repeat(2001) },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /v1/feedback', () => {
  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/feedback',
      payload: { answers: { q1: 'yes' } },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 201 on valid submission', async () => {
    const { token, user } = await createTestUser()
    const res = await app.inject({
      method: 'POST',
      url: '/v1/feedback',
      headers: { authorization: `Bearer ${token}` },
      payload: { answers: { q1: 'very good', q2: 'strongly agree' }, comment: 'Great event overall' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json()).toEqual({ ok: true })

    const record = await prisma.appFeedback.findFirst({ where: { userId: user.id } })
    expect(record).not.toBeNull()
    expect(record?.isAnonymous).toBe(false)
  })

  it('stores null userId when isAnonymous is true', async () => {
    const { token } = await createTestUser()
    const res = await app.inject({
      method: 'POST',
      url: '/v1/feedback',
      headers: { authorization: `Bearer ${token}` },
      payload: { answers: { q1: 'ok' }, isAnonymous: true },
    })
    expect(res.statusCode).toBe(201)

    const record = await prisma.appFeedback.findFirst({
      where: { userId: null, isAnonymous: true },
      orderBy: { createdAt: 'desc' },
    })
    expect(record).not.toBeNull()
  })

  it('returns 400 when comment exceeds 2000 characters', async () => {
    const { token } = await createTestUser()
    const res = await app.inject({
      method: 'POST',
      url: '/v1/feedback',
      headers: { authorization: `Bearer ${token}` },
      payload: { answers: { q1: 'yes' }, comment: 'x'.repeat(2001) },
    })
    expect(res.statusCode).toBe(400)
  })
})
