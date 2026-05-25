import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { notFound } from '../lib/errors'

const AgendaQuerySchema = z.object({
  since: z.coerce.number().int().min(0).optional(),
})

function mapEvent(event: {
  id: string; day: number; name: string; description: string | null;
  location: string; speaker: string | null; startsAt: Date; endsAt: Date; version: number;
}) {
  return {
    id: event.id,
    day: event.day,
    name: event.name,
    description: event.description ?? undefined,
    location: event.location,
    speakerName: event.speaker ?? undefined,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    version: event.version,
  }
}

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

    return reply.send({ version: latest._max.version ?? 0, events: events.map(mapEvent) })
  })

  fastify.get('/agenda/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const event = await prisma.agendaEvent.findUnique({ where: { id: request.params.id } })
    if (!event) throw notFound('Agenda event not found')
    return reply.send(mapEvent(event))
  })
}
