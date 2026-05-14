import { FastifyInstance } from 'fastify'
import { authenticate } from '../plugins/auth'

export async function feedbackRoutes(fastify: FastifyInstance) {
  fastify.post('/agenda-events/:id/feedback', { preHandler: [authenticate] }, async () => {
    return { ok: true, message: 'not implemented' }
  })

  fastify.post('/feedback', { preHandler: [authenticate] }, async () => {
    // IMPORTANT: when request.body.isAnonymous === true, strip user_id before DB insert
    return { ok: true, message: 'not implemented' }
  })
}
