import { apiFetch, ApiError } from '../api';
import { readToken } from '../auth';

export interface Activity {
  id: string;
  type: 'trivia' | 'avatar' | 'prompt_challenge' | 'golden_points' | 'touchpoint';
  name: string;
  maxPoints: number;
  isOpen: boolean;
  isOneShot: boolean;
  isCompleted: boolean;
  pointsEarned: number;
}

export interface TriviaQuestion {
  id: string;
  questionText: string;
  optionsJson: string[];
}

export interface PromptQuestion {
  id: string;
  category: string;
  scenarioText: string;
  optionsJson: string[];
  correctIndex?: number | null;
  explanation?: string | null;
  userAnswer?: { selectedIndex: number; isCorrect: boolean; pointsAwarded: number } | null;
}

export const getActivities = () =>
  apiFetch<{ activities: Activity[] }>('/v1/activities').then((r) => r.activities);

export const startTrivia = () =>
  apiFetch<{ attemptId: string; questions: TriviaQuestion[] }>(
    '/v1/activities/trivia/start', { method: 'POST' }
  );

export const completeTrivia = (
  attemptId: string,
  answers: { questionId: string; selectedIndex: number }[],
  dedupeKey: string,
) =>
  apiFetch<{ pointsAwarded: number; correctCount: number; totalQuestions: number }>(
    '/v1/activities/trivia/complete',
    { method: 'POST', body: JSON.stringify({ attemptId, answers, dedupeKey }) }
  );

export const getPromptQuestions = () =>
  apiFetch<{ questions: PromptQuestion[]; totalPoints: number }>(
    '/v1/activities/prompt-challenge/questions'
  ).then((r) => r.questions);

export const answerPrompt = (questionId: string, selectedIndex: number, dedupeKey: string) =>
  apiFetch<{ isCorrect: boolean; pointsAwarded: number; explanation: string; correctIndex: number }>(
    '/v1/activities/prompt-challenge/answer',
    { method: 'POST', body: JSON.stringify({ questionId, selectedIndex, dedupeKey }) }
  );

export const submitGoldenPoints = (text: string, dedupeKey: string) =>
  apiFetch<{ id: string }>('/v1/activities/golden-points/submit', {
    method: 'POST',
    body: JSON.stringify({ text, dedupeKey }),
  });

export const getGoldenPointsStatus = (id: string) =>
  apiFetch<{ status: string; pointsAwarded?: number; feedback?: string }>(
    `/v1/activities/golden-points/${id}`
  );

// Avatar — multipart upload uses fetch directly (apiFetch forces application/json Content-Type)
export async function uploadSelfieAndGenerate(
  selfie: File,
): Promise<{ jobId: string; pointsAwarded: number }> {
  const formData = new FormData();
  formData.append('selfie', selfie);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const token = readToken();
  const res = await fetch(`${baseUrl}/v1/activities/avatar/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body, `${res.status} /v1/activities/avatar/upload`);
  }

  return res.json();
}

export const getAvatarStatus = (jobId: string) =>
  apiFetch<{ status: string; avatarUrl?: string }>(`/v1/activities/avatar/status/${jobId}`);

export const claimAvatarPrint = () =>
  apiFetch<{ pointsAwarded: number }>('/v1/activities/avatar/claim-print', { method: 'POST' });

export async function downloadAvatar(): Promise<Blob> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const token = readToken();
  const res = await fetch(`${baseUrl}/v1/activities/avatar/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, null, `${res.status} /v1/activities/avatar/download`);
  return res.blob();
}

export const checkinTouchpoint = (locationId: string, response: string, dedupeKey: string) =>
  apiFetch<{ pointsAwarded: number; locationId: string }>(
    '/v1/touchpoints/checkin',
    { method: 'POST', body: JSON.stringify({ locationId, response, dedupeKey }) }
  );

export const getTouchpointCheckins = () =>
  apiFetch<{ checkins: { locationId: string; pointsAwarded: number; response?: string }[] }>('/v1/touchpoints/checkins')
    .then((r) => r.checkins);
