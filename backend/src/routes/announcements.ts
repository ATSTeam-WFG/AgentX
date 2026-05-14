import { FastifyInstance } from 'fastify'

export async function announcementsRoutes(fastify: FastifyInstance) {
  fastify.get('/announcements', async () => {
    return { ok: true, message: 'not implemented' }
  })
}
