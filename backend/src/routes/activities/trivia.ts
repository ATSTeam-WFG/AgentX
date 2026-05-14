import { FastifyInstance } from 'fastify'
import { authenticate } from '../../plugins/auth'

export async function triviaRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate)

  fastify.post('/start', async () => {
    return { ok: true, message: 'not implemented' }
  })

  fastify.post('/complete', async () => {
    return { ok: true, message: 'not implemented' }
  })
}
