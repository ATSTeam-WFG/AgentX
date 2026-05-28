import { FastifyInstance } from 'fastify'
import { requireMinRole } from '../../lib/role-guard'
import { z } from 'zod'
import { prisma } from '../../db'

const ListQuerySchema = z.object({
  status: z.enum(['pending', 'running', 'done', 'failed']).optional(),
  type: z.enum(['avatar_generation', 'golden_points_scoring', 'push_notification']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const IdParamSchema = z.object({ id: z.string().uuid() })

export async function adminJobsRoutes(fastify: FastifyInstance) {
  // GET /v1/admin/jobs
  fastify.get('/', async (request, reply) => {
    requireMinRole('moderator', request)
    const parsed = ListQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: parsed.error.issues[0].message })
    }
    const { status, type, limit, offset } = parsed.data

    const where = {
      ...(status ? { status } : {}),
      ...(type   ? { type   } : {}),
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.job.count({ where }),
    ])

    return reply.send({ jobs, total, limit, offset })
  })

  // GET /v1/admin/jobs/:id
  fastify.get('/:id', async (request, reply) => {
    requireMinRole('moderator', request)
    const parsed = IdParamSchema.safeParse(request.params)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Invalid job ID' })
    }
    const job = await prisma.job.findUnique({ where: { id: parsed.data.id } })
    if (!job) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Job not found' })
    return reply.send(job)
  })

  // POST /v1/admin/jobs/:id/retry
  fastify.post('/:id/retry', async (request, reply) => {
    requireMinRole('moderator', request)
    const parsed = IdParamSchema.safeParse(request.params)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Invalid job ID' })
    }

    const job = await prisma.job.findUnique({ where: { id: parsed.data.id } })
    if (!job) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Job not found' })
    if (job.status !== 'failed') {
      return reply.status(409).send({ error: 'CONFLICT', message: 'Only failed jobs can be retried' })
    }

    const updated = await prisma.job.update({
      where: { id: parsed.data.id },
      data: {
        status: 'pending',
        attempts: 0,
        lastError: null,
        lockedBy: null,
        lockedUntil: null,
        completedAt: null,
      },
    })

    return reply.send(updated)
  })
}
