'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('agentx_admin_token') ?? '' : '';
}

async function getDashboardStats() {
  const res = await fetch(`${API_URL}/v1/admin/dashboard`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed');
  return res.json() as Promise<{
    totalUsers: number;
    goldenPointsPending: number;
    touchpointsEngaged: number;
    avgScore: number;
  }>;
}

async function getAnalyticsSummary() {
  const res = await fetch(`${API_URL}/v1/admin/analytics`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed');
  return res.json() as Promise<{
    presence: { activeNow: number; activeTenMin: number; totalInvitees: number };
    jobs: { failed: number; pending: number };
    activities: { goldenPoints: { pending: number; flagged: number } };
  }>;
}

// ── Inline SVG icons ───────────────────────────────────────────────────────

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function IconMapPin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}

function IconBarChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
      <line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  );
}

function IconStar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}

function IconUserCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <polyline points="16 11 18 13 22 9"/>
    </svg>
  );
}

function IconBroadcast() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M22 2L11 13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}

function IconSliders() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" width="20" height="20">
      <line x1="4" y1="21" x2="4" y2="14"/>
      <line x1="4" y1="10" x2="4" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12" y2="3"/>
      <line x1="20" y1="21" x2="20" y2="16"/>
      <line x1="20" y1="12" x2="20" y2="3"/>
      <line x1="1" y1="14" x2="7" y2="14"/>
      <line x1="9" y1="8" x2="15" y2="8"/>
      <line x1="17" y1="16" x2="23" y2="16"/>
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <path d="M7.5 4.5l5 5-5 5"/>
    </svg>
  );
}

// ── Data ───────────────────────────────────────────────────────────────────

// stat.color must contrast on --surface (#CCDEE7 ≈ light blue-grey)
const STATS = [
  { label: 'Registered',       key: 'users',       color: '#0f4c75', icon: <IconUsers /> },
  { label: 'GP Pending Review', key: 'gp',          color: '#7a4900', icon: <IconClock /> },
  { label: 'Touchpoints Hit',   key: 'touchpoints', color: '#145a30', icon: <IconMapPin /> },
  { label: 'Avg Score',         key: 'avgScore',    color: '#1e3d9c', icon: <IconBarChart /> },
] as const;

const ACTIONS = [
  {
    href: '/admin/golden-points',
    label: 'Review Golden Points',
    description: 'Score and approve AI-evaluated responses.',
    accent: '#a87c0e',
    bg: 'rgba(168,124,14,.12)',
    icon: <IconStar />,
  },
  {
    href: '/admin/users',
    label: 'Approve Walk-ins',
    description: 'Pending walk-in registrations need admin sign-off.',
    accent: '#2a5cd4',
    bg: 'rgba(42,92,212,.10)',
    icon: <IconUserCheck />,
  },
  {
    href: '/admin/announcements',
    label: 'Send Announcement',
    description: 'Broadcast a message to all attendees instantly.',
    accent: '#166534',
    bg: 'rgba(22,101,52,.10)',
    icon: <IconBroadcast />,
  },
  {
    href: '/admin/features',
    label: 'Feature Flags',
    description: 'Toggle activities, scoring, and live features.',
    accent: '#6d28d9',
    bg: 'rgba(109,40,217,.10)',
    icon: <IconSliders />,
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getDashboardStats,
    staleTime: 30_000,
    retry: false,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['admin-analytics-summary'],
    queryFn: getAnalyticsSummary,
    staleTime: 30_000,
    retry: false,
  });

  const isLoading = statsLoading || analyticsLoading;

  const alerts: { label: string; href: string; color: string }[] = [];
  if ((analytics?.jobs.failed ?? 0) > 0) {
    alerts.push({ label: `${analytics!.jobs.failed} failed jobs`, href: '/admin/system', color: '#ba1818' });
  }
  if ((analytics?.activities.goldenPoints.flagged ?? 0) > 0) {
    alerts.push({ label: `${analytics!.activities.goldenPoints.flagged} GP submissions flagged`, href: '/admin/golden-points', color: '#a87c0e' });
  }

  const statValues = {
    users: stats?.totalUsers,
    gp: analytics?.activities.goldenPoints.pending,
    touchpoints: stats?.touchpointsEngaged,
    avgScore: stats?.avgScore,
  };

  return (
    <>
      <style>{`
        .dash-page { display: flex; flex-direction: column; gap: 28px; }

        /* ── Header ── */
        .dash-title {
          font-family: 'Sora', sans-serif;
          font-size: 24px; font-weight: 800;
          color: var(--t); letter-spacing: -.03em; margin: 0 0 2px;
        }
        .dash-subtitle { font-size: 13px; color: var(--t3); margin: 0; }

        /* ── Alerts ── */
        .dash-alerts { display: flex; flex-direction: column; gap: 8px; }
        .dash-alert {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px;
          background: rgba(186,24,24,.10);
          border: 1px solid rgba(186,24,24,.22);
          border-radius: 10px;
          text-decoration: none;
        }
        .dash-alert-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .dash-alert-text { font-size: 13px; font-weight: 600; color: #f87171; }

        /* ── Live presence strip ── */
        .dash-presence {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 16px;
          background: rgba(34,197,94,.08);
          border: 1px solid rgba(34,197,94,.20);
          border-radius: 12px;
        }
        .dash-presence-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 0 0 rgba(34,197,94,.6);
          animation: dash-pulse 2s ease-in-out infinite;
          flex-shrink: 0;
        }
        @keyframes dash-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(34,197,94,.6); }
          70%  { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
        /* Presence text — explicit colors so they always read on dark strip bg */
        .dash-presence-live  { font-size: 13px; font-weight: 700; color: #22c55e; }
        .dash-presence-sep   { color: #4a6a5a; font-size: 13px; }
        .dash-presence-sub   { font-size: 13px; color: #a8cdb8; font-weight: 500; }

        /* ── Section label ── */
        .dash-section-label {
          font-size: 10px; font-weight: 800; letter-spacing: .10em;
          text-transform: uppercase; color: var(--t4);
          margin-bottom: 10px;
        }

        /* ── Stat grid ── */
        .dash-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        @media (max-width: 900px) { .dash-stats { grid-template-columns: repeat(2, 1fr); } }

        /* Stat card — light surface; all text must use dark colors explicitly */
        .dash-stat {
          background: var(--surface);
          border: 1px solid rgba(0,0,0,.06);
          border-radius: var(--r-lg);
          padding: 18px 18px 16px;
          box-shadow: var(--shadow-xs);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .dash-stat-icon {
          width: 32px; height: 32px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .dash-stat-value {
          font-family: 'Sora', sans-serif;
          font-size: 32px; font-weight: 800;
          letter-spacing: -.04em; line-height: 1;
        }
        /* Label always dark on the light card surface */
        .dash-stat-label {
          font-size: 11px; font-weight: 700; letter-spacing: .05em;
          text-transform: uppercase;
          color: #4a6080;
        }

        /* ── Action grid ── */
        .dash-actions {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (max-width: 700px) { .dash-actions { grid-template-columns: 1fr; } }

        /* Action card — light surface; explicit dark text */
        .dash-action {
          background: var(--surface);
          border: 1px solid rgba(0,0,0,.06);
          border-radius: var(--r-lg);
          padding: 16px 14px 16px 16px;
          box-shadow: var(--shadow-xs);
          text-decoration: none;
          display: flex; align-items: center; gap: 14px;
          transition: box-shadow var(--tr), transform var(--tr);
        }
        .dash-action:hover {
          box-shadow: var(--shadow-sm);
          transform: translateY(-1px);
        }
        .dash-action-icon {
          width: 40px; height: 40px; border-radius: 11px;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .dash-action-body { flex: 1; min-width: 0; }
        /* Explicit dark colors — these cards sit on --surface (#CCDEE7) */
        .dash-action-label {
          font-size: 14px; font-weight: 700;
          color: #1a2c42;
          margin-bottom: 3px;
        }
        .dash-action-desc {
          font-size: 12px; color: #4a6080; line-height: 1.45;
        }
        .dash-action-arrow {
          color: #7a96a8; flex-shrink: 0; margin-left: 4px;
        }

        /* ── Skeleton ── */
        @keyframes dash-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .dash-skel {
          border-radius: 8px;
          background: linear-gradient(90deg,
            rgba(160,190,210,.5) 25%,
            rgba(190,215,230,.7) 50%,
            rgba(160,190,210,.5) 75%);
          background-size: 200% 100%;
          animation: dash-shimmer 1.4s ease-in-out infinite;
        }
      `}</style>

      <div className="dash-page">

        {/* Header */}
        <div>
          <h1 className="dash-title">Dashboard</h1>
          <p className="dash-subtitle">WFG Executive Summit 2026 · June 3–5</p>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="dash-alerts">
            {alerts.map((a) => (
              <Link key={a.label} href={a.href} className="dash-alert">
                <span className="dash-alert-dot" style={{ background: a.color }} />
                <span className="dash-alert-text">{a.label}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Live presence strip */}
        {!analyticsLoading && analytics && (
          <div className="dash-presence">
            <span className="dash-presence-dot" />
            <span className="dash-presence-live">
              {analytics.presence.activeNow} online now
            </span>
            <span className="dash-presence-sep">·</span>
            <span className="dash-presence-sub">
              {analytics.presence.activeTenMin} active in last 10 min
            </span>
          </div>
        )}

        {/* Key stats */}
        <div>
          <div className="dash-section-label">Overview</div>
          <div className="dash-stats">
            {isLoading
              ? [0, 1, 2, 3].map((i) => (
                <div key={i} className="dash-stat">
                  <div className="dash-skel" style={{ width: 32, height: 32, borderRadius: 9 }} />
                  <div className="dash-skel" style={{ height: 32, width: '55%', marginTop: 2 }} />
                  <div className="dash-skel" style={{ height: 10, width: '75%' }} />
                </div>
              ))
              : STATS.map((s) => (
                <div key={s.key} className="dash-stat">
                  <div
                    className="dash-stat-icon"
                    style={{ background: `${s.color}18`, color: s.color }}
                  >
                    {s.icon}
                  </div>
                  <div className="dash-stat-value" style={{ color: s.color }}>
                    {(statValues[s.key] ?? 0).toLocaleString()}
                  </div>
                  <div className="dash-stat-label">{s.label}</div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <div className="dash-section-label">Quick Actions</div>
          <div className="dash-actions">
            {ACTIONS.map((action) => (
              <Link key={action.href} href={action.href} className="dash-action">
                <div
                  className="dash-action-icon"
                  style={{ background: action.bg, color: action.accent, border: `1px solid ${action.accent}28` }}
                >
                  {action.icon}
                </div>
                <div className="dash-action-body">
                  <div className="dash-action-label">{action.label}</div>
                  <div className="dash-action-desc">{action.description}</div>
                </div>
                <span className="dash-action-arrow"><IconChevronRight /></span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
