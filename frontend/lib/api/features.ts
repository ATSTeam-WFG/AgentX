import { apiFetch } from '@/lib/api';

export async function fetchFeatures(): Promise<Record<string, boolean>> {
  return apiFetch<Record<string, boolean>>('/v1/features', { skipAuth: true });
}
