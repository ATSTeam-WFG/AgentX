import { apiFetch } from '../api';

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
