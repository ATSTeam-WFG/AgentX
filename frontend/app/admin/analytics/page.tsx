'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid,
} from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Snapshot {
  ts: string;
  presence: {
    activeNow: number;
    activeTenMin: number;
    activeOneHour: number;
    totalUsers: number;
    totalInvitees: number;
  };
  funnel: {
    registered: number;
    withAvatar: number;
    anyActivity: number;
  };
  activities: {
    trivia:          { completed: number };
    promptChallenge: { completed: number };
    avatar:          { completed: number };
    touchpoints:     { uniqueUsers: number; totalScans: number };
    goldenPoints: {
      pending: number; aiScored: number; flagged: number;
      approved: number; rejected: number;
    };
  };
  touchpointBreakdown: { name: string; location: string; points: number; scans: number }[];
  points: {
    total: number;
    topUsers: { name: string; points: number }[];
  };
  pointsVelocity: { hour: string; points: number }[];
  scoreDistribution: { bucket: string; count: number }[];
  jobs: { pending: number; running: number; done: number; failed: number };
  feedback: { eventFeedback: number; appFeedback: number; pushSubscriptions: number };
}

// ─── Fetch ───────────────────────────────────────────────────────────────────

async function fetchSnapshot(): Promise<Snapshot> {
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('agentx_admin_token') ?? '')
    : '';
  const res = await fetch(`${API_URL}/v1/admin/analytics`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('analytics fetch failed');
  return res.json();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(num: number, denom: number): string {
  if (!denom) return '0%';
  return `${Math.round((num / denom) * 100)}%`;
}

function fmtHour(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', hour12: true });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="an-card">
      <div className="an-stat-value" style={{ color: color ?? '#2a5cd4' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="an-stat-label">{label}</div>
      {sub && <div className="an-stat-sub">{sub}</div>}
    </div>
  );
}

function ProgressRow({ label, value, total, color }: {
  label: string; value: number; total: number; color: string;
}) {
  const ratio = total ? Math.min(value / total, 1) : 0;
  return (
    <div className="an-prog-row">
      <div className="an-prog-label">{label}</div>
      <div className="an-prog-track">
        <div className="an-prog-fill" style={{ width: `${ratio * 100}%`, background: color }} />
      </div>
      <div className="an-prog-count">
        <span style={{ color }}>{value.toLocaleString()}</span>
        <span className="an-prog-pct"> {pct(value, total)}</span>
      </div>
    </div>
  );
}

function GpPill({ label, count, color, bg }: {
  label: string; count: number; color: string; bg: string;
}) {
  return (
    <div className="an-gp-pill" style={{ background: bg, border: `1px solid ${color}30` }}>
      <span className="an-gp-pill-count" style={{ color }}>{count}</span>
      <span className="an-gp-pill-label">{label}</span>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="an-section-header">
      <span className="an-section-title">{title}</span>
      {sub && <span className="an-section-sub">{sub}</span>}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData]         = useState<Snapshot | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [fetching, setFetching] = useState(false);
  const [lastTs, setLastTs]     = useState<string | null>(null);
  const intervalRef             = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const snap = await fetchSnapshot();
      setData(snap);
      setLastTs(snap.ts);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 15_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [load]);

  if (loading) return <Skeleton />;

  if (error || !data) {
    return (
      <div className="an-error">
        Failed to load analytics. Check backend connection.
      </div>
    );
  }

  const { presence, activities, touchpointBreakdown, points, pointsVelocity,
          scoreDistribution, jobs, feedback } = data;

  const totalGp = activities.goldenPoints.pending
    + activities.goldenPoints.aiScored
    + activities.goldenPoints.flagged
    + activities.goldenPoints.approved
    + activities.goldenPoints.rejected;

  const velocityData = pointsVelocity.map(r => ({
    hour: fmtHour(r.hour),
    points: r.points,
  }));

  const distData = scoreDistribution.map(r => ({
    bucket: r.bucket,
    count: Number(r.count),
  }));

  const tpData = touchpointBreakdown.map(t => ({
    name: t.name,
    scans: t.scans,
  }));

  const jobTotal = jobs.pending + jobs.running + jobs.done + jobs.failed;

  return (
    <>
      <style>{`
        /* ── Layout ── */
        .an-page { display: flex; flex-direction: column; gap: 24px; padding-bottom: 32px; }

        /* ── Status bar ── */
        .an-status-bar {
          display: flex; align-items: center; gap: 10px;
          font-size: 12px; color: var(--t3);
        }
        .an-pulse {
          width: 8px; height: 8px; border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 0 0 rgba(34,197,94,.6);
          animation: an-pulse 2s ease-in-out infinite;
          flex-shrink: 0;
        }
        .an-pulse.fetching { background: #f59e0b; box-shadow: none; }
        @keyframes an-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(34,197,94,.6); }
          70%  { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
        .an-refresh-btn {
          margin-left: auto;
          background: none; border: 1px solid rgba(42,92,212,.3);
          border-radius: 6px; padding: 4px 10px;
          font-size: 11px; font-weight: 700; color: #2a5cd4;
          cursor: pointer; letter-spacing: .03em;
          font-family: 'DM Sans', sans-serif;
        }
        .an-refresh-btn:active { opacity: .7; }

        /* ── Cards ── */
        .an-card {
          background: var(--surface);
          border: 1px solid rgba(255,255,255,.30);
          border-radius: var(--r-lg);
          padding: 18px 16px;
          box-shadow: var(--shadow-card);
        }
        .an-stat-value {
          font-family: 'Sora', sans-serif;
          font-size: 36px; font-weight: 800;
          letter-spacing: -.04em; line-height: 1;
          margin-bottom: 6px;
        }
        .an-stat-label {
          font-size: 11px; font-weight: 700; letter-spacing: .05em;
          text-transform: uppercase; color: var(--t3);
        }
        .an-stat-sub {
          font-size: 12px; color: var(--t4); margin-top: 4px;
        }

        /* ── Grids ── */
        .an-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .an-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .an-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        @media (max-width: 900px) {
          .an-grid-4 { grid-template-columns: repeat(2, 1fr); }
          .an-grid-2 { grid-template-columns: 1fr; }
          .an-grid-3 { grid-template-columns: repeat(2, 1fr); }
        }

        /* ── Section header ── */
        .an-section-header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 12px; }
        .an-section-title {
          font-family: 'Sora', sans-serif;
          font-size: 15px; font-weight: 700;
          color: var(--t); letter-spacing: -.01em;
        }
        .an-section-sub {
          font-size: 11px; font-weight: 700; letter-spacing: .06em;
          text-transform: uppercase; color: var(--t4);
        }

        /* ── Activity progress rows ── */
        .an-prog-list { display: flex; flex-direction: column; gap: 12px; }
        .an-prog-row { display: flex; align-items: center; gap: 10px; }
        .an-prog-label {
          font-size: 13px; font-weight: 600; color: var(--t);
          width: 130px; flex-shrink: 0;
        }
        .an-prog-track {
          flex: 1; height: 6px; background: rgba(28,40,60,.1);
          border-radius: 3px; overflow: hidden;
        }
        .an-prog-fill { height: 100%; border-radius: 3px; transition: width .4s ease; }
        .an-prog-count {
          font-size: 13px; font-weight: 700; color: var(--t);
          width: 80px; flex-shrink: 0; text-align: right;
        }
        .an-prog-pct { font-weight: 400; color: var(--t3); }

        /* ── GP pills ── */
        .an-gp-pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .an-gp-pill {
          display: flex; flex-direction: column; align-items: center;
          padding: 10px 14px; border-radius: 10px; min-width: 72px;
        }
        .an-gp-pill-count {
          font-family: 'Sora', sans-serif;
          font-size: 22px; font-weight: 800; letter-spacing: -.03em;
        }
        .an-gp-pill-label {
          font-size: 10px; font-weight: 700; letter-spacing: .05em;
          text-transform: uppercase; color: var(--t3); margin-top: 3px;
        }

        /* ── Charts ── */
        .an-chart-card {
          background: var(--surface);
          border: 1px solid rgba(255,255,255,.30);
          border-radius: var(--r-lg);
          padding: 18px 16px;
          box-shadow: var(--shadow-card);
        }
        .an-chart-title {
          font-size: 13px; font-weight: 700; color: var(--t3);
          letter-spacing: .04em; text-transform: uppercase;
          margin-bottom: 14px;
        }
        .an-chart-empty {
          height: 140px; display: flex; align-items: center; justify-content: center;
          font-size: 13px; color: var(--t4);
        }

        /* ── Top users ── */
        .an-top-list { display: flex; flex-direction: column; gap: 8px; }
        .an-top-row {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(28,40,60,.07);
        }
        .an-top-row:last-child { border-bottom: none; }
        .an-top-rank {
          font-size: 11px; font-weight: 800; color: var(--t4);
          width: 20px; flex-shrink: 0; text-align: center;
        }
        .an-top-name {
          font-size: 13px; font-weight: 600; color: var(--t);
          flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .an-top-pts {
          font-family: 'Sora', sans-serif;
          font-size: 14px; font-weight: 700; color: #2a5cd4;
        }

        /* ── Job badges ── */
        .an-job-grid { display: flex; flex-wrap: wrap; gap: 10px; }
        .an-job-badge {
          display: flex; flex-direction: column; align-items: center;
          padding: 10px 16px; border-radius: 10px;
          min-width: 72px;
        }
        .an-job-count {
          font-family: 'Sora', sans-serif;
          font-size: 22px; font-weight: 800; letter-spacing: -.03em;
        }
        .an-job-label {
          font-size: 10px; font-weight: 700; letter-spacing: .05em;
          text-transform: uppercase; color: var(--t3); margin-top: 3px;
        }

        /* ── Error / loading ── */
        .an-error {
          padding: 32px; text-align: center;
          font-size: 14px; color: #ba1818;
        }
        .an-skel {
          border-radius: 8px;
          background: linear-gradient(90deg, #c2d4de 25%, #d8e8f0 50%, #c2d4de 75%);
          background-size: 200% 100%;
          animation: an-shimmer 1.4s ease-in-out infinite;
        }
        @keyframes an-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .an-page-title {
          font-family: 'Sora', sans-serif;
          font-size: 22px; font-weight: 700;
          color: var(--t); margin: 0 0 4px; letter-spacing: -.02em;
        }
      `}</style>

      <div className="an-page">

        {/* Title + status */}
        <div>
          <h1 className="an-page-title">Live Analytics</h1>
          <div className="an-status-bar">
            <div className={`an-pulse${fetching ? ' fetching' : ''}`} />
            {lastTs ? `Updated ${fmtTime(lastTs)}` : 'Loading...'}
            &nbsp;&middot;&nbsp;auto-refresh 15s
            <button className="an-refresh-btn" onClick={load} disabled={fetching}>
              Refresh
            </button>
          </div>
        </div>

        {/* Presence */}
        <div>
          <SectionHeader
            title="Live Presence"
            sub={`${presence.totalUsers} / ${presence.totalInvitees} invitees registered`}
          />
          <div className="an-grid-4">
            <StatCard label="Online now"   value={presence.activeNow}     color="#22c55e" sub="last 2 min" />
            <StatCard label="Active 10min" value={presence.activeTenMin}  color="#2a5cd4" />
            <StatCard label="Active 1hr"   value={presence.activeOneHour} color="#2a5cd4" />
            <StatCard label="Total Users"  value={presence.totalUsers}
              sub={`${pct(presence.totalUsers, presence.totalInvitees)} of invitee list`}
            />
          </div>
        </div>

        {/* Activity funnel + GP queue */}
        <div className="an-grid-2">
          <div className="an-chart-card">
            <div className="an-chart-title">Activity Completion</div>
            <div className="an-prog-list">
              <ProgressRow label="Trivia"           value={activities.trivia.completed}           total={presence.totalUsers} color="#2a5cd4" />
              <ProgressRow label="Prompt Challenge" value={activities.promptChallenge.completed}  total={presence.totalUsers} color="#7c3aed" />
              <ProgressRow label="Avatar"           value={activities.avatar.completed}           total={presence.totalUsers} color="#0891b2" />
              <ProgressRow label="Touchpoints"      value={activities.touchpoints.uniqueUsers}    total={presence.totalUsers} color="#146636" />
              <ProgressRow label="Any Activity"     value={data.funnel.anyActivity}               total={presence.totalUsers} color="#a87c0e" />
            </div>
          </div>

          <div className="an-chart-card">
            <div className="an-chart-title">Golden Points Queue — {totalGp} total</div>
            <div className="an-gp-pills">
              <GpPill label="Pending"  count={activities.goldenPoints.pending}  color="#a87c0e" bg="rgba(168,124,14,.10)" />
              <GpPill label="AI Scored" count={activities.goldenPoints.aiScored} color="#2a5cd4" bg="rgba(42,92,212,.08)" />
              <GpPill label="Flagged"  count={activities.goldenPoints.flagged}  color="#ba1818" bg="rgba(186,24,24,.08)"  />
              <GpPill label="Approved" count={activities.goldenPoints.approved} color="#146636" bg="rgba(20,102,54,.08)"  />
              <GpPill label="Rejected" count={activities.goldenPoints.rejected} color="#6b7280" bg="rgba(107,114,128,.08)" />
            </div>

            <div style={{ marginTop: 20 }}>
              <div className="an-chart-title" style={{ marginBottom: 8 }}>Push Subscriptions</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 800, color: '#2a5cd4', letterSpacing: '-.03em' }}>
                  {feedback.pushSubscriptions}
                </span>
                <span style={{ fontSize: 13, color: 'var(--t3)', fontWeight: 600 }}>
                  of {presence.totalUsers} users ({pct(feedback.pushSubscriptions, presence.totalUsers)})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Points velocity */}
        <div className="an-chart-card">
          <div className="an-chart-title">
            Points Velocity — last 12h &nbsp;
            <span style={{ color: '#2a5cd4', fontWeight: 800 }}>
              {points.total.toLocaleString()} total awarded
            </span>
          </div>
          {velocityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={velocityData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="ptsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2a5cd4" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2a5cd4" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(28,40,60,.07)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#7a8eae' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#7a8eae' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1C283C', border: 'none', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#9caec8' }}
                  itemStyle={{ color: '#fff', fontWeight: 700 }}
                />
                <Area type="monotone" dataKey="points" stroke="#2a5cd4" strokeWidth={2}
                  fill="url(#ptsFill)" dot={false} activeDot={{ r: 4, fill: '#2a5cd4' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="an-chart-empty">No points awarded in the last 12 hours yet.</div>
          )}
        </div>

        {/* Score distribution + top 10 */}
        <div className="an-grid-2">
          <div className="an-chart-card">
            <div className="an-chart-title">Score Distribution</div>
            {distData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={distData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(28,40,60,.07)" vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#7a8eae' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#7a8eae' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1C283C', border: 'none', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#9caec8' }}
                    itemStyle={{ color: '#fff', fontWeight: 700 }}
                    cursor={{ fill: 'rgba(42,92,212,.08)' }}
                  />
                  <Bar dataKey="count" fill="#2a5cd4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="an-chart-empty">No scores yet.</div>
            )}
          </div>

          <div className="an-chart-card">
            <div className="an-chart-title">Top 10 Users</div>
            {points.topUsers.length > 0 ? (
              <div className="an-top-list">
                {points.topUsers.map((u, i) => (
                  <div key={u.name} className="an-top-row">
                    <span className="an-top-rank">#{i + 1}</span>
                    <span className="an-top-name">{u.name}</span>
                    <span className="an-top-pts">{u.points.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="an-chart-empty">No scores yet.</div>
            )}
          </div>
        </div>

        {/* Touchpoints */}
        {tpData.length > 0 && (
          <div className="an-chart-card">
            <div className="an-chart-title">
              Touchpoint Scans — {activities.touchpoints.totalScans.toLocaleString()} total
              &nbsp;({activities.touchpoints.uniqueUsers} unique users)
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={tpData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(28,40,60,.07)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#7a8eae' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#7a8eae' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1C283C', border: 'none', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#9caec8' }}
                  itemStyle={{ color: '#fff', fontWeight: 700 }}
                  cursor={{ fill: 'rgba(20,102,54,.08)' }}
                />
                <Bar dataKey="scans" fill="#146636" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Job health + feedback */}
        <div className="an-grid-2">
          <div className="an-chart-card">
            <div className="an-chart-title">Job Worker Health — {jobTotal} total</div>
            <div className="an-job-grid">
              <div className="an-job-badge" style={{ background: 'rgba(168,124,14,.10)' }}>
                <span className="an-job-count" style={{ color: '#a87c0e' }}>{jobs.pending}</span>
                <span className="an-job-label">Pending</span>
              </div>
              <div className="an-job-badge" style={{ background: 'rgba(42,92,212,.08)' }}>
                <span className="an-job-count" style={{ color: '#2a5cd4' }}>{jobs.running}</span>
                <span className="an-job-label">Running</span>
              </div>
              <div className="an-job-badge" style={{ background: 'rgba(20,102,54,.08)' }}>
                <span className="an-job-count" style={{ color: '#146636' }}>{jobs.done}</span>
                <span className="an-job-label">Done</span>
              </div>
              <div className="an-job-badge" style={{
                background: jobs.failed > 0 ? 'rgba(186,24,24,.10)' : 'rgba(107,114,128,.06)',
              }}>
                <span className="an-job-count" style={{ color: jobs.failed > 0 ? '#ba1818' : '#6b7280' }}>
                  {jobs.failed}
                </span>
                <span className="an-job-label">Failed</span>
              </div>
            </div>
          </div>

          <div className="an-chart-card">
            <div className="an-chart-title">Feedback</div>
            <div className="an-grid-3" style={{ gap: 8 }}>
              <div style={{ padding: '10px 0' }}>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: '#2a5cd4', letterSpacing: '-.03em' }}>
                  {feedback.eventFeedback}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--t3)', marginTop: 4 }}>
                  Session
                </div>
              </div>
              <div style={{ padding: '10px 0' }}>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: '#7c3aed', letterSpacing: '-.03em' }}>
                  {feedback.appFeedback}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--t3)', marginTop: 4 }}>
                  App
                </div>
              </div>
              <div style={{ padding: '10px 0' }}>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: '#146636', letterSpacing: '-.03em' }}>
                  {pct(feedback.pushSubscriptions, presence.totalUsers)}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--t3)', marginTop: 4 }}>
                  Push opt-in
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

function Skeleton() {
  return (
    <>
      <style>{`
        .an-skel-page { display: flex; flex-direction: column; gap: 20px; }
        .an-skel {
          border-radius: 8px;
          background: linear-gradient(90deg, #c2d4de 25%, #d8e8f0 50%, #c2d4de 75%);
          background-size: 200% 100%;
          animation: an-shimmer 1.4s ease-in-out infinite;
        }
        @keyframes an-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .an-grid-4s { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
      `}</style>
      <div className="an-skel-page">
        <div className="an-skel" style={{ height: 28, width: 180 }} />
        <div className="an-grid-4s">
          {[0,1,2,3].map(i => <div key={i} className="an-skel" style={{ height: 96 }} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="an-skel" style={{ height: 200 }} />
          <div className="an-skel" style={{ height: 200 }} />
        </div>
        <div className="an-skel" style={{ height: 220 }} />
      </div>
    </>
  );
}
