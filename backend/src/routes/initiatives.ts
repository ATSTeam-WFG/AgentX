import { FastifyInstance } from 'fastify'
import { prisma } from '../db'

export async function initiativesRoutes(fastify: FastifyInstance) {
  fastify.get('/initiatives', async (_request, reply) => {
    const initiatives = await prisma.initiative.findMany({ orderBy: { displayOrder: 'asc' } })
    return reply.send({ initiatives })
  })
}
