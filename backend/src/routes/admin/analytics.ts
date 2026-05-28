import { FastifyInstance } from 'fastify'
import { prisma } from '../../db'

interface VelocityRow { hour: Date; points: number }
interface DistRow { bucket: string; count: number }
interface CheckinRow { locationId: string; checkins: number }

async function getAnalyticsSnapshot() {
  const now = new Date()
  const twoMinsAgo  = new Date(now.getTime() -  2 * 60 * 1000)
  const tenMinsAgo  = new Date(now.getTime() - 10 * 60 * 1000)
  const oneHourAgo  = new Date(now.getTime() - 60 * 60 * 1000)

  const [
    activeNow,
    activeTenMin,
    activeOneHour,
    totalUsers,
    totalInvitees,
    usersWithAvatar,
    usersWithAnyActivity,
    triviaCompleted,
    promptCompleted,
    avatarCompleted,
    touchpointUniqueUsers,
    totalCheckins,
    gpByStatus,
    jobBreakdown,
    topUsers,
    eventFeedbackCount,
    appFeedbackCount,
    pushSubCount,
    totalPointsAgg,
  ] = await Promise.all([
    prisma.user.count({ where: { lastSeenAt: { gte: twoMinsAgo } } }),
    prisma.user.count({ where: { lastSeenAt: { gte: tenMinsAgo } } }),
    prisma.user.count({ where: { lastSeenAt: { gte: oneHourAgo } } }),
    prisma.user.count(),
    prisma.invitee.count(),
    prisma.user.count({ where: { avatarUrl: { not: null } } }),
    prisma.user.count({ where: { activityAttempts: { some: {} } } }),
    prisma.activityAttempt.count({
      where: { activity: { type: 'trivia' }, completedAt: { not: null } },
    }),
    prisma.activityAttempt.count({
      where: { activity: { type: 'prompt_challenge' }, completedAt: { not: null } },
    }),
    prisma.activityAttempt.count({
      where: { activity: { type: 'avatar' }, completedAt: { not: null } },
    }),
    prisma.submission.findMany({ where: { kind: 'touchpoint_checkin' }, select: { userId: true }, distinct: ['userId'] }).then(r => r.length),
    prisma.submission.count({ where: { kind: 'touchpoint_checkin' } }),
    prisma.goldenPointsSubmission.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.job.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.userScore.findMany({
      take: 10,
      orderBy: { totalPoints: 'desc' },
      include: { user: { select: { name: true } } },
    }),
    prisma.eventFeedback.count(),
    prisma.appFeedback.count(),
    prisma.pushSubscription.count(),
    prisma.userScore.aggregate({ _sum: { totalPoints: true } }),
  ])

  // Points awarded per hour over the last 12h (all sources)
  const pointsVelocity = await prisma.$queryRaw<VelocityRow[]>`
    SELECT
      date_trunc('hour', ts) AS hour,
      SUM(pts)::int          AS points
    FROM (
      SELECT "completedAt" AS ts, "pointsAwarded" AS pts
        FROM "ActivityAttempt"
        WHERE "completedAt" IS NOT NULL
          AND "completedAt" > NOW() - INTERVAL '12 hours'
      UNION ALL
      SELECT "createdAt" AS ts, ("payloadJson"->>'pointsAwarded')::int AS pts
        FROM "Submission"
        WHERE kind = 'touchpoint_checkin'
          AND "createdAt" > NOW() - INTERVAL '12 hours'
      UNION ALL
      SELECT "createdAt" AS ts, GREATEST("delta", 0) AS pts
        FROM "PointAdjustment"
        WHERE "createdAt" > NOW() - INTERVAL '12 hours'
      UNION ALL
      SELECT "reviewedAt" AS ts, "pointsAwarded" AS pts
        FROM "GoldenPointsSubmission"
        WHERE status = 'approved'
          AND "reviewedAt" IS NOT NULL
          AND "reviewedAt" > NOW() - INTERVAL '12 hours'
    ) combined
    GROUP BY 1
    ORDER BY 1
  `

  // Score distribution across 4 buckets
  const scoreDistribution = await prisma.$queryRaw<DistRow[]>`
    SELECT
      CASE
        WHEN "totalPoints" <  100 THEN '0–99'
        WHEN "totalPoints" <  250 THEN '100–249'
        WHEN "totalPoints" <  500 THEN '250–499'
        ELSE '500+'
      END            AS bucket,
      COUNT(*)::int  AS count
    FROM "UserScore"
    GROUP BY 1
    ORDER BY MIN("totalPoints")
  `

  const touchpointBreakdown = await prisma.$queryRaw<CheckinRow[]>`
    SELECT
      "payloadJson"->>'locationId' AS "locationId",
      COUNT(*)::int                AS checkins
    FROM "Submission"
    WHERE kind = 'touchpoint_checkin'
    GROUP BY 1
    ORDER BY checkins DESC
  `

  const gpMap  = Object.fromEntries(gpByStatus.map(g  => [g.status,  g._count.id]))
  const jobMap = Object.fromEntries(jobBreakdown.map(j => [j.status, j._count.id]))

  return {
    ts: now.toISOString(),
    presence: {
      activeNow,
      activeTenMin,
      activeOneHour,
      totalUsers,
      totalInvitees,
    },
    funnel: {
      registered:  totalUsers,
      withAvatar:  usersWithAvatar,
      anyActivity: usersWithAnyActivity,
    },
    activities: {
      trivia:          { completed: triviaCompleted },
      promptChallenge: { completed: promptCompleted },
      avatar:          { completed: avatarCompleted },
      touchpoints: {
        uniqueUsers:   touchpointUniqueUsers,
        totalCheckins: totalCheckins,
      },
      goldenPoints: {
        pending:  gpMap['pending']           ?? 0,
        aiScored: gpMap['ai_scored']         ?? 0,
        flagged:  gpMap['flagged_for_review'] ?? 0,
        approved: gpMap['approved']          ?? 0,
        rejected: gpMap['rejected']          ?? 0,
      },
    },
    touchpointBreakdown: touchpointBreakdown.map(t => ({
      locationId: t.locationId,
      checkins:   t.checkins,
    })),
    points: {
      total:    totalPointsAgg._sum.totalPoints ?? 0,
      topUsers: topUsers.map(u => ({ name: u.user.name, points: u.totalPoints })),
    },
    pointsVelocity: pointsVelocity.map(r => ({
      hour:   r.hour.toISOString(),
      points: r.points ?? 0,
    })),
    scoreDistribution,
    jobs: {
      pending: jobMap['pending'] ?? 0,
      running: jobMap['running'] ?? 0,
      done:    jobMap['done']    ?? 0,
      failed:  jobMap['failed']  ?? 0,
    },
    feedback: {
      eventFeedback:     eventFeedbackCount,
      appFeedback:       appFeedbackCount,
      pushSubscriptions: pushSubCount,
    },
  }
}

export async function adminAnalyticsRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, reply) => {
    const snapshot = await getAnalyticsSnapshot()
    return reply.send(snapshot)
  })

  // SSE stream — pushes full snapshot every 30s
  // Accepts token via query param since EventSource can't send headers
  fastify.get('/stream', async (request, reply) => {
    const raw = reply.raw

    raw.setHeader('Content-Type',  'text/event-stream')
    raw.setHeader('Cache-Control', 'no-cache')
    raw.setHeader('Connection',    'keep-alive')
    raw.setHeader('X-Accel-Buffering', 'no')
    raw.flushHeaders()

    const push = async () => {
      if (raw.destroyed) return
      try {
        const snapshot = await getAnalyticsSnapshot()
        raw.write(`data: ${JSON.stringify(snapshot)}\n\n`)
      } catch (err) {
        console.error('[analytics:sse] snapshot failed:', err)
        // don't kill the stream on a transient DB hiccup
      }
    }

    await push()
    const dataInterval = setInterval(push, 30_000)
    const pingInterval = setInterval(() => {
      if (!raw.destroyed) raw.write(': ping\n\n')
    }, 15_000)

    return new Promise<void>((resolve) => {
      const cleanup = () => {
        clearInterval(dataInterval)
        clearInterval(pingInterval)
        resolve()
      }
      request.raw.on('close', cleanup)
      // reply.raw fires 'close' in Fastify inject after the mock socket is torn down
      reply.raw.on('close', cleanup)
    })
  })
}
