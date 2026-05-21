'use client';

import { useQuery } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function getAdminStats() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('agentx_admin_token') ?? localStorage.getItem('agentx_token') : '';
  const res = await fetch(`${API_URL}/v1/admin/stats`, {
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

const MOCK_STATS = { totalUsers: 142, goldenPointsPending: 8, touchpointsEngaged: 97, avgScore: 340 };

export default function AdminDashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
    staleTime: 30_000,
    retry: false,
  });

  const s = stats ?? MOCK_STATS;

  const STAT_CARDS = [
    { label: 'Total Users',         value: s.totalUsers,           icon: '👥', color: 'var(--blue)'  },
    { label: 'Golden Pts Pending',  value: s.goldenPointsPending,  icon: '⭐', color: 'var(--gold)'  },
    { label: 'Touchpoints Engaged', value: s.touchpointsEngaged,   icon: '📍', color: 'var(--green)' },
    { label: 'Avg Score',           value: s.avgScore,             icon: '📊', color: 'var(--blue-mid)' },
  ];

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
          border: 1px solid var(--border-metal);
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
          font-size: 12px; font-weight: 700; letter-spacing: .04em;
          text-transform: uppercase; color: var(--t3);
        }
        .adm-section-label {
          font-size: 11px; font-weight: 800; letter-spacing: .08em;
          text-transform: uppercase; color: var(--t3);
          margin-bottom: 12px; margin-top: 6px;
        }
        .adm-recent-card {
          background: var(--surface);
          border: 1px solid var(--border-metal);
          border-radius: var(--r-lg);
          padding: 16px 18px;
          box-shadow: var(--shadow-card);
        }
        .adm-recent-title {
          font-family: 'Sora', sans-serif;
          font-size: 16px; font-weight: 700; color: var(--t);
          margin-bottom: 4px;
        }
        .adm-recent-sub { font-size: 13px; color: var(--t3); }
        .adm-quick-links {
          display: flex; flex-direction: column; gap: 10px; margin-top: 20px;
        }
        .adm-quick-link {
          background: var(--surface);
          border: 1px solid var(--border-metal);
          border-radius: var(--r);
          padding: 14px 16px;
          box-shadow: var(--shadow-card);
          display: flex; align-items: center; justify-content: space-between;
          text-decoration: none; color: var(--t);
        }
        .adm-quick-link:active { background: var(--bg2); }
        .adm-quick-link-label { font-size: 15px; font-weight: 600; color: var(--t); }
        .adm-quick-link-sub { font-size: 13px; color: var(--t3); margin-top: 2px; }
        .adm-chev { color: var(--t3); }
      `}</style>

      <h1 className="adm-page-title">Dashboard</h1>

      <div className="adm-stats-grid">
        {STAT_CARDS.map((card) => (
          <div key={card.label} className="adm-stat-card">
            <div className="adm-stat-icon">{card.icon}</div>
            <div className="adm-stat-value" style={{ color: card.color }}>{card.value.toLocaleString()}</div>
            <div className="adm-stat-label">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="adm-section-label">Quick Actions</div>
      <div className="adm-quick-links">
        <a href="/admin/golden-points" className="adm-quick-link">
          <div>
            <div className="adm-quick-link-label">Review Golden Points</div>
            <div className="adm-quick-link-sub">{s.goldenPointsPending} pending approvals</div>
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
      </div>
    </>
  );
}
