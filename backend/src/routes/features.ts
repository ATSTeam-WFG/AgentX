import { FastifyInstance } from 'fastify'
import { prisma } from '../db'

export async function featuresRoutes(fastify: FastifyInstance) {
  // GET /v1/features — public, no auth required
  // Returns a flat map of all feature flag keys → boolean values.
  // Frontend fetches this on app init and via WebSocket updates.
  fastify.get('/features', async () => {
    const rows = await prisma.appConfig.findMany({
      select: { key: true, value: true },
    })
    return Object.fromEntries(rows.map((r) => [r.key, r.value]))
  })
}
