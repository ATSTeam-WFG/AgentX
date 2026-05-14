import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../db'
import { authenticate } from '../../plugins/auth'
import { badRequest, notFound, conflict } from '../../lib/errors'
import { verifyToken } from '../../lib/qr'

const ScanBodySchema = z.object({
  qrToken: z.string().min(1),
  dedupeKey: z.string().min(1).max(200),
})

export async function touchpointsRoutes(fastify: FastifyInstance) {
  fastify.post('/scan', { preHandler: [authenticate] }, async (request: FastifyRequest, reply) => {
    const userId = request.user.sub
    const parsed = ScanBodySchema.safeParse(request.body)
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message)
    const { qrToken, dedupeKey } = parsed.data

    // Dedupe check
    const existingSub = await prisma.submission.findUnique({ where: { clientDedupeKey: dedupeKey } })
    if (existingSub) return reply.send(existingSub.payloadJson)

    const touchpointId = verifyToken(qrToken)
    if (!touchpointId) throw badRequest('Invalid QR code')

    const [touchpoint, activity] = await Promise.all([
      prisma.touchpoint.findUnique({ where: { id: touchpointId } }),
      prisma.activity.findFirst({ where: { type: 'touchpoint' } }),
    ])
    if (!touchpoint || !touchpoint.isActive) throw notFound('Touchpoint not found or inactive')
    if (!activity) throw badRequest('Touchpoint activity not configured')

    const existingScan = await prisma.touchpointScan.findUnique({
      where: { userId_touchpointId: { userId, touchpointId: touchpoint.id } },
    })
    if (existingScan) throw conflict('Already scanned this touchpoint')

    const responsePayload = {
      pointsAwarded: touchpoint.points,
      touchpoint: { name: touchpoint.name, locationDescription: touchpoint.locationDescription },
    }

    await prisma.$transaction(async (tx) => {
      await tx.touchpointScan.create({
        data: { userId, touchpointId: touchpoint.id, pointsAwarded: touchpoint.points },
      })
      await tx.submission.create({
        data: {
          userId,
          activityId: activity.id,
          kind: 'touchpoint_scan',
          payloadJson: responsePayload,
          clientDedupeKey: dedupeKey,
        },
      })
      await tx.userScore.upsert({
        where: { userId },
        update: { totalPoints: { increment: touchpoint.points } },
        create: { userId, totalPoints: touchpoint.points, activitiesCompleted: 0 },
      })
    }, { maxWait: 10000, timeout: 15000 })

    return reply.send(responsePayload)
  })
}
