import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'

const SyncQuerySchema = z.object({
  since: z.coerce.number().int().min(0).optional(),
})

export async function syncRoutes(fastify: FastifyInstance) {
  fastify.get('/sync', async (request, reply) => {
    const { since } = SyncQuerySchema.parse(request.query)
    const sinceDate = since !== undefined ? new Date(since) : undefined
    const now = new Date()

    const [agenda, announcements, initiatives, sponsors] = await Promise.all([
      prisma.agendaEvent.findMany({
        where: sinceDate ? { updatedAt: { gt: sinceDate } } : undefined,
        orderBy: [{ day: 'asc' }, { startsAt: 'asc' }],
      }),
      prisma.announcement.findMany({
        where: {
          ...(sinceDate ? { publishedAt: { gt: sinceDate } } : {}),
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { publishedAt: 'desc' },
      }),
      sinceDate
        ? Promise.resolve([])
        : prisma.initiative.findMany({ orderBy: { displayOrder: 'asc' } }),
      sinceDate
        ? Promise.resolve([])
        : prisma.sponsor.findMany({ orderBy: { displayOrder: 'asc' } }),
    ])

    return reply.send({ agenda, announcements, initiatives, sponsors, serverTime: now.toISOString() })
  })
}
