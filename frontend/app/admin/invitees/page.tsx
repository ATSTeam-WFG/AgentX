'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminRole } from '@/hooks/use-admin-role';
import { canDo } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('agentx_admin_token') ?? '' : '';
}

interface Invitee {
  id: string;
  name: string;
  email: string;
  attendeeType: 'invited' | 'walk_in';
  user: { id: string; name: string; attendeeType: string } | null;
}

interface InviteePage {
  invitees: Invitee[];
  total: number;
}

async function fetchInvitees(search: string, offset: number): Promise<InviteePage> {
  const params = new URLSearchParams({ limit: '50', offset: String(offset) });
  if (search) params.set('search', search);
  const res = await fetch(`${API_URL}/v1/admin/invitees?${params}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

async function uploadCsv(file: File): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_URL}/v1/admin/invitees/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error((err as { message?: string } | null)?.message ?? 'Upload failed');
  }
  return res.json();
}

async function addInvitee(payload: { name: string; email: string; attendeeType: 'invited' | 'walk_in' }) {
  const res = await fetch(`${API_URL}/v1/admin/invitees`, {
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

async function editInvitee(id: string, data: { name?: string; email?: string; attendeeType?: string }) {
  const res = await fetch(`${API_URL}/v1/admin/invitees/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error((err as { message?: string } | null)?.message ?? 'Failed');
  }
  return res.json();
}

async function deleteInvitee(id: string) {
  const res = await fetch(`${API_URL}/v1/admin/invitees/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error((err as { message?: string } | null)?.message ?? 'Failed');
  }
  return res.json();
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

export default function AdminInviteesPage() {
  const qc = useQueryClient();
  const role = useAdminRole();
  const canEdit = canDo(role, 'moderator');
  const canDelete = canDo(role, 'super_admin');
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [allInvitees, setAllInvitees] = useState<Invitee[]>([]);
  const [uploadResult, setUploadResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addType, setAddType] = useState<'invited' | 'walk_in'>('invited');
  const [addError, setAddError] = useState('');

  // Edit state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editType, setEditType] = useState<'invited' | 'walk_in'>('invited');
  const [editMsg, setEditMsg] = useState('');
  const [editErr, setEditErr] = useState('');

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const { data: page, isLoading, isFetching, isError } = useQuery({
    queryKey: ['admin-invitees', submittedSearch, offset],
    queryFn: () => fetchInvitees(submittedSearch, offset),
    staleTime: 30_000,
    retry: false,
  });

  const combined = offset === 0 ? (page?.invitees ?? []) : [...allInvitees, ...(page?.invitees ?? [])];

  const uploadMutation = useMutation({
    mutationFn: uploadCsv,
    onSuccess: (result) => {
      setUploadResult(result);
      qc.invalidateQueries({ queryKey: ['admin-invitees'] });
      if (fileRef.current) fileRef.current.value = '';
    },
  });

  const addMutation = useMutation({
    mutationFn: addInvitee,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-invitees'] });
      setAddName(''); setAddEmail(''); setAddType('invited'); setAddError('');
    },
    onError: (e: Error) => setAddError(e.message),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; email: string; attendeeType: string } }) =>
      editInvitee(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-invitees'] });
      setEditMsg('Saved');
      setTimeout(() => setEditMsg(''), 3000);
    },
    onError: (e: Error) => setEditErr(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInvitee(id),
    onSuccess: () => {
      setConfirmDelete(null);
      setExpandedId(null);
      qc.invalidateQueries({ queryKey: ['admin-invitees'] });
    },
    onError: (e: Error) => alert(e.message),
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setAllInvitees([]);
    setOffset(0);
    setSubmittedSearch(search.trim());
  }

  function handleLoadMore() {
    setAllInvitees(combined);
    setOffset((o) => o + 50);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addName.trim() || !addEmail.trim()) return;
    addMutation.mutate({ name: addName.trim(), email: addEmail.trim(), attendeeType: addType });
  }

  function openEdit(inv: Invitee) {
    if (expandedId === inv.id) { setExpandedId(null); return; }
    setExpandedId(inv.id);
    setEditName(inv.name);
    setEditEmail(inv.email);
    setEditType(inv.attendeeType);
    setEditMsg(''); setEditErr('');
  }

  function handleEdit(id: string) {
    if (!editName.trim() || !editEmail.trim()) return;
    editMutation.mutate({ id, data: { name: editName.trim(), email: editEmail.trim(), attendeeType: editType } });
  }

  const hasMore = combined.length < (page?.total ?? 0);

  return (
    <>
      <style>{`
        .inv-title { font-family: 'Sora', sans-serif; font-size: 22px; font-weight: 700; color: var(--t); margin: 0 0 18px; letter-spacing: -.02em; }
        .inv-section-card {
          background: var(--surface); border: 1px solid rgba(255,255,255,.30);
          border-radius: var(--r-lg); padding: 16px; margin-bottom: 16px; box-shadow: var(--shadow-card);
        }
        .inv-section-heading { font-size: 13px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--t3); margin-bottom: 14px; }
        .inv-upload-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .inv-file-input {
          flex: 1; min-width: 0; font-size: 13px; color: #1C283C;
          background: rgba(28,40,60,.07); border: 1.5px solid rgba(28,40,60,.18);
          border-radius: var(--r); padding: 8px 12px; font-family: inherit; outline: none; cursor: pointer;
        }
        .inv-upload-btn {
          height: 40px; padding: 0 18px; flex-shrink: 0;
          background: linear-gradient(135deg, #3068e8, #2a5cd4); color: #fff; border: none;
          border-radius: var(--r); font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer;
          box-shadow: 0 4px 14px rgba(42,92,212,.35);
        }
        .inv-upload-btn:disabled { opacity: .5; cursor: not-allowed; }
        .inv-upload-result { margin-top: 10px; padding: 10px 12px; border-radius: var(--r); font-size: 13px; background: rgba(20,102,54,.10); color: #146636; font-weight: 600; }
        .inv-upload-errors { margin-top: 6px; font-size: 12px; color: #ba1818; font-weight: 600; }
        .inv-add-form { display: flex; flex-direction: column; gap: 10px; }
        .inv-add-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .inv-label { font-size: 12px; font-weight: 700; color: var(--t2); margin-bottom: 4px; display: block; }
        .inv-input, .inv-select {
          width: 100%; height: 40px; background: rgba(28,40,60,.07);
          border: 1.5px solid rgba(28,40,60,.18); border-radius: var(--r);
          padding: 0 10px; font-size: 13px; color: #1C283C; font-family: inherit;
          outline: none; box-sizing: border-box; transition: border-color var(--tr);
        }
        .inv-input::placeholder { color: #7a8eae; }
        .inv-input:focus, .inv-select:focus { border-color: #2a5cd4; box-shadow: 0 0 0 3px rgba(42,92,212,.14); }
        .inv-select { appearance: none; }
        .inv-add-group { display: flex; flex-direction: column; }
        .inv-add-btn {
          height: 40px; padding: 0 20px;
          background: linear-gradient(135deg, #3068e8, #2a5cd4); color: #fff; border: none;
          border-radius: var(--r); font-size: 13px; font-weight: 700;
          font-family: inherit; cursor: pointer; align-self: flex-end;
          box-shadow: 0 4px 14px rgba(42,92,212,.35);
        }
        .inv-add-btn:disabled { opacity: .5; cursor: not-allowed; }
        .inv-add-error { font-size: 13px; color: #ba1818; font-weight: 600; }
        .inv-search-form { display: flex; gap: 10px; margin-bottom: 14px; }
        .inv-search-input {
          flex: 1; height: 44px; background: var(--surface);
          border: 1.5px solid rgba(28,40,60,.16); border-radius: var(--r);
          padding: 0 14px; font-size: 14px; color: #1C283C; font-family: inherit; outline: none;
          transition: border-color var(--tr);
        }
        .inv-search-input::placeholder { color: #7a8eae; }
        .inv-search-input:focus { border-color: #2a5cd4; box-shadow: 0 0 0 3px rgba(42,92,212,.14); }
        .inv-search-btn {
          height: 44px; padding: 0 18px;
          background: linear-gradient(135deg, #3068e8, #2a5cd4); color: #fff;
          border: none; border-radius: var(--r); font-size: 14px; font-weight: 700;
          font-family: inherit; cursor: pointer; flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(42,92,212,.35);
        }
        .inv-empty { text-align: center; padding: 32px; color: var(--t4); font-size: 14px; }
        .inv-invitee-card {
          background: var(--surface); border: 1px solid rgba(255,255,255,.30);
          border-radius: var(--r-lg); margin-bottom: 8px;
          box-shadow: var(--shadow-card); overflow: hidden;
        }
        .inv-card-main {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 16px; cursor: pointer; user-select: none;
        }
        .inv-card-main:active { background: rgba(204,222,231,.70); }
        .inv-initials {
          width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
          background: rgba(42,92,212,.12); color: #2a5cd4;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 700;
        }
        .inv-name { font-size: 15px; font-weight: 700; color: var(--t); }
        .inv-email { font-size: 12px; color: var(--t3); margin-top: 2px; }
        .inv-chips { display: flex; gap: 6px; margin-top: 5px; flex-wrap: wrap; }
        .inv-chip { font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; padding: 2px 7px; border-radius: 5px; }
        .inv-chip.invited    { background: rgba(42,92,212,.12); color: #2a5cd4; }
        .inv-chip.walk-in    { background: rgba(168,124,14,.12); color: #a87c0e; }
        .inv-chip.registered { background: rgba(20,102,54,.12); color: #146636; }
        .inv-chevron { margin-left: auto; flex-shrink: 0; color: var(--t4); transition: transform .2s; }
        .inv-invitee-card.open .inv-chevron { transform: rotate(180deg); }
        .inv-expanded {
          padding: 14px 16px; border-top: 1px solid rgba(28,40,60,.10);
          display: flex; flex-direction: column; gap: 10px;
          background: rgba(204,222,231,.30);
        }
        .inv-edit-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .inv-edit-input {
          flex: 1; min-width: 120px; height: 38px;
          background: rgba(255,255,255,.75); border: 1.5px solid rgba(28,40,60,.18);
          border-radius: var(--r); padding: 0 10px;
          font-size: 13px; color: #1C283C; font-family: inherit; outline: none;
        }
        .inv-edit-input:focus { border-color: #2a5cd4; }
        .inv-edit-select {
          width: 110px; height: 38px; flex-shrink: 0;
          background: rgba(255,255,255,.75); border: 1.5px solid rgba(28,40,60,.18);
          border-radius: var(--r); padding: 0 8px;
          font-size: 13px; color: #1C283C; font-family: inherit; outline: none; appearance: none;
        }
        .inv-save-btn {
          height: 36px; padding: 0 16px;
          background: #2a5cd4; color: #fff; border: none;
          border-radius: var(--r); font-size: 13px; font-weight: 700;
          font-family: inherit; cursor: pointer;
        }
        .inv-save-btn:disabled { opacity: .4; cursor: not-allowed; }
        .inv-delete-btn {
          height: 36px; padding: 0 14px; align-self: flex-start;
          background: rgba(186,24,24,.10); border: 1.5px solid rgba(186,24,24,.25);
          border-radius: var(--r); font-size: 13px; font-weight: 700;
          color: #ba1818; font-family: inherit; cursor: pointer;
        }
        .inv-delete-btn:disabled { opacity: .4; cursor: not-allowed; }
        .inv-inline-ok { font-size: 13px; font-weight: 600; color: #146636; }
        .inv-inline-err { font-size: 13px; font-weight: 600; color: #ba1818; }
        .inv-load-more {
          width: 100%; height: 44px; margin-top: 4px;
          background: var(--surface); border: 1px solid rgba(255,255,255,.30);
          border-radius: var(--r-lg); color: #2a5cd4;
          font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer;
          transition: background var(--tr);
        }
        .inv-load-more:active { background: rgba(204,222,231,.70); }
        .inv-load-more:disabled { opacity: .5; cursor: not-allowed; }
        .inv-count { font-size: 12px; color: var(--t4); margin-bottom: 12px; }

        /* Confirm dialog */
        .inv-overlay {
          position: fixed; inset: 0; background: rgba(10,24,64,.45);
          display: flex; align-items: center; justify-content: center;
          z-index: 200; padding: 20px;
        }
        .inv-dialog {
          background: var(--surface); border-radius: var(--r-lg);
          padding: 24px; max-width: 360px; width: 100%;
          box-shadow: 0 20px 60px rgba(10,24,64,.25);
        }
        .inv-dialog-title { font-family: 'Sora', sans-serif; font-size: 18px; font-weight: 700; color: var(--t); margin: 0 0 10px; }
        .inv-dialog-body { font-size: 15px; color: var(--t2); line-height: 1.55; margin-bottom: 20px; }
        .inv-dialog-btns { display: flex; gap: 10px; }
        .inv-dialog-cancel {
          flex: 1; height: 44px; background: var(--surface);
          border: 1.5px solid rgba(28,40,60,.18); border-radius: var(--r);
          font-size: 14px; font-weight: 700; color: var(--t2); font-family: inherit; cursor: pointer;
        }
        .inv-dialog-confirm {
          flex: 1; height: 44px; background: #ba1818; color: #fff;
          border: none; border-radius: var(--r);
          font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer;
          box-shadow: 0 4px 14px rgba(186,24,24,.30);
        }
        .inv-dialog-confirm:disabled { opacity: .5; cursor: not-allowed; }
      `}</style>

      {/* Delete confirm dialog */}
      {confirmDelete && (
        <div className="inv-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="inv-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="inv-dialog-title">Delete Invitee?</div>
            <div className="inv-dialog-body">
              This will permanently remove <strong>{confirmDelete.name}</strong> from the invite list.
              They will not be able to register with this email.
            </div>
            <div className="inv-dialog-btns">
              <button className="inv-dialog-cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                className="inv-dialog-confirm"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(confirmDelete.id)}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="inv-title">Invitees</h1>

      <div className="inv-section-card" style={canEdit ? {} : { position: 'relative' }}>
        {!canEdit && <LockNotice text="Requires Moderator access to upload CSV" />}
        <div className="inv-section-heading">CSV Upload</div>
        <div className={`inv-upload-row${canEdit ? '' : ' adm-locked'}`}>
          <input
            ref={fileRef}
            className="inv-file-input"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { setUploadResult(null); uploadMutation.mutate(f); }
            }}
          />
          {uploadMutation.isPending && <span style={{ fontSize: 13, color: '#4a6080' }}>Uploading…</span>}
        </div>
        {uploadResult && (
          <div className="inv-upload-result">
            {uploadResult.imported} imported, {uploadResult.skipped} skipped.
            {uploadResult.errors.length > 0 && (
              <div className="inv-upload-errors">
                {uploadResult.errors.slice(0, 5).map((e, i) => <div key={i}>{e}</div>)}
                {uploadResult.errors.length > 5 && <div>…and {uploadResult.errors.length - 5} more</div>}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="inv-section-card" style={canEdit ? {} : { position: 'relative' }}>
        {!canEdit && <LockNotice text="Requires Moderator access to add invitees" />}
        <div className="inv-section-heading">Add Single Invitee</div>
        <div className={canEdit ? undefined : 'adm-locked'}>
        <form className="inv-add-form" onSubmit={handleAdd}>
          <div className="inv-add-row">
            <div className="inv-add-group" style={{ flex: 1 }}>
              <label className="inv-label">Name *</label>
              <input className="inv-input" type="text" placeholder="Jane Doe" value={addName} onChange={(e) => setAddName(e.target.value)} />
            </div>
            <div className="inv-add-group" style={{ flex: 1 }}>
              <label className="inv-label">Email *</label>
              <input className="inv-input" type="email" placeholder="jane@example.com" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
            </div>
            <div className="inv-add-group" style={{ width: 120, flexShrink: 0 }}>
              <label className="inv-label">Type</label>
              <select className="inv-select" value={addType} onChange={(e) => setAddType(e.target.value as 'invited' | 'walk_in')}>
                <option value="invited">Invited</option>
                <option value="walk_in">Walk-in</option>
              </select>
            </div>
          </div>
          {addError && <div className="inv-add-error">{addError}</div>}
          <button className="inv-add-btn" type="submit" disabled={!addName.trim() || !addEmail.trim() || addMutation.isPending}>
            {addMutation.isPending ? 'Adding…' : 'Add Invitee'}
          </button>
        </form>
        </div>
      </div>

      <form className="inv-search-form" onSubmit={handleSearch}>
        <input
          className="inv-search-input"
          type="text"
          placeholder="Search invitees by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="inv-search-btn" type="submit">Search</button>
      </form>

      {page && <div className="inv-count">{page.total} invitee{page.total !== 1 ? 's' : ''} total</div>}
      {isLoading && <div className="inv-empty">Loading…</div>}
      {isError && <div className="inv-empty" style={{ color: '#ba1818' }}>Failed to load invitees — check your connection and reload.</div>}
      {!isLoading && !isError && combined.length === 0 && (
        <div className="inv-empty">
          {submittedSearch ? 'No invitees found.' : 'No invitees yet. Upload a CSV or add one above.'}
        </div>
      )}

      {combined.map((inv) => {
        const initials = (inv.name ?? '').split(' ').map((n) => n[0] ?? '').join('').slice(0, 2).toUpperCase();
        const isOpen = expandedId === inv.id;
        return (
          <div key={inv.id} className={`inv-invitee-card${isOpen ? ' open' : ''}`}>
            <div className="inv-card-main" onClick={() => openEdit(inv)}>
              <div className="inv-initials">{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="inv-name">{inv.name}</div>
                <div className="inv-email">{inv.email}</div>
                <div className="inv-chips">
                  <span className={`inv-chip ${inv.attendeeType === 'walk_in' ? 'walk-in' : 'invited'}`}>
                    {inv.attendeeType === 'walk_in' ? 'Walk-in' : 'Invited'}
                  </span>
                  {inv.user && <span className="inv-chip registered">Registered</span>}
                </div>
              </div>
              <svg className="inv-chevron" viewBox="0 0 12 12" fill="none" width="16" height="16">
                <path d="M2.5 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {isOpen && (
              <div className="inv-expanded">
                <div className={`inv-edit-row${canEdit ? '' : ' adm-locked'}`}>
                  <input className="inv-edit-input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
                  <input className="inv-edit-input" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" />
                  <select className="inv-edit-select" value={editType} onChange={(e) => setEditType(e.target.value as 'invited' | 'walk_in')}>
                    <option value="invited">Invited</option>
                    <option value="walk_in">Walk-in</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button className="inv-save-btn"
                    disabled={!editName.trim() || !editEmail.trim() || editMutation.isPending || !canEdit}
                    title={!canEdit ? 'Requires Moderator access' : undefined}
                    onClick={() => handleEdit(inv.id)}>
                    {editMutation.isPending ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button
                    className="inv-delete-btn"
                    disabled={!!inv.user || deleteMutation.isPending || !canDelete}
                    title={!canDelete ? 'Requires Super Admin access' : inv.user ? 'Delete the user account first' : 'Delete invitee'}
                    onClick={() => { if (canDelete && !inv.user) setConfirmDelete({ id: inv.id, name: inv.name }); }}
                  >
                    Delete
                  </button>
                  {editMsg && <span className="inv-inline-ok">{editMsg}</span>}
                  {editErr && <span className="inv-inline-err">{editErr}</span>}
                </div>
                {inv.user && (
                  <div style={{ fontSize: 12, color: '#a87c0e', fontWeight: 600 }}>
                    Has a registered account — delete the user first to remove this invitee.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {hasMore && (
        <button className="inv-load-more" onClick={handleLoadMore} disabled={isFetching}>
          {isFetching ? 'Loading…' : `Load more (${(page?.total ?? 0) - combined.length} remaining)`}
        </button>
      )}
    </>
  );
}
