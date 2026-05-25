import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../helpers/app'
import { createTestUser } from '../helpers/tokens'
import { prisma } from '../../db'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

// 51 words — passes the server-side 50-word minimum check
const FIFTY_WORDS =
  'The title industry faces significant challenges with manual processes that slow down closings. ' +
  'Every transaction requires multiple touch points between agents, lenders, and title companies. ' +
  'Technology could dramatically improve efficiency by automating routine tasks, reducing errors, and ' +
  'providing real-time visibility into transaction status for all parties involved in the closing process.'

beforeAll(async () => { app = await getTestApp() })
afterAll(async () => { await closeTestApp() })

describe('POST /v1/activities/golden-points/submit', () => {
  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/activities/golden-points/submit',
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 when text is fewer than 50 words', async () => {
    const { token } = await createTestUser()
    const res = await app.inject({
      method: 'POST',
      url: '/v1/activities/golden-points/submit',
      headers: { authorization: `Bearer ${token}` },
      payload: { text: 'This is too short.', dedupeKey: 'short-001' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when activity is closed', async () => {
    const { token } = await createTestUser()
    await prisma.activity.updateMany({ where: { type: 'golden_points' }, data: { isOpen: false } })
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/activities/golden-points/submit',
        headers: { authorization: `Bearer ${token}` },
        payload: { text: FIFTY_WORDS, dedupeKey: 'closed-001' },
      })
      expect(res.statusCode).toBe(400)
    } finally {
      await prisma.activity.updateMany({ where: { type: 'golden_points' }, data: { isOpen: true } })
    }
  })

  it('returns 201 with submission id for valid 50+ word text', async () => {
    const { token, user } = await createTestUser()
    const res = await app.inject({
      method: 'POST',
      url: '/v1/activities/golden-points/submit',
      headers: { authorization: `Bearer ${token}` },
      payload: { text: FIFTY_WORDS, dedupeKey: 'valid-001' },
    })
    expect(res.statusCode).toBe(201)
    const { id } = res.json()
    expect(typeof id).toBe('string')

    const submission = await prisma.goldenPointsSubmission.findUnique({ where: { id } })
    expect(submission?.userId).toBe(user.id)
    expect(submission?.status).toBe('pending')
    expect(submission?.wordCount).toBeGreaterThanOrEqual(50)
  })

  it('creates a Job record for the worker on submit', async () => {
    const { token } = await createTestUser()
    const res = await app.inject({
      method: 'POST',
      url: '/v1/activities/golden-points/submit',
      headers: { authorization: `Bearer ${token}` },
      payload: { text: FIFTY_WORDS, dedupeKey: 'job-001' },
    })
    const { id } = res.json()

    const job = await prisma.job.findFirst({
      where: { type: 'golden_points_scoring' },
      orderBy: { createdAt: 'desc' },
    })
    expect(job).not.toBeNull()
    expect((job?.payloadJson as { submissionId: string })?.submissionId).toBe(id)
  })

  it('one-shot: second submit returns existing id without creating new rows', async () => {
    const { token } = await createTestUser()
    const payload = { text: FIFTY_WORDS, dedupeKey: 'oneshot-1' }

    const first = await app.inject({
      method: 'POST',
      url: '/v1/activities/golden-points/submit',
      headers: { authorization: `Bearer ${token}` },
      payload,
    })
    expect(first.statusCode).toBe(201)
    const { id: firstId } = first.json()

    const countBefore = await prisma.goldenPointsSubmission.count()

    const second = await app.inject({
      method: 'POST',
      url: '/v1/activities/golden-points/submit',
      headers: { authorization: `Bearer ${token}` },
      payload: { text: FIFTY_WORDS, dedupeKey: 'oneshot-2' },
    })

    expect(second.statusCode).toBe(200)
    expect(second.json().id).toBe(firstId)
    expect(await prisma.goldenPointsSubmission.count()).toBe(countBefore)
  })
})

describe('GET /v1/activities/golden-points/:id', () => {
  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/activities/golden-points/00000000-0000-0000-0000-000000000000',
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 404 for non-existent id', async () => {
    const { token } = await createTestUser()
    const res = await app.inject({
      method: 'GET',
      url: '/v1/activities/golden-points/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns { status: pending } for a newly submitted response', async () => {
    const { token } = await createTestUser()
    const submitRes = await app.inject({
      method: 'POST',
      url: '/v1/activities/golden-points/submit',
      headers: { authorization: `Bearer ${token}` },
      payload: { text: FIFTY_WORDS, dedupeKey: 'poll-pending-001' },
    })
    const { id } = submitRes.json()

    const res = await app.inject({
      method: 'GET',
      url: `/v1/activities/golden-points/${id}`,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'pending' })
  })

  it('returns scored result when status is ai_scored', async () => {
    const { token, user } = await createTestUser()
    const sub = await prisma.goldenPointsSubmission.create({
      data: {
        userId: user.id,
        text: FIFTY_WORDS,
        wordCount: 51,
        status: 'ai_scored',
        aiScore: 80,
        aiFeedback: 'Strong specificity with a clear technology solution mentioned.',
        pointsAwarded: 75,
        aiScoredAt: new Date(),
      },
    })

    const res = await app.inject({
      method: 'GET',
      url: `/v1/activities/golden-points/${sub.id}`,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({
      status: 'scored',
      pointsAwarded: 75,
      feedback: 'Strong specificity with a clear technology solution mentioned.',
    })
  })

  it('returns pointsAwarded: 0 when status is rejected', async () => {
    const { token, user } = await createTestUser()
    const sub = await prisma.goldenPointsSubmission.create({
      data: {
        userId: user.id,
        text: FIFTY_WORDS,
        wordCount: 51,
        status: 'rejected',
        aiScore: 20,
        aiFeedback: 'Response was too generic to score well.',
        pointsAwarded: 0,
        aiScoredAt: new Date(),
      },
    })

    const res = await app.inject({
      method: 'GET',
      url: `/v1/activities/golden-points/${sub.id}`,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ status: 'scored', pointsAwarded: 0 })
  })

  it('returns 403 when a different user tries to read the submission', async () => {
    const { user: userA } = await createTestUser()
    const { token: tokenB } = await createTestUser()

    const sub = await prisma.goldenPointsSubmission.create({
      data: { userId: userA.id, text: FIFTY_WORDS, wordCount: 51 },
    })

    const res = await app.inject({
      method: 'GET',
      url: `/v1/activities/golden-points/${sub.id}`,
      headers: { authorization: `Bearer ${tokenB}` },
    })
    expect(res.statusCode).toBe(403)
  })
})
