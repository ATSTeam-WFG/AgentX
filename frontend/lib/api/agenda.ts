import { apiFetch } from '../api';

export interface Speaker {
  name: string;
  title: string;
  bio: string;
  photoUrl?: string;
}

export interface AgendaEvent {
  id: string;
  day: number;
  name: string;
  description?: string;
  location?: string;
  speakerName?: string;
  speakers?: Speaker[];
  startsAt: string;
  endsAt: string;
  version: number;
}

export interface AgendaResponse {
  events: AgendaEvent[];
  version: number;
}

export const getAgenda = (since?: number) =>
  apiFetch<AgendaResponse>(`/v1/agenda${since != null ? `?since=${since}` : ''}`);

export const getAgendaEvent = (id: string) =>
  apiFetch<AgendaEvent>(`/v1/agenda/${id}`);

export const postSessionFeedback = (eventId: string, payload: Record<string, unknown>) =>
  apiFetch<void>(`/v1/agenda-events/${eventId}/feedback`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getSessionFeedbackStatus = (eventId: string) =>
  apiFetch<{ submitted: boolean; rating?: number | null }>(`/v1/agenda-events/${eventId}/feedback`);
