import { apiFetch } from '../api';

export interface Activity {
  id: string;
  type: 'trivia' | 'avatar' | 'prompt_challenge' | 'golden_points' | 'touchpoint';
  name: string;
  max_points: number;
  is_open: boolean;
  is_one_shot: boolean;
  completed: boolean;
  points_earned: number;
}

export interface TriviaQuestion {
  id: string;
  question_text: string;
  options_json: string[];
}

export interface PromptQuestion {
  id: string;
  category: string;
  scenario_text: string;
  options_json: string[];
  user_answer?: { selected_index: number; is_correct: boolean };
}

export const getActivities = () => apiFetch<Activity[]>('/v1/activities');

export const startTrivia = () =>
  apiFetch<{ attempt_id: string; questions: TriviaQuestion[] }>(
    '/v1/activities/trivia/start', { method: 'POST' }
  );

export const completeTrivia = (
  attempt_id: string,
  answers: { question_id: string; selected_index: number }[],
  dedupeKey: string,
) =>
  apiFetch<{ points_awarded: number; correct: number; total: number }>(
    '/v1/activities/trivia/complete',
    { method: 'POST', body: JSON.stringify({ attempt_id, answers, dedupeKey }) }
  );

export const getPromptQuestions = () =>
  apiFetch<PromptQuestion[]>('/v1/activities/prompt-challenge/questions');

export const answerPrompt = (question_id: string, selected_index: number, dedupeKey: string) =>
  apiFetch<{ is_correct: boolean; points_awarded: number }>(
    '/v1/activities/prompt-challenge/answer',
    { method: 'POST', body: JSON.stringify({ question_id, selected_index, dedupeKey }) }
  );

export const submitGoldenPoints = (text: string, dedupeKey: string) =>
  apiFetch<{ id: string }>('/v1/activities/golden-points/submit', {
    method: 'POST',
    body: JSON.stringify({ text, dedupeKey }),
  });

export const getGoldenPointsStatus = (id: string) =>
  apiFetch<{ status: string; ai_score?: number; points_awarded?: number }>(
    `/v1/activities/golden-points/${id}`
  );

export const scanTouchpoint = (qr_token: string, dedupeKey: string) =>
  apiFetch<{ points_awarded: number; touchpoint: { name: string; location_description: string } }>(
    '/v1/touchpoints/scan',
    { method: 'POST', body: JSON.stringify({ qr_token, dedupeKey }) }
  );
