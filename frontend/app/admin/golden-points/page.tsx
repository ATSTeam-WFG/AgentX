'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('agentx_admin_token') ?? localStorage.getItem('agentx_token') ?? '' : '';
}

interface GoldenPointsEntry {
  id: string;
  userName: string;
  userEmail: string;
  text: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'skipped';
}

async function getPendingQueue(): Promise<GoldenPointsEntry[]> {
  const res = await fetch(`${API_URL}/v1/admin/golden-points?status=pending`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

async function reviewEntry(id: string, action: 'approve' | 'skip') {
  const res = await fetch(`${API_URL}/v1/admin/golden-points/${id}/${action}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

const MOCK_QUEUE: GoldenPointsEntry[] = [
  { id: '1', userName: 'Sarah Martinez', userEmail: 's.martinez@example.com', text: 'One of the biggest pain points our team faces is the delay between title search completion and policy issuance. Clients often wait 3-5 business days and it creates friction at the closing table. AI could dramatically speed up the verification process…', submittedAt: new Date().toISOString(), status: 'pending' },
  { id: '2', userName: 'James Reeves',   userEmail: 'j.reeves@example.com',   text: 'Wire fraud is the #1 concern for our escrow team. We spend hours manually verifying banking changes. An AI tool that cross-references wire instructions against known fraud patterns and flags anomalies in real-time would save us significant risk…', submittedAt: new Date().toISOString(), status: 'pending' },
  { id: '3', userName: 'Linda Kim',      userEmail: 'l.kim@example.com',      text: 'Remote notarization is becoming more common but the workflow is fragmented. We still rely on email chains and phone calls to coordinate. A unified AI-powered platform that handles scheduling, identity verification, and document routing would transform closings…', submittedAt: new Date().toISOString(), status: 'pending' },
];

export default function AdminGoldenPointsPage() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: queue, isLoading } = useQuery({
    queryKey: ['admin-golden-points'],
    queryFn: getPendingQueue,
    staleTime: 30_000,
    retry: false,
    placeholderData: MOCK_QUEUE,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'skip' }) => reviewEntry(id, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-golden-points'] }),
  });

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const pending = (queue ?? MOCK_QUEUE).filter((e) => e.status === 'pending');

  return (
    <>
      <style>{`
        .gpa-title {
          font-family: 'Sora', sans-serif;
          font-size: 22px; font-weight: 700; color: var(--t);
          margin: 0 0 6px; letter-spacing: -.02em;
        }
        .gpa-sub { font-size: 14px; color: var(--t3); margin: 0 0 20px; }
        .gpa-empty {
          text-align: center; padding: 60px 20px;
          font-size: 15px; color: var(--t4);
        }
        .gpa-card {
          background: var(--surface);
          border: 1px solid var(--border-metal);
          border-radius: var(--r-lg);
          box-shadow: var(--shadow-card);
          overflow: hidden; margin-bottom: 14px;
        }
        .gpa-card-header {
          padding: 14px 16px; cursor: pointer;
          display: flex; align-items: flex-start; gap: 12px;
        }
        .gpa-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: var(--blue-lt); flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 700;
          color: var(--blue);
        }
        .gpa-user-name {
          font-size: 15px; font-weight: 700; color: var(--t);
        }
        .gpa-user-email { font-size: 13px; color: var(--t3); margin-top: 1px; }
        .gpa-preview {
          font-size: 13px; color: var(--t2); margin-top: 6px;
          line-height: 1.5; display: -webkit-box;
          -webkit-box-orient: vertical; -webkit-line-clamp: 2;
          overflow: hidden;
        }
        .gpa-expand-label { font-size: 12px; color: var(--blue); font-weight: 600; margin-top: 4px; }
        .gpa-full-text {
          padding: 0 16px 14px;
          font-size: 14px; color: var(--t2); line-height: 1.6;
          border-top: 1px solid var(--border); padding-top: 14px;
        }
        .gpa-actions {
          display: flex; gap: 10px;
          padding: 0 16px 16px;
        }
        .gpa-approve-btn {
          flex: 1; height: 46px; border-radius: 12px;
          background: var(--green-lt); color: var(--green);
          border: 1.5px solid rgba(21,122,64,.22);
          font-size: 14px; font-weight: 700; font-family: inherit;
          cursor: pointer; transition: opacity var(--tr);
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .gpa-approve-btn:active { opacity: .8; }
        .gpa-skip-btn {
          flex: 1; height: 46px; border-radius: 12px;
          background: var(--bg2); color: var(--t3);
          border: 1px solid var(--border-metal);
          font-size: 14px; font-weight: 600; font-family: inherit;
          cursor: pointer; transition: opacity var(--tr);
        }
        .gpa-skip-btn:active { opacity: .8; }
        .gpa-loading { text-align: center; padding: 40px; color: var(--t3); }
      `}</style>

      <h1 className="gpa-title">Golden Points Review</h1>
      <p className="gpa-sub">{pending.length} pending approval{pending.length !== 1 ? 's' : ''}</p>

      {isLoading && <div className="gpa-loading">Loading queue…</div>}

      {pending.length === 0 && !isLoading && (
        <div className="gpa-empty">All caught up! No pending submissions.</div>
      )}

      {pending.map((entry) => {
        const isExpanded = expanded.has(entry.id);
        const initials = entry.userName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
        const isBusy = reviewMutation.isPending && reviewMutation.variables?.id === entry.id;

        return (
          <div key={entry.id} className="gpa-card">
            <div className="gpa-card-header" onClick={() => toggleExpand(entry.id)}>
              <div className="gpa-avatar">{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="gpa-user-name">{entry.userName}</div>
                <div className="gpa-user-email">{entry.userEmail}</div>
                {!isExpanded && <div className="gpa-preview">{entry.text}</div>}
                <div className="gpa-expand-label">{isExpanded ? '▲ Collapse' : '▼ Read full response'}</div>
              </div>
            </div>
            {isExpanded && (
              <div className="gpa-full-text">{entry.text}</div>
            )}
            <div className="gpa-actions">
              <button
                className="gpa-approve-btn"
                disabled={isBusy}
                onClick={() => reviewMutation.mutate({ id: entry.id, action: 'approve' })}
              >
                <svg viewBox="0 0 14 14" fill="none" width="14" height="14">
                  <path d="M2.5 7l3.5 3.5 5.5-5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {isBusy ? 'Processing…' : 'Approve'}
              </button>
              <button
                className="gpa-skip-btn"
                disabled={isBusy}
                onClick={() => reviewMutation.mutate({ id: entry.id, action: 'skip' })}
              >
                Skip
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}
