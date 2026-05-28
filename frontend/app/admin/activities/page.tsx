'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminRole } from '@/hooks/use-admin-role';
import { canDo } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('agentx_admin_token') ?? '' : '';
}

interface Activity {
  id: string;
  type: string;
  name: string;
  maxPoints: number;
  isOpen: boolean;
  isOneShot: boolean;
}

async function fetchActivities(): Promise<Activity[]> {
  const res = await fetch(`${API_URL}/v1/admin/activities`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed');
  return res.json() as Promise<Activity[]>;
}

async function toggleActivity(id: string): Promise<{ id: string; isOpen: boolean }> {
  const res = await fetch(`${API_URL}/v1/admin/activities/${id}/toggle`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

const TYPE_LABELS: Record<string, string> = {
  trivia: 'Trivia',
  avatar: 'Avatar',
  prompt_challenge: 'Prompt',
  golden_points: 'Golden Pts',
  touchpoint: 'Touchpoint',
};

// SVG icons per activity type (stroke-based, inherits `color` from parent)
const ACT_ICONS = {
  trivia: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <circle cx="10" cy="10" r="8"/>
      <path d="M7.5 7.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5"/>
      <circle cx="10" cy="14.5" r=".75" fill="currentColor" stroke="none"/>
    </svg>
  ),
  avatar: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <rect x="2" y="2" width="16" height="16" rx="3"/>
      <circle cx="10" cy="8" r="2.5"/>
      <path d="M4.5 17a5.5 5.5 0 0 1 11 0"/>
    </svg>
  ),
  prompt_challenge: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M17 2H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h5l2 3 2-3h5a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"/>
      <line x1="6" y1="7" x2="14" y2="7"/>
      <line x1="6" y1="10.5" x2="11" y2="10.5"/>
    </svg>
  ),
  golden_points: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <polygon points="10 2 12.59 7.18 18.5 8.09 14.25 12.22 15.18 18.09 10 15.36 4.82 18.09 5.75 12.22 1.5 8.09 7.41 7.18 10 2"/>
    </svg>
  ),
  touchpoint: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M10 1.5C7.24 1.5 5 3.74 5 6.5c0 4.25 5 12 5 12s5-7.75 5-12c0-2.76-2.24-5-5-5z"/>
      <circle cx="10" cy="6.5" r="1.8"/>
    </svg>
  ),
  _default: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <circle cx="10" cy="10" r="8"/>
      <line x1="10" y1="6" x2="10" y2="10"/>
      <line x1="10" y1="13" x2="10" y2="14"/>
    </svg>
  ),
};

// Hardcoded dark-enough colors for silver (#CCDEE7) card surface
const TYPE_COLORS: Record<string, string> = {
  trivia:           '#2a5cd4',   // blue
  avatar:           '#7c3aed',   // purple
  prompt_challenge: '#146636',   // dark green
  golden_points:    '#a87c0e',   // dark gold
  touchpoint:       '#3068e8',   // blue-mid
};

export default function AdminActivitiesPage() {
  const qc = useQueryClient();
  const role = useAdminRole();
  const canToggle = canDo(role, 'moderator');

  const { data: activities, isLoading } = useQuery({
    queryKey: ['activities'],
    queryFn: fetchActivities,
    staleTime: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: toggleActivity,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['activities'] });
      const prev = qc.getQueryData<Activity[]>(['activities']);
      qc.setQueryData<Activity[]>(['activities'], (old) =>
        old?.map((a) => a.id === id ? { ...a, isOpen: !a.isOpen } : a) ?? []
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['activities'], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  });

  const list = activities ?? [];

  return (
    <>
      <style>{`
        .act-title {
          font-family: 'Sora', sans-serif;
          font-size: 22px; font-weight: 700; color: var(--t);
          margin: 0 0 6px; letter-spacing: -.02em;
        }
        .act-sub { font-size: 14px; color: var(--t3); margin: 0 0 20px; }
        .act-empty { text-align: center; padding: 40px; color: var(--t4); font-size: 14px; }
        .act-card {
          background: var(--surface);
          border: 1px solid rgba(255,255,255,.30);
          border-radius: var(--r-lg);
          padding: 16px;
          margin-bottom: 10px;
          box-shadow: var(--shadow-card);
          display: flex; align-items: center; gap: 14px;
        }
        .act-icon {
          width: 40px; height: 40px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        .act-name { font-size: 15px; font-weight: 700; color: var(--t); }
        .act-meta { display: flex; gap: 8px; align-items: center; margin-top: 5px; }
        .act-type-chip {
          font-size: 11px; font-weight: 700; letter-spacing: .04em;
          text-transform: uppercase; padding: 2px 8px; border-radius: 6px;
        }
        .act-pts { font-size: 12px; color: var(--t3); font-weight: 600; }
        .act-toggle-wrap { margin-left: auto; flex-shrink: 0; }
        .act-toggle {
          display: flex; align-items: center; gap: 8px;
          background: none; border: none; cursor: pointer; padding: 0;
        }
        .act-toggle-track {
          width: 44px; height: 26px; border-radius: 13px;
          position: relative; transition: background var(--tr);
          flex-shrink: 0;
        }
        .act-toggle-track.on  { background: #146636; }
        .act-toggle-track.off { background: rgba(28,40,60,.20); }
        .act-toggle-thumb {
          position: absolute; top: 3px;
          width: 20px; height: 20px; border-radius: 50%;
          background: #fff; transition: left var(--tr);
          box-shadow: 0 1px 4px rgba(0,0,0,.3);
        }
        .act-toggle-track.on  .act-toggle-thumb { left: 21px; }
        .act-toggle-track.off .act-toggle-thumb { left: 3px; }
        .act-toggle-label { font-size: 13px; font-weight: 700; }
        .act-toggle-label.on  { color: #146636; }
        .act-toggle-label.off { color: var(--t4); }
      `}</style>

      <h1 className="act-title">Activities</h1>
      <p className="act-sub">Toggle activities on or off. Closed activities reject new submissions.</p>

      {isLoading && <div className="act-empty">Loading…</div>}
      {!isLoading && list.length === 0 && <div className="act-empty">No activities found.</div>}

      {list.map((activity) => {
        const color = TYPE_COLORS[activity.type] ?? '#2a5cd4';
        const isOn = activity.isOpen;
        const bgColor = `${color}1e`; // ~12% opacity
        const actIcon = ACT_ICONS[activity.type as keyof typeof ACT_ICONS] ?? ACT_ICONS._default;
        return (
          <div key={activity.id} className="act-card">
            <div className="act-icon" style={{ background: bgColor, color }}>
              {actIcon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="act-name">{activity.name}</div>
              <div className="act-meta">
                <span
                  className="act-type-chip"
                  style={{ background: bgColor, color }}
                >
                  {TYPE_LABELS[activity.type] ?? activity.type}
                </span>
                <span className="act-pts">{activity.maxPoints} pts max</span>
              </div>
            </div>
            <div className="act-toggle-wrap">
              {canToggle ? (
                <button
                  className="act-toggle"
                  onClick={() => toggleMutation.mutate(activity.id)}
                  disabled={toggleMutation.isPending}
                >
                  <div className={`act-toggle-track ${isOn ? 'on' : 'off'}`}>
                    <div className="act-toggle-thumb" />
                  </div>
                  <span className={`act-toggle-label ${isOn ? 'on' : 'off'}`}>
                    {isOn ? 'Open' : 'Closed'}
                  </span>
                </button>
              ) : (
                <div
                  className="act-toggle adm-locked"
                  title="Requires Moderator access"
                  style={{ cursor: 'not-allowed' }}
                >
                  <div className={`act-toggle-track ${isOn ? 'on' : 'off'}`}>
                    <div className="act-toggle-thumb" />
                  </div>
                  <span className={`act-toggle-label ${isOn ? 'on' : 'off'}`}>
                    {isOn ? 'Open' : 'Closed'}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
