import { FastifyInstance } from 'fastify'

export async function adminActivitiesRoutes(fastify: FastifyInstance) {
  fastify.post('/:id/toggle', async () => {
    return { ok: true, message: 'not implemented' }
  })
}
