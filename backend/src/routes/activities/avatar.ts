import { FastifyInstance } from 'fastify'
import { authenticate } from '../../plugins/auth'

export async function avatarRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate)

  fastify.post('/upload-url', async () => {
    return { ok: true, message: 'not implemented' }
  })

  fastify.post('/generate', async () => {
    return { ok: true, message: 'not implemented' }
  })
}
