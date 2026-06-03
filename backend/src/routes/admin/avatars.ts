import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../db'

const ListAvatarsQuerySchema = z.object({
  search: z.string().optional(),
  limit:  z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
})

export async function adminAvatarsRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    const query = ListAvatarsQuerySchema.parse(request.query)

    const where = {
      avatarUrl: { not: null },
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, avatarUrl: true },
        orderBy: { name: 'asc' },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.user.count({ where }),
    ])

    return reply.send({
      avatars: users.map((u) => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl! })),
      total,
      limit: query.limit,
      offset: query.offset,
    })
  })
}
