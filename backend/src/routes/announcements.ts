import { FastifyInstance } from 'fastify'
import { prisma } from '../db'

export async function announcementsRoutes(fastify: FastifyInstance) {
  fastify.get('/announcements', async (_request, reply) => {
    const now = new Date()
    const announcements = await prisma.announcement.findMany({
      where: { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      orderBy: { publishedAt: 'desc' },
      include: { publishedBy: { select: { id: true, email: true, role: true } } },
    })
    return reply.send({ announcements })
  })
}
