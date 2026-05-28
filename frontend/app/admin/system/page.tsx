'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { decodeToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('agentx_admin_token') ?? '' : '';
}

function isSuperAdmin() {
  const token = getToken();
  if (!token) return false;
  const claims = decodeToken(token) as { role?: string } | null;
  return claims?.role === 'super_admin';
}

interface DbStatus {
  tables: {
    users: number;
    invitees: number;
    agendaEvents: number;
    sponsors: number;
    initiatives: number;
    announcements: number;
    activities: number;
    triviaQuestions: number;
    promptChallengeQuestions: number;
    touchpoints: number;
    activityAttempts: number;
    submissions: number;
    goldenPointsSubmissions: number;
    sessions: number;
    auditLogs: number;
    jobs: number;
  };
}

interface Activity {
  id: string;
  name: string;
  type: string;
}

type ToastKind = 'success' | 'error';

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

let toastSeq = 0;

export default function SystemPage() {
  const router = useRouter();
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  // Confirmation modal state
  const [modal, setModal] = useState<{
    action: string;
    label: string;
    description: string;
    requiresTyped?: boolean;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [typedConfirm, setTypedConfirm] = useState('');

  const superAdmin = isSuperAdmin();

  const addToast = useCallback((message: string, kind: ToastKind) => {
    const id = ++toastSeq;
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch(`${API_URL}/v1/admin/system/status`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed');
      setStatus(await res.json() as DbStatus);
    } catch {
      addToast('Failed to load DB status', 'error');
    } finally {
      setStatusLoading(false);
    }
  }, [addToast]);

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/v1/activities`);
      if (!res.ok) return;
      const data = await res.json() as { activities: Activity[] };
      setActivities(data.activities ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchActivities();
  }, [fetchStatus, fetchActivities]);

  async function runAction(key: string, endpoint: string, body?: object) {
    setBusy(key);
    try {
      const res = await fetch(`${API_URL}/v1/admin/system/${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json() as { ok?: boolean; message?: string; error?: string; requiresReauth?: boolean };
      if (!res.ok) throw new Error(data.message ?? data.error ?? 'Request failed');
      addToast(data.message ?? 'Done', 'success');
      if (data.requiresReauth) {
        localStorage.removeItem('agentx_admin_token');
        setTimeout(() => router.replace('/admin/login'), 1500);
      } else {
        fetchStatus();
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unknown error', 'error');
    } finally {
      setBusy(null);
    }
  }

  function openModal(opts: typeof modal) {
    setTypedConfirm('');
    setModal(opts);
  }

  async function confirmModal() {
    if (!modal) return;
    setModal(null);
    await modal.onConfirm();
  }

  const STATUS_GROUPS = [
    {
      label: 'Users & Sessions',
      rows: [
        { key: 'users', label: 'Users' },
        { key: 'sessions', label: 'Active Sessions' },
        { key: 'invitees', label: 'Invitees' },
      ],
    },
    {
      label: 'Content',
      rows: [
        { key: 'agendaEvents', label: 'Agenda Events' },
        { key: 'announcements', label: 'Announcements' },
        { key: 'sponsors', label: 'Sponsors' },
        { key: 'initiatives', label: 'Initiatives' },
      ],
    },
    {
      label: 'Activities & Gameplay',
      rows: [
        { key: 'activities', label: 'Activities' },
        { key: 'triviaQuestions', label: 'Trivia Questions' },
        { key: 'promptChallengeQuestions', label: 'Prompt Challenge Qs' },
        { key: 'touchpoints', label: 'Touchpoints' },
        { key: 'activityAttempts', label: 'Activity Attempts' },
        { key: 'submissions', label: 'Submissions' },
        { key: 'goldenPointsSubmissions', label: 'Golden Pts Submissions' },
      ],
    },
    {
      label: 'Operational',
      rows: [
        { key: 'auditLogs', label: 'Audit Logs' },
        { key: 'jobs', label: 'Jobs' },
      ],
    },
  ];

  return (
    <>
      <style>{`
        .sys-page { max-width: 860px; }
        .sys-h1 { font-family: 'Sora', sans-serif; font-size: 22px; font-weight: 800; color: var(--t); letter-spacing: -.02em; margin: 0 0 4px; }
        .sys-sub { font-size: 13px; color: var(--t3); margin: 0 0 24px; }

        /* Status grid */
        .sys-status-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(195px, 1fr)); gap: 12px; margin-bottom: 28px; }
        .sys-status-card { background: var(--surface); border: 1px solid rgba(28,40,60,.10); border-radius: 10px; padding: 14px 16px; }
        .sys-status-group-label { font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--t4); margin: 0 0 8px; }
        .sys-status-row { display: flex; justify-content: space-between; align-items: center; padding: 3px 0; }
        .sys-status-name { font-size: 12px; color: var(--t3); }
        .sys-status-val { font-size: 13px; font-weight: 700; color: var(--t); font-variant-numeric: tabular-nums; }
        .sys-status-loading { font-size: 12px; color: var(--t4); padding: 4px 0; }

        /* Refresh */
        .sys-refresh-row { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
        .sys-refresh-btn { background: var(--surface); border: 1px solid rgba(28,40,60,.12); border-radius: 7px; padding: 6px 14px; font-size: 12px; font-weight: 600; color: var(--t2); cursor: pointer; }
        .sys-refresh-btn:hover { background: rgba(28,40,60,.06); }

        /* Sections */
        .sys-section { margin-bottom: 28px; }
        .sys-section-title { font-size: 13px; font-weight: 700; color: var(--t2); margin: 0 0 10px; letter-spacing: -.01em; }
        .sys-action-grid { display: flex; flex-direction: column; gap: 8px; }
        .sys-action-card { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; background: var(--surface); border: 1px solid rgba(28,40,60,.10); border-radius: 10px; padding: 14px 16px; }
        .sys-action-card.danger  { border-color: rgba(224,92,92,.25);  background: rgba(224,92,92,.06);  --t: #CCDEE7; --t2: #A8BECB; --t3: #8aa8c8; --t4: #5c7590; }
        .sys-action-card.warning { border-color: rgba(218,138,35,.22); background: rgba(218,138,35,.06); --t: #CCDEE7; --t2: #A8BECB; --t3: #8aa8c8; --t4: #5c7590; }
        .sys-action-info { flex: 1; min-width: 0; }
        .sys-action-name { font-size: 13px; font-weight: 700; color: var(--t); margin: 0 0 2px; }
        .sys-action-desc { font-size: 12px; color: var(--t3); line-height: 1.45; margin: 0; }
        .sys-action-lock { font-size: 11px; color: var(--t4); margin-top: 4px; display: flex; align-items: center; gap: 4px; }

        /* Buttons */
        .sys-btn { flex-shrink: 0; border: none; border-radius: 7px; padding: 7px 14px; font-size: 12px; font-weight: 700; cursor: pointer; transition: opacity .15s; white-space: nowrap; font-family: 'DM Sans', sans-serif; }
        .sys-btn:disabled { opacity: .45; cursor: not-allowed; }
        .sys-btn-blue { background: #2a5cd4; color: #fff; }
        .sys-btn-blue:hover:not(:disabled) { background: #1f4ab3; }
        .sys-btn-orange { background: rgba(218,138,35,.15); color: #b87c15; border: 1px solid rgba(218,138,35,.3); }
        .sys-btn-orange:hover:not(:disabled) { background: rgba(218,138,35,.25); }
        .sys-btn-red { background: rgba(224,92,92,.14); color: #c0392b; border: 1px solid rgba(224,92,92,.28); }
        .sys-btn-red:hover:not(:disabled) { background: rgba(224,92,92,.24); }

        /* Activity select */
        .sys-activity-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .sys-select { background: var(--bg); border: 1px solid rgba(28,40,60,.15); border-radius: 6px; padding: 6px 10px; font-size: 12px; color: var(--t2); font-family: 'DM Sans', sans-serif; flex: 1; min-width: 160px; max-width: 280px; }

        /* Modal */
        .sys-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
        .sys-modal { background: var(--surface); border-radius: 14px; padding: 28px 24px; max-width: 420px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,.25); }
        .sys-modal-title { font-family: 'Sora', sans-serif; font-size: 17px; font-weight: 800; color: #1C283C; margin: 0 0 8px; }
        .sys-modal-desc { font-size: 13px; color: #4a6080; line-height: 1.5; margin: 0 0 16px; }
        .sys-modal-input-label { font-size: 12px; font-weight: 600; color: #2A3C52; margin: 0 0 6px; }
        .sys-modal-input { width: 100%; box-sizing: border-box; border: 1px solid rgba(28,40,60,.2); border-radius: 7px; padding: 9px 12px; font-size: 13px; font-family: 'DM Sans', sans-serif; background: #fff; color: #1C283C; outline: none; }
        .sys-modal-input:focus { border-color: #c0392b; }
        .sys-modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }
        .sys-modal-cancel { background: none; border: 1px solid rgba(28,40,60,.15); border-radius: 7px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer; color: #4a6080; font-family: 'DM Sans', sans-serif; }
        .sys-modal-confirm { border: none; border-radius: 7px; padding: 8px 16px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .sys-modal-confirm.red { background: #c0392b; color: #fff; }
        .sys-modal-confirm.red:disabled { opacity: .45; cursor: not-allowed; }
        .sys-modal-confirm.orange { background: #da8a23; color: #fff; }
        .sys-modal-confirm.orange:disabled { opacity: .45; cursor: not-allowed; }

        /* Toasts */
        .sys-toast-stack { position: fixed; bottom: 24px; right: 24px; display: flex; flex-direction: column; gap: 8px; z-index: 200; pointer-events: none; }
        .sys-toast { padding: 10px 16px; border-radius: 9px; font-size: 13px; font-weight: 600; font-family: 'DM Sans', sans-serif; box-shadow: 0 4px 14px rgba(0,0,0,.18); animation: toast-in .2s ease; max-width: 320px; }
        .sys-toast.success { background: #1b7a4a; color: #fff; }
        .sys-toast.error { background: #c0392b; color: #fff; }
        @keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        /* Divider */
        .sys-divider { border: none; border-top: 1px solid rgba(28,40,60,.08); margin: 24px 0; }
      `}</style>

      <div className="sys-page">
        <h1 className="sys-h1">System</h1>
        <p className="sys-sub">Database status, seeding, and reset operations</p>

        {/* DB Status */}
        <div className="sys-refresh-row">
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t2)' }}>Database Status</span>
          <button className="sys-refresh-btn" onClick={fetchStatus} disabled={statusLoading}>
            {statusLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {statusLoading ? (
          <div className="sys-status-loading">Loading table counts…</div>
        ) : status ? (
          <div className="sys-status-grid">
            {STATUS_GROUPS.map((group) => (
              <div key={group.label} className="sys-status-card">
                <p className="sys-status-group-label">{group.label}</p>
                {group.rows.map((row) => (
                  <div key={row.key} className="sys-status-row">
                    <span className="sys-status-name">{row.label}</span>
                    <span className="sys-status-val">
                      {(status.tables as Record<string, number>)[row.key] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : null}

        <hr className="sys-divider" />

        {/* Seed */}
        <div className="sys-section">
          <p className="sys-section-title">Seed Operations</p>
          <div className="sys-action-grid">
            <div className="sys-action-card">
              <div className="sys-action-info">
                <p className="sys-action-name">Run Full Seed</p>
                <p className="sys-action-desc">
                  Idempotent — upserts all default content: admin, invitees, agenda, sponsors,
                  initiatives, activities, trivia, prompt challenge questions, and touchpoints.
                  Safe to run multiple times.
                </p>
              </div>
              <button
                className="sys-btn sys-btn-blue"
                disabled={busy !== null}
                onClick={() =>
                  openModal({
                    action: 'seed',
                    label: 'Run Full Seed',
                    description: 'This will upsert all default seed data. Safe to run on a live database — existing records will not be overwritten.',
                    onConfirm: () => runAction('seed', 'seed'),
                  })
                }
              >
                {busy === 'seed' ? 'Running…' : 'Seed'}
              </button>
            </div>
          </div>
        </div>

        <hr className="sys-divider" />

        {/* User Data / Scores */}
        <div className="sys-section">
          <p className="sys-section-title">User Data — Super Admin Only</p>
          <div className="sys-action-grid">
            <div className={`sys-action-card warning${!superAdmin ? ' disabled' : ''}`}>
              <div className="sys-action-info">
                <p className="sys-action-name">Reset All Scores</p>
                <p className="sys-action-desc">
                  Zeros out all user points and clears all activity attempts, submissions, and
                  responses. User accounts are preserved — attendees can redo all activities.
                </p>
                {!superAdmin && <p className="sys-action-lock"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" width="12" height="12" style={{display:"inline",verticalAlign:"middle",marginRight:"4px"}}><rect x="3" y="6" width="8" height="7" rx="1.5"/><path d="M5 6V4.5a2 2 0 0 1 4 0V6"/></svg>Super admin required</p>}
              </div>
              <button
                className="sys-btn sys-btn-orange"
                disabled={busy !== null || !superAdmin}
                onClick={() =>
                  openModal({
                    action: 'reset-scores',
                    label: 'Reset All Scores',
                    description: 'All activity attempts, submissions, and scores will be deleted. User accounts will be kept intact and attendees can redo activities.',
                    onConfirm: () => runAction('reset-scores', 'reset-scores'),
                  })
                }
              >
                {busy === 'reset-scores' ? 'Resetting…' : 'Reset Scores'}
              </button>
            </div>

            <div className={`sys-action-card warning${!superAdmin ? ' disabled' : ''}`}>
              <div className="sys-action-info">
                <p className="sys-action-name">Reset Single Activity</p>
                <p className="sys-action-desc">
                  Clears all attempts and responses for one activity, subtracting those points
                  from each affected user. Select the activity below.
                </p>
                {!superAdmin && <p className="sys-action-lock"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" width="12" height="12" style={{display:"inline",verticalAlign:"middle",marginRight:"4px"}}><rect x="3" y="6" width="8" height="7" rx="1.5"/><path d="M5 6V4.5a2 2 0 0 1 4 0V6"/></svg>Super admin required</p>}
              </div>
              <ResetActivityButton
                activities={activities}
                busy={busy}
                superAdmin={superAdmin}
                onReset={(actId, actName) =>
                  openModal({
                    action: `reset-activity-${actId}`,
                    label: `Reset "${actName}"`,
                    description: `All attempts and responses for "${actName}" will be deleted and points subtracted from affected users.`,
                    onConfirm: () => runAction(`reset-activity-${actId}`, `reset-activity/${actId}`),
                  })
                }
              />
            </div>

            <div className={`sys-action-card danger${!superAdmin ? ' disabled' : ''}`}>
              <div className="sys-action-info">
                <p className="sys-action-name">Wipe All User Accounts</p>
                <p className="sys-action-desc">
                  Permanently deletes every user account and all associated activity data —
                  attempts, scores, submissions, sessions. Config data (agenda, activities,
                  invitees) is preserved.
                </p>
                {!superAdmin && <p className="sys-action-lock"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" width="12" height="12" style={{display:"inline",verticalAlign:"middle",marginRight:"4px"}}><rect x="3" y="6" width="8" height="7" rx="1.5"/><path d="M5 6V4.5a2 2 0 0 1 4 0V6"/></svg>Super admin required</p>}
              </div>
              <button
                className="sys-btn sys-btn-red"
                disabled={busy !== null || !superAdmin}
                onClick={() =>
                  openModal({
                    action: 'wipe-users',
                    label: 'Wipe All User Accounts',
                    description: 'This permanently deletes every user account, all scores, all sessions, and all activity data. This cannot be undone. Config data is preserved.',
                    onConfirm: () => runAction('wipe-users', 'wipe-users'),
                  })
                }
              >
                {busy === 'wipe-users' ? 'Wiping…' : 'Wipe Users'}
              </button>
            </div>
          </div>
        </div>

        <hr className="sys-divider" />

        {/* Danger Zone */}
        <div className="sys-section">
          <p className="sys-section-title" style={{ color: '#c0392b' }}>Danger Zone</p>
          <div className="sys-action-grid">
            <div className={`sys-action-card danger${!superAdmin ? ' disabled' : ''}`}>
              <div className="sys-action-info">
                <p className="sys-action-name">Full Database Reset</p>
                <p className="sys-action-desc">
                  Wipes every table in the database — all users, all content, all config — then
                  re-runs the full seed. Your admin session will be invalidated and you will be
                  logged out. Type <strong>RESET</strong> to confirm.
                </p>
                {!superAdmin && <p className="sys-action-lock"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" width="12" height="12" style={{display:"inline",verticalAlign:"middle",marginRight:"4px"}}><rect x="3" y="6" width="8" height="7" rx="1.5"/><path d="M5 6V4.5a2 2 0 0 1 4 0V6"/></svg>Super admin required</p>}
              </div>
              <button
                className="sys-btn sys-btn-red"
                disabled={busy !== null || !superAdmin}
                onClick={() =>
                  openModal({
                    action: 'reset-database',
                    label: 'Full Database Reset',
                    description: 'EVERY table will be truncated and the seed will re-run. This cannot be undone. Your session will be invalidated immediately after.',
                    requiresTyped: true,
                    onConfirm: () => runAction('reset-database', 'reset-database', { confirmation: 'RESET' }),
                  })
                }
              >
                {busy === 'reset-database' ? 'Resetting…' : 'Reset Database'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {modal && (
        <div className="sys-modal-backdrop" onClick={() => setModal(null)}>
          <div className="sys-modal" onClick={(e) => e.stopPropagation()}>
            <p className="sys-modal-title">{modal.label}</p>
            <p className="sys-modal-desc">{modal.description}</p>
            {modal.requiresTyped && (
              <>
                <p className="sys-modal-input-label">Type RESET to confirm</p>
                <input
                  className="sys-modal-input"
                  value={typedConfirm}
                  onChange={(e) => setTypedConfirm(e.target.value)}
                  placeholder="RESET"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter' && typedConfirm === 'RESET') confirmModal() }}
                />
              </>
            )}
            <div className="sys-modal-actions">
              <button className="sys-modal-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button
                className={`sys-modal-confirm ${modal.action.startsWith('reset-database') || modal.action === 'wipe-users' ? 'red' : 'orange'}`}
                disabled={modal.requiresTyped ? typedConfirm !== 'RESET' : false}
                onClick={confirmModal}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast stack */}
      <div className="sys-toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`sys-toast ${t.kind}`}>{t.message}</div>
        ))}
      </div>
    </>
  );
}

function ResetActivityButton({
  activities,
  busy,
  superAdmin,
  onReset,
}: {
  activities: Activity[];
  busy: string | null;
  superAdmin: boolean;
  onReset: (id: string, name: string) => void;
}) {
  const [selected, setSelected] = useState('');
  const act = activities.find((a) => a.id === selected);

  return (
    <div className="sys-activity-row">
      <select
        className="sys-select"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={!superAdmin}
      >
        <option value="">Select activity…</option>
        {activities.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
      <button
        className="sys-btn sys-btn-orange"
        disabled={busy !== null || !superAdmin || !selected}
        onClick={() => act && onReset(act.id, act.name)}
      >
        {busy?.startsWith('reset-activity') ? 'Resetting…' : 'Reset'}
      </button>
    </div>
  );
}
