'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminRole } from '@/hooks/use-admin-role';
import { canDo } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('agentx_admin_token') ?? '' : '';
}

interface AgendaEvent {
  id: string;
  day: number;
  name: string;
  description?: string;
  location: string;
  speakerName?: string;
  startsAt: string;
  endsAt: string;
  version: number;
}

async function fetchAgenda(): Promise<AgendaEvent[]> {
  const res = await fetch(`${API_URL}/v1/agenda`);
  if (!res.ok) throw new Error('Failed');
  const data = await res.json() as { events: AgendaEvent[] };
  return data.events;
}

async function createEvent(body: Partial<AgendaEvent>) {
  const res = await fetch(`${API_URL}/v1/admin/agenda`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error((err as { message?: string } | null)?.message ?? 'Failed');
  }
  return res.json();
}

async function updateEvent(id: string, body: Partial<AgendaEvent>) {
  const res = await fetch(`${API_URL}/v1/admin/agenda/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error((err as { message?: string } | null)?.message ?? 'Failed');
  }
  return res.json();
}

async function deleteEvent(id: string) {
  const res = await fetch(`${API_URL}/v1/admin/agenda/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

function toLocalDatetime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

interface EventFormState {
  day: string;
  name: string;
  description: string;
  location: string;
  speakerName: string;
  startsAt: string;
  endsAt: string;
}

const BLANK_FORM: EventFormState = { day: '1', name: '', description: '', location: '', speakerName: '', startsAt: '', endsAt: '' };

function EventForm({ initial, onSave, onCancel, saving, error }: {
  initial: EventFormState;
  onSave: (f: EventFormState) => void;
  onCancel: () => void;
  saving: boolean;
  error: string;
}) {
  const [f, setF] = useState(initial);
  const set = (k: keyof EventFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <form className="agd-form" onSubmit={(e) => { e.preventDefault(); onSave(f); }}>
      <div className="agd-form-row">
        <div className="agd-form-group" style={{ width: 80, flexShrink: 0 }}>
          <label className="agd-label">Day</label>
          <select className="agd-input agd-select" value={f.day} onChange={set('day')}>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </div>
        <div className="agd-form-group" style={{ flex: 1 }}>
          <label className="agd-label">Session Name *</label>
          <input className="agd-input" type="text" placeholder="Keynote: …" value={f.name} onChange={set('name')} required />
        </div>
      </div>
      <div className="agd-form-row">
        <div className="agd-form-group" style={{ flex: 1 }}>
          <label className="agd-label">Location *</label>
          <input className="agd-input" type="text" placeholder="Grand Ballroom" value={f.location} onChange={set('location')} required />
        </div>
        <div className="agd-form-group" style={{ flex: 1 }}>
          <label className="agd-label">Speaker</label>
          <input className="agd-input" type="text" placeholder="Jane Doe" value={f.speakerName} onChange={set('speakerName')} />
        </div>
      </div>
      <div className="agd-form-row">
        <div className="agd-form-group" style={{ flex: 1 }}>
          <label className="agd-label">Starts at *</label>
          <input className="agd-input" type="datetime-local" value={f.startsAt} onChange={set('startsAt')} required />
        </div>
        <div className="agd-form-group" style={{ flex: 1 }}>
          <label className="agd-label">Ends at *</label>
          <input className="agd-input" type="datetime-local" value={f.endsAt} onChange={set('endsAt')} required />
        </div>
      </div>
      <div className="agd-form-group">
        <label className="agd-label">Description</label>
        <textarea className="agd-input agd-textarea" placeholder="Optional details…" value={f.description} onChange={set('description')} />
      </div>
      {error && <div className="agd-form-error">{error}</div>}
      <div className="agd-form-actions">
        <button className="agd-save-btn" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        <button className="agd-cancel-btn" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function AdminAgendaPage() {
  const qc = useQueryClient();
  const role = useAdminRole();
  const canEdit = canDo(role, 'moderator');
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const { data: events, isLoading } = useQuery({
    queryKey: ['agenda'],
    queryFn: fetchAgenda,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (f: EventFormState) => createEvent({
      day: parseInt(f.day, 10), name: f.name,
      description: f.description || undefined,
      location: f.location,
      speakerName: f.speakerName || undefined,
      startsAt: new Date(f.startsAt).toISOString(),
      endsAt: new Date(f.endsAt).toISOString(),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agenda'] }); setShowAdd(false); setFormError(''); },
    onError: (e: Error) => setFormError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, f }: { id: string; f: EventFormState }) => updateEvent(id, {
      day: parseInt(f.day, 10), name: f.name,
      description: f.description || undefined,
      location: f.location,
      speakerName: f.speakerName || undefined,
      startsAt: new Date(f.startsAt).toISOString(),
      endsAt: new Date(f.endsAt).toISOString(),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agenda'] }); setEditingId(null); setFormError(''); },
    onError: (e: Error) => setFormError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agenda'] }); setConfirmDelete(null); },
  });

  const list = events ?? [];
  const days = [1, 2, 3];

  return (
    <>
      <style>{`
        .agd-title {
          font-family: 'Sora', sans-serif;
          font-size: 22px; font-weight: 700; color: var(--t);
          margin: 0 0 16px; letter-spacing: -.02em;
        }
        .agd-add-btn {
          width: 100%; height: 48px; margin-bottom: 20px;
          background: var(--surface); border: 1.5px dashed rgba(28,40,60,.22);
          border-radius: var(--r-lg); color: #2a5cd4;
          font-size: 14px; font-weight: 700; font-family: inherit;
          cursor: pointer; transition: border-color var(--tr);
        }
        .agd-add-btn:hover { border-color: #2a5cd4; }
        .agd-add-card {
          background: var(--surface);
          border: 1px solid rgba(255,255,255,.30);
          border-radius: var(--r-lg);
          padding: 16px; margin-bottom: 20px;
          box-shadow: var(--shadow-card);
        }
        .agd-add-heading {
          font-size: 13px; font-weight: 800; letter-spacing: .06em;
          text-transform: uppercase; color: var(--t3); margin-bottom: 14px;
        }
        .agd-day-label {
          font-size: 12px; font-weight: 800; letter-spacing: .08em;
          text-transform: uppercase; color: var(--t3);
          margin-bottom: 10px; margin-top: 20px;
        }
        .agd-day-label:first-of-type { margin-top: 0; }
        .agd-event-card {
          background: var(--surface);
          border: 1px solid rgba(255,255,255,.30);
          border-radius: var(--r-lg);
          margin-bottom: 8px; overflow: hidden;
          box-shadow: var(--shadow-card);
        }
        .agd-event-main { padding: 12px 16px; }
        .agd-event-header { display: flex; align-items: flex-start; gap: 10px; }
        .agd-event-name { font-size: 15px; font-weight: 700; color: var(--t); flex: 1; }
        .agd-event-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .agd-edit-btn, .agd-del-btn {
          background: none; border: none; cursor: pointer;
          font-size: 12px; font-weight: 700; padding: 4px 8px; border-radius: 6px;
          font-family: inherit;
        }
        .agd-edit-btn { color: #2a5cd4; background: rgba(42,92,212,.12); }
        .agd-del-btn { color: var(--t4); }
        .agd-del-btn:hover { color: #ba1818; }
        .agd-event-meta { display: flex; gap: 10px; margin-top: 6px; flex-wrap: wrap; }
        .agd-event-time { font-size: 12px; font-weight: 600; color: var(--t2); }
        .agd-event-loc { font-size: 12px; color: var(--t3); }
        .agd-event-speaker { font-size: 12px; color: var(--t4); }
        .agd-event-desc { font-size: 13px; color: var(--t3); margin-top: 4px; line-height: 1.4; }
        .agd-confirm-row {
          display: flex; gap: 8px; padding: 10px 16px;
          border-top: 1px solid rgba(28,40,60,.12);
        }
        .agd-confirm-yes {
          height: 34px; padding: 0 14px;
          background: #ba1818; color: #fff; border: none;
          border-radius: var(--r); font-size: 13px; font-weight: 700;
          font-family: inherit; cursor: pointer;
        }
        .agd-confirm-no {
          height: 34px; padding: 0 14px;
          background: rgba(28,40,60,.08); color: #2A3C52;
          border: 1px solid rgba(28,40,60,.18);
          border-radius: var(--r); font-size: 13px; font-weight: 600;
          font-family: inherit; cursor: pointer;
        }
        .agd-edit-wrap {
          padding: 14px 16px;
          border-top: 1px solid rgba(28,40,60,.12);
        }
        .agd-form { display: flex; flex-direction: column; gap: 10px; }
        .agd-form-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .agd-form-group { display: flex; flex-direction: column; }
        .agd-label { font-size: 12px; font-weight: 700; color: var(--t2); margin-bottom: 4px; }
        .agd-input {
          height: 40px; background: rgba(28,40,60,.07);
          border: 1.5px solid rgba(28,40,60,.18);
          border-radius: var(--r); padding: 0 10px;
          font-size: 13px; color: #1C283C; font-family: inherit; outline: none;
          transition: border-color var(--tr); width: 100%; box-sizing: border-box;
        }
        .agd-input::placeholder { color: #7a8eae; }
        .agd-input:focus { border-color: #2a5cd4; box-shadow: 0 0 0 3px rgba(42,92,212,.14); }
        .agd-select { appearance: none; }
        .agd-textarea { height: 60px; padding: 8px 10px; resize: vertical; }
        .agd-form-error { font-size: 13px; color: #ba1818; font-weight: 600; }
        .agd-form-actions { display: flex; gap: 8px; }
        .agd-save-btn {
          height: 40px; padding: 0 20px;
          background: linear-gradient(135deg, #3068e8, #2a5cd4); color: #fff; border: none;
          border-radius: var(--r); font-size: 13px; font-weight: 700;
          font-family: inherit; cursor: pointer;
          box-shadow: 0 4px 14px rgba(42,92,212,.35);
        }
        .agd-save-btn:disabled { opacity: .5; cursor: not-allowed; }
        .agd-cancel-btn {
          height: 40px; padding: 0 16px;
          background: rgba(28,40,60,.08); color: #2A3C52;
          border: 1px solid rgba(28,40,60,.18);
          border-radius: var(--r); font-size: 13px; font-weight: 600;
          font-family: inherit; cursor: pointer;
        }
        .agd-empty { text-align: center; padding: 40px; color: var(--t4); font-size: 14px; }
      `}</style>

      <h1 className="agd-title">Agenda</h1>

      {!showAdd && (
        canEdit ? (
          <button className="agd-add-btn" onClick={() => { setShowAdd(true); setFormError(''); }}>
            + Add Event
          </button>
        ) : (
          <button className="agd-add-btn adm-locked" title="Requires Moderator access" style={{ cursor: 'not-allowed' }}>
            + Add Event
          </button>
        )
      )}

      {showAdd && (
        <div className="agd-add-card">
          <div className="agd-add-heading">New Event</div>
          <EventForm
            initial={BLANK_FORM}
            onSave={(f) => createMutation.mutate(f)}
            onCancel={() => { setShowAdd(false); setFormError(''); }}
            saving={createMutation.isPending}
            error={formError}
          />
        </div>
      )}

      {isLoading && <div className="agd-empty">Loading…</div>}

      {days.map((day) => {
        const dayEvents = list.filter((e) => e.day === day).sort(
          (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
        );
        if (dayEvents.length === 0 && !isLoading) return null;
        return (
          <div key={day}>
            <div className="agd-day-label">Day {day}</div>
            {dayEvents.map((event) => (
              <div key={event.id} className="agd-event-card">
                <div className="agd-event-main">
                  <div className="agd-event-header">
                    <div className="agd-event-name">{event.name}</div>
                    {canEdit && (
                      <div className="agd-event-actions">
                        <button
                          className="agd-edit-btn"
                          onClick={() => { setEditingId(event.id === editingId ? null : event.id); setFormError(''); }}
                        >
                          {editingId === event.id ? 'Cancel' : 'Edit'}
                        </button>
                        <button className="agd-del-btn" onClick={() => setConfirmDelete(event.id)}>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="agd-event-meta">
                    <span className="agd-event-time">{formatTime(event.startsAt)} – {formatTime(event.endsAt)}</span>
                    <span className="agd-event-loc">{event.location}</span>
                    {event.speakerName && <span className="agd-event-speaker">{event.speakerName}</span>}
                  </div>
                  {event.description && <div className="agd-event-desc">{event.description}</div>}
                </div>

                {editingId === event.id && (
                  <div className="agd-edit-wrap">
                    <EventForm
                      initial={{
                        day: String(event.day),
                        name: event.name,
                        description: event.description ?? '',
                        location: event.location,
                        speakerName: event.speakerName ?? '',
                        startsAt: toLocalDatetime(event.startsAt),
                        endsAt: toLocalDatetime(event.endsAt),
                      }}
                      onSave={(f) => updateMutation.mutate({ id: event.id, f })}
                      onCancel={() => { setEditingId(null); setFormError(''); }}
                      saving={updateMutation.isPending}
                      error={formError}
                    />
                  </div>
                )}

                {confirmDelete === event.id && (
                  <div className="agd-confirm-row">
                    <button
                      className="agd-confirm-yes"
                      onClick={() => deleteMutation.mutate(event.id)}
                    >
                      Confirm Delete
                    </button>
                    <button className="agd-confirm-no" onClick={() => setConfirmDelete(null)}>Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}
