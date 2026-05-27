import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { authenticate } from '../plugins/auth'
import { conflict, unauthorized, badRequest, forbidden } from '../lib/errors'

const AuthBodySchema = z.object({
  name: z.string().min(1).max(200).trim(),
  email: z.string().email().toLowerCase().trim(),
})

async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  return prisma.session.create({ data: { userId, expiresAt } })
}

function signUserJwt(fastify: FastifyInstance, userId: string, tokenId: string) {
  return fastify.jwt.sign({ sub: userId, tokenId }, { expiresIn: '7d' })
}

async function signupUser(fastify: FastifyInstance, name: string, email: string) {
  const invitee = await prisma.invitee.findUnique({
    where: { email },
    include: { user: true },
  })

  let user: Awaited<ReturnType<typeof prisma.user.create>>

  if (invitee && invitee.user !== null) {
    throw conflict('This invitation has already been claimed. Contact an administrator.')
  } else if (invitee) {
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name, email, attendeeType: 'invited', inviteeId: invitee.id, pendingAdminApproval: false },
      })
      await tx.userScore.create({ data: { userId: created.id } })
      return created
    }, { maxWait: 10000, timeout: 15000 })
  } else {
    // Walk-in path — check the checkin_open feature flag
    const checkinConfig = await prisma.appConfig.findUnique({ where: { key: 'checkin_open' } })
    if (checkinConfig && !checkinConfig.value) {
      throw forbidden('Walk-in registration is currently closed. Please contact an administrator.')
    }
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name, email, attendeeType: 'walk_in', pendingAdminApproval: true },
      })
      await tx.userScore.create({ data: { userId: created.id } })
      return created
    }, { maxWait: 10000, timeout: 15000 })
  }

  const session = await createSession(user.id)
  const token = signUserJwt(fastify, user.id, session.tokenId)

  return {
    token,
    isNewUser: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      attendeeType: user.attendeeType,
      pendingAdminApproval: user.pendingAdminApproval,
    },
    status: user.pendingAdminApproval ? 'pending_approval' : 'active',
  }
}

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/signup', async (request, reply) => {
    const parsed = AuthBodySchema.safeParse(request.body)
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message)
    const { name, email } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) throw conflict('An account with this email already exists. Use /login instead.')

    const result = await signupUser(fastify, name, email)
    return reply.status(201).send(result)
  })

  fastify.post('/login', async (request, reply) => {
    const parsed = AuthBodySchema.safeParse(request.body)
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message)
    const { name, email } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      const result = await signupUser(fastify, name, email)
      return reply.status(201).send(result)
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date(), name },
    })

    const session = await createSession(user.id)
    const token = signUserJwt(fastify, user.id, session.tokenId)

    return reply.send({
      token,
      isNewUser: false,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        attendeeType: user.attendeeType,
        pendingAdminApproval: user.pendingAdminApproval,
      },
      status: user.pendingAdminApproval ? 'pending_approval' : 'active',
    })
  })

  fastify.post('/refresh', { preHandler: [authenticate] }, async (request: FastifyRequest, reply) => {
    const { sub: userId, tokenId } = request.user
    if (!tokenId) throw unauthorized('Invalid token structure')

    const session = await prisma.session.findUnique({ where: { tokenId } })
    if (!session || session.revokedAt !== null || session.expiresAt < new Date()) {
      throw unauthorized('Session expired or revoked')
    }

    await prisma.session.update({ where: { tokenId }, data: { lastUsedAt: new Date() } })

    const newSession = await createSession(userId)
    const token = signUserJwt(fastify, userId, newSession.tokenId)

    return reply.send({ token })
  })

  fastify.post('/logout', { preHandler: [authenticate] }, async (request: FastifyRequest, reply) => {
    const { tokenId } = request.user
    if (!tokenId) throw unauthorized('Invalid token structure')

    await prisma.session.update({ where: { tokenId }, data: { revokedAt: new Date() } })

    return reply.send({ ok: true })
  })
}
