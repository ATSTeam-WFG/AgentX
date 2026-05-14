import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../helpers/app'
import { createTestUser } from '../helpers/tokens'
import { prisma } from '../../db'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

beforeAll(async () => { app = await getTestApp() })
afterAll(async () => { await closeTestApp() })

async function startTrivia(token: string) {
  return app.inject({
    method: 'POST',
    url: '/v1/activities/trivia/start',
    headers: { authorization: `Bearer ${token}` },
  })
}

async function completeTrivia(
  token: string,
  attemptId: string,
  answers: { questionId: string; selectedIndex: number }[],
  dedupeKey: string,
) {
  return app.inject({
    method: 'POST',
    url: '/v1/activities/trivia/complete',
    headers: { authorization: `Bearer ${token}` },
    payload: { attemptId, answers, dedupeKey },
  })
}

describe('POST /v1/activities/trivia/start', () => {
  it('returns attemptId and 50 questions without correctIndex', async () => {
    const { token } = await createTestUser()
    const res = await startTrivia(token)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.attemptId).toBeTruthy()
    expect(body.questions).toHaveLength(50)
    for (const q of body.questions) {
      expect(q).not.toHaveProperty('correctIndex')
      expect(q.optionsJson).toHaveLength(4)
    }
  })

  it('resumes with same attemptId and same question order on second call', async () => {
    const { token } = await createTestUser()
    const first = await startTrivia(token)
    const second = await startTrivia(token)
    expect(second.json().attemptId).toBe(first.json().attemptId)
    expect(second.json().questions.map((q: { id: string }) => q.id)).toEqual(
      first.json().questions.map((q: { id: string }) => q.id),
    )
  })

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/activities/trivia/start' })
    expect(res.statusCode).toBe(401)
  })
})

describe('POST /v1/activities/trivia/complete', () => {
  it('scores correctly and increments UserScore', async () => {
    const { token, user } = await createTestUser()
    const startRes = await startTrivia(token)
    const { attemptId, questions } = startRes.json()

    // Answer just the first question
    const qId = questions[0].id
    const correctQ = await prisma.triviaQuestion.findUnique({ where: { id: qId } })
    const correctIdx = correctQ!.correctIndex

    const res = await completeTrivia(token, attemptId, [{ questionId: qId, selectedIndex: correctIdx }], 'key-t1')
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.correctCount).toBe(1)
    expect(body.totalQuestions).toBe(1)
    expect(body.pointsAwarded).toBe(100) // 1/1 * 100

    const score = await prisma.userScore.findUnique({ where: { userId: user.id } })
    expect(score?.totalPoints).toBe(100)
    expect(score?.activitiesCompleted).toBe(1)
  })

  it('awards 0 points for all wrong answers', async () => {
    const { token, user } = await createTestUser()
    const { attemptId, questions } = (await startTrivia(token)).json()
    const qId = questions[0].id
    const correctQ = await prisma.triviaQuestion.findUnique({ where: { id: qId } })
    const wrongIdx = (correctQ!.correctIndex + 1) % 4

    const res = await completeTrivia(token, attemptId, [{ questionId: qId, selectedIndex: wrongIdx }], 'key-t2')
    expect(res.json().pointsAwarded).toBe(0)
    const score = await prisma.userScore.findUnique({ where: { userId: user.id } })
    expect(score?.totalPoints).toBe(0)
    expect(score?.activitiesCompleted).toBe(1)
  })

  it('dedupe: same dedupeKey returns identical response without new DB rows', async () => {
    const { token } = await createTestUser()
    const { attemptId, questions } = (await startTrivia(token)).json()
    const payload = { attemptId, answers: [{ questionId: questions[0].id, selectedIndex: 0 }], dedupeKey: 'dedup-key-1' }

    const first = await app.inject({
      method: 'POST',
      url: '/v1/activities/trivia/complete',
      headers: { authorization: `Bearer ${token}` },
      payload,
    })
    const subCountBefore = await prisma.submission.count()

    const second = await app.inject({
      method: 'POST',
      url: '/v1/activities/trivia/complete',
      headers: { authorization: `Bearer ${token}` },
      payload,
    })
    const subCountAfter = await prisma.submission.count()

    expect(second.statusCode).toBe(200)
    expect(second.json()).toEqual(first.json())
    expect(subCountAfter).toBe(subCountBefore)
  })

  it('one-shot: second complete (different dedupeKey) returns idempotent result', async () => {
    const { token } = await createTestUser()
    const { attemptId, questions } = (await startTrivia(token)).json()
    await completeTrivia(token, attemptId, [{ questionId: questions[0].id, selectedIndex: 0 }], 'shot-k-1')
    const second = await completeTrivia(token, attemptId, [{ questionId: questions[0].id, selectedIndex: 0 }], 'shot-k-2')
    // Already completed → idempotent response (200, not 409)
    expect(second.statusCode).toBe(200)
  })

  it('returns 403 for wrong user attemptId', async () => {
    const { token: tokenA } = await createTestUser()
    const { token: tokenB } = await createTestUser()
    const { attemptId, questions } = (await startTrivia(tokenA)).json()
    const res = await app.inject({
      method: 'POST',
      url: '/v1/activities/trivia/complete',
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { attemptId, answers: [{ questionId: questions[0].id, selectedIndex: 0 }], dedupeKey: 'k-403' },
    })
    expect(res.statusCode).toBe(403)
  })

  it('filters out foreign questionIds not in the attempt', async () => {
    const { token } = await createTestUser()
    const { attemptId } = (await startTrivia(token)).json()
    const res = await completeTrivia(
      token,
      attemptId,
      [{ questionId: '00000000-0000-0000-0000-000000000000', selectedIndex: 0 }],
      'filter-key-1',
    )
    // No valid answers → 400 (all filtered out)
    expect(res.statusCode).toBe(400)
  })
})
