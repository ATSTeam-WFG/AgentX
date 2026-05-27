import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { redis } from '../redis'
import { config } from '../config'

const LeaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(5),
})

export async function leaderboardRoutes(fastify: FastifyInstance) {
  fastify.get('/leaderboard', async (request, reply) => {
    const { limit } = LeaderboardQuerySchema.parse(request.query)

    // Optional auth — do NOT use authenticate preHandler (it sends 401 on failure, not throws)
    let currentUserId: string | null = null
    try {
      await request.jwtVerify()
      if ((request.user as { aud?: string }).aud !== 'admin') {
        currentUserId = request.user.sub
      }
    } catch {
      // unauthenticated — fine
    }

    const cacheKey = `lb:top:${limit}`
    let leaderboard: Array<{ rank: number; name: string; totalPoints: number; avatarUrl: string | null }>

    const cached = config.NODE_ENV !== 'test'
      ? await redis.get(cacheKey).catch(() => null)
      : null

    if (cached) {
      leaderboard = JSON.parse(cached) as typeof leaderboard
    } else {
      const topScores = await prisma.userScore.findMany({
        orderBy: { totalPoints: 'desc' },
        take: limit,
        include: { user: { select: { name: true, avatarUrl: true } } },
      })
      leaderboard = topScores.map((s, i) => ({
        rank: i + 1,
        name: s.user.name,
        totalPoints: s.totalPoints,
        avatarUrl: s.user.avatarUrl ?? null,
      }))
      if (config.NODE_ENV !== 'test') {
        await redis.setex(cacheKey, 10, JSON.stringify(leaderboard)).catch(() => {})
      }
    }

    let currentUser: { rank: number; totalPoints: number } | null = null
    if (currentUserId) {
      const myScore = await prisma.userScore.findUnique({ where: { userId: currentUserId } })
      const myPoints = myScore?.totalPoints ?? 0
      const higherRanked = await prisma.userScore.count({ where: { totalPoints: { gt: myPoints } } })
      currentUser = { rank: higherRanked + 1, totalPoints: myPoints }
    }

    return reply.send({ leaderboard, currentUser })
  })
}
