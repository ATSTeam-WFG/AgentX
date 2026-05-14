import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { parse } from 'csv-parse/sync'
import { prisma } from '../../db'
import { badRequest, conflict } from '../../lib/errors'

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

const RowSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().toLowerCase().trim(),
  attendee_type: z.enum(['invited', 'walk_in']).default('invited'),
})

export async function adminInviteesRoutes(fastify: FastifyInstance) {
  fastify.post('/upload', async (request, reply) => {
    const file = await request.file()
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

  fastify.post('/', async (request: FastifyRequest, reply) => {
    const parsed = CreateInviteeSchema.safeParse(request.body)
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message)
    const { name, email, attendeeType } = parsed.data

    const existing = await prisma.invitee.findUnique({ where: { email } })
    if (existing) throw conflict(`Invitee with email ${email} already exists`)

    const invitee = await prisma.invitee.create({ data: { name, email, attendeeType } })
    return reply.status(201).send({ invitee })
  })
}
