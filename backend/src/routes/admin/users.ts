import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../db'
import { notFound, conflict } from '../../lib/errors'

const ListUsersQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  pendingOnly: z.coerce.boolean().optional(),
})

export async function adminUsersRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    const query = ListUsersQuerySchema.parse(request.query)

    const where = {
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search.toLowerCase() } },
              { name: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(query.pendingOnly ? { pendingAdminApproval: true } : {}),
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { userScore: true },
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.user.count({ where }),
    ])

    return reply.send({ users, total, limit: query.limit, offset: query.offset })
  })

  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.params.id },
      include: {
        userScore: true,
        sessions: { orderBy: { expiresAt: 'desc' }, take: 5 },
        invitee: true,
      },
    })
    if (!user) throw notFound('User not found')
    return reply.send({ user })
  })

  fastify.post('/:id/points', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const adminId = request.user.sub
    const { id } = request.params

    const PointsBodySchema = z.object({
      delta: z.number().int(),
      reason: z.string().min(1),
    })
    const parsed = PointsBodySchema.safeParse(request.body)
    if (!parsed.success) throw notFound(parsed.error.issues[0].message)

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw notFound('User not found')

    await prisma.$transaction(async (tx) => {
      await tx.pointAdjustment.create({
        data: { userId: id, delta: parsed.data.delta, reason: parsed.data.reason, adminUserId: adminId },
      })
      await tx.userScore.upsert({
        where: { userId: id },
        update: { totalPoints: { increment: parsed.data.delta } },
        create: { userId: id, totalPoints: Math.max(0, parsed.data.delta) },
      })
      await tx.auditLog.create({
        data: {
          adminUserId: adminId,
          action: 'manual_point_adjustment',
          targetType: 'User',
          targetId: id,
          payloadJson: { delta: parsed.data.delta, reason: parsed.data.reason },
        },
      })
    }, { maxWait: 10000, timeout: 15000 })

    return reply.send({ ok: true })
  })

  fastify.post('/:id/approve', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const adminId = request.user.sub
    const { id } = request.params

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw notFound('User not found')
    if (!user.pendingAdminApproval) throw conflict('User is already approved')

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { pendingAdminApproval: false } })
      await tx.auditLog.create({
        data: {
          adminUserId: adminId,
          action: 'approve_user',
          targetType: 'User',
          targetId: id,
          payloadJson: { previousState: 'pending_approval' },
        },
      })
    }, { maxWait: 10000, timeout: 15000 })

    return reply.send({ ok: true, message: 'User approved' })
  })
}
