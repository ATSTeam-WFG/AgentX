import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  scoreGoldenPoints: vi.fn(),
  sendPushToUser: vi.fn(),
}))

vi.mock('../../../lib/scoring', () => ({
  scoreGoldenPoints: mocks.scoreGoldenPoints,
  GOLDEN_POINTS_QUESTION: 'How is AI transforming the title industry?',
}))

vi.mock('../../../lib/push', () => ({
  sendPushToUser: mocks.sendPushToUser,
}))

import { handleGoldenPointsScoring } from '../../../workers/golden-points'
import { prisma } from '../../../db'
import { createTestUser } from '../../helpers/tokens'
import { getTestApp, closeTestApp } from '../../helpers/app'

const DEFAULT_SCORE = {
  aiScore: 80,
  aiFeedback: 'Strong specificity with a clear technology solution mentioned.',
  status: 'ai_scored' as const,
  pointsAwarded: 75,
}

beforeAll(async () => { await getTestApp() }) // ensures DB setup is ready
afterAll(async () => { await closeTestApp() })

beforeEach(() => {
  mocks.scoreGoldenPoints.mockReset()
  mocks.sendPushToUser.mockReset()
  mocks.scoreGoldenPoints.mockResolvedValue(DEFAULT_SCORE)
  mocks.sendPushToUser.mockResolvedValue(undefined)
})

async function createPendingJob(submissionId: string) {
  return prisma.job.create({
    data: {
      type: 'golden_points_scoring',
      payloadJson: { submissionId, questionText: 'How is AI transforming the title industry?' },
    },
  })
}

async function createSubmission(userId: string, status = 'pending') {
  return prisma.goldenPointsSubmission.create({
    data: {
      userId,
      text: 'A comprehensive response about the title industry and AI transformation.',
      wordCount: 15,
      status: status as never,
    },
  })
}

describe('handleGoldenPointsScoring — happy path', () => {
  it('scores submission and updates status to ai_scored', async () => {
    const { user } = await createTestUser()
    const sub = await createSubmission(user.id)
    const job = await createPendingJob(sub.id)

    await handleGoldenPointsScoring(job.id, {
      submissionId: sub.id,
      questionText: 'How is AI transforming the title industry?',
    })

    const updatedSub = await prisma.goldenPointsSubmission.findUnique({ where: { id: sub.id } })
    expect(updatedSub?.status).toBe('ai_scored')
    expect(updatedSub?.aiScore).toBe(80)
    expect(updatedSub?.pointsAwarded).toBe(75)
    expect(updatedSub?.aiFeedback).toBeTruthy()
  })

  it('increments user totalPoints by pointsAwarded', async () => {
    const { user } = await createTestUser()
    const sub = await createSubmission(user.id)
    const job = await createPendingJob(sub.id)

    await handleGoldenPointsScoring(job.id, { submissionId: sub.id, questionText: 'test' })

    const score = await prisma.userScore.findUnique({ where: { userId: user.id } })
    expect(score?.totalPoints).toBe(75)
    expect(score?.activitiesCompleted).toBe(1)
  })

  it('marks job as done after scoring', async () => {
    const { user } = await createTestUser()
    const sub = await createSubmission(user.id)
    const job = await createPendingJob(sub.id)

    await handleGoldenPointsScoring(job.id, { submissionId: sub.id, questionText: 'test' })

    const updatedJob = await prisma.job.findUnique({ where: { id: job.id } })
    expect(updatedJob?.status).toBe('done')
    expect(updatedJob?.completedAt).not.toBeNull()
  })
})

describe('handleGoldenPointsScoring — edge cases', () => {
  it('skips scoring and marks job done when submission is already scored', async () => {
    const { user } = await createTestUser()
    const sub = await createSubmission(user.id, 'ai_scored')
    const job = await createPendingJob(sub.id)

    await handleGoldenPointsScoring(job.id, { submissionId: sub.id, questionText: 'test' })

    expect(mocks.scoreGoldenPoints).not.toHaveBeenCalled()
    const updatedJob = await prisma.job.findUnique({ where: { id: job.id } })
    expect(updatedJob?.status).toBe('done')
  })

  it('throws and leaves submission unchanged when scoreGoldenPoints throws', async () => {
    const { user } = await createTestUser()
    const sub = await createSubmission(user.id)
    const job = await createPendingJob(sub.id)

    mocks.scoreGoldenPoints.mockRejectedValue(new Error('Claude API error'))

    await expect(
      handleGoldenPointsScoring(job.id, { submissionId: sub.id, questionText: 'test' }),
    ).rejects.toThrow('Claude API error')

    const unchanged = await prisma.goldenPointsSubmission.findUnique({ where: { id: sub.id } })
    expect(unchanged?.status).toBe('pending')
  })
})
