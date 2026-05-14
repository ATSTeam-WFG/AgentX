import { FastifyInstance } from 'fastify'

export async function initiativesRoutes(fastify: FastifyInstance) {
  fastify.get('/initiatives', async () => {
    return { ok: true, message: 'not implemented' }
  })
}
