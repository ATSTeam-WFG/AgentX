'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('agentx_admin_token') ?? '' : '';
}

interface LogEntry {
  id: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

interface LogPage {
  logs: LogEntry[];
  total: number;
}

async function fetchLogs(offset: number): Promise<LogPage> {
  const params = new URLSearchParams({ limit: '50', offset: String(offset) });
  const res = await fetch(`${API_URL}/v1/admin/audit-log?${params}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

const ACTION_LABELS: Record<string, string> = {
  manual_point_adjustment: 'Point Adjustment',
  approve_user:            'Approved Walk-in',
  toggle_activity:         'Activity Toggle',
  create_announcement:     'New Announcement',
  delete_announcement:     'Deleted Announcement',
  create_agenda_event:     'Created Event',
  update_agenda_event:     'Updated Event',
  delete_agenda_event:     'Deleted Event',
};

// Hardcoded dark-enough colors for silver (#CCDEE7) card surface
const ACTION_COLORS: Record<string, string> = {
  manual_point_adjustment: '#a87c0e',   // dark gold
  approve_user:            '#146636',   // dark green
  toggle_activity:         '#2a5cd4',   // blue
  create_announcement:     '#7c3aed',   // purple
  delete_announcement:     '#ba1818',   // dark red
  create_agenda_event:     '#146636',   // dark green
  update_agenda_event:     '#2a5cd4',   // blue
  delete_agenda_event:     '#ba1818',   // dark red
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminAuditLogPage() {
  const [offset, setOffset] = useState(0);
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['audit-log', offset],
    queryFn: () => fetchLogs(offset),
    staleTime: 30_000,
    retry: false,
  });

  // Accumulate logs across page loads
  const page = data ?? { logs: [], total: 0 };
  const combined = offset === 0 ? page.logs : [...allLogs, ...page.logs];

  function handleLoadMore() {
    setAllLogs(combined);
    setOffset((o) => o + 50);
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const hasMore = combined.length < page.total;

  return (
    <>
      <style>{`
        .alog-title {
          font-family: 'Sora', sans-serif;
          font-size: 22px; font-weight: 700; color: var(--t);
          margin: 0 0 6px; letter-spacing: -.02em;
        }
        .alog-sub { font-size: 14px; color: var(--t3); margin: 0 0 20px; }
        .alog-empty { text-align: center; padding: 40px; color: var(--t4); font-size: 14px; }
        .alog-entry {
          background: var(--surface);
          border: 1px solid rgba(255,255,255,.30);
          border-radius: var(--r-lg);
          margin-bottom: 8px;
          box-shadow: var(--shadow-card);
          overflow: hidden;
        }
        .alog-entry-main {
          padding: 12px 16px; display: flex; align-items: flex-start; gap: 12px;
          cursor: pointer;
        }
        .alog-entry-main:active { background: rgba(204,222,231,.70); }
        .alog-dot {
          width: 8px; height: 8px; border-radius: 50%;
          margin-top: 6px; flex-shrink: 0;
        }
        .alog-action {
          font-size: 14px; font-weight: 700;
        }
        .alog-target { font-size: 12px; color: var(--t3); margin-top: 2px; }
        .alog-right { margin-left: auto; text-align: right; flex-shrink: 0; }
        .alog-admin { font-size: 12px; color: var(--t3); }
        .alog-time { font-size: 11px; color: var(--t4); margin-top: 2px; }
        .alog-payload {
          padding: 10px 16px;
          border-top: 1px solid rgba(28,40,60,.12);
          font-size: 12px; color: #2A3C52; font-family: monospace;
          white-space: pre-wrap; word-break: break-all;
          background: rgba(28,40,60,.06);
        }
        .alog-load-more {
          width: 100%; height: 48px;
          background: var(--surface);
          border: 1px solid rgba(255,255,255,.30);
          border-radius: var(--r-lg);
          color: #2a5cd4; font-size: 14px; font-weight: 700;
          font-family: inherit; cursor: pointer; margin-top: 4px;
          transition: background var(--tr);
        }
        .alog-load-more:active { background: rgba(204,222,231,.70); }
        .alog-load-more:disabled { opacity: .5; cursor: not-allowed; }
      `}</style>

      <h1 className="alog-title">Audit Log</h1>
      <p className="alog-sub">{data ? `${data.total} total actions` : 'All admin actions'}</p>

      {isLoading && <div className="alog-empty">Loading…</div>}
      {!isLoading && combined.length === 0 && <div className="alog-empty">No audit log entries yet.</div>}

      {combined.map((entry) => {
        const color = ACTION_COLORS[entry.action] ?? '#4a6080';
        const label = ACTION_LABELS[entry.action] ?? entry.action;
        const isExpanded = expanded.has(entry.id);
        return (
          <div key={entry.id} className="alog-entry">
            <div className="alog-entry-main" onClick={() => entry.payload && toggleExpand(entry.id)}>
              <div className="alog-dot" style={{ background: color }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="alog-action" style={{ color }}>{label}</div>
                <div className="alog-target">{entry.targetType} · {entry.targetId.slice(0, 8)}…</div>
              </div>
              <div className="alog-right">
                <div className="alog-admin">{entry.adminEmail}</div>
                <div className="alog-time">{formatDate(entry.createdAt)}</div>
              </div>
            </div>
            {isExpanded && entry.payload && (
              <div className="alog-payload">{JSON.stringify(entry.payload, null, 2)}</div>
            )}
          </div>
        );
      })}

      {hasMore && (
        <button
          className="alog-load-more"
          onClick={handleLoadMore}
          disabled={isFetching}
        >
          {isFetching ? 'Loading…' : `Load more (${page.total - combined.length} remaining)`}
        </button>
      )}
    </>
  );
}
