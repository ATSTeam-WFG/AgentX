import { FastifyInstance } from 'fastify'
import { authenticate } from '../plugins/auth'

export async function jobsRoutes(fastify: FastifyInstance) {
  fastify.get('/jobs/:id', { preHandler: [authenticate] }, async () => {
    return { ok: true, message: 'not implemented' }
  })
}
