'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('agentx_admin_token') ?? '' : '';
}

interface GoldenPointsEntry {
  id: string;
  userName: string;
  userEmail: string;
  text: string;
  wordCount: number;
  aiScore: number | null;
  aiFeedback: string | null;
  status: 'pending' | 'ai_scored' | 'flagged_for_review' | 'approved' | 'rejected';
  pointsAwarded: number;
  submittedAt: string;
}

async function getAllSubmissions(): Promise<GoldenPointsEntry[]> {
  const res = await fetch(`${API_URL}/v1/admin/golden-points`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

const STATUS_LABEL: Record<GoldenPointsEntry['status'], string> = {
  pending: 'Pending',
  ai_scored: 'AI Scored',
  flagged_for_review: 'Flagged',
  approved: 'Approved',
  rejected: 'Rejected',
};

// Dark-enough colors for use on the silver (#CCDEE7) card surface
const STATUS_COLOR: Record<GoldenPointsEntry['status'], string> = {
  pending:           '#4a6080',   // slate — was var(--t3) which now resolves dark ✓
  ai_scored:         '#146636',   // dark green ✓
  flagged_for_review:'#a87c0e',   // dark gold — was gold-rich (#e8b824) which was too bright
  approved:          '#2a5cd4',   // blue ✓
  rejected:          '#ba1818',   // dark red ✓
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function AdminGoldenPointsPage() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['admin-golden-points'],
    queryFn: getAllSubmissions,
    staleTime: 30_000,
    retry: false,
  });

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const all = submissions ?? [];
  const entries = statusFilter === 'all' ? all : all.filter((e) => e.status === statusFilter);

  return (
    <>
      <style>{`
        .gpa-title {
          font-family: 'Sora', sans-serif;
          font-size: 22px; font-weight: 700; color: var(--t);
          margin: 0 0 14px; letter-spacing: -.02em;
        }
        .gpa-filter-row {
          display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 18px;
        }
        .gpa-filter-btn {
          height: 32px; padding: 0 12px;
          border-radius: 20px; border: 1.5px solid rgba(28,40,60,.15);
          background: rgba(204,222,231,.45); color: #4a6080;
          font-size: 12px; font-weight: 700; letter-spacing: .03em;
          font-family: inherit; cursor: pointer; transition: all var(--tr);
        }
        .gpa-filter-btn.active {
          background: #2a5cd4; color: #fff;
          border-color: #2a5cd4;
        }
        .gpa-sub { font-size: 13px; color: var(--t3); margin: 0 0 16px; }
        .gpa-empty {
          text-align: center; padding: 60px 20px;
          font-size: 15px; color: var(--t4);
        }
        .gpa-card {
          background: var(--surface);
          border: 1px solid rgba(255,255,255,.30);
          border-radius: var(--r-lg);
          box-shadow: var(--shadow-card);
          overflow: hidden; margin-bottom: 12px;
        }
        .gpa-card-header {
          padding: 14px 16px; cursor: pointer;
          display: flex; align-items: flex-start; gap: 12px;
        }
        .gpa-card-header:active { background: rgba(204,222,231,.70); }
        .gpa-avatar {
          width: 38px; height: 38px; border-radius: 50%;
          background: rgba(42,92,212,.14); flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 700;
          color: #2a5cd4;
        }
        .gpa-user-name { font-size: 15px; font-weight: 700; color: var(--t); }
        .gpa-user-email { font-size: 12px; color: var(--t3); margin-top: 2px; }
        .gpa-meta {
          display: flex; gap: 8px; align-items: center; margin-top: 6px; flex-wrap: wrap;
        }
        .gpa-status {
          font-size: 11px; font-weight: 700; letter-spacing: .04em;
          text-transform: uppercase; padding: 3px 9px; border-radius: 20px;
        }
        .gpa-score {
          font-size: 12px; font-weight: 700; color: var(--t2);
        }
        .gpa-pts {
          font-size: 12px; color: var(--t3); font-weight: 600;
        }
        .gpa-date {
          font-size: 11px; color: var(--t4); margin-left: auto; flex-shrink: 0;
        }
        .gpa-preview {
          font-size: 13px; color: var(--t2); margin-top: 6px;
          line-height: 1.5; display: -webkit-box;
          -webkit-box-orient: vertical; -webkit-line-clamp: 2;
          overflow: hidden;
        }
        .gpa-expand-label { font-size: 12px; color: #2a5cd4; font-weight: 600; margin-top: 6px; }
        .gpa-full-text {
          padding: 14px 16px;
          font-size: 14px; color: var(--t2); line-height: 1.65;
          border-top: 1px solid rgba(28,40,60,.12);
        }
        .gpa-feedback {
          padding: 0 16px 14px;
          font-size: 13px; color: var(--t3); font-style: italic;
          border-top: 1px solid rgba(28,40,60,.08);
          padding-top: 10px;
        }
        .gpa-loading { text-align: center; padding: 40px; color: var(--t3); }
      `}</style>

      <h1 className="gpa-title">Golden Points</h1>

      <div className="gpa-filter-row">
        {(['all', 'pending', 'ai_scored', 'flagged_for_review', 'approved', 'rejected'] as const).map((s) => (
          <button
            key={s}
            className={`gpa-filter-btn${statusFilter === s ? ' active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? 'All' : STATUS_LABEL[s as GoldenPointsEntry['status']]}
          </button>
        ))}
      </div>

      <p className="gpa-sub">{entries.length} submission{entries.length !== 1 ? 's' : ''}</p>

      {isLoading && <div className="gpa-loading">Loading submissions…</div>}

      {entries.length === 0 && !isLoading && (
        <div className="gpa-empty">No submissions{statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''} yet.</div>
      )}

      {entries.map((entry) => {
        const isExpanded = expanded.has(entry.id);
        const initials = entry.userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
        const color = STATUS_COLOR[entry.status] ?? '#4a6080';
        const bgColor = `${color}1e`; // ~12% opacity hex

        return (
          <div key={entry.id} className="gpa-card">
            <div className="gpa-card-header" onClick={() => toggleExpand(entry.id)}>
              <div className="gpa-avatar">{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div className="gpa-user-name">{entry.userName}</div>
                    <div className="gpa-user-email">{entry.userEmail}</div>
                  </div>
                  <div className="gpa-date">{formatDate(entry.submittedAt)}</div>
                </div>
                <div className="gpa-meta">
                  <span className="gpa-status" style={{ background: bgColor, color }}>
                    {STATUS_LABEL[entry.status]}
                  </span>
                  {entry.aiScore != null && (
                    <span className="gpa-score">Score {entry.aiScore}/100</span>
                  )}
                  <span className="gpa-pts">+{entry.pointsAwarded} pts</span>
                </div>
                {!isExpanded && <div className="gpa-preview">{entry.text}</div>}
                <div className="gpa-expand-label">{isExpanded ? '▲ Collapse' : '▼ Read full response'}</div>
              </div>
            </div>
            {isExpanded && (
              <>
                <div className="gpa-full-text">{entry.text}</div>
                {entry.aiFeedback && (
                  <div className="gpa-feedback">AI feedback: &ldquo;{entry.aiFeedback}&rdquo;</div>
                )}
              </>
            )}
          </div>
        );
      })}
    </>
  );
}
