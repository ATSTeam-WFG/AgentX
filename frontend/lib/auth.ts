const TOKEN_KEY = 'agentx_token';
const ADMIN_TOKEN_KEY = 'agentx_admin_token';

// ── Admin roles ───────────────────────────────────────────────────────────────

export type AdminRole = 'super_admin' | 'moderator' | 'support';

const ROLE_RANK: Record<AdminRole, number> = {
  support:     0,
  moderator:   1,
  super_admin: 2,
};

/** Decode the admin role from the stored admin JWT. Returns null if not present or unparseable. */
export function decodeAdminRole(): AdminRole | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const decoded = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return (decoded.role as AdminRole) ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns true if `role` meets the minimum required role.
 * Safe to call with null (returns false).
 */
export function canDo(role: AdminRole | null, minRole: AdminRole): boolean {
  if (!role) return false;
  return (ROLE_RANK[role] ?? -1) >= ROLE_RANK[minRole];
}

export interface JwtClaims {
  sub: string;           // userId
  tokenId: string;
  name: string;
  email: string;
  attendeeType: string;
  exp: number;
  iat: number;
}

export function saveToken(token: string): void {
  if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, token);
}

export function readToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
}

export function saveAdminToken(token: string): void {
  if (typeof window !== 'undefined') localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function readAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function clearAdminToken(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function decodeToken(token: string): JwtClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const decoded = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return decoded as JwtClaims;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const claims = decodeToken(token);
  if (!claims) return true;
  return claims.exp * 1000 < Date.now();
}
