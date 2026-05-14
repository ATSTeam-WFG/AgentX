import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { authenticate } from '../plugins/auth'
import { notFound, badRequest } from '../lib/errors'

const TIER_ORDER: Record<string, number> = { title: 0, gold: 1, silver: 2, partner: 3 }

const ImpressionBodySchema = z.object({
  surface: z.enum(['home', 'profile', 'agenda']),
})

export async function sponsorsRoutes(fastify: FastifyInstance) {
  fastify.get('/sponsors', async (_request, reply) => {
    const sponsors = await prisma.sponsor.findMany({ orderBy: { displayOrder: 'asc' } })
    sponsors.sort((a, b) => {
      const tierDiff = (TIER_ORDER[a.tier] ?? 99) - (TIER_ORDER[b.tier] ?? 99)
      return tierDiff !== 0 ? tierDiff : a.displayOrder - b.displayOrder
    })
    return reply.send({ sponsors })
  })

  fastify.post<{ Params: { id: string } }>(
    '/sponsors/:id/impression',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user.sub
      const sponsorId = request.params.id

      const parsed = ImpressionBodySchema.safeParse(request.body)
      if (!parsed.success) throw badRequest('surface must be one of: home, profile, agenda')

      const sponsor = await prisma.sponsor.findUnique({ where: { id: sponsorId } })
      if (!sponsor) throw notFound('Sponsor not found')

      await prisma.sponsorImpression.create({
        data: { sponsorId, userId, surface: parsed.data.surface },
      })

      return reply.status(201).send({ ok: true })
    },
  )
}
