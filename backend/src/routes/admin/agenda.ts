import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../db'
import { badRequest, notFound } from '../../lib/errors'
import { requireMinRole } from '../../lib/role-guard'
import { broadcastAll } from '../../ws-connections'
import { makeWsMessage } from '../../ws-events'

const CreateSchema = z.object({
  day: z.number().int().min(1).max(3),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  location: z.string().min(1).max(200),
  speaker: z.string().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
})

const UpdateSchema = CreateSchema.partial()

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

export async function adminAgendaRoutes(fastify: FastifyInstance) {
  fastify.post('/', async (request, reply) => {
    requireMinRole('moderator', request)
    const parsed = CreateSchema.safeParse(request.body)
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message)
    const { day, name, description, location, speaker, startsAt, endsAt } = parsed.data
    const adminId = request.user.sub

    const event = await prisma.$transaction(async (tx) => {
      const e = await tx.agendaEvent.create({
        data: {
          day,
          name,
          description: description ?? null,
          location,
          speaker: speaker ?? null,
          startsAt: new Date(startsAt),
          endsAt: new Date(endsAt),
        },
      })
      await tx.auditLog.create({
        data: {
          adminUserId: adminId,
          action: 'create_agenda_event',
          targetType: 'AgendaEvent',
          targetId: e.id,
          payloadJson: { name },
        },
      })
      return e
    })

    broadcastAll(makeWsMessage({ event: 'agenda.changed', data: { action: 'created', eventId: event.id } }))
    return reply.status(201).send(mapEvent(event))
  })

  fastify.put('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    requireMinRole('moderator', request)
    const { id } = request.params
    const adminId = request.user.sub

    const parsed = UpdateSchema.safeParse(request.body)
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message)
    const data = parsed.data

    const existing = await prisma.agendaEvent.findUnique({ where: { id } })
    if (!existing) throw notFound('Agenda event not found')

    const event = await prisma.$transaction(async (tx) => {
      const e = await tx.agendaEvent.update({
        where: { id },
        data: {
          ...(data.day !== undefined && { day: data.day }),
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.location !== undefined && { location: data.location }),
          ...(data.speaker !== undefined && { speaker: data.speaker }),
          ...(data.startsAt !== undefined && { startsAt: new Date(data.startsAt) }),
          ...(data.endsAt !== undefined && { endsAt: new Date(data.endsAt) }),
          version: { increment: 1 },
        },
      })
      await tx.auditLog.create({
        data: {
          adminUserId: adminId,
          action: 'update_agenda_event',
          targetType: 'AgendaEvent',
          targetId: id,
          payloadJson: data,
        },
      })
      return e
    })

    broadcastAll(makeWsMessage({ event: 'agenda.changed', data: { action: 'updated', eventId: id } }))
    return reply.send(mapEvent(event))
  })

  fastify.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    requireMinRole('moderator', request)
    const { id } = request.params
    const adminId = request.user.sub

    const existing = await prisma.agendaEvent.findUnique({ where: { id } })
    if (!existing) throw notFound('Agenda event not found')

    await prisma.$transaction(async (tx) => {
      await tx.agendaEvent.delete({ where: { id } })
      await tx.auditLog.create({
        data: {
          adminUserId: adminId,
          action: 'delete_agenda_event',
          targetType: 'AgendaEvent',
          targetId: id,
          payloadJson: { name: existing.name },
        },
      })
    })

    broadcastAll(makeWsMessage({ event: 'agenda.changed', data: { action: 'deleted', eventId: id } }))
    return reply.send({ ok: true })
  })
}
