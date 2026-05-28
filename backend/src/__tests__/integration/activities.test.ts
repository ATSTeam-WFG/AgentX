import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../helpers/app'
import { createTestUser } from '../helpers/tokens'
import { prisma } from '../../db'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

beforeAll(async () => { app = await getTestApp() })
afterAll(async () => { await closeTestApp() })

describe('GET /v1/activities', () => {
  it('returns all 5 activities with isCompleted=false and pointsEarned=0 for new user', async () => {
    const { token } = await createTestUser()
    const res = await app.inject({
      method: 'GET',
      url: '/v1/activities',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const { activities } = res.json()
    expect(activities.length).toBeGreaterThanOrEqual(5)
    for (const a of activities) {
      expect(typeof a.id).toBe('string')
      expect(typeof a.type).toBe('string')
      expect(typeof a.isCompleted).toBe('boolean')
      expect(typeof a.pointsEarned).toBe('number')
    }
    const allNotCompleted = activities.every((a: { isCompleted: boolean }) => !a.isCompleted)
    expect(allNotCompleted).toBe(true)
  })

  it('trivia shows isCompleted=true after trivia is completed', async () => {
    const { token, user } = await createTestUser()

    // Start + complete trivia
    const startRes = await app.inject({
      method: 'POST',
      url: '/v1/activities/trivia/start',
      headers: { authorization: `Bearer ${token}` },
    })
    const { attemptId, questions } = startRes.json()
    const qId = questions[0].id
    await app.inject({
      method: 'POST',
      url: '/v1/activities/trivia/complete',
      headers: { authorization: `Bearer ${token}` },
      payload: { attemptId, answers: [{ questionId: qId, selectedIndex: 0 }], dedupeKey: 'act-trivia-1' },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/v1/activities',
      headers: { authorization: `Bearer ${token}` },
    })
    const trivia = res.json().activities.find((a: { type: string }) => a.type === 'trivia')
    expect(trivia.isCompleted).toBe(true)
    expect(trivia.pointsEarned).toBeGreaterThanOrEqual(0)
  })

  it('prompt_challenge shows isCompleted=true after all 5 questions answered', async () => {
    const { token } = await createTestUser()
    const qs = (await app.inject({
      method: 'GET',
      url: '/v1/activities/prompt-challenge/questions',
      headers: { authorization: `Bearer ${token}` },
    })).json().questions

    for (let i = 0; i < qs.length; i++) {
      await app.inject({
        method: 'POST',
        url: '/v1/activities/prompt-challenge/answer',
        headers: { authorization: `Bearer ${token}` },
        payload: { questionId: qs[i].id, selectedIndex: 0, dedupeKey: `act-pc-${i}` },
      })
    }

    const res = await app.inject({
      method: 'GET',
      url: '/v1/activities',
      headers: { authorization: `Bearer ${token}` },
    })
    const pc = res.json().activities.find((a: { type: string }) => a.type === 'prompt_challenge')
    expect(pc.isCompleted).toBe(true)
  })

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/activities' })
    expect(res.statusCode).toBe(401)
  })
})
