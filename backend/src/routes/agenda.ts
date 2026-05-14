import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'

const AgendaQuerySchema = z.object({
  since: z.coerce.number().int().min(0).optional(),
})

export async function agendaRoutes(fastify: FastifyInstance) {
  fastify.get('/agenda', async (request, reply) => {
    const { since } = AgendaQuerySchema.parse(request.query)

    const [events, latest] = await Promise.all([
      prisma.agendaEvent.findMany({
        where: since !== undefined ? { version: { gt: since } } : undefined,
        orderBy: [{ day: 'asc' }, { startsAt: 'asc' }],
      }),
      prisma.agendaEvent.aggregate({ _max: { version: true } }),
    ])

    return reply.send({ version: latest._max.version ?? 0, events })
  })
}
