'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminRole } from '@/hooks/use-admin-role';
import { canDo } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('agentx_admin_token') ?? '' : '';
}

interface FeatureFlag {
  key: string;
  label: string;
  description: string;
  value: boolean;
  updatedAt: string;
  updatedByAdminId: string | null;
}

async function fetchFlags(): Promise<FeatureFlag[]> {
  const res = await fetch(`${API_URL}/v1/admin/features`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed to load feature flags');
  return res.json();
}

async function patchFlag(key: string, value: boolean): Promise<FeatureFlag> {
  const res = await fetch(`${API_URL}/v1/admin/features/${key}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error('Failed to update flag');
  return res.json();
}

// Keys that warrant a gold/high-impact highlight
const HIGH_IMPACT_KEYS = new Set(['activities_open']);

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminFeaturesPage() {
  const qc = useQueryClient();
  const role = useAdminRole();
  const canManage = canDo(role, 'moderator');

  const { data: flags, isLoading, isError } = useQuery({
    queryKey: ['admin-features'],
    queryFn: fetchFlags,
    staleTime: 10_000,
    retry: 1,
  });

  const mutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: boolean }) => patchFlag(key, value),
    onMutate: async ({ key, value }) => {
      await qc.cancelQueries({ queryKey: ['admin-features'] });
      const prev = qc.getQueryData<FeatureFlag[]>(['admin-features']);
      qc.setQueryData<FeatureFlag[]>(['admin-features'], (old) =>
        old?.map((f) => f.key === key ? { ...f, value } : f) ?? []
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['admin-features'], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin-features'] }),
  });

  return (
    <>
      <style>{`
        .cp-header { margin: 0 0 4px; }
        .cp-title {
          font-family: 'Sora', sans-serif;
          font-size: 22px; font-weight: 700; color: var(--t);
          letter-spacing: -.02em; margin: 0 0 6px;
        }
        .cp-sub { font-size: 14px; color: var(--t3); margin: 0 0 20px; }

        .cp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 12px;
        }

        .cp-card {
          background: var(--surface);
          border: 1px solid rgba(255,255,255,.30);
          border-radius: var(--r-lg);
          padding: 18px;
          box-shadow: var(--shadow-card);
          display: flex; flex-direction: column; gap: 4px;
        }
        .cp-card--high {
          border-color: rgba(168,124,14,.40);
          box-shadow: var(--shadow-card), 0 0 0 1px rgba(168,124,14,.18);
        }

        .cp-card-top {
          display: flex; align-items: flex-start;
          justify-content: space-between; gap: 12px;
        }
        .cp-card-label {
          font-size: 15px; font-weight: 700; color: var(--t);
          line-height: 1.3;
        }
        .cp-card-label--high { color: #a87c0e; }
        .cp-card-badge {
          font-size: 10px; font-weight: 700; letter-spacing: .05em;
          text-transform: uppercase; padding: 2px 7px; border-radius: 5px;
          background: rgba(168,124,14,.14); color: #a87c0e;
          flex-shrink: 0; margin-top: 2px;
          border: 1px solid rgba(168,124,14,.24);
        }
        .cp-card-desc {
          font-size: 13px; color: var(--t3);
          line-height: 1.55; margin: 2px 0 0;
        }

        .cp-toggle-row {
          display: flex; align-items: center;
          justify-content: space-between;
          margin-top: 14px; padding-top: 12px;
          border-top: 1px solid rgba(28,40,60,.10);
        }
        .cp-toggle-meta {
          font-size: 11px; color: var(--t4);
          line-height: 1.4;
        }

        /* Toggle switch */
        .cp-toggle {
          display: flex; align-items: center; gap: 8px;
          background: none; border: none; cursor: pointer; padding: 0;
        }
        .cp-toggle:disabled { cursor: default; opacity: .6; }
        .cp-toggle-track {
          width: 48px; height: 28px; border-radius: 14px;
          position: relative; transition: background var(--tr);
          flex-shrink: 0;
        }
        .cp-toggle-track.on  { background: #146636; }
        .cp-toggle-track.off { background: rgba(28,40,60,.20); }
        .cp-toggle-thumb {
          position: absolute; top: 4px;
          width: 20px; height: 20px; border-radius: 50%;
          background: #fff; transition: left var(--tr);
          box-shadow: 0 1px 4px rgba(0,0,0,.30);
        }
        .cp-toggle-track.on  .cp-toggle-thumb { left: 24px; }
        .cp-toggle-track.off .cp-toggle-thumb { left: 4px; }
        .cp-toggle-label { font-size: 13px; font-weight: 700; min-width: 42px; }
        .cp-toggle-label.on  { color: #146636; }
        .cp-toggle-label.off { color: var(--t4); }

        .cp-empty { text-align: center; padding: 40px; color: var(--t4); font-size: 14px; }
      `}</style>

      <div className="cp-header">
        <h1 className="cp-title">Control Panel</h1>
        <p className="cp-sub">Live event feature switches — changes take effect instantly for all users.</p>
      </div>

      {isLoading && <div className="cp-empty">Loading…</div>}

      {isError && (
        <div className="cp-empty" style={{ color: '#c0392b' }}>
          Failed to load flags — check that the backend is running and restarted after the latest deploy.
        </div>
      )}

      {!isLoading && !isError && (flags ?? []).length === 0 && (
        <div className="cp-empty">
          No feature flags found. Run <strong>System → Seed</strong> to populate them.
        </div>
      )}

      {!isLoading && !isError && (flags ?? []).length > 0 && (
        <div className="cp-grid">
          {(flags ?? []).map((flag) => {
            const isHigh = HIGH_IMPACT_KEYS.has(flag.key);
            const isOn = flag.value;

            return (
              <div
                key={flag.key}
                className={`cp-card${isHigh ? ' cp-card--high' : ''}`}
              >
                <div className="cp-card-top">
                  <span className={`cp-card-label${isHigh ? ' cp-card-label--high' : ''}`}>
                    {flag.label}
                  </span>
                  {isHigh && <span className="cp-card-badge">High impact</span>}
                </div>
                <p className="cp-card-desc">{flag.description}</p>

                <div className="cp-toggle-row">
                  <span className="cp-toggle-meta">
                    {flag.updatedAt
                      ? `Changed ${relativeTime(flag.updatedAt)}`
                      : 'Never changed'}
                  </span>
                  {canManage ? (
                    <button
                      className="cp-toggle"
                      onClick={() => mutation.mutate({ key: flag.key, value: !flag.value })}
                      disabled={mutation.isPending}
                      aria-label={`Toggle ${flag.label}`}
                    >
                      <div className={`cp-toggle-track ${isOn ? 'on' : 'off'}`}>
                        <div className="cp-toggle-thumb" />
                      </div>
                      <span className={`cp-toggle-label ${isOn ? 'on' : 'off'}`}>
                        {isOn ? 'On' : 'Off'}
                      </span>
                    </button>
                  ) : (
                    <div
                      className="cp-toggle adm-locked"
                      title="Requires Moderator access"
                      style={{ cursor: 'not-allowed' }}
                    >
                      <div className={`cp-toggle-track ${isOn ? 'on' : 'off'}`}>
                        <div className="cp-toggle-thumb" />
                      </div>
                      <span className={`cp-toggle-label ${isOn ? 'on' : 'off'}`}>
                        {isOn ? 'On' : 'Off'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
