import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../db'
import { notFound } from '../../lib/errors'

const ListQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export async function adminGoldenPointsRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply) => {
    const parsed = ListQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: parsed.error.issues[0].message })
    }
    const { status, limit, offset } = parsed.data

    const validStatuses = ['pending', 'ai_scored', 'flagged_for_review', 'approved', 'rejected']
    const statusFilter = status && validStatuses.includes(status) ? status : undefined

    const submissions = await prisma.goldenPointsSubmission.findMany({
      where: statusFilter ? { status: statusFilter as never } : undefined,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    return reply.send(
      submissions.map((s) => ({
        id: s.id,
        userName: s.user.name,
        userEmail: s.user.email,
        text: s.text,
        wordCount: s.wordCount,
        aiScore: s.aiScore,
        aiFeedback: s.aiFeedback,
        status: s.status,
        pointsAwarded: s.pointsAwarded,
        submittedAt: s.createdAt,
      })),
    )
  })

  // Read-only admin view — no approve/skip endpoints.
  // AI scoring is fully automated; admin uses the list endpoint to review insights.
  // If a specific submission is needed:
  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const submission = await prisma.goldenPointsSubmission.findUnique({
      where: { id: request.params.id },
      include: { user: { select: { name: true, email: true } } },
    })
    if (!submission) throw notFound('Submission not found')

    return reply.send({
      id: submission.id,
      userName: submission.user.name,
      userEmail: submission.user.email,
      text: submission.text,
      wordCount: submission.wordCount,
      aiScore: submission.aiScore,
      aiFeedback: submission.aiFeedback,
      status: submission.status,
      pointsAwarded: submission.pointsAwarded,
      submittedAt: submission.createdAt,
    })
  })
}
