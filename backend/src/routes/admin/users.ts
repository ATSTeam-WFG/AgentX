import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../db'
import { notFound, conflict, badRequest } from '../../lib/errors'
import { broadcastAll, broadcastUser } from '../../ws-connections'
import { makeWsMessage } from '../../ws-events'

const ListUsersQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  pendingOnly: z.coerce.boolean().optional(),
})

export async function adminUsersRoutes(fastify: FastifyInstance) {
  // ── List ────────────────────────────────────────────────────────────────────
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

  // ── Export CSV ──────────────────────────────────────────────────────────────
  // Must be registered before /:id to avoid Fastify matching "export" as an id param
  fastify.get('/export', async (_request, reply) => {
    const users = await prisma.user.findMany({
      include: { userScore: true },
      orderBy: { createdAt: 'asc' },
    })

    const header = ['id', 'name', 'email', 'attendeeType', 'pendingApproval', 'totalPoints', 'activitiesCompleted', 'createdAt'].join(',')
    const rows = users.map((u) => [
      u.id,
      `"${u.name.replace(/"/g, '""')}"`,
      u.email,
      u.attendeeType,
      u.pendingAdminApproval ? 'yes' : 'no',
      u.userScore?.totalPoints ?? 0,
      u.userScore?.activitiesCompleted ?? 0,
      u.createdAt.toISOString(),
    ].join(','))

    const csv = [header, ...rows].join('\n')
    const date = new Date().toISOString().slice(0, 10)

    reply.header('Content-Type', 'text/csv; charset=utf-8')
    reply.header('Content-Disposition', `attachment; filename="attendees-${date}.csv"`)
    return reply.send(csv)
  })

  // ── Bulk approve ────────────────────────────────────────────────────────────
  fastify.post('/bulk-approve', async (request, reply) => {
    const adminId = request.user.sub

    const BulkApproveSchema = z.object({
      ids: z.array(z.string().uuid()).min(1).max(200),
    })
    const parsed = BulkApproveSchema.safeParse(request.body)
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message)

    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { id: { in: parsed.data.ids }, pendingAdminApproval: true },
        data: { pendingAdminApproval: false },
      })
      await tx.auditLog.createMany({
        data: parsed.data.ids.map((id) => ({
          adminUserId: adminId,
          action: 'approve_user',
          targetType: 'User',
          targetId: id,
          payloadJson: { bulk: true },
        })),
      })
    }, { maxWait: 10000, timeout: 15000 })

    return reply.send({ ok: true, approved: parsed.data.ids.length })
  })

  // ── Get single ──────────────────────────────────────────────────────────────
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

  // ── Edit ────────────────────────────────────────────────────────────────────
  fastify.patch('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const adminId = request.user.sub
    const { id } = request.params

    const EditUserSchema = z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().toLowerCase().trim().optional(),
      attendeeType: z.enum(['invited', 'walk_in']).optional(),
      pendingAdminApproval: z.boolean().optional(),
    }).refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' })

    const parsed = EditUserSchema.safeParse(request.body)
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message)

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw notFound('User not found')

    if (parsed.data.email && parsed.data.email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
      if (existing) throw conflict('Email already in use by another user')
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({ where: { id }, data: parsed.data })
      await tx.auditLog.create({
        data: {
          adminUserId: adminId,
          action: 'edit_user',
          targetType: 'User',
          targetId: id,
          payloadJson: parsed.data,
        },
      })
      return u
    }, { maxWait: 10000, timeout: 15000 })

    return reply.send({ user: updated })
  })

  // ── Delete ──────────────────────────────────────────────────────────────────
  fastify.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const adminId = request.user.sub
    const { id } = request.params

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw notFound('User not found')

    await prisma.$transaction(async (tx) => {
      // Delete all related data in dependency order
      await tx.pushSubscription.deleteMany({ where: { userId: id } })
      await tx.sponsorImpression.deleteMany({ where: { userId: id } })
      await tx.appFeedback.deleteMany({ where: { userId: id } })
      await tx.eventFeedback.deleteMany({ where: { userId: id } })
      await tx.touchpointScan.deleteMany({ where: { userId: id } })
      await tx.goldenPointsSubmission.deleteMany({ where: { userId: id } })
      await tx.promptChallengeAnswer.deleteMany({ where: { userId: id } })
      await tx.triviaAnswer.deleteMany({ where: { userId: id } })
      await tx.submission.deleteMany({ where: { userId: id } })
      await tx.activityAttempt.deleteMany({ where: { userId: id } })
      await tx.pointAdjustment.deleteMany({ where: { userId: id } })
      await tx.userScore.deleteMany({ where: { userId: id } })
      await tx.session.deleteMany({ where: { userId: id } })
      await tx.user.delete({ where: { id } })
      await tx.auditLog.create({
        data: {
          adminUserId: adminId,
          action: 'delete_user',
          targetType: 'User',
          targetId: id,
          payloadJson: { name: user.name, email: user.email },
        },
      })
    }, { maxWait: 10000, timeout: 30000 })

    return reply.send({ ok: true })
  })

  // ── Adjust points ───────────────────────────────────────────────────────────
  fastify.post('/:id/points', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const adminId = request.user.sub
    const { id } = request.params

    const PointsBodySchema = z.object({
      delta: z.number().int(),
      reason: z.string().min(1),
    })
    const parsed = PointsBodySchema.safeParse(request.body)
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message)

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

    const updated = await prisma.userScore.findUnique({ where: { userId: id }, select: { totalPoints: true } })
    if (updated) {
      broadcastUser(id, makeWsMessage({ event: 'scores.update', data: { userId: id, totalPoints: updated.totalPoints } }))
      broadcastAll(makeWsMessage({ event: 'leaderboard.update', data: null }))
    }

    return reply.send({ ok: true })
  })

  // ── Approve single ──────────────────────────────────────────────────────────
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
