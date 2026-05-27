'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
        const icons: Record<string, string> = {
          trivia: '🧠', avatar: '🖼️', prompt_challenge: '💬',
          golden_points: '⭐', touchpoint: '📍',
        };
        return (
          <div key={activity.id} className="act-card">
            <div className="act-icon" style={{ background: bgColor }}>
              {icons[activity.type] ?? '🎯'}
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
            </div>
          </div>
        );
      })}
    </>
  );
}
