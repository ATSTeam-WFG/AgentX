import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../db'
import { authenticate } from '../../plugins/auth'
import { badRequest, conflict } from '../../lib/errors'
import { broadcastUser, broadcastAll } from '../../ws-connections'
import { makeWsMessage } from '../../ws-events'
import { invalidateLeaderboardCache } from '../../lib/leaderboard-cache'

const CheckinBodySchema = z.object({
  locationId: z.string().min(1),
  response: z.string().min(20),
  dedupeKey: z.string().min(1).max(200),
})

const CHECKIN_POINTS = 30
const TOUCHPOINT_MAX = 5

export async function touchpointsRoutes(fastify: FastifyInstance) {
  fastify.get('/checkins', { preHandler: [authenticate] }, async (request: FastifyRequest, reply) => {
    const userId = request.user.sub
    const checkinSubs = await prisma.submission.findMany({
      where: { userId, kind: 'touchpoint_checkin' },
      select: { payloadJson: true },
    })
    const checkins = checkinSubs.map((s) => {
      const p = s.payloadJson as { locationId: string; pointsAwarded: number; response?: string }
      return { locationId: p.locationId, pointsAwarded: p.pointsAwarded, response: p.response }
    })
    return reply.send({ checkins })
  })

  fastify.post('/checkin', { preHandler: [authenticate] }, async (request: FastifyRequest, reply) => {
    const userId = request.user.sub
    const parsed = CheckinBodySchema.safeParse(request.body)
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message)
    const { locationId, response, dedupeKey } = parsed.data

    // Idempotency check
    const existingSub = await prisma.submission.findUnique({ where: { clientDedupeKey: dedupeKey } })
    if (existingSub) return reply.send(existingSub.payloadJson)

    // Activity check
    const activity = await prisma.activity.findFirst({ where: { type: 'touchpoint' } })
    if (!activity) throw badRequest('Touchpoint activity not configured')
    if (!activity.isOpen) throw conflict('Touchpoints are currently closed')

    // One-per-location check
    const existingCheckin = await prisma.submission.findFirst({
      where: { userId, kind: 'touchpoint_checkin', payloadJson: { path: ['locationId'], equals: locationId } },
    })
    if (existingCheckin) throw conflict('Already checked in at this location')

    const responsePayload = { pointsAwarded: CHECKIN_POINTS, locationId, response }

    await prisma.$transaction(async (tx) => {
      await tx.submission.create({
        data: {
          userId,
          activityId: activity.id,
          kind: 'touchpoint_checkin',
          payloadJson: responsePayload,
          clientDedupeKey: dedupeKey,
        },
      })
      await tx.userScore.upsert({
        where: { userId },
        update: { totalPoints: { increment: CHECKIN_POINTS } },
        create: { userId, totalPoints: CHECKIN_POINTS, activitiesCompleted: 0 },
      })
      const checkinCount = await tx.submission.count({ where: { userId, kind: 'touchpoint_checkin' } })
      if (checkinCount === TOUCHPOINT_MAX) {
        await tx.userScore.upsert({
          where: { userId },
          update: { activitiesCompleted: { increment: 1 } },
          create: { userId, totalPoints: CHECKIN_POINTS, activitiesCompleted: 1 },
        })
      }
    }, { maxWait: 10000, timeout: 15000 })

    const updatedScore = await prisma.userScore.findUnique({ where: { userId }, select: { totalPoints: true } })
    if (updatedScore) {
      invalidateLeaderboardCache()
      broadcastUser(userId, makeWsMessage({ event: 'scores.update', data: { userId, totalPoints: updatedScore.totalPoints } }))
      broadcastAll(makeWsMessage({ event: 'leaderboard.update', data: null }))
    }

    return reply.send(responsePayload)
  })
}
