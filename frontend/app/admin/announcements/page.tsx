'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminRole } from '@/hooks/use-admin-role';
import { canDo } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('agentx_admin_token') ?? '' : '';
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
  expiresAt: string | null;
}

async function fetchAnnouncements(): Promise<Announcement[]> {
  const res = await fetch(`${API_URL}/v1/announcements`);
  if (!res.ok) throw new Error('Failed');
  const data = await res.json() as { announcements: Announcement[] };
  return data.announcements;
}

async function createAnnouncement(payload: { title: string; body: string; expiresAt?: string }) {
  const res = await fetch(`${API_URL}/v1/admin/announcements`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error((err as { message?: string } | null)?.message ?? 'Failed');
  }
  return res.json();
}

async function deleteAnnouncement(id: string) {
  const res = await fetch(`${API_URL}/v1/admin/announcements/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function LockNotice({ text }: { text: string }) {
  return (
    <div className="adm-lock-notice" style={{ marginBottom: 12 }}>
      <svg viewBox="0 0 14 14" fill="none" width="14" height="14">
        <rect x="3" y="6" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M5 6V4.5a2 2 0 0 1 4 0V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
      {text}
    </div>
  );
}

export default function AdminAnnouncementsPage() {
  const qc = useQueryClient();
  const role = useAdminRole();
  const canManage = canDo(role, 'moderator');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: fetchAnnouncements,
    staleTime: 15_000,
  });

  const createMutation = useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      setTitle('');
      setBody('');
      setExpiresAt('');
      setFormError('');
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    createMutation.mutate({
      title: title.trim(),
      body: body.trim(),
      ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
    });
  }

  const list = announcements ?? [];

  return (
    <>
      <style>{`
        .ann-title {
          font-family: 'Sora', sans-serif;
          font-size: 22px; font-weight: 700; color: var(--t);
          margin: 0 0 18px; letter-spacing: -.02em;
        }
        .ann-form-card {
          background: var(--surface);
          border: 1px solid rgba(255,255,255,.30);
          border-radius: var(--r-lg);
          padding: 18px 16px; margin-bottom: 24px;
          box-shadow: var(--shadow-card);
        }
        .ann-form-heading {
          font-size: 13px; font-weight: 800; letter-spacing: .06em;
          text-transform: uppercase; color: var(--t3); margin-bottom: 14px;
        }
        .ann-label {
          display: block; font-size: 13px; font-weight: 700;
          color: var(--t2); margin-bottom: 5px;
        }
        .ann-input, .ann-textarea {
          width: 100%;
          background: rgba(28,40,60,.07); border: 1.5px solid rgba(28,40,60,.18);
          border-radius: var(--r); padding: 10px 14px;
          font-size: 14px; color: #1C283C; font-family: inherit; outline: none;
          margin-bottom: 12px; box-sizing: border-box;
          transition: border-color var(--tr);
        }
        .ann-input::placeholder, .ann-textarea::placeholder { color: #7a8eae; }
        .ann-input { height: 44px; }
        .ann-textarea { height: 80px; resize: vertical; }
        .ann-input:focus, .ann-textarea:focus {
          border-color: #2a5cd4;
          box-shadow: 0 0 0 3px rgba(42,92,212,.14);
        }
        .ann-input-row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
        .ann-input-row .ann-input { margin-bottom: 0; }
        .ann-expiry-wrap { display: flex; flex-direction: column; flex: 1; min-width: 180px; }
        .ann-submit-btn {
          height: 44px; padding: 0 20px; flex-shrink: 0;
          background: linear-gradient(135deg, #3068e8, #2a5cd4);
          color: #fff; border: none; border-radius: var(--r);
          font-size: 14px; font-weight: 700; font-family: 'Sora', sans-serif;
          cursor: pointer; box-shadow: 0 4px 14px rgba(42,92,212,.35);
          transition: opacity var(--tr);
        }
        .ann-submit-btn:disabled { opacity: .5; cursor: not-allowed; }
        .ann-form-error { font-size: 13px; color: #ba1818; margin-top: 8px; font-weight: 600; }
        .ann-section-label {
          font-size: 11px; font-weight: 800; letter-spacing: .08em;
          text-transform: uppercase; color: var(--t3); margin-bottom: 12px;
        }
        .ann-empty { text-align: center; padding: 40px; color: var(--t4); font-size: 14px; }
        .ann-card {
          background: var(--surface);
          border: 1px solid rgba(255,255,255,.30);
          border-radius: var(--r-lg);
          padding: 14px 16px; margin-bottom: 10px;
          box-shadow: var(--shadow-card);
        }
        .ann-card-header { display: flex; align-items: flex-start; gap: 10px; }
        .ann-card-title { font-size: 15px; font-weight: 700; color: var(--t); flex: 1; }
        .ann-card-body { font-size: 13px; color: var(--t2); margin-top: 6px; line-height: 1.5; }
        .ann-card-meta { display: flex; gap: 10px; align-items: center; margin-top: 8px; flex-wrap: wrap; }
        .ann-card-time { font-size: 12px; color: var(--t4); }
        .ann-expiry-chip {
          font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 20px;
          background: rgba(168,124,14,.12); color: #a87c0e;
        }
        .ann-delete-btn {
          background: none; border: none; cursor: pointer;
          color: var(--t4); padding: 2px 6px; border-radius: 4px;
          font-size: 13px; font-weight: 600;
          transition: color var(--tr);
          flex-shrink: 0;
        }
        .ann-delete-btn:hover { color: #ba1818; }
        .ann-confirm-row { display: flex; gap: 8px; margin-top: 10px; }
        .ann-confirm-yes {
          height: 34px; padding: 0 14px;
          background: #ba1818; color: #fff; border: none;
          border-radius: var(--r); font-size: 13px; font-weight: 700;
          font-family: inherit; cursor: pointer;
        }
        .ann-confirm-no {
          height: 34px; padding: 0 14px;
          background: rgba(28,40,60,.08); color: #2A3C52;
          border: 1px solid rgba(28,40,60,.18);
          border-radius: var(--r); font-size: 13px; font-weight: 600;
          font-family: inherit; cursor: pointer;
        }
      `}</style>

      <h1 className="ann-title">Announcements</h1>

      <div className="ann-form-card" style={canManage ? {} : { position: 'relative' }}>
        {!canManage && <LockNotice text="Requires Moderator access to post announcements" />}
        <div className="ann-form-heading">New Announcement</div>
        <div className={canManage ? undefined : 'adm-locked'}>
        <form onSubmit={handleCreate}>
          <label className="ann-label">Title</label>
          <input
            className="ann-input"
            type="text"
            placeholder="e.g. Lunch is ready on Level 2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label className="ann-label">Message</label>
          <textarea
            className="ann-textarea"
            placeholder="Announcement body…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="ann-input-row">
            <div className="ann-expiry-wrap">
              <label className="ann-label">Expires at (optional)</label>
              <input
                className="ann-input"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            <button
              className="ann-submit-btn"
              type="submit"
              disabled={!title.trim() || !body.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Posting…' : 'Post'}
            </button>
          </div>
          {formError && <div className="ann-form-error">{formError}</div>}
        </form>
        </div>
      </div>

      <div className="ann-section-label">{list.length} active announcement{list.length !== 1 ? 's' : ''}</div>

      {isLoading && <div className="ann-empty">Loading…</div>}
      {!isLoading && list.length === 0 && <div className="ann-empty">No announcements yet.</div>}

      {list.map((a) => (
        <div key={a.id} className="ann-card">
          <div className="ann-card-header">
            <div className="ann-card-title">{a.title}</div>
            {canManage && confirmDelete !== a.id ? (
              <button className="ann-delete-btn" onClick={() => setConfirmDelete(a.id)}>Delete</button>
            ) : null}
          </div>
          <div className="ann-card-body">{a.body}</div>
          <div className="ann-card-meta">
            <span className="ann-card-time">Posted {formatDate(a.publishedAt)}</span>
            {a.expiresAt && (
              <span className="ann-expiry-chip">Expires {formatDate(a.expiresAt)}</span>
            )}
          </div>
          {canManage && confirmDelete === a.id && (
            <div className="ann-confirm-row">
              <button
                className="ann-confirm-yes"
                onClick={() => { deleteMutation.mutate(a.id); setConfirmDelete(null); }}
              >
                Confirm Delete
              </button>
              <button className="ann-confirm-no" onClick={() => setConfirmDelete(null)}>Cancel</button>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
