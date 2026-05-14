import { FastifyInstance } from 'fastify'

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/signup', async () => {
    return { ok: true, message: 'not implemented' }
  })

  fastify.post('/login', async () => {
    return { ok: true, message: 'not implemented' }
  })

  fastify.post('/refresh', async () => {
    return { ok: true, message: 'not implemented' }
  })

  fastify.post('/logout', async () => {
    return { ok: true, message: 'not implemented' }
  })
}
