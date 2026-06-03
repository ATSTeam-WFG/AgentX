import { FastifyInstance } from 'fastify'
import { randomUUID } from 'crypto'
import { prisma } from '../../db'
import { authenticate } from '../../plugins/auth'
import { badRequest, conflict, forbidden, notFound, unauthorized } from '../../lib/errors'
import { uploadBuffer, downloadBuffer, publicUrl } from '../../lib/storage'
import { config } from '../../config'

export async function avatarRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate)

  // POST /v1/activities/avatar/upload
  // Accepts multipart: field "selfie" (image). Returns existing job if one is already pending/running.
  fastify.post('/upload', async (request, reply) => {
    const userId = request.user.sub

    const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!userExists) throw unauthorized('User not found — please log in again')

    const parts = request.parts()
    let selfieBuffer: Buffer | null = null
    let selfieContentType = 'image/jpeg'
    let backdropId: string | null = null

    for await (const part of parts) {
      if (part.type === 'file' && part.fieldname === 'selfie') {
        selfieBuffer = await part.toBuffer()
        selfieContentType = part.mimetype
      } else if (part.type === 'field' && part.fieldname === 'backdropId') {
        backdropId = part.value as string
      }
    }

    if (!selfieBuffer || selfieBuffer.length === 0) throw badRequest('No selfie file provided')
    if (!selfieContentType.startsWith('image/')) throw badRequest('File must be an image')
    if (!backdropId || !['1', '2'].includes(backdropId)) throw badRequest('Invalid or missing backdropId')

    const activity = await prisma.activity.findFirst({ where: { type: 'avatar' } })
    if (!activity) throw notFound('Avatar activity not found')
    if (!activity.isOpen) throw badRequest('Avatar activity is not currently open')

    const dedupeKey = `avatar_upload_${userId}`
    const [existingUser, existingJob, existingSub] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } }),
      prisma.job.findFirst({
        where: { type: 'avatar_generation', status: { in: ['pending', 'running'] }, payloadJson: { path: ['userId'], equals: userId } },
        select: { id: true },
      }),
      prisma.submission.findUnique({ where: { clientDedupeKey: dedupeKey }, select: { id: true } }),
    ])

    if (existingUser?.avatarUrl) throw conflict('Avatar already generated')
    if (existingJob) return reply.status(200).send({ jobId: existingJob.id })

    const ext = selfieContentType === 'image/png' ? 'png' : 'jpg'
    const selfieKey = `selfies/${userId}/${randomUUID()}.${ext}`

    await uploadBuffer(selfieKey, selfieBuffer, selfieContentType)

    const job = await prisma.$transaction(async (tx) => {
      const newJob = await tx.job.create({
        data: {
          type: 'avatar_generation',
          payloadJson: { selfieKey, backdropId, userId },
        },
      })

      if (!existingSub) {
        await tx.submission.create({
          data: {
            userId,
            activityId: activity.id,
            kind: 'avatar_upload',
            clientDedupeKey: dedupeKey,
          },
        })
      }

      return newJob
    })

    return reply.status(201).send({ jobId: job.id })
  })

  // GET /v1/activities/avatar/status/:jobId
  // Returns { status, avatarUrl? } — client polls this until status === 'done'
  fastify.get<{ Params: { jobId: string } }>('/status/:jobId', async (request, reply) => {
    const userId = request.user.sub
    const { jobId } = request.params

    const job = await prisma.job.findUnique({ where: { id: jobId } })
    if (!job) throw notFound('Job not found')

    const payload = job.payloadJson as Record<string, unknown>
    if (payload.userId !== userId) throw forbidden()

    if (job.status === 'done') {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } })
      return reply.send({ status: 'done', avatarUrl: user?.avatarUrl })
    }

    return reply.send({ status: job.status })
  })

  // POST /v1/activities/avatar/claim-print
  // Awards 100pts for claiming a physical print at the kiosk (one-time)
  fastify.post('/claim-print', async (request, reply) => {
    const userId = request.user.sub

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } })
    if (!user?.avatarUrl) throw badRequest('Generate your avatar before claiming a print')

    const dedupeKey = `avatar_print_${userId}`
    const existingSub = await prisma.submission.findUnique({ where: { clientDedupeKey: dedupeKey } })
    if (existingSub) throw conflict('Print already claimed')

    const activity = await prisma.activity.findFirst({ where: { type: 'avatar' } })
    if (!activity) throw notFound('Avatar activity not found')

    try {
      await prisma.$transaction(async (tx) => {
        await tx.submission.create({
          data: {
            userId,
            activityId: activity.id,
            kind: 'avatar_print',
            clientDedupeKey: dedupeKey,
          },
        })
        await tx.userScore.upsert({
          where: { userId },
          update: { totalPoints: { increment: 50 } },
          create: { userId, totalPoints: 50, activitiesCompleted: 0 },
        })
      })
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2002') throw conflict('Print already claimed')
      throw err
    }

    return reply.send({ pointsAwarded: 50 })
  })

  // GET /v1/activities/avatar/download
  // Proxies the current user's avatar image from R2 to avoid CORS issues on the client
  fastify.get('/download', async (request, reply) => {
    const userId = request.user.sub
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } })
    if (!user?.avatarUrl) throw notFound('No avatar found')

    const base = (config.OBJECT_STORAGE_PUBLIC_URL ?? '').replace(/\/$/, '')
    const key = user.avatarUrl.replace(`${base}/`, '')
    const imageBuffer = await downloadBuffer(key)

    reply.header('Content-Type', 'image/jpeg')
    reply.header('Content-Disposition', 'attachment; filename="executive-portrait.jpg"')
    return reply.send(imageBuffer)
  })
}
