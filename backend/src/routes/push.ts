import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { authenticate } from '../plugins/auth'

const SubscribeBody = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth:   z.string().min(1),
  }),
})

const UnsubscribeBody = z.object({
  endpoint: z.string().min(1),
})

export async function pushRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate)

  fastify.post('/subscribe', async (request, reply) => {
    const userId = (request.user as { sub: string }).sub
    const parsed = SubscribeBody.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.issues[0].message })
    }

    const { endpoint, keys } = parsed.data
    await prisma.pushSubscription.upsert({
      where:  { endpoint },
      create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      update: { userId, p256dh: keys.p256dh, auth: keys.auth },
    })
    return reply.status(201).send({ ok: true })
  })

  fastify.delete('/subscribe', async (request, reply) => {
    const parsed = UnsubscribeBody.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: parsed.error.issues[0].message })
    }
    await prisma.pushSubscription.deleteMany({ where: { endpoint: parsed.data.endpoint } })
    return reply.send({ ok: true })
  })
}
