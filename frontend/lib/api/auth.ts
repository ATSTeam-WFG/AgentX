import { apiFetch } from '../api';
import { saveAdminToken } from '../auth';

export interface User {
  id: string;
  name: string;
  email: string;
  attendeeType: 'invited' | 'walk_in';
  pendingAdminApproval: boolean;
  avatarUrl?: string;
  onboardingInterests?: string[];
}

export interface AuthResponse {
  token: string;
  user: User;
  status: 'active' | 'pending_approval';
}

export const signup = (name: string, email: string) =>
  apiFetch<AuthResponse>('/v1/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email }),
    skipAuth: true,
  });

export const login = (name: string, email: string) =>
  apiFetch<AuthResponse>('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ name, email }),
    skipAuth: true,
  });

export const refreshToken = () =>
  apiFetch<{ token: string }>('/v1/auth/refresh', { method: 'POST' });

export const logout = () =>
  apiFetch<void>('/v1/auth/logout', { method: 'POST' });

export async function adminLogin(email: string, password: string): Promise<{ token: string; admin: { id: string; email: string; role: string } }> {
  const res = await apiFetch<{ token: string; admin: { id: string; email: string; role: string } }>(
    '/v1/admin/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }), skipAuth: true },
  );
  saveAdminToken(res.token);
  return res;
}
