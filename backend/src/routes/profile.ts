import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { authenticate } from '../plugins/auth'
import { notFound, badRequest } from '../lib/errors'

const PatchMeSchema = z.object({
  avatarUrl: z.string().url().optional(),
  onboardingInterests: z.array(z.string()).optional(),
})

const HistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export async function profileRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate)

  fastify.get('/me', async (request: FastifyRequest, reply) => {
    const userId = request.user.sub

    const [user, userScore, touchpointsCompleted] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.userScore.findUnique({ where: { userId } }),
      prisma.submission.count({ where: { userId, kind: 'touchpoint_checkin' } }),
    ])

    if (!user) throw notFound('User not found')

    await prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } })

    const higherRanked = await prisma.userScore.count({
      where: { totalPoints: { gt: userScore?.totalPoints ?? 0 } },
    })

    return reply.send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        attendeeType: user.attendeeType,
        avatarUrl: user.avatarUrl,
        onboardingInterests: user.onboardingInterests,
        pendingAdminApproval: user.pendingAdminApproval,
        createdAt: user.createdAt,
      },
      score: {
        totalPoints: userScore?.totalPoints ?? 0,
        activitiesCompleted: userScore?.activitiesCompleted ?? 0,
        touchpointsCompleted,
        rank: higherRanked + 1,
      },
    })
  })

  fastify.patch('/me', async (request: FastifyRequest, reply) => {
    const userId = request.user.sub
    const parsed = PatchMeSchema.safeParse(request.body)
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message)

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(parsed.data.avatarUrl !== undefined && { avatarUrl: parsed.data.avatarUrl }),
        ...(parsed.data.onboardingInterests !== undefined && {
          onboardingInterests: parsed.data.onboardingInterests,
        }),
      },
    })

    return reply.send({ user: updated })
  })

  fastify.get('/me/history', async (request: FastifyRequest, reply) => {
    const userId = request.user.sub
    const { limit, offset } = HistoryQuerySchema.parse(request.query)

    const submissions = await prisma.submission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: { activity: { select: { name: true, type: true } } },
    })

    return reply.send({ submissions, limit, offset })
  })
}
