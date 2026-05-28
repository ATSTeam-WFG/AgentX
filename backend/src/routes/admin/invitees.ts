import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { parse } from 'csv-parse/sync'
import { prisma } from '../../db'
import { badRequest, conflict, notFound } from '../../lib/errors'
import { requireMinRole } from '../../lib/role-guard'

const ListQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const CreateInviteeSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().toLowerCase().trim(),
  attendeeType: z.enum(['invited', 'walk_in']).default('invited'),
})

const EditInviteeSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().toLowerCase().trim().optional(),
  attendeeType: z.enum(['invited', 'walk_in']).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' })

const RowSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().toLowerCase().trim(),
  attendee_type: z.enum(['invited', 'walk_in']).default('invited'),
})

export async function adminInviteesRoutes(fastify: FastifyInstance) {
  // ── CSV upload ──────────────────────────────────────────────────────────────
  fastify.post('/upload', async (request, reply) => {
    requireMinRole('moderator', request)
    let file
    try {
      file = await request.file()
    } catch {
      throw badRequest('No file uploaded')
    }
    if (!file) throw badRequest('No file uploaded')
    if (!file.filename.endsWith('.csv') && !file.mimetype.includes('csv')) {
      throw badRequest('File must be a CSV')
    }

    const buffer = await file.toBuffer()
    const csvText = buffer.toString('utf-8')

    let records: Record<string, string>[]
    try {
      records = parse(csvText, { columns: true, skip_empty_lines: true, trim: true })
    } catch {
      throw badRequest('Invalid CSV format')
    }

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (const [idx, row] of records.entries()) {
      const parsed = RowSchema.safeParse(row)
      if (!parsed.success) {
        errors.push(`Row ${idx + 2}: ${parsed.error.issues[0].message}`)
        skipped++
        continue
      }
      try {
        await prisma.invitee.upsert({
          where: { email: parsed.data.email },
          update: {},
          create: {
            name: parsed.data.name,
            email: parsed.data.email,
            attendeeType: parsed.data.attendee_type,
          },
        })
        imported++
      } catch {
        errors.push(`Row ${idx + 2}: database error for ${parsed.data.email}`)
        skipped++
      }
    }

    return reply.send({ imported, skipped, errors })
  })

  // ── List ────────────────────────────────────────────────────────────────────
  fastify.get('/', async (request, reply) => {
    const { search, limit, offset } = ListQuerySchema.parse(request.query)

    const where = search
      ? {
          OR: [
            { email: { contains: search.toLowerCase() } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const [invitees, total] = await Promise.all([
      prisma.invitee.findMany({
        where,
        include: { user: { select: { id: true, name: true, attendeeType: true } } },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.invitee.count({ where }),
    ])

    return reply.send({ invitees, total, limit, offset })
  })

  // ── Create single ───────────────────────────────────────────────────────────
  fastify.post('/', async (request: FastifyRequest, reply) => {
    requireMinRole('moderator', request)
    const parsed = CreateInviteeSchema.safeParse(request.body)
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message)
    const { name, email, attendeeType } = parsed.data

    const existing = await prisma.invitee.findUnique({ where: { email } })
    if (existing) throw conflict(`Invitee with email ${email} already exists`)

    const invitee = await prisma.invitee.create({ data: { name, email, attendeeType } })
    return reply.status(201).send({ invitee })
  })

  // ── Edit ────────────────────────────────────────────────────────────────────
  fastify.patch('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    requireMinRole('moderator', request)
    const { id } = request.params

    const parsed = EditInviteeSchema.safeParse(request.body)
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message)

    const invitee = await prisma.invitee.findUnique({ where: { id } })
    if (!invitee) throw notFound('Invitee not found')

    if (parsed.data.email && parsed.data.email !== invitee.email) {
      const existing = await prisma.invitee.findUnique({ where: { email: parsed.data.email } })
      if (existing) throw conflict('Email already in use by another invitee')
    }

    const updated = await prisma.invitee.update({ where: { id }, data: parsed.data })
    return reply.send({ invitee: updated })
  })

  // ── Delete ──────────────────────────────────────────────────────────────────
  fastify.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    requireMinRole('super_admin', request)
    const { id } = request.params

    const invitee = await prisma.invitee.findUnique({
      where: { id },
      include: { user: { select: { id: true } } },
    })
    if (!invitee) throw notFound('Invitee not found')

    if (invitee.user) {
      throw conflict('Cannot delete invitee with a registered user. Delete the user account first.')
    }

    await prisma.invitee.delete({ where: { id } })
    return reply.send({ ok: true })
  })
}
