import { FastifyInstance, FastifyRequest } from 'fastify'
import { prisma } from '../../db'
import { authenticate } from '../../plugins/auth'

export async function activitiesRoutes(fastify: FastifyInstance) {
  fastify.get('/activities', { preHandler: [authenticate] }, async (request: FastifyRequest, reply) => {
    const userId = request.user.sub

    const [activities, triviaAttempt, pcAnswers, totalPcQuestions, gpSubmission, avatarUser, touchpointCheckins] =
      await Promise.all([
        prisma.activity.findMany({ orderBy: { createdAt: 'asc' } }),
        prisma.activityAttempt.findFirst({
          where: { userId, activity: { type: 'trivia' } },
        }),
        prisma.promptChallengeAnswer.aggregate({
          where: { userId },
          _sum: { pointsAwarded: true },
          _count: { id: true },
        }),
        prisma.promptChallengeQuestion.count(),
        prisma.goldenPointsSubmission.findFirst({
          where: { userId, status: { not: 'pending' } },
          select: { pointsAwarded: true, status: true },
        }),
        prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } }),
        prisma.submission.count({ where: { userId, kind: 'touchpoint_checkin' } }),
      ])

    const TOUCHPOINT_MAX = 5
    const CHECKIN_POINTS = 30

    const result = activities.map((activity) => {
      let isCompleted = false
      let pointsEarned = 0

      if (activity.type === 'trivia') {
        isCompleted = triviaAttempt?.completedAt != null
        pointsEarned = triviaAttempt?.pointsAwarded ?? 0
      } else if (activity.type === 'prompt_challenge') {
        isCompleted = totalPcQuestions > 0 && pcAnswers._count.id === totalPcQuestions
        pointsEarned = pcAnswers._sum.pointsAwarded ?? 0
      } else if (activity.type === 'golden_points') {
        isCompleted = gpSubmission != null
        pointsEarned = gpSubmission?.pointsAwarded ?? 0
      } else if (activity.type === 'avatar') {
        isCompleted = avatarUser?.avatarUrl != null
        pointsEarned = avatarUser?.avatarUrl ? 150 : 0
      } else if (activity.type === 'touchpoint') {
        isCompleted = touchpointCheckins >= TOUCHPOINT_MAX
        pointsEarned = touchpointCheckins * CHECKIN_POINTS
      }

      return {
        id: activity.id,
        type: activity.type,
        name: activity.name,
        maxPoints: activity.maxPoints,
        isOneShot: activity.isOneShot,
        isOpen: activity.isOpen,
        pointsEarned,
        isCompleted,
      }
    })

    return reply.send({ activities: result })
  })
}
