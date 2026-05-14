import { FastifyInstance } from 'fastify'
import { authenticate } from '../../plugins/auth'

export async function promptChallengeRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate)

  fastify.get('/questions', async () => {
    return { ok: true, message: 'not implemented' }
  })

  fastify.post('/answer', async () => {
    return { ok: true, message: 'not implemented' }
  })
}
