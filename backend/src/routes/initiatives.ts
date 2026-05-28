import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { authenticate } from '../plugins/auth'
import { badRequest } from '../lib/errors'

const NoteBodySchema = z.object({
  initiativeName: z.string().min(1).max(200),
  noteText: z.string().min(1).max(5000),
})

export async function initiativesRoutes(fastify: FastifyInstance) {
  fastify.get('/initiatives', async (_request, reply) => {
    const initiatives = await prisma.initiative.findMany({ orderBy: { displayOrder: 'asc' } })
    return reply.send({ initiatives })
  })

  fastify.get('/initiative-notes', { preHandler: [authenticate] }, async (request: FastifyRequest, reply) => {
    const userId = request.user.sub
    const notes = await prisma.initiativeNote.findMany({ where: { userId } })
    return reply.send({ notes: notes.map((n) => ({ initiativeName: n.initiativeName, noteText: n.noteText })) })
  })

  fastify.post('/initiative-notes', { preHandler: [authenticate] }, async (request: FastifyRequest, reply) => {
    const userId = request.user.sub
    const parsed = NoteBodySchema.safeParse(request.body)
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message)
    const { initiativeName, noteText } = parsed.data

    await prisma.initiativeNote.upsert({
      where: { userId_initiativeName: { userId, initiativeName } },
      update: { noteText },
      create: { userId, initiativeName, noteText },
    })

    return reply.status(201).send({ ok: true })
  })
}
