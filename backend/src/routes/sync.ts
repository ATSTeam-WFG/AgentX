import { FastifyInstance } from 'fastify'

export async function syncRoutes(fastify: FastifyInstance) {
  fastify.get('/sync', async () => {
    return { ok: true, message: 'not implemented' }
  })
}
