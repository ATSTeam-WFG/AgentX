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

async function fetchUsers(search: string, offset = 0): Promise<{ users: AdminUser[]; total: number }> {
  const params = new URLSearchParams({ limit: '50', offset: String(offset) });
  if (search) params.set('search', search);
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
    total: number;
  };
  return {
    total: data.total,
    users: data.users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      attendeeType: u.attendeeType,
      pendingAdminApproval: u.pendingAdminApproval,
      totalPoints: u.userScore?.totalPoints ?? 0,
      activitiesCompleted: u.userScore?.activitiesCompleted ?? 0,
    })),
  };
}

async function fetchPending(): Promise<AdminUser[]> {
  const res = await fetch(`${API_URL}/v1/admin/users?pendingOnly=true&limit=200`, {
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
    id: u.id, name: u.name, email: u.email, attendeeType: u.attendeeType,
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

async function bulkApprove(ids: string[]) {
  const res = await fetch(`${API_URL}/v1/admin/users/bulk-approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
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

async function editUser(userId: string, data: { name?: string; email?: string; attendeeType?: string }) {
  const res = await fetch(`${API_URL}/v1/admin/users/${userId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error((body as { message?: string } | null)?.message ?? 'Failed');
  }
  return res.json();
}

async function deleteUser(userId: string) {
  const res = await fetch(`${API_URL}/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error((body as { message?: string } | null)?.message ?? 'Failed');
  }
  return res.json();
}

async function exportCsv() {
  const res = await fetch(`${API_URL}/v1/admin/users/export`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendees-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const TYPE_LABELS: Record<string, string> = { invited: 'Invited', walk_in: 'Walk-in' };

function UserCard({ user, onApprove, onAdjust, onEdit, onDelete }: {
  user: AdminUser;
  onApprove: (id: string) => void;
  onAdjust: (id: string, delta: number, reason: string) => void;
  onEdit: (id: string, data: { name: string; email: string; attendeeType: string }) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [ptsMsg, setPtsMsg] = useState('');
  const [editName, setEditName] = useState(user.name);
  const [editEmail, setEditEmail] = useState(user.email);
  const [editType, setEditType] = useState(user.attendeeType);
  const [editMsg, setEditMsg] = useState('');
  const [editErr, setEditErr] = useState('');

  const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  function handleAdjust() {
    const d = parseInt(delta, 10);
    if (isNaN(d) || !reason.trim()) return;
    onAdjust(user.id, d, reason.trim());
    setPtsMsg(`Applied ${d > 0 ? '+' : ''}${d} pts`);
    setDelta(''); setReason('');
    setTimeout(() => setPtsMsg(''), 3000);
  }

  function handleEdit() {
    if (!editName.trim() || !editEmail.trim()) return;
    setEditErr('');
    const data = { name: editName.trim(), email: editEmail.trim(), attendeeType: editType };
    // Call via parent — but since this is a local edit we call directly
    onEdit(user.id, data);
    setEditMsg('Saved');
    setTimeout(() => setEditMsg(''), 3000);
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
            {user.pendingAdminApproval && <span className="adum-pending-chip">Pending</span>}
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

          {/* Edit */}
          <div className="adum-section-label">Edit User</div>
          <div className="adum-edit-row">
            <input className="adum-edit-input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
            <input className="adum-edit-input" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" />
            <select className="adum-edit-select" value={editType} onChange={(e) => setEditType(e.target.value)}>
              <option value="invited">Invited</option>
              <option value="walk_in">Walk-in</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="adum-save-btn" onClick={handleEdit}
              disabled={!editName.trim() || !editEmail.trim()}>
              Save Changes
            </button>
            {editMsg && <span className="adum-inline-ok">{editMsg}</span>}
            {editErr && <span className="adum-inline-err">{editErr}</span>}
          </div>

          {/* Points */}
          <div className="adum-section-label">Adjust Points</div>
          <div className="adum-pts-form">
            <input className="adum-pts-input" type="number" placeholder="+50 or -25"
              value={delta} onChange={(e) => setDelta(e.target.value)} />
            <input className="adum-reason-input" type="text" placeholder="Reason (required)"
              value={reason} onChange={(e) => setReason(e.target.value)} />
            <button className="adum-apply-btn" onClick={handleAdjust}
              disabled={!delta || !reason.trim()}>Apply</button>
          </div>
          {ptsMsg && <div className="adum-inline-ok">{ptsMsg}</div>}

          {/* Delete */}
          <button className="adum-delete-btn" onClick={() => onDelete(user.id, user.name)}>
            Delete User
          </button>
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
  const [offset, setOffset] = useState(0);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data: searchPage, isLoading: searchLoading, isFetching: searchFetching } = useQuery({
    queryKey: ['admin-users-search', submitted, offset],
    queryFn: () => fetchUsers(submitted, offset),
    enabled: submitted !== null,
    retry: false,
    staleTime: 30_000,
  });

  const searchResults = offset === 0 ? (searchPage?.users ?? []) : [...allUsers, ...(searchPage?.users ?? [])];
  const hasMore = searchResults.length < (searchPage?.total ?? 0);

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

  const bulkApproveMutation = useMutation({
    mutationFn: (ids: string[]) => bulkApprove(ids),
    onSuccess: () => {
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['admin-users-pending'] });
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

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; email: string; attendeeType: string } }) =>
      editUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users-search'] });
      qc.invalidateQueries({ queryKey: ['admin-users-pending'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      setConfirmDelete(null);
      qc.invalidateQueries({ queryKey: ['admin-users-search'] });
      qc.invalidateQueries({ queryKey: ['admin-users-pending'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setAllUsers([]);
    setOffset(0);
    setSubmitted(query.trim());
  }

  function handleLoadMore() {
    setAllUsers(searchResults);
    setOffset((o) => o + 50);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    const all = (pendingUsers ?? []).map((u) => u.id);
    setSelected(new Set(all));
  }

  async function handleExport() {
    setExporting(true);
    try { await exportCsv(); } finally { setExporting(false); }
  }

  return (
    <>
      <style>{`
        .adum-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .adum-title { font-family: 'Sora', sans-serif; font-size: 22px; font-weight: 700; color: var(--t); margin: 0; letter-spacing: -.02em; }
        .adum-export-btn {
          height: 38px; padding: 0 16px;
          background: var(--surface); border: 1.5px solid rgba(28,40,60,.18);
          border-radius: var(--r); font-size: 13px; font-weight: 700;
          color: #2a5cd4; font-family: inherit; cursor: pointer;
          transition: background var(--tr);
        }
        .adum-export-btn:active { background: rgba(204,222,231,.70); }
        .adum-export-btn:disabled { opacity: .5; cursor: not-allowed; }
        .adum-tabs { display: flex; gap: 0; margin-bottom: 18px; border-bottom: 1.5px solid rgba(28,40,60,.14); }
        .adum-tab {
          flex: 1; padding: 10px 0; font-size: 14px; font-weight: 600; color: #4a6080;
          background: none; border: none; cursor: pointer;
          border-bottom: 2.5px solid transparent; margin-bottom: -1.5px;
          font-family: 'DM Sans', sans-serif; transition: all var(--tr);
        }
        .adum-tab.active { color: #2a5cd4; border-bottom-color: #2a5cd4; }
        .adum-search-form { display: flex; gap: 10px; margin-bottom: 20px; }
        .adum-search-input {
          flex: 1; height: 48px; background: var(--surface);
          border: 1.5px solid rgba(28,40,60,.16); border-radius: var(--r);
          padding: 0 16px; font-size: 15px; color: #1C283C; font-family: inherit; outline: none;
          transition: border-color var(--tr), box-shadow var(--tr);
        }
        .adum-search-input::placeholder { color: #7a8eae; }
        .adum-search-input:focus { border-color: #2a5cd4; box-shadow: 0 0 0 3px rgba(42,92,212,.12); }
        .adum-search-btn {
          height: 48px; padding: 0 20px; background: #2a5cd4; color: #fff;
          border: none; border-radius: var(--r); font-size: 14px; font-weight: 700;
          font-family: inherit; cursor: pointer; box-shadow: 0 4px 14px rgba(42,92,212,.35); flex-shrink: 0;
          transition: opacity var(--tr);
        }
        .adum-search-btn:active { opacity: .85; }
        .adum-count { font-size: 12px; color: var(--t4); margin-bottom: 12px; }
        .adum-empty { text-align: center; padding: 40px; color: var(--t3); font-size: 14px; }
        .adum-bulk-bar {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 14px; flex-wrap: wrap;
        }
        .adum-bulk-btn {
          height: 38px; padding: 0 16px;
          background: linear-gradient(135deg, #f5a623, #e8910a); color: #fff;
          border: none; border-radius: var(--r); font-size: 13px; font-weight: 700;
          font-family: inherit; cursor: pointer;
          box-shadow: 0 4px 12px rgba(245,166,35,.30);
        }
        .adum-bulk-btn:disabled { opacity: .4; cursor: not-allowed; }
        .adum-sel-btn {
          height: 38px; padding: 0 14px;
          background: var(--surface); border: 1.5px solid rgba(28,40,60,.18);
          border-radius: var(--r); font-size: 13px; font-weight: 600;
          color: #4a6080; font-family: inherit; cursor: pointer;
        }
        .adum-sel-count { font-size: 13px; color: var(--t3); font-weight: 500; }
        .adum-user-card {
          background: var(--surface); border: 1px solid rgba(255,255,255,.30);
          border-radius: var(--r-lg); margin-bottom: 10px;
          box-shadow: var(--shadow-card); overflow: hidden;
        }
        .adum-card-main {
          padding: 14px 16px; display: flex; align-items: center; gap: 12px;
          cursor: pointer; user-select: none;
        }
        .adum-card-main:active { background: rgba(204,222,231,.70); }
        .adum-pending-row { display: flex; align-items: center; gap: 12px; padding: 0 16px 0 0; }
        .adum-checkbox {
          width: 18px; height: 18px; accent-color: #2a5cd4;
          cursor: pointer; flex-shrink: 0; margin-left: 14px;
        }
        .adum-avatar {
          width: 44px; height: 44px; border-radius: 50%;
          background: rgba(42,92,212,.14); flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Sora', sans-serif; font-size: 15px; font-weight: 700; color: #2a5cd4;
        }
        .adum-user-name { font-size: 16px; font-weight: 700; color: var(--t); }
        .adum-user-email { font-size: 13px; color: var(--t3); margin-top: 2px; }
        .adum-user-meta { display: flex; align-items: center; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
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
        .adum-pts-big { font-family: 'Sora', sans-serif; font-size: 20px; font-weight: 800; color: #a87c0e; line-height: 1; }
        .adum-pts-label { font-size: 11px; color: var(--t4); font-weight: 600; margin-top: 3px; text-transform: uppercase; letter-spacing: .04em; }
        .adum-expanded {
          padding: 14px 16px; border-top: 1px solid rgba(28,40,60,.12);
          display: flex; flex-direction: column; gap: 10px;
          background: rgba(204,222,231,.35);
        }
        .adum-approve-btn {
          height: 44px; border-radius: var(--r);
          background: linear-gradient(135deg, #f5a623, #e8910a);
          color: #fff; font-size: 14px; font-weight: 700;
          font-family: 'Sora', sans-serif; border: none; cursor: pointer;
          box-shadow: 0 4px 12px rgba(245,166,35,.30);
        }
        .adum-approve-btn:active { opacity: .85; }
        .adum-section-label {
          font-size: 11px; font-weight: 800; letter-spacing: .06em;
          text-transform: uppercase; color: #4a6080; margin-top: 2px;
        }
        .adum-edit-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .adum-edit-input {
          flex: 1; min-width: 120px; height: 38px;
          background: rgba(255,255,255,.75); border: 1.5px solid rgba(28,40,60,.18);
          border-radius: var(--r); padding: 0 10px;
          font-size: 13px; color: #1C283C; font-family: inherit; outline: none;
        }
        .adum-edit-input:focus { border-color: #2a5cd4; }
        .adum-edit-select {
          width: 110px; height: 38px; flex-shrink: 0;
          background: rgba(255,255,255,.75); border: 1.5px solid rgba(28,40,60,.18);
          border-radius: var(--r); padding: 0 8px;
          font-size: 13px; color: #1C283C; font-family: inherit; outline: none;
          appearance: none;
        }
        .adum-edit-select:focus { border-color: #2a5cd4; }
        .adum-save-btn {
          height: 36px; padding: 0 16px;
          background: #2a5cd4; color: #fff; border: none;
          border-radius: var(--r); font-size: 13px; font-weight: 700;
          font-family: inherit; cursor: pointer; flex-shrink: 0;
        }
        .adum-save-btn:disabled { opacity: .4; cursor: not-allowed; }
        .adum-pts-form { display: flex; gap: 8px; flex-wrap: wrap; }
        .adum-pts-input {
          width: 90px; height: 40px;
          background: rgba(28,40,60,.07); border: 1.5px solid rgba(28,40,60,.18);
          border-radius: var(--r); padding: 0 10px;
          font-size: 14px; color: #1C283C; font-family: inherit; outline: none;
        }
        .adum-pts-input:focus { border-color: #2a5cd4; }
        .adum-reason-input {
          flex: 1; min-width: 120px; height: 40px;
          background: rgba(28,40,60,.07); border: 1.5px solid rgba(28,40,60,.18);
          border-radius: var(--r); padding: 0 10px;
          font-size: 14px; color: #1C283C; font-family: inherit; outline: none;
        }
        .adum-reason-input:focus { border-color: #2a5cd4; }
        .adum-apply-btn {
          height: 40px; padding: 0 16px; background: #2a5cd4; color: #fff;
          border: none; border-radius: var(--r); font-size: 13px; font-weight: 700;
          font-family: inherit; cursor: pointer; flex-shrink: 0;
        }
        .adum-apply-btn:disabled { opacity: .4; cursor: not-allowed; }
        .adum-delete-btn {
          height: 38px; padding: 0 16px; align-self: flex-start;
          background: rgba(186,24,24,.10); border: 1.5px solid rgba(186,24,24,.25);
          border-radius: var(--r); font-size: 13px; font-weight: 700;
          color: #ba1818; font-family: inherit; cursor: pointer;
          transition: background var(--tr);
        }
        .adum-delete-btn:active { background: rgba(186,24,24,.20); }
        .adum-inline-ok { font-size: 13px; font-weight: 600; color: #146636; }
        .adum-inline-err { font-size: 13px; font-weight: 600; color: #ba1818; }
        .adum-load-more {
          width: 100%; height: 44px; margin-top: 4px;
          background: var(--surface); border: 1px solid rgba(255,255,255,.30);
          border-radius: var(--r-lg); color: #2a5cd4;
          font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer;
        }
        .adum-load-more:disabled { opacity: .5; cursor: not-allowed; }

        /* Confirm dialog */
        .adum-overlay {
          position: fixed; inset: 0; background: rgba(10,24,64,.45);
          display: flex; align-items: center; justify-content: center;
          z-index: 200; padding: 20px;
        }
        .adum-dialog {
          background: var(--surface); border-radius: var(--r-lg);
          padding: 24px; max-width: 360px; width: 100%;
          box-shadow: 0 20px 60px rgba(10,24,64,.25);
        }
        .adum-dialog-title {
          font-family: 'Sora', sans-serif; font-size: 18px; font-weight: 700;
          color: var(--t); margin: 0 0 10px;
        }
        .adum-dialog-body { font-size: 15px; color: var(--t2); line-height: 1.55; margin-bottom: 20px; }
        .adum-dialog-btns { display: flex; gap: 10px; }
        .adum-dialog-cancel {
          flex: 1; height: 44px; background: var(--surface);
          border: 1.5px solid rgba(28,40,60,.18); border-radius: var(--r);
          font-size: 14px; font-weight: 700; color: var(--t2); font-family: inherit; cursor: pointer;
        }
        .adum-dialog-confirm {
          flex: 1; height: 44px; background: #ba1818; color: #fff;
          border: none; border-radius: var(--r);
          font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer;
          box-shadow: 0 4px 14px rgba(186,24,24,.30);
        }
        .adum-dialog-confirm:disabled { opacity: .5; cursor: not-allowed; }
      `}</style>

      {/* Delete confirm dialog */}
      {confirmDelete && (
        <div className="adum-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="adum-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="adum-dialog-title">Delete User?</div>
            <div className="adum-dialog-body">
              This will permanently delete <strong>{confirmDelete.name}</strong> and all their activity data, points, and sessions. This cannot be undone.
            </div>
            <div className="adum-dialog-btns">
              <button className="adum-dialog-cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                className="adum-dialog-confirm"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(confirmDelete.id)}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="adum-header">
        <h1 className="adum-title">Users</h1>
        <button className="adum-export-btn" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      <div className="adum-tabs">
        <button className={`adum-tab${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>All Users</button>
        <button className={`adum-tab${tab === 'pending' ? ' active' : ''}`} onClick={() => setTab('pending')}>Pending Approvals</button>
      </div>

      {tab === 'all' && (
        <>
          <form className="adum-search-form" onSubmit={handleSearch}>
            <input
              className="adum-search-input"
              type="text"
              placeholder="Search by name or email… (empty = show all)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="adum-search-btn" type="submit">Search</button>
          </form>

          {searchPage && (
            <div className="adum-count">{searchPage.total} user{searchPage.total !== 1 ? 's' : ''}</div>
          )}

          {submitted === null && <div className="adum-empty">Enter a name or email, or submit empty to browse all.</div>}
          {(searchLoading || searchFetching) && searchResults.length === 0 && <div className="adum-empty">Loading…</div>}
          {!searchLoading && !searchFetching && submitted !== null && searchResults.length === 0 && (
            <div className="adum-empty">No users found.</div>
          )}

          {searchResults.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onApprove={(id) => approveMutation.mutate(id)}
              onAdjust={(id, delta, reason) => pointsMutation.mutate({ id, delta, reason })}
              onEdit={(id, data) => editMutation.mutate({ id, data })}
              onDelete={(id, name) => setConfirmDelete({ id, name })}
            />
          ))}

          {hasMore && (
            <button className="adum-load-more" onClick={handleLoadMore} disabled={searchFetching}>
              {searchFetching ? 'Loading…' : `Load more (${(searchPage?.total ?? 0) - searchResults.length} remaining)`}
            </button>
          )}
        </>
      )}

      {tab === 'pending' && (
        <>
          {!pendingLoading && (pendingUsers ?? []).length > 0 && (
            <div className="adum-bulk-bar">
              <button className="adum-bulk-btn"
                disabled={selected.size === 0 || bulkApproveMutation.isPending}
                onClick={() => bulkApproveMutation.mutate([...selected])}>
                {bulkApproveMutation.isPending
                  ? 'Approving…'
                  : selected.size > 0
                    ? `Approve Selected (${selected.size})`
                    : 'Approve Selected'}
              </button>
              <button className="adum-sel-btn" onClick={selectAll}>Select All</button>
              {selected.size > 0 && (
                <button className="adum-sel-btn" onClick={() => setSelected(new Set())}>Clear</button>
              )}
              <span className="adum-sel-count">{(pendingUsers ?? []).length} pending</span>
            </div>
          )}

          {pendingLoading && <div className="adum-empty">Loading…</div>}
          {!pendingLoading && (pendingUsers ?? []).length === 0 && (
            <div className="adum-empty">No pending walk-in approvals.</div>
          )}

          {(pendingUsers ?? []).map((user) => (
            <div key={user.id} className="adum-pending-row">
              <input
                type="checkbox"
                className="adum-checkbox"
                checked={selected.has(user.id)}
                onChange={() => toggleSelect(user.id)}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <UserCard
                  user={user}
                  onApprove={(id) => approveMutation.mutate(id)}
                  onAdjust={(id, delta, reason) => pointsMutation.mutate({ id, delta, reason })}
                  onEdit={(id, data) => editMutation.mutate({ id, data })}
                  onDelete={(id, name) => setConfirmDelete({ id, name })}
                />
              </div>
            </div>
          ))}
        </>
      )}
    </>
  );
}
