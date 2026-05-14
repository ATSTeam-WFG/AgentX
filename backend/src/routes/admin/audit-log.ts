import { FastifyInstance } from 'fastify'

export async function adminAuditLogRoutes(fastify: FastifyInstance) {
  fastify.get('/', async () => {
    return { ok: true, message: 'not implemented' }
  })
}
