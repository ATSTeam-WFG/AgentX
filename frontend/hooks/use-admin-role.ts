'use client';

import { useEffect, useState } from 'react';
import { decodeAdminRole, type AdminRole } from '@/lib/auth';

/**
 * Decodes and returns the authenticated admin's role from their JWT.
 * Returns null on the server and until the effect runs on the client.
 */
export function useAdminRole(): AdminRole | null {
  const [role, setRole] = useState<AdminRole | null>(null);
  useEffect(() => {
    setRole(decodeAdminRole());
  }, []);
  return role;
}
