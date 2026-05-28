import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../helpers/app'
import { prisma } from '../../db'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

beforeAll(async () => {
  app = await getTestApp()
  // Ensure all activities are open for the journey
  await prisma.activity.updateMany({ data: { isOpen: true } })
})
afterAll(async () => { await closeTestApp() })

describe('User activity journey — signup through leaderboard', () => {
  it('completes the full attendee lifecycle in sequence', async () => {
    // --- Step 1: Sign up as walk-in ---
    const email = `journey-${Date.now()}@e2e.test`
    const signupRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: { name: 'Journey User', email },
    })
    expect(signupRes.statusCode).toBe(201)
    const { token, user: signedUpUser } = signupRes.json()
    expect(typeof token).toBe('string')
    expect(signedUpUser.attendeeType).toBe('walk_in')

    // --- Step 2: List activities ---
    const activitiesRes = await app.inject({
      method: 'GET',
      url: '/v1/activities',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(activitiesRes.statusCode).toBe(200)
    const { activities } = activitiesRes.json()
    expect(activities.length).toBeGreaterThanOrEqual(3)
    const triviaActivity = activities.find((a: { type: string }) => a.type === 'trivia')
    expect(triviaActivity).toBeTruthy()
    expect(triviaActivity.isOpen).toBe(true)

    // --- Step 3: Start trivia ---
    const startRes = await app.inject({
      method: 'POST',
      url: '/v1/activities/trivia/start',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(startRes.statusCode).toBe(200)
    const { attemptId, questions } = startRes.json()
    expect(typeof attemptId).toBe('string')
    expect(questions.length).toBe(50)

    // --- Step 4: Complete trivia (answer first question correctly) ---
    const firstQ = questions[0]
    const dbQ = await prisma.triviaQuestion.findUniqueOrThrow({ where: { id: firstQ.id } })
    const triviaRes = await app.inject({
      method: 'POST',
      url: '/v1/activities/trivia/complete',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        attemptId,
        answers: [{ questionId: firstQ.id, selectedIndex: dbQ.correctIndex }],
        dedupeKey: `journey-trivia-${Date.now()}`,
      },
    })
    expect(triviaRes.statusCode).toBe(200)
    const triviaBody = triviaRes.json()
    expect(triviaBody.correctCount).toBe(1)
    expect(triviaBody.pointsAwarded).toBe(10)

    const scoreAfterTrivia = await prisma.userScore.findUnique({ where: { userId: signedUpUser.id } })
    expect(scoreAfterTrivia?.totalPoints).toBe(10)

    // --- Step 5: Get prompt-challenge questions ---
    const pcQRes = await app.inject({
      method: 'GET',
      url: '/v1/activities/prompt-challenge/questions',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(pcQRes.statusCode).toBe(200)
    const { questions: pcQuestions } = pcQRes.json()
    expect(pcQuestions.length).toBe(5)

    // --- Step 6: Answer a prompt-challenge question ---
    const pcQ = pcQuestions[0]
    const dbPcQ = await prisma.promptChallengeQuestion.findUniqueOrThrow({ where: { id: pcQ.id } })
    const pcRes = await app.inject({
      method: 'POST',
      url: '/v1/activities/prompt-challenge/answer',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        questionId: pcQ.id,
        selectedIndex: dbPcQ.correctIndex,
        dedupeKey: `journey-pc-${Date.now()}`,
      },
    })
    expect(pcRes.statusCode).toBe(200)
    const pcBody = pcRes.json()
    expect(pcBody.isCorrect).toBe(true)
    expect(pcBody.pointsAwarded).toBeGreaterThan(0)

    const scoreAfterPc = await prisma.userScore.findUnique({ where: { userId: signedUpUser.id } })
    expect(scoreAfterPc!.totalPoints).toBeGreaterThan(10)

    const expectedTotal = 10 + pcBody.pointsAwarded

    // --- Step 7: Check leaderboard — user appears ---
    const lbRes = await app.inject({
      method: 'GET',
      url: '/v1/leaderboard',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(lbRes.statusCode).toBe(200)
    const { leaderboard, currentUser } = lbRes.json()
    expect(currentUser).not.toBeNull()
    expect(currentUser.totalPoints).toBe(expectedTotal)
    expect(leaderboard.some((e: { totalPoints: number }) => e.totalPoints === expectedTotal)).toBe(true)

    // --- Step 9: Check history — all entries present ---
    const historyRes = await app.inject({
      method: 'GET',
      url: '/v1/me/history',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(historyRes.statusCode).toBe(200)
    const { submissions } = historyRes.json()
    expect(submissions.length).toBeGreaterThanOrEqual(2) // trivia + prompt-challenge (touchpoint not a Submission)
    const activityTypes = submissions.map((s: { activity: { type: string } | null }) => s.activity?.type)
    expect(activityTypes).toContain('trivia')
    expect(activityTypes).toContain('prompt_challenge')
  })
})
