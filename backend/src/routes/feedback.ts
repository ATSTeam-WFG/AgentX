import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { authenticate } from '../plugins/auth'
import { notFound, badRequest } from '../lib/errors'

const EventFeedbackSchema = z.object({
  ratings: z.record(z.string(), z.number().int().min(1).max(5)),
  comment: z.string().max(2000).optional(),
})

const AppFeedbackSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
  comment: z.string().max(2000).optional(),
  isAnonymous: z.boolean().default(false),
})

export async function feedbackRoutes(fastify: FastifyInstance) {
  fastify.post<{ Params: { id: string } }>(
    '/agenda-events/:id/feedback',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user.sub
      const { id: agendaEventId } = request.params

      const parsed = EventFeedbackSchema.safeParse(request.body)
      if (!parsed.success) throw badRequest(parsed.error.issues[0].message)

      const event = await prisma.agendaEvent.findUnique({ where: { id: agendaEventId } })
      if (!event) throw notFound('Agenda event not found')

      await prisma.eventFeedback.create({
        data: {
          agendaEventId,
          userId,
          ratingsJson: parsed.data.ratings as object,
          comment: parsed.data.comment ?? null,
        },
      })

      return reply.status(201).send({ ok: true })
    },
  )

  fastify.post(
    '/feedback',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user.sub

      const parsed = AppFeedbackSchema.safeParse(request.body)
      if (!parsed.success) throw badRequest(parsed.error.issues[0].message)

      await prisma.appFeedback.create({
        data: {
          userId: parsed.data.isAnonymous ? null : userId,
          answersJson: parsed.data.answers as object,
          comment: parsed.data.comment ?? null,
          isAnonymous: parsed.data.isAnonymous,
        },
      })

      return reply.status(201).send({ ok: true })
    },
  )
}
