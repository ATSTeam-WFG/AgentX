import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      sub: string
      tokenId?: string
      aud?: string
      role?: string
      name?: string
      email?: string
      attendeeType?: string
    }
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
    if (request.user.aud === 'admin') {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Admin token cannot be used on user routes' })
    }
  } catch {
    return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Invalid or missing token' })
  }
}

export async function authenticateAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
    if (request.user.aud !== 'admin') {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Admin access required' })
    }
    const { tokenId } = request.user
    if (tokenId) {
      const session = await prisma.adminSession.findUnique({ where: { tokenId } })
      if (!session || session.revokedAt !== null || session.expiresAt < new Date()) {
        return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Admin session expired or revoked' })
      }
    }
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err) throw err
    return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Invalid or missing admin token' })
  }
}
