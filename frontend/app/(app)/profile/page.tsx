'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getMe } from '@/lib/api/profile';
import { getLeaderboard, type LeaderboardEntry } from '@/lib/api/leaderboard';
import { useAuthStore } from '@/store/auth';

function MedalCell({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="lb-medal gold">{rank}</div>
    );
  }
  if (rank === 2) {
    return <div className="lb-medal silver">{rank}</div>;
  }
  if (rank === 3) {
    return <div className="lb-medal bronze">{rank}</div>;
  }
  return <div className="lb-rank-num">#{rank}</div>;
}

function LbRow({ entry, highlight }: { entry: LeaderboardEntry; highlight: boolean }) {
  return (
    <div className={`lb-row-v7${highlight ? ' me' : ''}`}>
      <MedalCell rank={entry.rank} />
      <div className="lb-name-v7">{entry.name}</div>
      <div className="lb-pts-v7">{entry.totalPoints.toLocaleString()} pts</div>
    </div>
  );
}

const STATIC_LB: LeaderboardEntry[] = [
  { rank: 1, name: 'Sarah M.',  totalPoints: 820 },
  { rank: 2, name: 'James R.',  totalPoints: 740 },
  { rank: 3, name: 'Linda K.',  totalPoints: 680 },
  { rank: 4, name: 'Carlos B.', totalPoints: 610 },
  { rank: 5, name: 'You',       totalPoints: 340 },
];

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: getMe,
    staleTime: 60_000,
    retry: false,
  });

  const { data: lb } = useQuery({
    queryKey: ['leaderboard', 5],
    queryFn: () => getLeaderboard(5),
    staleTime: 30_000,
    retry: false,
  });

  const name       = profile?.name ?? user?.name ?? 'Summit Guest';
  const role       = (user as { role?: string } | null)?.role ?? 'Summit Attendee';
  const points     = profile?.totalPoints ?? 0;
  const activities = profile?.activitiesCompleted ?? 0;
  const touchpts   = (profile as { touchpointsCompleted?: number } | null)?.touchpointsCompleted ?? 0;
  const rank       = profile?.rank ?? '–';

  const leaderboard = lb?.leaderboard ?? STATIC_LB;

  return (
    <>
      <style>{`
        .profile-page {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .profile-scroll {
          flex: 1; overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 20px 18px calc(20px + var(--nav-h) + env(safe-area-inset-bottom, 0px) + 90px);
          overscroll-behavior: contain;
        }
        .profile-page-title {
          font-family: 'Sora', sans-serif;
          font-size: 28px; font-weight: 700;
          color: var(--t); letter-spacing: -.025em;
          margin: 0 0 18px;
        }

        /* ── Hero card (dark, keeps white text) ── */
        .profile-hero-v7 {
          background: linear-gradient(160deg, #1a2d50 0%, #0e1f3a 55%, #0a1830 100%);
          border-radius: var(--r-xl);
          padding: 24px 20px;
          margin-bottom: 18px;
          box-shadow: 0 16px 50px rgba(0,0,0,.48), inset 0 1px 0 rgba(255,255,255,.07);
          position: relative; overflow: hidden;
          border: 1px solid rgba(255,255,255,.07);
        }
        .profile-hero-v7::before {
          content: '';
          position: absolute; top: -40%; right: -15%;
          width: 280px; height: 280px;
          background: radial-gradient(circle, rgba(212,160,23,.10), transparent 70%);
          border-radius: 50%; pointer-events: none;
        }
        .hero-top-row {
          display: flex; align-items: center;
          gap: 18px; margin-bottom: 20px;
          position: relative; z-index: 1;
        }
        .hero-avatar {
          width: 56px; height: 56px;
          background: rgba(255,255,255,.10);
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          border: 1.5px solid rgba(255,255,255,.18);
          flex-shrink: 0;
        }
        .hero-name {
          font-family: 'Sora', sans-serif;
          font-size: 22px; font-weight: 800;
          letter-spacing: -.02em; color: #fff;
          line-height: 1.1;
        }
        .hero-role {
          font-size: 14px; color: rgba(255,255,255,.65);
          margin-top: 3px; font-weight: 500;
        }
        .hero-rank-chip {
          display: inline-flex; align-items: center;
          margin-top: 10px;
          background: rgba(212,160,23,.18);
          border: 1px solid rgba(212,160,23,.35);
          border-radius: 10px; padding: 5px 12px;
          font-size: 12px; font-weight: 700;
          color: #e8c840; letter-spacing: .02em;
          font-family: 'Sora', sans-serif;
        }
        .hero-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          position: relative; z-index: 1;
        }
        .hero-stat-cell { text-align: center; }
        .hero-stat-cell:nth-child(2) {
          border-left: 1px solid rgba(255,255,255,.14);
          border-right: 1px solid rgba(255,255,255,.14);
        }
        .hero-pts {
          font-family: 'Sora', sans-serif;
          font-size: 36px; font-weight: 800;
          letter-spacing: -.04em; color: #fff;
          line-height: 1;
        }
        .hero-pts-label {
          font-size: 13px; color: rgba(255,255,255,.60);
          font-weight: 600; letter-spacing: .03em;
          margin-top: 3px; text-transform: uppercase;
          font-size: 11px;
        }

        /* ── Collapse card (leaderboard) ── */
        .prof-section {
          background: var(--metallic);
          border: 1.5px solid rgba(255,255,255,.28);
          border-radius: var(--r-lg);
          box-shadow: var(--shadow-card);
          overflow: hidden;
          margin-bottom: 14px;
        }
        .prof-section-hd {
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 16px 18px;
          border-bottom: 1px solid rgba(0,0,0,.08);
          cursor: pointer;
        }
        .prof-section-hd-left {
          display: flex; align-items: center; gap: 12px;
        }
        .prof-section-icon {
          width: 38px; height: 38px;
          border-radius: 11px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .prof-section-title {
          font-family: 'Sora', sans-serif;
          font-size: 16px; font-weight: 700;
          color: #0d1e38; letter-spacing: -.01em;
        }

        /* ── Leaderboard rows ── */
        .lb-row-v7 {
          display: flex; align-items: center;
          gap: 12px; padding: 14px 18px;
          border-bottom: 1px solid rgba(0,0,0,.07);
        }
        .lb-row-v7:last-child { border-bottom: none; }
        .lb-row-v7.me {
          background: linear-gradient(90deg, rgba(212,160,23,.12), transparent);
        }
        .lb-medal {
          width: 32px; height: 32px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Sora', sans-serif;
          font-size: 13px; font-weight: 800;
          letter-spacing: -.02em; flex-shrink: 0;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 1px 3px rgba(0,0,0,.18);
        }
        .lb-medal.gold {
          background: linear-gradient(135deg, #f8d77a 0%, #d4a017 50%, #a67710 100%);
          color: #4a3308; border: 1px solid rgba(166,119,16,.40);
        }
        .lb-medal.silver {
          background: linear-gradient(135deg, #e6ecf6 0%, #b8c4d8 50%, #94a3b8 100%);
          color: #3a4858; border: 1px solid rgba(120,140,180,.45);
        }
        .lb-medal.bronze {
          background: linear-gradient(135deg, #e8b78a 0%, #c2671c 60%, #8a4a14 100%);
          color: #3a1f0a; border: 1px solid rgba(140,80,30,.42);
        }
        .lb-rank-num {
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Sora', sans-serif;
          font-size: 13px; font-weight: 700;
          color: #4a6080; flex-shrink: 0;
        }
        .lb-name-v7 {
          flex: 1; font-size: 15px; font-weight: 600; color: #0d1e38;
        }
        .lb-pts-v7 {
          font-family: 'Sora', sans-serif;
          font-size: 14px; font-weight: 800; color: #a67710;
        }

        /* ── Feedback link row ── */
        .feedback-link {
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 16px 18px; text-decoration: none;
        }
        .feedback-link-left {
          display: flex; align-items: center; gap: 12px;
        }
        .feedback-link-label {
          font-size: 16px; font-weight: 600; color: #0d1e38;
        }
        .feedback-link-sub {
          font-size: 13px; color: #4a6080; margin-top: 2px;
        }
        .prof-chevron {
          color: #7a8eae; flex-shrink: 0;
        }
      `}</style>

      <div className="profile-page">
        <div className="profile-scroll">
          <h1 className="profile-page-title">Profile</h1>

          {/* ── Hero ── */}
          <div className="profile-hero-v7">
            <div className="hero-top-row">
              <div className="hero-avatar">
                <svg viewBox="0 0 24 24" fill="none" width="32" height="32">
                  <circle cx="12" cy="8" r="4" stroke="rgba(255,255,255,.80)" strokeWidth="1.6"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="rgba(255,255,255,.80)" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div className="hero-name">{name}</div>
                <div className="hero-role">{role}</div>
                <div className="hero-rank-chip">#{rank} of summit</div>
              </div>
            </div>
            <div className="hero-stats">
              <div className="hero-stat-cell">
                <div className="hero-pts">{points.toLocaleString()}</div>
                <div className="hero-pts-label">Points</div>
              </div>
              <div className="hero-stat-cell">
                <div className="hero-pts">{activities}/{5}</div>
                <div className="hero-pts-label">Activities</div>
              </div>
              <div className="hero-stat-cell">
                <div className="hero-pts">{touchpts}/5</div>
                <div className="hero-pts-label">Touchpoints</div>
              </div>
            </div>
          </div>

          {/* ── Leaderboard ── */}
          <div className="prof-section">
            <div className="prof-section-hd">
              <div className="prof-section-hd-left">
                <div className="prof-section-icon" style={{ background: 'linear-gradient(135deg, #fdf3dc, #faecc8)', border: '1px solid rgba(166,119,16,.22)' }}>
                  <svg viewBox="0 0 20 20" fill="none" width="20" height="20">
                    <path d="M5 10H3a1 1 0 00-1 1v6a1 1 0 001 1h14a1 1 0 001-1v-6a1 1 0 00-1-1h-2M10 2v12M7 5l3-3 3 3" stroke="#a67710" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="prof-section-title">Leaderboard</span>
              </div>
              <svg className="prof-chevron" viewBox="0 0 12 12" fill="none" width="18" height="18">
                <path d="M2.5 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {leaderboard.map((entry) => (
              <LbRow key={entry.rank} entry={entry} highlight={entry.rank === lb?.currentUser?.rank} />
            ))}
            {lb?.currentUser && !leaderboard.some((e) => e.rank === lb.currentUser?.rank) && (
              <LbRow entry={{ rank: lb.currentUser.rank, name: name, totalPoints: lb.currentUser.totalPoints }} highlight />
            )}
          </div>

          {/* ── Feedback ── */}
          <div className="prof-section">
            <Link href="/profile/feedback" className="feedback-link">
              <div className="feedback-link-left">
                <div className="prof-section-icon" style={{ background: 'linear-gradient(135deg, #fde8cc, #fbd9ad)', border: '1px solid rgba(194,103,28,.22)' }}>
                  <svg viewBox="0 0 20 20" fill="none" width="20" height="20">
                    <path d="M3 4h14a1 1 0 011 1v8a1 1 0 01-1 1H8l-4 3V5a1 1 0 011-1z" stroke="#c2671c" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M7 8l2 2 4-4" stroke="#c2671c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <div className="feedback-link-label">Summit Feedback</div>
                  <div className="feedback-link-sub">Share your experience</div>
                </div>
              </div>
              <svg className="prof-chevron" viewBox="0 0 12 12" fill="none" width="18" height="18">
                <path d="M4.5 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>

          <div style={{ height: 28 }} />
        </div>
      </div>
    </>
  );
}
