import { apiFetch } from '../api';

export const getInitiativeNotes = () =>
  apiFetch<{ notes: { initiativeName: string; noteText: string }[] }>('/v1/initiative-notes')
    .then((r) => Object.fromEntries(r.notes.map((n) => [n.initiativeName, n.noteText])) as Record<string, string>);

export const saveInitiativeNote = (initiativeName: string, noteText: string) =>
  apiFetch<void>('/v1/initiative-notes', {
    method: 'POST',
    body: JSON.stringify({ initiativeName, noteText }),
  });
