import { FastifyInstance } from 'fastify'

export async function adminInviteesRoutes(fastify: FastifyInstance) {
  fastify.post('/upload', async () => {
    return { ok: true, message: 'not implemented' }
  })

  fastify.get('/', async () => {
    return { ok: true, message: 'not implemented' }
  })

  fastify.post('/', async () => {
    return { ok: true, message: 'not implemented' }
  })
}
