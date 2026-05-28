import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../helpers/app'
import { createTestUser } from '../helpers/tokens'
import { prisma } from '../../db'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

beforeAll(async () => { app = await getTestApp() })
afterAll(async () => { await closeTestApp() })

describe('POST /v1/touchpoints/checkin', () => {
  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/touchpoints/checkin',
      payload: { locationId: 'lobby', response: 'I am checking in here today.', dedupeKey: 'ci-auth-1' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 when response is too short (min 20 chars)', async () => {
    const { token } = await createTestUser()
    const res = await app.inject({
      method: 'POST',
      url: '/v1/touchpoints/checkin',
      headers: { authorization: `Bearer ${token}` },
      payload: { locationId: 'lobby', response: 'Too short.', dedupeKey: 'ci-short-1' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when locationId is missing', async () => {
    const { token } = await createTestUser()
    const res = await app.inject({
      method: 'POST',
      url: '/v1/touchpoints/checkin',
      headers: { authorization: `Bearer ${token}` },
      payload: { response: 'A sufficient length response for checkin.', dedupeKey: 'ci-noloc-1' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('awards 30 points on first checkin and returns { ok: true, pointsAwarded: 30, locationId }', async () => {
    const { token, user } = await createTestUser()
    const res = await app.inject({
      method: 'POST',
      url: '/v1/touchpoints/checkin',
      headers: { authorization: `Bearer ${token}` },
      payload: { locationId: 'main-lobby', response: 'I visited the main lobby today.', dedupeKey: 'ci-happy-1' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.pointsAwarded).toBe(30)
    expect(body.locationId).toBe('main-lobby')

    const score = await prisma.userScore.findUnique({ where: { userId: user.id } })
    expect(score?.totalPoints).toBe(30)
  })

  it('returns 409 on duplicate checkin at the same location', async () => {
    const { token } = await createTestUser()
    await app.inject({
      method: 'POST',
      url: '/v1/touchpoints/checkin',
      headers: { authorization: `Bearer ${token}` },
      payload: { locationId: 'exhibit-hall', response: 'I visited the exhibit hall today.', dedupeKey: 'ci-dup-1' },
    })
    const second = await app.inject({
      method: 'POST',
      url: '/v1/touchpoints/checkin',
      headers: { authorization: `Bearer ${token}` },
      payload: { locationId: 'exhibit-hall', response: 'I visited the exhibit hall again.', dedupeKey: 'ci-dup-2' },
    })
    expect(second.statusCode).toBe(409)
    expect(second.json().error).toBe('CONFLICT')
  })

  it('allows different users to checkin at same location', async () => {
    const { token: tokenA } = await createTestUser()
    const { token: tokenB } = await createTestUser()
    const resA = await app.inject({
      method: 'POST',
      url: '/v1/touchpoints/checkin',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { locationId: 'keynote-room', response: 'Attending the keynote session here.', dedupeKey: 'ci-multi-A' },
    })
    const resB = await app.inject({
      method: 'POST',
      url: '/v1/touchpoints/checkin',
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { locationId: 'keynote-room', response: 'Also attending the keynote session.', dedupeKey: 'ci-multi-B' },
    })
    expect(resA.statusCode).toBe(200)
    expect(resB.statusCode).toBe(200)
  })

  it('dedupe: same dedupeKey returns identical response without extra DB row', async () => {
    const { token } = await createTestUser()
    const payload = { locationId: 'networking-lounge', response: 'Visiting the networking lounge area.', dedupeKey: 'ci-dedup-1' }
    const first = await app.inject({
      method: 'POST',
      url: '/v1/touchpoints/checkin',
      headers: { authorization: `Bearer ${token}` },
      payload,
    })
    const subCountBefore = await prisma.submission.count()

    const second = await app.inject({
      method: 'POST',
      url: '/v1/touchpoints/checkin',
      headers: { authorization: `Bearer ${token}` },
      payload,
    })
    const subCountAfter = await prisma.submission.count()

    expect(second.statusCode).toBe(200)
    expect(second.json()).toEqual(first.json())
    expect(subCountAfter).toBe(subCountBefore)
  })
})
