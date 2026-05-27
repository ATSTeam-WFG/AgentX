import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../db'
import { badRequest, notFound } from '../../lib/errors'
import { broadcastAll } from '../../ws-connections'
import { makeWsMessage } from '../../ws-events'

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  expiresAt: z.string().datetime().optional(),
})

export async function adminAnnouncementsRoutes(fastify: FastifyInstance) {
  fastify.post('/', async (request, reply) => {
    const parsed = CreateSchema.safeParse(request.body)
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message)
    const { title, body, expiresAt } = parsed.data
    const adminId = request.user.sub

    const announcement = await prisma.$transaction(async (tx) => {
      const a = await tx.announcement.create({
        data: {
          title,
          body,
          publishedByAdminId: adminId,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        },
      })
      await tx.auditLog.create({
        data: {
          adminUserId: adminId,
          action: 'create_announcement',
          targetType: 'Announcement',
          targetId: a.id,
          payloadJson: { title },
        },
      })
      return a
    })

    broadcastAll(makeWsMessage({
      event: 'announcements.new',
      data: { id: announcement.id, title: announcement.title, body: announcement.body },
    }))
    return reply.status(201).send({
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      publishedAt: announcement.publishedAt,
      expiresAt: announcement.expiresAt ?? null,
    })
  })

  fastify.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { id } = request.params
    const adminId = request.user.sub

    const existing = await prisma.announcement.findUnique({ where: { id } })
    if (!existing) throw notFound('Announcement not found')

    await prisma.$transaction(async (tx) => {
      await tx.announcement.delete({ where: { id } })
      await tx.auditLog.create({
        data: {
          adminUserId: adminId,
          action: 'delete_announcement',
          targetType: 'Announcement',
          targetId: id,
          payloadJson: { title: existing.title },
        },
      })
    })

    return reply.send({ ok: true })
  })
}
