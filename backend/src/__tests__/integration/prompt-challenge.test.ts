import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { getTestApp, closeTestApp } from '../helpers/app'
import { createTestUser } from '../helpers/tokens'
import { prisma } from '../../db'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

beforeAll(async () => { app = await getTestApp() })
afterAll(async () => { await closeTestApp() })

async function getQuestions(token: string) {
  return app.inject({
    method: 'GET',
    url: '/v1/activities/prompt-challenge/questions',
    headers: { authorization: `Bearer ${token}` },
  })
}

async function submitAnswer(
  token: string,
  questionId: string,
  selectedIndex: number,
  dedupeKey: string,
) {
  return app.inject({
    method: 'POST',
    url: '/v1/activities/prompt-challenge/answer',
    headers: { authorization: `Bearer ${token}` },
    payload: { questionId, selectedIndex, dedupeKey },
  })
}

describe('GET /v1/activities/prompt-challenge/questions', () => {
  it('returns questions without correctIndex or explanation for unanswered', async () => {
    const { token } = await createTestUser()
    const res = await getQuestions(token)
    expect(res.statusCode).toBe(200)
    const { questions, totalPoints } = res.json()
    expect(questions.length).toBe(5)
    expect(totalPoints).toBe(0)
    for (const q of questions) {
      expect(q.correctIndex).toBeNull()
      expect(q.explanation).toBeNull()
      expect(q.userAnswer).toBeNull()
    }
  })

  it('reveals correctIndex and explanation after answering', async () => {
    const { token, user } = await createTestUser()
    const { questions } = (await getQuestions(token)).json()
    const firstQ = questions[0]

    await submitAnswer(token, firstQ.id, 0, 'pc-reveal-1')

    const res2 = await getQuestions(token)
    const updated = res2.json().questions.find((q: { id: string }) => q.id === firstQ.id)
    expect(updated.correctIndex).not.toBeNull()
    expect(updated.explanation).not.toBeNull()
    expect(updated.userAnswer).not.toBeNull()
    expect(typeof updated.userAnswer.selectedIndex).toBe('number')
  })

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/activities/prompt-challenge/questions' })
    expect(res.statusCode).toBe(401)
  })
})

describe('POST /v1/activities/prompt-challenge/answer', () => {
  it('correct answer awards 20 points (configJson.pointsCorrect)', async () => {
    const { token, user } = await createTestUser()
    const { questions } = (await getQuestions(token)).json()
    const q = questions[0]
    // Fetch the correct index directly to guarantee correct answer
    const dbQ = await prisma.promptChallengeQuestion.findUnique({ where: { id: q.id } })
    const res = await submitAnswer(token, q.id, dbQ!.correctIndex, 'pc-correct-1')
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.isCorrect).toBe(true)
    expect(body.pointsAwarded).toBe(20)

    const score = await prisma.userScore.findUnique({ where: { userId: user.id } })
    expect(score?.totalPoints).toBe(20)
  })

  it('wrong answer awards 10 points (configJson.pointsWrong)', async () => {
    const { token, user } = await createTestUser()
    const { questions } = (await getQuestions(token)).json()
    const q = questions[0]
    const dbQ = await prisma.promptChallengeQuestion.findUnique({ where: { id: q.id } })
    const wrongIdx = (dbQ!.correctIndex + 1) % 4
    const res = await submitAnswer(token, q.id, wrongIdx, 'pc-wrong-1')
    expect(res.json().isCorrect).toBe(false)
    expect(res.json().pointsAwarded).toBe(10)

    const score = await prisma.userScore.findUnique({ where: { userId: user.id } })
    expect(score?.totalPoints).toBe(10)
  })

  it('idempotent: second answer to same question returns same response without re-awarding', async () => {
    const { token, user } = await createTestUser()
    const { questions } = (await getQuestions(token)).json()
    const q = questions[0]
    const dbQ = await prisma.promptChallengeQuestion.findUnique({ where: { id: q.id } })

    const first = await submitAnswer(token, q.id, dbQ!.correctIndex, 'pc-idem-1')
    const scoreAfterFirst = (await prisma.userScore.findUnique({ where: { userId: user.id } }))?.totalPoints ?? 0

    // Second attempt (different dedupeKey, same questionId)
    const second = await submitAnswer(token, q.id, dbQ!.correctIndex, 'pc-idem-2')
    const scoreAfterSecond = (await prisma.userScore.findUnique({ where: { userId: user.id } }))?.totalPoints ?? 0

    expect(second.statusCode).toBe(200)
    expect(second.json().isCorrect).toBe(first.json().isCorrect)
    expect(scoreAfterSecond).toBe(scoreAfterFirst)
  })

  it('dedupe: same dedupeKey returns identical response without new Submission row', async () => {
    const { token } = await createTestUser()
    const { questions } = (await getQuestions(token)).json()
    const q = questions[0]

    const first = await submitAnswer(token, q.id, 0, 'pc-dedup-1')
    const countBefore = await prisma.submission.count()

    const second = await submitAnswer(token, q.id, 0, 'pc-dedup-1')
    const countAfter = await prisma.submission.count()

    expect(second.json()).toEqual(first.json())
    expect(countAfter).toBe(countBefore)
  })

  it('increments activitiesCompleted only after all 5 questions answered', async () => {
    const { token, user } = await createTestUser()
    const { questions } = (await getQuestions(token)).json()

    // Answer 4 questions
    for (let i = 0; i < 4; i++) {
      await submitAnswer(token, questions[i].id, 0, `pc-all-${i}`)
    }
    let score = await prisma.userScore.findUnique({ where: { userId: user.id } })
    expect(score?.activitiesCompleted).toBe(0)

    // Answer the 5th (final) question
    await submitAnswer(token, questions[4].id, 0, 'pc-all-4')
    score = await prisma.userScore.findUnique({ where: { userId: user.id } })
    expect(score?.activitiesCompleted).toBe(1)
  })

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/activities/prompt-challenge/answer',
      payload: { questionId: '00000000-0000-0000-0000-000000000000', selectedIndex: 0, dedupeKey: 'x' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 for selectedIndex out of range', async () => {
    const { token } = await createTestUser()
    const { questions } = (await getQuestions(token)).json()
    const res = await app.inject({
      method: 'POST',
      url: '/v1/activities/prompt-challenge/answer',
      headers: { authorization: `Bearer ${token}` },
      payload: { questionId: questions[0].id, selectedIndex: 5, dedupeKey: 'pc-oob-1' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when activity is closed', async () => {
    await prisma.activity.updateMany({ where: { type: 'prompt_challenge' }, data: { isOpen: false } })
    try {
      const { token } = await createTestUser()
      const { questions } = (await getQuestions(token)).json()
      const res = await submitAnswer(token, questions[0].id, 0, 'pc-closed-1')
      expect(res.statusCode).toBe(400)
      expect(res.json().error).toBe('BAD_REQUEST')
    } finally {
      await prisma.activity.updateMany({ where: { type: 'prompt_challenge' }, data: { isOpen: true } })
    }
  })
})
