import { FastifyInstance } from 'fastify'
import { prisma } from '../../db'

export async function adminDashboardRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, reply) => {
    const [totalUsers, goldenPointsTotal, touchpointsEngaged, scoreAgg] = await Promise.all([
      prisma.user.count(),
      prisma.goldenPointsSubmission.count(),
      prisma.submission.groupBy({ by: ['userId'], where: { kind: 'touchpoint_checkin' } }).then(r => r.length),
      prisma.userScore.aggregate({ _avg: { totalPoints: true } }),
    ])

    return reply.send({
      totalUsers,
      goldenPointsPending: goldenPointsTotal,
      touchpointsEngaged,
      avgScore: Math.round(scoreAgg._avg.totalPoints ?? 0),
    })
  })
}
