import { FastifyRequest, FastifyReply } from 'fastify'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      sub: string
      tokenId?: string
      aud?: string
      role?: string
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
  } catch {
    return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Invalid or missing admin token' })
  }
}
