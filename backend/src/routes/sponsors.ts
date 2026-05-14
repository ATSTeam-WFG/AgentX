import { FastifyInstance } from 'fastify'
import { authenticate } from '../plugins/auth'

export async function sponsorsRoutes(fastify: FastifyInstance) {
  fastify.get('/sponsors', async () => {
    return { ok: true, message: 'not implemented' }
  })

  fastify.post('/sponsors/:id/impression', { preHandler: [authenticate] }, async () => {
    return { ok: true, message: 'not implemented' }
  })
}
