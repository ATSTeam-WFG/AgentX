import { sign } from 'jsonwebtoken'
import { config } from '../../config'
import { prisma } from '../../db'

export function signTestToken(userId: string, tokenId = 'test-session-token'): string {
  return sign({ sub: userId, tokenId }, config.JWT_SECRET, { expiresIn: '1h' })
}

export function signAdminToken(adminId: string, role = 'super_admin'): string {
  return sign({ sub: adminId, aud: 'admin', role }, config.JWT_SECRET, { expiresIn: '1h' })
}

export async function createTestUser(opts: {
  name?: string
  email?: string
  invited?: boolean
} = {}) {
  const name = opts.name ?? 'Test User'
  const email = opts.email ?? `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

  let inviteeId: string | undefined
  if (opts.invited) {
    const inv = await prisma.invitee.create({ data: { name, email, attendeeType: 'invited' } })
    inviteeId = inv.id
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      attendeeType: opts.invited ? 'invited' : 'walk_in',
      pendingAdminApproval: !opts.invited,
      ...(inviteeId ? { inviteeId } : {}),
    },
  })
  await prisma.userScore.create({ data: { userId: user.id } })

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  const token = signTestToken(user.id, session.tokenId)
  return { user, session, token }
}
