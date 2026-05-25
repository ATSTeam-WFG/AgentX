import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../db'

const QuerySchema = z.object({
  action: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export async function adminAuditLogRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    const parsed = QuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: parsed.error.issues[0].message })
    }
    const { action, limit, offset } = parsed.data

    const where = action ? { action: { contains: action } } : {}

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { adminUser: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ])

    return reply.send({
      logs: logs.map((l) => ({
        id: l.id,
        adminEmail: l.adminUser.email,
        action: l.action,
        targetType: l.targetType,
        targetId: l.targetId,
        payload: l.payloadJson,
        createdAt: l.createdAt,
      })),
      total,
      limit,
      offset,
    })
  })
}
