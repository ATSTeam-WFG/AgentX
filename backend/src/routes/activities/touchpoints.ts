import { FastifyInstance } from 'fastify'
import { authenticate } from '../../plugins/auth'

export async function touchpointsRoutes(fastify: FastifyInstance) {
  fastify.post('/scan', { preHandler: [authenticate] }, async () => {
    return { ok: true, message: 'not implemented' }
  })
}
