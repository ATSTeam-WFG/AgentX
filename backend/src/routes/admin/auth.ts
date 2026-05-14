import { FastifyInstance } from 'fastify'

export async function adminAuthRoutes(fastify: FastifyInstance) {
  fastify.post('/login', async () => {
    return { ok: true, message: 'not implemented' }
  })
}
