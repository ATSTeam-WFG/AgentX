import { FastifyInstance } from 'fastify'
import { randomUUID } from 'crypto'
import { prisma } from '../../db'
import { authenticate } from '../../plugins/auth'
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors'
import { uploadBuffer } from '../../lib/storage'

export async function avatarRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate)

  // POST /v1/activities/avatar/upload
  // Accepts multipart: field "selfie" (image) + field "backdropId" ("1" or "2")
  // Uploads selfie to R2, creates avatar_generation job, awards 50pts (first time only)
  fastify.post('/upload', async (request, reply) => {
    const userId = request.user.sub

    const parts = request.parts()
    let selfieBuffer: Buffer | null = null
    let selfieContentType = 'image/jpeg'
    let backdropId = '1'

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
    if (backdropId !== '1' && backdropId !== '2') throw badRequest('backdropId must be "1" or "2"')

    const activity = await prisma.activity.findFirst({ where: { type: 'avatar' } })
    if (!activity) throw notFound('Avatar activity not found')
    if (!activity.isOpen) throw badRequest('Avatar activity is not currently open')

    const ext = selfieContentType === 'image/png' ? 'png' : 'jpg'
    const selfieKey = `selfies/${userId}/${randomUUID()}.${ext}`

    await uploadBuffer(selfieKey, selfieBuffer, selfieContentType)

    const dedupeKey = `avatar_upload_${userId}`
    const existingSub = await prisma.submission.findUnique({ where: { clientDedupeKey: dedupeKey } })
    const isFirstTime = !existingSub

    const job = await prisma.$transaction(async (tx) => {
      const newJob = await tx.job.create({
        data: {
          type: 'avatar_generation',
          payloadJson: { selfieKey, backdropId, userId },
        },
      })

      if (isFirstTime) {
        await tx.submission.create({
          data: {
            userId,
            activityId: activity.id,
            kind: 'avatar_upload',
            clientDedupeKey: dedupeKey,
          },
        })

        await tx.userScore.upsert({
          where: { userId },
          update: { totalPoints: { increment: 50 } },
          create: { userId, totalPoints: 50, activitiesCompleted: 1 },
        })
      }

      return newJob
    })

    return reply.status(201).send({ jobId: job.id, pointsAwarded: isFirstTime ? 50 : 0 })
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
        update: { totalPoints: { increment: 100 } },
        create: { userId, totalPoints: 100, activitiesCompleted: 0 },
      })
    })

    return reply.send({ pointsAwarded: 100 })
  })
}
