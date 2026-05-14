import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../../db'
import { unauthorized, badRequest } from '../../lib/errors'

const AdminLoginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
})

export async function adminAuthRoutes(fastify: FastifyInstance) {
  fastify.post('/login', async (request, reply) => {
    const parsed = AdminLoginSchema.safeParse(request.body)
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message)
    const { email, password } = parsed.data

    const admin = await prisma.adminUser.findUnique({ where: { email } })
    if (!admin) throw unauthorized('Invalid credentials')

    const valid = await bcrypt.compare(password, admin.passwordHash)
    if (!valid) throw unauthorized('Invalid credentials')

    const token = fastify.jwt.sign(
      { sub: admin.id, aud: 'admin', role: admin.role },
      { expiresIn: '24h' },
    )

    return reply.send({ token, admin: { id: admin.id, email: admin.email, role: admin.role } })
  })
}
