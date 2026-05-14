import { FastifyInstance } from 'fastify'

export async function agendaRoutes(fastify: FastifyInstance) {
  fastify.get('/agenda', async () => {
    return { ok: true, message: 'not implemented' }
  })
}
