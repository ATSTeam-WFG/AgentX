import { FastifyInstance, FastifyRequest } from 'fastify'
import { prisma } from '../../db'
import { notFound } from '../../lib/errors'
import { broadcastAll } from '../../ws-connections'
import { makeWsMessage } from '../../ws-events'

export async function adminActivitiesRoutes(fastify: FastifyInstance) {
  fastify.post('/:id/toggle', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { id } = request.params
    const adminId = request.user.sub

    const activity = await prisma.activity.findUnique({ where: { id } })
    if (!activity) throw notFound('Activity not found')

    const newIsOpen = !activity.isOpen

    await prisma.$transaction(async (tx) => {
      await tx.activity.update({ where: { id }, data: { isOpen: newIsOpen } })
      await tx.auditLog.create({
        data: {
          adminUserId: adminId,
          action: 'toggle_activity',
          targetType: 'Activity',
          targetId: id,
          payloadJson: { previousIsOpen: activity.isOpen, newIsOpen },
        },
      })
    })

    broadcastAll(makeWsMessage({ event: 'activity.changed', data: { id, isOpen: newIsOpen } }))
    return reply.send({ id, isOpen: newIsOpen })
  })
}
