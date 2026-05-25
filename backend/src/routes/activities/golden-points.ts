import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../db'
import { authenticate } from '../../plugins/auth'
import { badRequest, forbidden, notFound } from '../../lib/errors'
import { GOLDEN_POINTS_QUESTION } from '../../lib/scoring'

const SubmitBodySchema = z.object({
  text: z.string().min(1).max(10000),
  dedupeKey: z.string().min(1).max(200),
})

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export async function goldenPointsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate)

  fastify.post('/submit', async (request: FastifyRequest, reply) => {
    const userId = request.user.sub
    const parsed = SubmitBodySchema.safeParse(request.body)
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message)
    const { text } = parsed.data

    if (wordCount(text) < 50) {
      throw badRequest('Response must be at least 50 words')
    }

    // One-time submission — return existing ID if already submitted
    const existing = await prisma.goldenPointsSubmission.findFirst({ where: { userId } })
    if (existing) {
      return reply.send({ id: existing.id })
    }

    const activity = await prisma.activity.findFirst({ where: { type: 'golden_points' } })
    if (!activity || !activity.isOpen) {
      throw badRequest('Golden Points activity is not currently open')
    }

    const configJson = activity.configJson as { questionText?: string } | null
    const questionText = configJson?.questionText ?? GOLDEN_POINTS_QUESTION

    const result = await prisma.$transaction(async (tx) => {
      const submission = await tx.goldenPointsSubmission.create({
        data: { userId, text, wordCount: wordCount(text) },
      })
      await tx.job.create({
        data: {
          type: 'golden_points_scoring',
          payloadJson: { submissionId: submission.id, questionText },
        },
      })
      return submission
    })

    return reply.status(201).send({ id: result.id })
  })

  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const userId = request.user.sub
    const { id } = request.params

    const submission = await prisma.goldenPointsSubmission.findUnique({ where: { id } })
    if (!submission) throw notFound('Submission not found')
    if (submission.userId !== userId) throw forbidden()

    const { status, pointsAwarded, aiFeedback } = submission

    if (status === 'pending') {
      return reply.send({ status: 'pending' })
    }

    return reply.send({
      status: 'scored',
      pointsAwarded: status === 'rejected' ? 0 : pointsAwarded,
      feedback: aiFeedback ?? '',
    })
  })
}
