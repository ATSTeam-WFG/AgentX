import { FastifyInstance } from 'fastify'

export async function adminUsersRoutes(fastify: FastifyInstance) {
  fastify.get('/', async () => {
    return { ok: true, message: 'not implemented' }
  })

  fastify.get('/:id', async () => {
    return { ok: true, message: 'not implemented' }
  })

  fastify.post('/:id/points', async () => {
    return { ok: true, message: 'not implemented' }
  })

  fastify.post('/:id/approve', async () => {
    return { ok: true, message: 'not implemented' }
  })
}
