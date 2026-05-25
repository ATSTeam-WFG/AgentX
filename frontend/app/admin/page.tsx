'use client';

import { useQuery } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function getAdminStats() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('agentx_admin_token') ?? '' : '';
  const res = await fetch(`${API_URL}/v1/admin/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed');
  return res.json() as Promise<{
    totalUsers: number;
    goldenPointsPending: number;
    touchpointsEngaged: number;
    avgScore: number;
  }>;
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
    staleTime: 30_000,
    retry: false,
  });

  const STAT_CARDS = stats ? [
    { label: 'Total Users',         value: stats.totalUsers,           icon: '👥', color: '#2a5cd4'  },
    { label: 'Golden Pts Pending',  value: stats.goldenPointsPending,  icon: '⭐', color: '#a87c0e'  },
    { label: 'Touchpoints Engaged', value: stats.touchpointsEngaged,   icon: '📍', color: '#146636'  },
    { label: 'Avg Score',           value: stats.avgScore,             icon: '📊', color: '#2a5cd4'  },
  ] : [];

  return (
    <>
      <style>{`
        .adm-page-title {
          font-family: 'Sora', sans-serif;
          font-size: 22px; font-weight: 700;
          color: var(--t); margin: 0 0 18px; letter-spacing: -.02em;
        }
        .adm-stats-grid {
          display: grid; grid-template-columns: repeat(2, 1fr);
          gap: 12px; margin-bottom: 24px;
        }
        .adm-stat-card {
          background: var(--surface);
          border: 1px solid rgba(255,255,255,.30);
          border-radius: var(--r-lg);
          padding: 18px 16px;
          box-shadow: var(--shadow-card);
          text-align: center;
        }
        .adm-stat-icon { font-size: 26px; margin-bottom: 8px; }
        .adm-stat-value {
          font-family: 'Sora', sans-serif;
          font-size: 32px; font-weight: 800;
          letter-spacing: -.03em; line-height: 1;
          margin-bottom: 6px;
        }
        .adm-stat-label {
          font-size: 11px; font-weight: 700; letter-spacing: .05em;
          text-transform: uppercase; color: var(--t3);
        }
        .adm-section-label {
          font-size: 11px; font-weight: 800; letter-spacing: .08em;
          text-transform: uppercase; color: var(--t3);
          margin-bottom: 12px; margin-top: 6px;
        }
        .adm-quick-links {
          display: flex; flex-direction: column; gap: 10px; margin-top: 20px;
        }
        .adm-quick-link {
          background: var(--surface);
          border: 1px solid rgba(255,255,255,.30);
          border-radius: var(--r);
          padding: 14px 16px;
          box-shadow: var(--shadow-card);
          display: flex; align-items: center; justify-content: space-between;
          text-decoration: none;
        }
        .adm-quick-link:active { background: rgba(204,222,231,.80); }
        .adm-quick-link-label { font-size: 15px; font-weight: 600; color: var(--t); }
        .adm-quick-link-sub { font-size: 13px; color: var(--t3); margin-top: 2px; }
        .adm-chev { color: var(--t3); flex-shrink: 0; }
        @keyframes adm-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .adm-skel {
          border-radius: 8px;
          background: linear-gradient(90deg, #c2d4de 25%, #d8e8f0 50%, #c2d4de 75%);
          background-size: 200% 100%;
          animation: adm-shimmer 1.4s ease-in-out infinite;
        }
        .adm-stat-card-skel {
          background: var(--surface);
          border: 1px solid rgba(255,255,255,.30);
          border-radius: var(--r-lg);
          padding: 18px 16px;
          box-shadow: var(--shadow-card);
          display: flex; flex-direction: column; align-items: center; gap: 10px;
        }
      `}</style>

      <h1 className="adm-page-title">Dashboard</h1>

      <div className="adm-stats-grid">
        {isLoading
          ? [0,1,2,3].map((i) => (
            <div key={i} className="adm-stat-card-skel">
              <div className="adm-skel" style={{ width: 32, height: 32, borderRadius: '50%' }} />
              <div className="adm-skel" style={{ width: '55%', height: 32 }} />
              <div className="adm-skel" style={{ width: '70%', height: 11 }} />
            </div>
          ))
          : STAT_CARDS.map((card) => (
            <div key={card.label} className="adm-stat-card">
              <div className="adm-stat-icon">{card.icon}</div>
              <div className="adm-stat-value" style={{ color: card.color }}>{card.value.toLocaleString()}</div>
              <div className="adm-stat-label">{card.label}</div>
            </div>
          ))
        }
      </div>

      <div className="adm-section-label" style={{ color: 'var(--t3)' }}>Quick Actions</div>
      <div className="adm-quick-links">
        <a href="/admin/golden-points" className="adm-quick-link">
          <div>
            <div className="adm-quick-link-label">Review Golden Points</div>
            <div className="adm-quick-link-sub">{stats ? `${stats.goldenPointsPending} submissions` : 'Review submissions'}</div>
          </div>
          <svg className="adm-chev" viewBox="0 0 12 12" fill="none" width="18" height="18">
            <path d="M4.5 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
        <a href="/admin/users" className="adm-quick-link">
          <div>
            <div className="adm-quick-link-label">User Lookup</div>
            <div className="adm-quick-link-sub">Search by name or email</div>
          </div>
          <svg className="adm-chev" viewBox="0 0 12 12" fill="none" width="18" height="18">
            <path d="M4.5 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
        <a href="/admin/invitees" className="adm-quick-link">
          <div>
            <div className="adm-quick-link-label">Manage Invitees</div>
            <div className="adm-quick-link-sub">CSV upload or add individually</div>
          </div>
          <svg className="adm-chev" viewBox="0 0 12 12" fill="none" width="18" height="18">
            <path d="M4.5 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>
    </>
  );
}
