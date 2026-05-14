import { FastifyInstance } from 'fastify'
import { authenticate } from '../../plugins/auth'

export async function activitiesRoutes(fastify: FastifyInstance) {
  fastify.get('/activities', { preHandler: [authenticate] }, async () => {
    return { ok: true, message: 'not implemented' }
  })
}
