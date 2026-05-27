import { FastifyInstance, FastifyRequest } from 'fastify'
import { prisma } from '../../db'
import { notFound } from '../../lib/errors'
import { broadcastAll } from '../../ws-connections'
import { makeWsMessage } from '../../ws-events'

export async function adminFeaturesRoutes(fastify: FastifyInstance) {

  // GET /v1/admin/features — full records with metadata for the Control Panel
  fastify.get('/features', async () => {
    return prisma.appConfig.findMany({
      orderBy: { key: 'asc' },
    })
  })

  // PATCH /v1/admin/features/:key — toggle or set a specific flag
  fastify.patch(
    '/features/:key',
    async (request: FastifyRequest<{ Params: { key: string }; Body: { value: boolean } }>, reply) => {
      const { key } = request.params
      const { value } = request.body
      const adminId = request.user.sub

      const existing = await prisma.appConfig.findUnique({ where: { key } })
      if (!existing) throw notFound(`Feature flag "${key}" not found`)

      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.appConfig.update({
          where: { key },
          data: { value, updatedByAdminId: adminId },
        })
        await tx.auditLog.create({
          data: {
            adminUserId: adminId,
            action: 'toggle_feature',
            targetType: 'AppConfig',
            targetId: key,
            payloadJson: { previousValue: existing.value, newValue: value },
          },
        })
        return result
      })

      broadcastAll(makeWsMessage({ event: 'features.updated', data: { key, value } }))
      return reply.send(updated)
    },
  )
}
