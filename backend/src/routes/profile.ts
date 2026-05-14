import { FastifyInstance } from 'fastify'
import { authenticate } from '../plugins/auth'

export async function profileRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate)

  fastify.get('/me', async () => {
    return { ok: true, message: 'not implemented' }
  })

  fastify.patch('/me', async () => {
    return { ok: true, message: 'not implemented' }
  })

  fastify.get('/me/history', async () => {
    return { ok: true, message: 'not implemented' }
  })
}
