import { FastifyInstance } from 'fastify'

export async function leaderboardRoutes(fastify: FastifyInstance) {
  fastify.get('/leaderboard', async () => {
    return { ok: true, message: 'not implemented' }
  })
}
