import { apiFetch } from '../api';

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
  apiFetch<{ status: string; aiScore?: number; pointsAwarded?: number }>(
    `/v1/activities/golden-points/${id}`
  );

export const scanTouchpoint = (qrToken: string, dedupeKey: string) =>
  apiFetch<{ pointsAwarded: number; touchpoint: { name: string; locationDescription: string } }>(
    '/v1/touchpoints/scan',
    { method: 'POST', body: JSON.stringify({ qrToken, dedupeKey }) }
  );
