import { FastifyInstance } from 'fastify'
import { authenticate } from '../../plugins/auth'

export async function goldenPointsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate)

  fastify.post('/submit', async () => {
    return { ok: true, message: 'not implemented' }
  })

  fastify.get('/:id', async () => {
    return { ok: true, message: 'not implemented' }
  })
}
