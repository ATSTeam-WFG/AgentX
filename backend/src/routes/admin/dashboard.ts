import { FastifyInstance } from 'fastify'

export async function adminDashboardRoutes(fastify: FastifyInstance) {
  fastify.get('/', async () => {
    return { ok: true, message: 'not implemented' }
  })
}
