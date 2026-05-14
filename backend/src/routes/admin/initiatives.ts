import { FastifyInstance } from 'fastify'

export async function adminInitiativesRoutes(fastify: FastifyInstance) {
  fastify.post('/', async () => {
    return { ok: true, message: 'not implemented' }
  })

  fastify.put('/:id', async () => {
    return { ok: true, message: 'not implemented' }
  })

  fastify.delete('/:id', async () => {
    return { ok: true, message: 'not implemented' }
  })
}
