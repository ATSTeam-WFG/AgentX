import { FastifyInstance } from 'fastify'

export async function adminGoldenPointsRoutes(fastify: FastifyInstance) {
  fastify.get('/', async () => {
    return { ok: true, message: 'not implemented' }
  })

  fastify.post('/:id/decision', async () => {
    return { ok: true, message: 'not implemented' }
  })
}
