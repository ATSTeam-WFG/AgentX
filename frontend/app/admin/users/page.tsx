'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('agentx_admin_token') ?? localStorage.getItem('agentx_token') ?? '' : '';
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  totalPoints: number;
  activitiesCompleted: number;
}

async function searchUsers(query: string): Promise<AdminUser[]> {
  const res = await fetch(`${API_URL}/v1/admin/users?q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

const MOCK_USERS: AdminUser[] = [
  { id: '1', name: 'Sarah Martinez', email: 's.martinez@example.com', role: 'title_agent',   totalPoints: 820, activitiesCompleted: 5 },
  { id: '2', name: 'James Reeves',   email: 'j.reeves@example.com',   role: 'wfg_employee',  totalPoints: 740, activitiesCompleted: 4 },
  { id: '3', name: 'Linda Kim',      email: 'l.kim@example.com',      role: 'title_agent',   totalPoints: 680, activitiesCompleted: 4 },
  { id: '4', name: 'Carlos Barrera', email: 'c.barrera@example.com',  role: 'title_agent',   totalPoints: 610, activitiesCompleted: 3 },
  { id: '5', name: 'Mei Tanaka',     email: 'm.tanaka@example.com',   role: 'wfg_employee',  totalPoints: 550, activitiesCompleted: 3 },
];

const ROLE_LABELS: Record<string, string> = {
  title_agent:  'Title Agent',
  wfg_employee: 'WFG Employee',
  guest:        'Guest',
};

export default function AdminUsersPage() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');

  const { data: results, isLoading, isFetching } = useQuery({
    queryKey: ['admin-users', submitted],
    queryFn: () => searchUsers(submitted),
    enabled: submitted.trim().length > 0,
    retry: false,
    placeholderData: submitted ? undefined : MOCK_USERS,
  });

  const displayUsers = submitted.trim() ? results : MOCK_USERS;

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
          margin: 0 0 18px; letter-spacing: -.02em;
        }
        .adum-search-form {
          display: flex; gap: 10px; margin-bottom: 20px;
        }
        .adum-search-input {
          flex: 1; height: 48px;
          background: var(--surface);
          border: 1.5px solid var(--border-metal);
          border-radius: var(--r);
          padding: 0 16px; font-size: 15px; color: var(--t);
          font-family: inherit; outline: none;
          transition: border-color var(--tr), box-shadow var(--tr);
        }
        .adum-search-input:focus {
          border-color: var(--blue);
          box-shadow: 0 0 0 3px rgba(27,79,196,.08);
        }
        .adum-search-btn {
          height: 48px; padding: 0 20px;
          background: var(--blue); color: #fff;
          border: none; border-radius: var(--r);
          font-size: 14px; font-weight: 700;
          font-family: inherit; cursor: pointer;
          box-shadow: var(--shadow-blue); flex-shrink: 0;
          transition: opacity var(--tr);
        }
        .adum-search-btn:active { opacity: .85; }
        .adum-loading { text-align: center; padding: 40px; color: var(--t3); }
        .adum-user-card {
          background: var(--surface);
          border: 1px solid var(--border-metal);
          border-radius: var(--r-lg);
          padding: 14px 16px; margin-bottom: 10px;
          box-shadow: var(--shadow-card);
          display: flex; align-items: center; gap: 12px;
        }
        .adum-avatar {
          width: 44px; height: 44px; border-radius: 50%;
          background: var(--blue-lt); flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Sora', sans-serif; font-size: 15px; font-weight: 700;
          color: var(--blue);
        }
        .adum-user-name {
          font-size: 16px; font-weight: 700; color: var(--t);
        }
        .adum-user-email { font-size: 13px; color: var(--t3); margin-top: 2px; }
        .adum-user-meta {
          display: flex; align-items: center; gap: 8px; margin-top: 6px; flex-wrap: wrap;
        }
        .adum-role-chip {
          font-size: 11px; font-weight: 700; letter-spacing: .04em;
          text-transform: uppercase; padding: 3px 8px; border-radius: 6px;
          background: var(--blue-lt); color: var(--blue);
        }
        .adum-pts {
          font-family: 'Sora', sans-serif;
          font-size: 13px; font-weight: 800; color: var(--gold);
        }
        .adum-acts { font-size: 13px; color: var(--t3); font-weight: 500; }
        .adum-pts-col { text-align: right; margin-left: auto; }
        .adum-pts-big {
          font-family: 'Sora', sans-serif;
          font-size: 20px; font-weight: 800; color: var(--gold); line-height: 1;
        }
        .adum-pts-label { font-size: 11px; color: var(--t4); font-weight: 600; margin-top: 3px; text-transform: uppercase; letter-spacing: .04em; }
      `}</style>

      <h1 className="adum-title">User Lookup</h1>

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

      {(isLoading || isFetching) && <div className="adum-loading">Searching…</div>}

      {(displayUsers ?? []).map((user) => {
        const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
        return (
          <div key={user.id} className="adum-user-card">
            <div className="adum-avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="adum-user-name">{user.name}</div>
              <div className="adum-user-email">{user.email}</div>
              <div className="adum-user-meta">
                <span className="adum-role-chip">{ROLE_LABELS[user.role] ?? user.role}</span>
                <span className="adum-acts">{user.activitiesCompleted}/5 activities</span>
              </div>
            </div>
            <div className="adum-pts-col">
              <div className="adum-pts-big">{user.totalPoints}</div>
              <div className="adum-pts-label">Points</div>
            </div>
          </div>
        );
      })}
    </>
  );
}
