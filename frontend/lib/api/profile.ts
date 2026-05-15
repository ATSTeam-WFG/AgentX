import { apiFetch } from '../api';
import type { User } from './auth';

interface MeApiResponse {
  user: User & { createdAt: string };
  score: {
    totalPoints: number;
    activitiesCompleted: number;
    rank: number;
  };
}

export interface UserProfile extends User {
  totalPoints: number;
  activitiesCompleted: number;
  rank: number;
}

export const getMe = async (): Promise<UserProfile> => {
  const { user, score } = await apiFetch<MeApiResponse>('/v1/me');
  return { ...user, ...score };
};

export const patchMe = (data: Partial<Pick<User, 'avatarUrl' | 'onboardingInterests'>>) =>
  apiFetch<{ user: User }>('/v1/me', { method: 'PATCH', body: JSON.stringify(data) });

export const getHistory = () =>
  apiFetch<{ submissions: unknown[] }>('/v1/me/history');
