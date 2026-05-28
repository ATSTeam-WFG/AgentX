import { FastifyRequest } from 'fastify'
import { forbidden } from './errors'

type AdminRole = 'super_admin' | 'moderator' | 'support'

const RANK: Record<AdminRole, number> = {
  support:     0,
  moderator:   1,
  super_admin: 2,
}

/**
 * Throws 403 if the authenticated admin's role is below `minRole`.
 * Call at the start of any handler that needs role-gating.
 */
export function requireMinRole(minRole: AdminRole, request: FastifyRequest): void {
  const role = (request.user as { role?: AdminRole } | undefined)?.role
  if (!role || (RANK[role] ?? -1) < RANK[minRole]) {
    const label = minRole.replace('_', ' ')
    throw forbidden(`Requires ${label} access`)
  }
}
