import { FastifyInstance, FastifyRequest } from 'fastify'
import { prisma } from '../../db'
import { forbidden, notFound, badRequest } from '../../lib/errors'
import { broadcastAll } from '../../ws-connections'
import { makeWsMessage } from '../../ws-events'
import {
  seedAdmin, seedInvitees, seedAgenda, seedSponsors, seedInitiatives,
  seedAnnouncements, seedActivities, seedTriviaQuestions,
  seedPromptChallengeQuestions, seedTouchpoints,
} from '../../lib/seeder'

function requireSuperAdmin(request: FastifyRequest) {
  if (request.user.role !== 'super_admin') throw forbidden('Super admin access required')
}

export async function adminSystemRoutes(fastify: FastifyInstance) {

  // ── GET /status ────────────────────────────────────────────────────────────
  fastify.get('/status', async () => {
    const [
      users, invitees, agendaEvents, sponsors, initiatives,
      announcements, activities, triviaQuestions, promptChallengeQuestions,
      touchpoints, activityAttempts, submissions, goldenPointsSubmissions,
      sessions, auditLogs, jobs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.invitee.count(),
      prisma.agendaEvent.count(),
      prisma.sponsor.count(),
      prisma.initiative.count(),
      prisma.announcement.count(),
      prisma.activity.count(),
      prisma.triviaQuestion.count(),
      prisma.promptChallengeQuestion.count(),
      prisma.touchpoint.count(),
      prisma.activityAttempt.count(),
      prisma.submission.count(),
      prisma.goldenPointsSubmission.count(),
      prisma.session.count(),
      prisma.auditLog.count(),
      prisma.job.count(),
    ])
    return {
      tables: {
        users, invitees, agendaEvents, sponsors, initiatives,
        announcements, activities, triviaQuestions, promptChallengeQuestions,
        touchpoints, activityAttempts, submissions, goldenPointsSubmissions,
        sessions, auditLogs, jobs,
      },
    }
  })

  // ── POST /seed ─────────────────────────────────────────────────────────────
  fastify.post('/seed', async (request) => {
    const adminId = request.user.sub
    const admin = await seedAdmin(prisma)
    await seedInvitees(prisma)
    await seedAgenda(prisma)
    await seedSponsors(prisma)
    await seedInitiatives(prisma)
    await seedAnnouncements(prisma, admin.id)
    await seedActivities(prisma)
    await seedTriviaQuestions(prisma)
    await seedPromptChallengeQuestions(prisma)
    await seedTouchpoints(prisma)

    await prisma.auditLog.create({
      data: {
        adminUserId: adminId,
        action: 'run_seed',
        targetType: 'System',
        targetId: 'seed',
        payloadJson: { timestamp: new Date().toISOString() },
      },
    })

    return { ok: true, message: 'Seed completed successfully' }
  })

  // ── POST /wipe-users ───────────────────────────────────────────────────────
  fastify.post('/wipe-users', async (request) => {
    requireSuperAdmin(request)
    const adminId = request.user.sub

    await prisma.$transaction(async (tx) => {
      await tx.triviaAnswer.deleteMany({})
      await tx.activityAttempt.deleteMany({})
      await tx.promptChallengeAnswer.deleteMany({})
      await tx.goldenPointsSubmission.deleteMany({})
      await tx.touchpointScan.deleteMany({})
      await tx.submission.deleteMany({})
      await tx.userScore.deleteMany({})
      await tx.pointAdjustment.deleteMany({})
      await tx.eventFeedback.deleteMany({})
      await tx.appFeedback.deleteMany({})
      await tx.sponsorImpression.deleteMany({})
      await tx.session.deleteMany({})
      await tx.pushSubscription.deleteMany({})
      await tx.user.deleteMany({})
    }, { timeout: 30_000 })

    await prisma.auditLog.create({
      data: {
        adminUserId: adminId,
        action: 'wipe_users',
        targetType: 'System',
        targetId: 'users',
        payloadJson: { timestamp: new Date().toISOString() },
      },
    })

    return { ok: true, message: 'All user accounts and activity data wiped' }
  })

  // ── POST /reset-scores ─────────────────────────────────────────────────────
  fastify.post('/reset-scores', async (request) => {
    requireSuperAdmin(request)
    const adminId = request.user.sub

    await prisma.$transaction(async (tx) => {
      await tx.triviaAnswer.deleteMany({})
      await tx.activityAttempt.deleteMany({})
      await tx.promptChallengeAnswer.deleteMany({})
      await tx.goldenPointsSubmission.deleteMany({})
      await tx.touchpointScan.deleteMany({})
      await tx.submission.deleteMany({})
      await tx.pointAdjustment.deleteMany({})
      await tx.userScore.updateMany({ data: { totalPoints: 0, activitiesCompleted: 0 } })
    }, { timeout: 30_000 })

    await prisma.auditLog.create({
      data: {
        adminUserId: adminId,
        action: 'reset_scores',
        targetType: 'System',
        targetId: 'scores',
        payloadJson: { timestamp: new Date().toISOString() },
      },
    })

    broadcastAll(makeWsMessage({ event: 'leaderboard.update', data: null }))
    return { ok: true, message: 'All scores reset to zero. User accounts preserved.' }
  })

  // ── POST /reset-activity/:id ───────────────────────────────────────────────
  fastify.post(
    '/reset-activity/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
      requireSuperAdmin(request)
      const { id } = request.params
      const adminId = request.user.sub

      const activity = await prisma.activity.findUnique({ where: { id } })
      if (!activity) throw notFound('Activity not found')

      const attempts = await prisma.activityAttempt.findMany({
        where: { activityId: id },
        select: { userId: true, pointsAwarded: true },
      })
      const affectedUserIds = [...new Set(attempts.map((a) => a.userId))]

      await prisma.$transaction(async (tx) => {
        if (activity.type === 'trivia') {
          await tx.triviaAnswer.deleteMany({ where: { attempt: { activityId: id } } })
        } else if (activity.type === 'prompt_challenge' && affectedUserIds.length > 0) {
          await tx.promptChallengeAnswer.deleteMany({ where: { userId: { in: affectedUserIds } } })
        } else if (activity.type === 'golden_points' && affectedUserIds.length > 0) {
          await tx.goldenPointsSubmission.deleteMany({ where: { userId: { in: affectedUserIds } } })
        } else if (activity.type === 'touchpoint') {
          await tx.touchpointScan.deleteMany({})
        }

        for (const { userId, pointsAwarded } of attempts) {
          await tx.userScore.updateMany({
            where: { userId },
            data: {
              totalPoints: { decrement: pointsAwarded },
              activitiesCompleted: { decrement: 1 },
            },
          })
        }

        await tx.activityAttempt.deleteMany({ where: { activityId: id } })
        await tx.submission.deleteMany({ where: { activityId: id } })

        await tx.auditLog.create({
          data: {
            adminUserId: adminId,
            action: 'reset_activity',
            targetType: 'Activity',
            targetId: id,
            payloadJson: { activityName: activity.name, affectedUsers: affectedUserIds.length },
          },
        })
      }, { timeout: 30_000 })

      broadcastAll(makeWsMessage({ event: 'activity.changed', data: { id, isOpen: activity.isOpen } }))
      broadcastAll(makeWsMessage({ event: 'leaderboard.update', data: null }))
      return { ok: true, message: `Activity "${activity.name}" reset`, affectedUsers: affectedUserIds.length }
    },
  )

  // ── POST /reset-database ───────────────────────────────────────────────────
  fastify.post(
    '/reset-database',
    async (request: FastifyRequest<{ Body: { confirmation?: string } }>, reply) => {
      requireSuperAdmin(request)
      if (request.body?.confirmation !== 'RESET') {
        throw badRequest('Body must include { "confirmation": "RESET" }')
      }

      const originalAdminId = request.user.sub

      // Full wipe in FK-safe order — no transaction (too many rows for single tx timeout)
      await prisma.triviaAnswer.deleteMany({})
      await prisma.activityAttempt.deleteMany({})
      await prisma.promptChallengeAnswer.deleteMany({})
      await prisma.goldenPointsSubmission.deleteMany({})
      await prisma.touchpointScan.deleteMany({})
      await prisma.submission.deleteMany({})
      await prisma.userScore.deleteMany({})
      await prisma.pointAdjustment.deleteMany({})
      await prisma.eventFeedback.deleteMany({})
      await prisma.appFeedback.deleteMany({})
      await prisma.sponsorImpression.deleteMany({})
      await prisma.session.deleteMany({})
      await prisma.pushSubscription.deleteMany({})
      await prisma.user.deleteMany({})
      await prisma.auditLog.deleteMany({})
      await prisma.announcement.deleteMany({})
      await prisma.agendaEvent.deleteMany({})
      await prisma.activity.deleteMany({})
      await prisma.triviaQuestion.deleteMany({})
      await prisma.promptChallengeQuestion.deleteMany({})
      await prisma.touchpoint.deleteMany({})
      await prisma.sponsorImpression.deleteMany({})
      await prisma.sponsor.deleteMany({})
      await prisma.initiative.deleteMany({})
      await prisma.invitee.deleteMany({})
      await prisma.job.deleteMany({})
      await prisma.adminUser.deleteMany({})

      // Reseed
      const admin = await seedAdmin(prisma)
      await seedInvitees(prisma)
      await seedAgenda(prisma)
      await seedSponsors(prisma)
      await seedInitiatives(prisma)
      await seedAnnouncements(prisma, admin.id)
      await seedActivities(prisma)
      await seedTriviaQuestions(prisma)
      await seedPromptChallengeQuestions(prisma)
      await seedTouchpoints(prisma)

      await prisma.auditLog.create({
        data: {
          adminUserId: admin.id,
          action: 'reset_database',
          targetType: 'System',
          targetId: 'database',
          payloadJson: { performedByOriginalAdminId: originalAdminId, timestamp: new Date().toISOString() },
        },
      })

      return {
        ok: true,
        message: 'Database wiped and reseeded. Your session has been invalidated — please log in again.',
        requiresReauth: true,
      }
    },
  )
}
