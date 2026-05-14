import { apiFetch } from '../api';
import type { User } from './auth';

export interface UserProfile extends User {
  total_points: number;
  activities_completed: number;
  rank: number;
}

export const getMe = () => apiFetch<UserProfile>('/v1/me');

export const patchMe = (data: Partial<Pick<User, 'avatar_url' | 'onboarding_interests'>>) =>
  apiFetch<UserProfile>('/v1/me', { method: 'PATCH', body: JSON.stringify(data) });

export const getHistory = () =>
  apiFetch<{ submissions: unknown[] }>('/v1/me/history');
