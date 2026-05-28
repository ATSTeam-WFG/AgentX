'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('agentx_admin_token') ?? '' : '';
}

type JobStatus = 'pending' | 'running' | 'done' | 'failed';
type JobType   = 'avatar_generation' | 'golden_points_scoring' | 'push_notification';

interface Job {
  id:          string;
  type:        JobType;
  payloadJson: Record<string, unknown>;
  status:      JobStatus;
  attempts:    number;
  lastError:   string | null;
  lockedBy:    string | null;
  lockedUntil: string | null;
  createdAt:   string;
  completedAt: string | null;
}

interface JobPage {
  jobs:   Job[];
  total:  number;
  limit:  number;
  offset: number;
}

async function fetchJobs(status: JobStatus | 'all', offset: number): Promise<JobPage> {
  const params = new URLSearchParams({ limit: '50', offset: String(offset) });
  if (status !== 'all') params.set('status', status);
  const res = await fetch(`${API_URL}/v1/admin/jobs?${params}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed to fetch jobs');
  return res.json();
}

async function retryJob(id: string): Promise<Job> {
  const res = await fetch(`${API_URL}/v1/admin/jobs/${id}/retry`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed to retry job');
  return res.json();
}

const STATUS_TABS: Array<{ key: JobStatus | 'all'; label: string }> = [
  { key: 'all',     label: 'All'     },
  { key: 'pending', label: 'Pending' },
  { key: 'running', label: 'Running' },
  { key: 'done',    label: 'Done'    },
  { key: 'failed',  label: 'Failed'  },
];

const STATUS_COLOR: Record<JobStatus, string> = {
  pending: '#a87c0e',
  running: '#2a5cd4',
  done:    '#146636',
  failed:  '#ba1818',
};

const STATUS_BG: Record<JobStatus, string> = {
  pending: 'rgba(168,124,14,.13)',
  running: 'rgba(42,92,212,.13)',
  done:    'rgba(20,102,54,.13)',
  failed:  'rgba(186,24,24,.13)',
};

const TYPE_LABELS: Record<JobType, string> = {
  avatar_generation:    'Avatar',
  golden_points_scoring: 'Golden Points',
  push_notification:    'Push',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function elapsed(createdAt: string, completedAt: string | null) {
  const end  = completedAt ? new Date(completedAt).getTime() : Date.now();
  const ms   = end - new Date(createdAt).getTime();
  if (ms < 1000)  return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export default function AdminJobsPage() {
  const [tab,      setTab]      = useState<JobStatus | 'all'>('all');
  const [offset,   setOffset]   = useState(0);
  const [allJobs,  setAllJobs]  = useState<Job[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-jobs', tab, offset],
    queryFn:  () => fetchJobs(tab, offset),
    staleTime: 5_000,
    refetchInterval: 5_000,
    retry: false,
  });

  // Reset accumulated list when tab changes
  useEffect(() => {
    setOffset(0);
    setAllJobs([]);
  }, [tab]);

  const page    = data ?? { jobs: [], total: 0, limit: 50, offset: 0 };
  const combined = offset === 0 ? page.jobs : [...allJobs, ...page.jobs];
  const hasMore  = combined.length < page.total;

  function handleLoadMore() {
    setAllJobs(combined);
    setOffset((o) => o + 50);
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const { mutate: retry, isPending: isRetrying } = useMutation({
    mutationFn: retryJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-jobs'] });
    },
  });

  const [retryingId, setRetryingId] = useState<string | null>(null);

  function handleRetry(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setRetryingId(id);
    retry(id, { onSettled: () => setRetryingId(null) });
  }

  return (
    <>
      <style>{`
        .ajob-title {
          font-family: 'Sora', sans-serif;
          font-size: 22px; font-weight: 700; color: var(--t);
          margin: 0 0 4px; letter-spacing: -.02em;
        }
        .ajob-sub { font-size: 14px; color: var(--t3); margin: 0 0 18px; }

        /* Tabs */
        .ajob-tabs {
          display: flex; gap: 4px; margin-bottom: 16px;
          overflow-x: auto; scrollbar-width: none;
        }
        .ajob-tabs::-webkit-scrollbar { display: none; }
        .ajob-tab {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 13px; font-weight: 700;
          border: 1px solid rgba(255,255,255,.12);
          background: transparent; color: var(--t3);
          cursor: pointer; font-family: inherit;
          transition: background var(--tr), color var(--tr);
          white-space: nowrap;
        }
        .ajob-tab:hover { background: rgba(255,255,255,.06); color: var(--t); }
        .ajob-tab.active {
          background: rgba(255,255,255,.12); color: #fff;
          border-color: rgba(255,255,255,.22);
        }

        /* Cards */
        .ajob-card {
          background: var(--surface);
          border: 1px solid rgba(255,255,255,.30);
          border-radius: var(--r-lg);
          margin-bottom: 8px;
          box-shadow: var(--shadow-card);
          overflow: hidden;
        }
        .ajob-row {
          padding: 12px 16px;
          display: flex; align-items: flex-start; gap: 12px;
          cursor: pointer;
        }
        .ajob-row:active { background: rgba(204,222,231,.70); }

        .ajob-status-pill {
          display: inline-flex; align-items: center;
          padding: 3px 9px; border-radius: 20px;
          font-size: 11px; font-weight: 800; letter-spacing: .05em;
          text-transform: uppercase; flex-shrink: 0; margin-top: 1px;
        }
        .ajob-type {
          font-size: 14px; font-weight: 700; color: var(--t);
        }
        .ajob-id {
          font-size: 11px; color: var(--t4); margin-top: 2px;
          font-family: monospace;
        }
        .ajob-right { margin-left: auto; text-align: right; flex-shrink: 0; }
        .ajob-time { font-size: 11px; color: var(--t4); margin-top: 2px; }
        .ajob-attempts {
          font-size: 11px; color: var(--t4); margin-top: 2px;
        }

        .ajob-detail {
          padding: 12px 16px;
          border-top: 1px solid rgba(28,40,60,.12);
          background: rgba(28,40,60,.04);
          display: flex; flex-direction: column; gap: 10px;
        }
        .ajob-detail-label {
          font-size: 10px; font-weight: 800; letter-spacing: .1em;
          text-transform: uppercase; color: var(--t4); margin-bottom: 4px;
        }
        .ajob-detail-code {
          font-size: 12px; color: #2A3C52; font-family: monospace;
          white-space: pre-wrap; word-break: break-all;
          background: rgba(28,40,60,.06);
          padding: 8px 10px; border-radius: 8px;
        }
        .ajob-error-box {
          background: rgba(186,24,24,.07);
          border: 1px solid rgba(186,24,24,.18);
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 12px; color: #ba1818; font-family: monospace;
          white-space: pre-wrap; word-break: break-all;
        }
        .ajob-retry-btn {
          align-self: flex-start;
          padding: 7px 16px;
          background: rgba(186,24,24,.10);
          color: #ba1818;
          border: 1px solid rgba(186,24,24,.25);
          border-radius: 8px;
          font-size: 13px; font-weight: 700;
          font-family: inherit; cursor: pointer;
          transition: opacity var(--tr);
        }
        .ajob-retry-btn:hover { opacity: .85; }
        .ajob-retry-btn:disabled { opacity: .45; cursor: not-allowed; }

        .ajob-empty {
          text-align: center; padding: 40px;
          color: var(--t4); font-size: 14px;
        }
        .ajob-load-more {
          width: 100%; height: 48px;
          background: var(--surface);
          border: 1px solid rgba(255,255,255,.30);
          border-radius: var(--r-lg);
          color: #2a5cd4; font-size: 14px; font-weight: 700;
          font-family: inherit; cursor: pointer; margin-top: 4px;
          transition: background var(--tr);
        }
        .ajob-load-more:active { background: rgba(204,222,231,.70); }
        .ajob-load-more:disabled { opacity: .5; cursor: not-allowed; }

        .ajob-refresh-dot {
          display: inline-block; width: 6px; height: 6px;
          border-radius: 50%; background: #4a8aff;
          margin-left: 6px; vertical-align: middle;
          animation: ajob-pulse 1.5s ease-in-out infinite;
        }
        @keyframes ajob-pulse {
          0%, 100% { opacity: 1; } 50% { opacity: .3; }
        }
      `}</style>

      <h1 className="ajob-title">
        Jobs
        {isFetching && <span className="ajob-refresh-dot" />}
      </h1>
      <p className="ajob-sub">
        {data ? `${data.total} total · refreshes every 5s` : 'Worker job queue'}
      </p>

      <div className="ajob-tabs">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            className={`ajob-tab${tab === key ? ' active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && <div className="ajob-empty">Loading…</div>}
      {!isLoading && combined.length === 0 && (
        <div className="ajob-empty">No jobs{tab !== 'all' ? ` with status "${tab}"` : ''}.</div>
      )}

      {combined.map((job) => {
        const isExpanded = expanded.has(job.id);
        const color = STATUS_COLOR[job.status];
        const bg    = STATUS_BG[job.status];
        return (
          <div key={job.id} className="ajob-card">
            <div className="ajob-row" onClick={() => toggleExpand(job.id)}>
              <span
                className="ajob-status-pill"
                style={{ color, background: bg }}
              >
                {job.status}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ajob-type">{TYPE_LABELS[job.type] ?? job.type}</div>
                <div className="ajob-id">{job.id}</div>
              </div>
              <div className="ajob-right">
                <div className="ajob-time">{formatDate(job.createdAt)}</div>
                <div className="ajob-attempts">
                  {job.attempts} attempt{job.attempts !== 1 ? 's' : ''} · {elapsed(job.createdAt, job.completedAt)}
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="ajob-detail">
                <div>
                  <div className="ajob-detail-label">Payload</div>
                  <pre className="ajob-detail-code">
                    {JSON.stringify(job.payloadJson, null, 2)}
                  </pre>
                </div>

                {job.lastError && (
                  <div>
                    <div className="ajob-detail-label">Last Error</div>
                    <div className="ajob-error-box">{job.lastError}</div>
                  </div>
                )}

                {job.lockedBy && (
                  <div className="ajob-id">
                    Locked by {job.lockedBy}
                    {job.lockedUntil ? ` until ${formatDate(job.lockedUntil)}` : ''}
                  </div>
                )}

                {job.status === 'failed' && (
                  <button
                    className="ajob-retry-btn"
                    onClick={(e) => handleRetry(e, job.id)}
                    disabled={retryingId === job.id || isRetrying}
                  >
                    {retryingId === job.id ? 'Retrying…' : 'Retry Job'}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {hasMore && (
        <button
          className="ajob-load-more"
          onClick={handleLoadMore}
          disabled={isFetching}
        >
          {isFetching ? 'Loading…' : `Load more (${page.total - combined.length} remaining)`}
        </button>
      )}
    </>
  );
}
