'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('agentx_admin_token') ?? '' : '';
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  attendeeType: string;
  pendingAdminApproval: boolean;
  totalPoints: number;
  activitiesCompleted: number;
}

async function fetchUsers(search: string): Promise<AdminUser[]> {
  const params = new URLSearchParams({ search, limit: '50' });
  const res = await fetch(`${API_URL}/v1/admin/users?${params}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed');
  const data = await res.json() as {
    users: Array<{
      id: string; name: string; email: string; attendeeType: string;
      pendingAdminApproval: boolean;
      userScore: { totalPoints: number; activitiesCompleted: number } | null;
    }>;
  };
  return data.users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    attendeeType: u.attendeeType,
    pendingAdminApproval: u.pendingAdminApproval,
    totalPoints: u.userScore?.totalPoints ?? 0,
    activitiesCompleted: u.userScore?.activitiesCompleted ?? 0,
  }));
}

async function fetchPending(): Promise<AdminUser[]> {
  const res = await fetch(`${API_URL}/v1/admin/users?pendingOnly=true&limit=100`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed');
  const data = await res.json() as {
    users: Array<{
      id: string; name: string; email: string; attendeeType: string;
      pendingAdminApproval: boolean;
      userScore: { totalPoints: number; activitiesCompleted: number } | null;
    }>;
  };
  return data.users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    attendeeType: u.attendeeType,
    pendingAdminApproval: u.pendingAdminApproval,
    totalPoints: u.userScore?.totalPoints ?? 0,
    activitiesCompleted: u.userScore?.activitiesCompleted ?? 0,
  }));
}

async function approveUser(userId: string) {
  const res = await fetch(`${API_URL}/v1/admin/users/${userId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

async function adjustPoints(userId: string, delta: number, reason: string) {
  const res = await fetch(`${API_URL}/v1/admin/users/${userId}/points`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta, reason }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error((body as { message?: string } | null)?.message ?? 'Failed');
  }
  return res.json();
}

const TYPE_LABELS: Record<string, string> = {
  invited: 'Invited',
  walk_in: 'Walk-in',
};

function UserCard({ user, onApprove, onAdjust }: {
  user: AdminUser;
  onApprove: (id: string) => void;
  onAdjust: (id: string, delta: number, reason: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');

  const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  function handleAdjust() {
    const d = parseInt(delta, 10);
    if (isNaN(d) || !reason.trim()) return;
    onAdjust(user.id, d, reason.trim());
    setMsg(`Applied ${d > 0 ? '+' : ''}${d} pts`);
    setDelta('');
    setReason('');
    setTimeout(() => setMsg(''), 3000);
  }

  return (
    <div className="adum-user-card">
      <div className="adum-card-main" onClick={() => setExpanded((v) => !v)}>
        <div className="adum-avatar">{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="adum-user-name">{user.name}</div>
          <div className="adum-user-email">{user.email}</div>
          <div className="adum-user-meta">
            <span className={`adum-type-chip${user.attendeeType === 'walk_in' ? ' walk-in' : ''}`}>
              {TYPE_LABELS[user.attendeeType] ?? user.attendeeType}
            </span>
            {user.pendingAdminApproval && (
              <span className="adum-pending-chip">Pending</span>
            )}
            <span className="adum-acts">{user.activitiesCompleted}/5 activities</span>
          </div>
        </div>
        <div className="adum-pts-col">
          <div className="adum-pts-big">{user.totalPoints}</div>
          <div className="adum-pts-label">pts</div>
        </div>
      </div>

      {expanded && (
        <div className="adum-expanded">
          {user.pendingAdminApproval && (
            <button className="adum-approve-btn" onClick={() => onApprove(user.id)}>
              Approve Walk-in
            </button>
          )}
          <div className="adum-pts-form-label">Adjust Points</div>
          <div className="adum-pts-form">
            <input
              className="adum-pts-input"
              type="number"
              placeholder="+50 or -25"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
            />
            <input
              className="adum-reason-input"
              type="text"
              placeholder="Reason (required)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <button
              className="adum-apply-btn"
              onClick={handleAdjust}
              disabled={!delta || !reason.trim()}
            >
              Apply
            </button>
          </div>
          {msg && <div className="adum-inline-msg">{msg}</div>}
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'all' | 'pending'>('all');
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');

  const { data: searchResults, isLoading: searchLoading, isFetching: searchFetching } = useQuery({
    queryKey: ['admin-users-search', submitted],
    queryFn: () => fetchUsers(submitted),
    enabled: submitted.trim().length > 0,
    retry: false,
  });

  const { data: pendingUsers, isLoading: pendingLoading } = useQuery({
    queryKey: ['admin-users-pending'],
    queryFn: fetchPending,
    enabled: tab === 'pending',
    staleTime: 30_000,
    retry: false,
  });

  const approveMutation = useMutation({
    mutationFn: (userId: string) => approveUser(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users-pending'] });
      qc.invalidateQueries({ queryKey: ['admin-users-search'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const pointsMutation = useMutation({
    mutationFn: ({ id, delta, reason }: { id: string; delta: number; reason: string }) =>
      adjustPoints(id, delta, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users-search'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(query.trim());
  }

  return (
    <>
      <style>{`
        .adum-title {
          font-family: 'Sora', sans-serif;
          font-size: 22px; font-weight: 700; color: var(--t);
          margin: 0 0 16px; letter-spacing: -.02em;
        }
        .adum-tabs {
          display: flex; gap: 0; margin-bottom: 18px;
          border-bottom: 1.5px solid rgba(28,40,60,.14);
        }
        .adum-tab {
          flex: 1; padding: 10px 0;
          font-size: 14px; font-weight: 600; color: #4a6080;
          background: none; border: none; cursor: pointer;
          border-bottom: 2.5px solid transparent; margin-bottom: -1.5px;
          font-family: 'DM Sans', sans-serif;
          transition: all var(--tr);
        }
        .adum-tab.active { color: #2a5cd4; border-bottom-color: #2a5cd4; }
        .adum-search-form {
          display: flex; gap: 10px; margin-bottom: 20px;
        }
        .adum-search-input {
          flex: 1; height: 48px;
          background: var(--surface);
          border: 1.5px solid rgba(28,40,60,.16);
          border-radius: var(--r);
          padding: 0 16px; font-size: 15px; color: #1C283C;
          font-family: inherit; outline: none;
          transition: border-color var(--tr), box-shadow var(--tr);
        }
        .adum-search-input::placeholder { color: #7a8eae; }
        .adum-search-input:focus {
          border-color: #2a5cd4;
          box-shadow: 0 0 0 3px rgba(42,92,212,.12);
        }
        .adum-search-btn {
          height: 48px; padding: 0 20px;
          background: #2a5cd4; color: #fff;
          border: none; border-radius: var(--r);
          font-size: 14px; font-weight: 700;
          font-family: inherit; cursor: pointer;
          box-shadow: 0 4px 14px rgba(42,92,212,.35); flex-shrink: 0;
          transition: opacity var(--tr);
        }
        .adum-search-btn:active { opacity: .85; }
        .adum-empty { text-align: center; padding: 40px; color: var(--t3); font-size: 14px; }
        .adum-user-card {
          background: var(--surface);
          border: 1px solid rgba(255,255,255,.30);
          border-radius: var(--r-lg);
          margin-bottom: 10px;
          box-shadow: var(--shadow-card);
          overflow: hidden;
        }
        .adum-card-main {
          padding: 14px 16px;
          display: flex; align-items: center; gap: 12px;
          cursor: pointer; user-select: none;
        }
        .adum-card-main:active { background: rgba(204,222,231,.70); }
        .adum-avatar {
          width: 44px; height: 44px; border-radius: 50%;
          background: rgba(42,92,212,.14); flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Sora', sans-serif; font-size: 15px; font-weight: 700;
          color: #2a5cd4;
        }
        .adum-user-name { font-size: 16px; font-weight: 700; color: var(--t); }
        .adum-user-email { font-size: 13px; color: var(--t3); margin-top: 2px; }
        .adum-user-meta {
          display: flex; align-items: center; gap: 8px; margin-top: 6px; flex-wrap: wrap;
        }
        .adum-type-chip {
          font-size: 11px; font-weight: 700; letter-spacing: .04em;
          text-transform: uppercase; padding: 3px 8px; border-radius: 6px;
          background: rgba(42,92,212,.12); color: #2a5cd4;
        }
        .adum-type-chip.walk-in { background: rgba(168,124,14,.12); color: #a87c0e; }
        .adum-pending-chip {
          font-size: 11px; font-weight: 700; letter-spacing: .04em;
          text-transform: uppercase; padding: 3px 8px; border-radius: 6px;
          background: rgba(186,24,24,.10); color: #ba1818;
        }
        .adum-acts { font-size: 13px; color: var(--t3); font-weight: 500; }
        .adum-pts-col { text-align: right; margin-left: auto; flex-shrink: 0; }
        .adum-pts-big {
          font-family: 'Sora', sans-serif;
          font-size: 20px; font-weight: 800; color: #a87c0e; line-height: 1;
        }
        .adum-pts-label { font-size: 11px; color: var(--t4); font-weight: 600; margin-top: 3px; text-transform: uppercase; letter-spacing: .04em; }
        .adum-expanded {
          padding: 14px 16px;
          border-top: 1px solid rgba(28,40,60,.12);
          display: flex; flex-direction: column; gap: 10px;
          background: rgba(204,222,231,.35);
        }
        .adum-approve-btn {
          height: 44px; border-radius: var(--r);
          background: linear-gradient(135deg, #f5a623, #e8910a);
          color: #fff; font-size: 14px; font-weight: 700;
          font-family: 'Sora', sans-serif;
          border: none; cursor: pointer;
          box-shadow: 0 4px 12px rgba(245,166,35,.30);
        }
        .adum-approve-btn:active { opacity: .85; }
        .adum-pts-form-label {
          font-size: 11px; font-weight: 800; letter-spacing: .06em;
          text-transform: uppercase; color: #4a6080;
        }
        .adum-pts-form { display: flex; gap: 8px; flex-wrap: wrap; }
        .adum-pts-input {
          width: 90px; height: 40px;
          background: rgba(28,40,60,.07); border: 1.5px solid rgba(28,40,60,.18);
          border-radius: var(--r); padding: 0 10px;
          font-size: 14px; color: #1C283C; font-family: inherit; outline: none;
        }
        .adum-pts-input::placeholder { color: #7a8eae; }
        .adum-pts-input:focus { border-color: #2a5cd4; }
        .adum-reason-input {
          flex: 1; min-width: 120px; height: 40px;
          background: rgba(28,40,60,.07); border: 1.5px solid rgba(28,40,60,.18);
          border-radius: var(--r); padding: 0 10px;
          font-size: 14px; color: #1C283C; font-family: inherit; outline: none;
        }
        .adum-reason-input::placeholder { color: #7a8eae; }
        .adum-reason-input:focus { border-color: #2a5cd4; }
        .adum-apply-btn {
          height: 40px; padding: 0 16px;
          background: #2a5cd4; color: #fff;
          border: none; border-radius: var(--r);
          font-size: 13px; font-weight: 700;
          font-family: inherit; cursor: pointer;
          flex-shrink: 0;
        }
        .adum-apply-btn:disabled { opacity: .4; cursor: not-allowed; }
        .adum-inline-msg {
          font-size: 13px; font-weight: 600; color: #146636;
        }
      `}</style>

      <h1 className="adum-title">Users</h1>

      <div className="adum-tabs">
        <button className={`adum-tab${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>
          All Users
        </button>
        <button className={`adum-tab${tab === 'pending' ? ' active' : ''}`} onClick={() => setTab('pending')}>
          Pending Approvals
        </button>
      </div>

      {tab === 'all' && (
        <>
          <form className="adum-search-form" onSubmit={handleSearch}>
            <input
              className="adum-search-input"
              type="text"
              placeholder="Search by name or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="adum-search-btn" type="submit">Search</button>
          </form>

          {!submitted && <div className="adum-empty">Enter a name or email above to find users.</div>}
          {submitted && (searchLoading || searchFetching) && <div className="adum-empty">Searching…</div>}
          {submitted && !searchLoading && !searchFetching && (searchResults ?? []).length === 0 && (
            <div className="adum-empty">No users found.</div>
          )}

          {(searchResults ?? []).map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onApprove={(id) => approveMutation.mutate(id)}
              onAdjust={(id, delta, reason) => pointsMutation.mutate({ id, delta, reason })}
            />
          ))}
        </>
      )}

      {tab === 'pending' && (
        <>
          {pendingLoading && <div className="adum-empty">Loading…</div>}
          {!pendingLoading && (pendingUsers ?? []).length === 0 && (
            <div className="adum-empty">No pending walk-in approvals.</div>
          )}
          {(pendingUsers ?? []).map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onApprove={(id) => approveMutation.mutate(id)}
              onAdjust={(id, delta, reason) => pointsMutation.mutate({ id, delta, reason })}
            />
          ))}
        </>
      )}
    </>
  );
}
