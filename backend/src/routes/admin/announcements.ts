import { FastifyInstance } from 'fastify'

export async function adminAnnouncementsRoutes(fastify: FastifyInstance) {
  fastify.post('/', async () => {
    return { ok: true, message: 'not implemented' }
  })
}
