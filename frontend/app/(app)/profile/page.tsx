'use client';

import { useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { getMe } from '@/lib/api/profile';
import { getLeaderboard, type LeaderboardEntry } from '@/lib/api/leaderboard';
import { useAuthStore } from '@/store/auth';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullIndicator } from '@/components/PullIndicator';
import { SPONSORS_DATA } from '@/lib/sponsors-data';

function MedalCell({ rank }: { rank: number }) {
  if (rank === 1) return <div className="lb-medal gold">{rank}</div>;
  if (rank === 2) return <div className="lb-medal silver">{rank}</div>;
  if (rank === 3) return <div className="lb-medal bronze">{rank}</div>;
  return <div className="lb-rank-num">#{rank}</div>;
}


function LbRow({ entry, highlight }: { entry: LeaderboardEntry; highlight: boolean }) {
  return (
    <div className={`lb-row-v7${highlight ? ' me' : ''}`}>
      <MedalCell rank={entry.rank} />
      <div className="lb-name-v7">{entry.name}</div>
      <div className="lb-pts-v7">
        <span>{entry.totalPoints.toLocaleString()}</span>
        <span className="lb-pts-label">PTS</span>
      </div>
    </div>
  );
}


export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const onRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['me'] }),
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] }),
    ]);
  }, [queryClient]);
  const indicatorRef = usePullToRefresh(scrollRef, onRefresh);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: getMe,
    staleTime: 60_000,
    retry: false,
  });

  const { data: lb, isLoading: lbLoading } = useQuery({
    queryKey: ['leaderboard', 5],
    queryFn: () => getLeaderboard(5),
    staleTime: 30_000,
    retry: false,
  });

  const name       = profile?.name ?? user?.name ?? 'Attendee';
  const role       = (user as { role?: string } | null)?.role ?? 'Summit Attendee';
  const points     = profile?.totalPoints ?? 0;
  const activities = profile?.activitiesCompleted ?? 0;
  const touchpts   = (profile as { touchpointsCompleted?: number } | null)?.touchpointsCompleted ?? 0;
  const rank       = profile?.rank ?? '–';

  const leaderboard = lb?.leaderboard ?? [];

  const nameParts = name.trim().split(' ');
  const firstName = nameParts[0];
  const lastName  = nameParts.slice(1).join(' ');

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

        /* ── Hero card — full-bleed photo with seamless dark blend ── */
        .profile-hero-v7 {
          border-radius: var(--r-xl);
          overflow: hidden;
          margin-bottom: 18px;
          position: relative;
          background: #1F2D45;
          border: 1px solid rgba(255,255,255,.10);
          box-shadow: 0 24px 64px rgba(0,0,0,.60),
                      inset 0 1px 0 rgba(255,255,255,.06);
          min-height: 300px;
        }

        /* Photo container — right side, absolute */
        .hero-photo-wrap {
          position: absolute;
          right: 0; top: 0; bottom: 0;
          width: 62%;
          pointer-events: none;
        }
        .hero-photo {
          width: 100%; height: 100%;
          object-fit: cover;
          object-position: 65% 20%;
          display: block;
        }
        /* Left-side fade — tight 32% blend into hero background */
        .hero-photo-wrap::before {
          content: '';
          position: absolute; inset: 0; z-index: 1;
          background: linear-gradient(
            to right,
            #1F2D45 0%,
            rgba(31,45,69,.90) 8%,
            rgba(31,45,69,.50) 16%,
            rgba(31,45,69,.12) 24%,
            transparent 32%
          );
        }
        /* Bottom fade — image dissolves into strip */
        .hero-photo-wrap::after {
          content: '';
          position: absolute; left: 0; right: 0; bottom: 0;
          height: 50%; z-index: 1;
          background: linear-gradient(
            to top,
            #1F2D45 0%,
            rgba(31,45,69,.75) 40%,
            transparent 100%
          );
        }

        /* Stub shown when no AI avatar has been generated yet */
        .hero-photo-stub {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Sora', sans-serif;
          font-size: 96px; font-weight: 800; letter-spacing: -.04em;
          color: rgba(255,255,255,.10);
          user-select: none;
        }

        /* Text content — above image layers */
        .hero-content {
          position: relative; z-index: 2;
          padding: 28px 24px 20px;
          max-width: 64%;
        }

        .hero-first {
          font-family: 'Sora', sans-serif;
          font-size: 38px; font-weight: 800;
          letter-spacing: -.04em; line-height: .92;
          color: #CCDEE7;
        }
        .hero-last {
          font-family: 'Sora', sans-serif;
          font-size: 24px; font-weight: 700;
          letter-spacing: -.02em; line-height: 1.1;
          color: #E39548;
        }
        .hero-role-tag {
          font-size: 10px; font-weight: 700;
          color: rgba(204,222,231,.38);
          letter-spacing: .12em; text-transform: uppercase;
          margin: 10px 0 22px;
        }

        .hero-pts-row {
          display: flex; align-items: baseline; gap: 7px;
          margin-bottom: 8px;
        }
        .hero-pts-big {
          font-family: 'Sora', sans-serif;
          font-size: 48px; font-weight: 800; letter-spacing: -.05em;
          color: #fff; line-height: 1;
          text-shadow: 0 2px 20px rgba(0,0,0,.40);
        }
        .hero-pts-unit {
          font-family: 'Sora', sans-serif;
          font-size: 12px; font-weight: 700; letter-spacing: .10em;
          color: rgba(204,222,231,.45); text-transform: uppercase;
        }

        .hero-rank-row {
          display: flex; align-items: center; gap: 5px;
        }
        .hero-rank-badge {
          font-family: 'Sora', sans-serif;
          font-size: 19px; font-weight: 800; letter-spacing: -.02em;
          color: var(--amber);
        }
        .hero-rank-label {
          font-size: 11px; font-weight: 700;
          color: rgba(204,222,231,.38);
          letter-spacing: .08em; text-transform: uppercase;
        }

        .hero-stats-row {
          display: flex; gap: 20px; margin-top: 14px;
        }
        .hero-stat-item { display: flex; flex-direction: column; }
        .hero-stat-val {
          font-family: 'Sora', sans-serif;
          font-size: 17px; font-weight: 700; letter-spacing: -.02em;
          color: rgba(204,222,231,.80); line-height: 1;
        }
        .hero-stat-label {
          font-size: 9px; font-weight: 700; letter-spacing: .10em;
          text-transform: uppercase; color: rgba(204,222,231,.38);
          margin-top: 3px;
        }

        /* ── Section cards ── */
        .prof-section {
          background: var(--metallic);
          border: 1.5px solid rgba(255,255,255,.45);
          border-radius: var(--r-lg);
          box-shadow: var(--shadow-card);
          overflow: hidden;
          margin-bottom: 14px;
        }
        .prof-section-hd {
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 15px 18px;
          border-bottom: 1px solid rgba(0,0,0,.08);
        }
        .prof-section-hd-left {
          display: flex; align-items: center; gap: 12px;
        }
        .prof-section-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .prof-section-title {
          font-family: 'Sora', sans-serif;
          font-size: 13px; font-weight: 800;
          color: #1C283C;
          letter-spacing: .08em; text-transform: uppercase;
        }

        /* ── Leaderboard rows ── */
        .lb-row-v7 {
          display: flex; align-items: center;
          gap: 12px; padding: 13px 18px;
          border-bottom: 1px solid rgba(0,0,0,.06);
          background: rgba(28,40,60,.04);
        }
        .lb-row-v7:last-child { border-bottom: none; }
        .lb-row-v7.me {
          background: linear-gradient(90deg, rgba(227,149,72,.08), transparent);
        }
        .lb-medal {
          width: 28px; height: 28px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Sora', sans-serif;
          font-size: 11px; font-weight: 700;
          letter-spacing: -.01em; flex-shrink: 0;
        }
        .lb-medal.gold {
          background: linear-gradient(145deg,
            #F0E08A 0%, #C8A020 28%,
            #9A7800 52%, #B89018 72%,
            #EAD278 100%
          );
          color: #3A2C00;
          border: 0.5px solid rgba(192,156,24,.55);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.60),
                      inset 0 -1px 0 rgba(0,0,0,.28),
                      0 2px 8px rgba(172,128,0,.30);
        }
        .lb-medal.silver {
          background: linear-gradient(145deg,
            #EEF1F8 0%, #BCC6DA 28%,
            #8E9CB2 52%, #A8B6CA 72%,
            #E4E8F4 100%
          );
          color: #28364A;
          border: 0.5px solid rgba(148,164,196,.55);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.70),
                      inset 0 -1px 0 rgba(0,0,0,.18),
                      0 2px 6px rgba(100,120,160,.22);
        }
        .lb-medal.bronze {
          background: linear-gradient(145deg,
            #E0C098 0%, #B87840 28%,
            #8A481A 52%, #A66830 72%,
            #DCA870 100%
          );
          color: #2C1200;
          border: 0.5px solid rgba(152,96,36,.55);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.48),
                      inset 0 -1px 0 rgba(0,0,0,.28),
                      0 2px 6px rgba(136,72,20,.28);
        }
        .lb-rank-num {
          width: 30px; height: 30px;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Sora', sans-serif;
          font-size: 12px; font-weight: 700;
          color: #4a6080; flex-shrink: 0;
        }
        @keyframes lb-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .lb-skel-row {
          display: flex; align-items: center; gap: 12px;
          padding: 13px 18px;
          border-bottom: 1px solid rgba(0,0,0,.06);
        }
        .lb-skel-row:last-child { border-bottom: none; }
        .lb-skel {
          border-radius: 6px;
          background: linear-gradient(90deg, #e8edf2 25%, #f4f7fa 50%, #e8edf2 75%);
          background-size: 200% 100%;
          animation: lb-shimmer 1.4s ease-in-out infinite;
        }
        .lb-name-v7 {
          flex: 1; font-size: 16px; font-weight: 600; color: #1C283C;
        }
        .lb-pts-v7 {
          font-family: 'Sora', sans-serif;
          font-size: 14px; font-weight: 800;
          color: var(--blue); letter-spacing: -.02em;
          display: flex; align-items: baseline; gap: 3px;
        }
        .lb-pts-label {
          font-size: 9px; font-weight: 700; letter-spacing: .10em;
          color: var(--blue); font-style: normal;
        }

        /* ── Feedback / Sponsor link rows ── */
        .section-link-row {
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 14px 18px; text-decoration: none;
          color: inherit;
        }
        .section-link-left {
          display: flex; align-items: center; gap: 0;
          flex: 1;
        }
        .section-link-body { flex: 1; }
        .section-link-sub {
          font-size: 14px; color: var(--t3); margin-top: 2px;
        }
        .section-static-row {
          display: flex; align-items: center;
          padding: 14px 18px;
          gap: 0;
        }
        .section-static-body { flex: 1; }
        .section-name {
          font-size: 16px; font-weight: 600; color: #1C283C;
          margin-top: 2px;
        }
        .prof-chevron { color: rgba(28,40,60,.35); flex-shrink: 0; }

        /* ── Sponsor logo grid ── */
        .sponsors-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding: 14px 16px 18px;
        }
        .sponsor-tile {
          background: #fff;
          border-radius: 14px;
          padding: 14px 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 68px;
          box-shadow: 0 1px 6px rgba(0,0,0,.10), inset 0 1px 0 rgba(255,255,255,.80);
          border: 1px solid rgba(0,0,0,.06);
          text-decoration: none;
          cursor: pointer;
        }
        .sponsor-tile.dark {
          background: #1C283C;
          border-color: rgba(255,255,255,.10);
          box-shadow: 0 1px 6px rgba(0,0,0,.30);
        }
        .sponsor-logo {
          width: 100%;
          height: 44px;
          object-fit: contain;
          object-position: center;
          display: block;
        }
      `}</style>

      <div className="profile-page">
        <PullIndicator ref={indicatorRef} />
        <div className="profile-scroll" ref={scrollRef}>

          {/* ── F1-style hero ── */}
          <div className="profile-hero-v7">
            <div className="hero-photo-wrap">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="hero-photo" />
              ) : (
                <div className="hero-photo-stub" aria-hidden="true">
                  {firstName[0]}{lastName?.[0] ?? ''}
                </div>
              )}
            </div>
            <div className="hero-content">
              <div className="hero-first">{firstName}</div>
              {lastName && <div className="hero-last">{lastName}</div>}
              <div className="hero-role-tag">{role}</div>

              <div className="hero-pts-row">
                <span className="hero-pts-big">{points.toLocaleString()}</span>
                <span className="hero-pts-unit">pts</span>
              </div>
              <div className="hero-rank-row">
                <span className="hero-rank-badge">#{rank}</span>
                <span className="hero-rank-label">Summit Rank</span>
              </div>
              <div className="hero-stats-row">
                <div className="hero-stat-item">
                  <span className="hero-stat-val">{activities}/5</span>
                  <span className="hero-stat-label">Activities</span>
                </div>
                <div className="hero-stat-item">
                  <span className="hero-stat-val">{touchpts}/5</span>
                  <span className="hero-stat-label">Touchpoints</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Leaderboard ── */}
          <div className="prof-section">
            <div className="prof-section-hd">
              <div className="prof-section-hd-left">
                <div className="prof-section-icon" style={{ background: 'rgba(212,160,23,.10)', border: '1px solid rgba(166,119,16,.18)' }}>
                  <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                    <path d="M5 10H3a1 1 0 00-1 1v6a1 1 0 001 1h14a1 1 0 001-1v-6a1 1 0 00-1-1h-2M10 2v12M7 5l3-3 3 3" stroke="#a67710" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="prof-section-title">Leaderboard</span>
              </div>
              <svg className="prof-chevron" viewBox="0 0 12 12" fill="none" width="16" height="16">
                <path d="M2.5 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {lbLoading
              ? [32, 24, 18, 14, 10].map((w, i) => (
                <div key={i} className="lb-skel-row">
                  <div className="lb-skel" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                  <div className="lb-skel" style={{ flex: 1, height: 14 }} />
                  <div className="lb-skel" style={{ width: `${w}%`, height: 14 }} />
                </div>
              ))
              : (<>
                {leaderboard.map((entry) => (
                  <LbRow key={entry.rank} entry={entry} highlight={entry.rank === lb?.currentUser?.rank} />
                ))}
                {lb?.currentUser && !leaderboard.some((e) => e.rank === lb.currentUser?.rank) && (
                  <LbRow entry={{ rank: lb.currentUser.rank, name: name, totalPoints: lb.currentUser.totalPoints }} highlight />
                )}
              </>)
            }
          </div>

          {/* ── Feedback ── */}
          <div className="prof-section">
            <div className="prof-section-hd">
              <div className="prof-section-hd-left">
                <div className="prof-section-icon" style={{ background: 'rgba(28,40,60,.07)', border: '1px solid rgba(28,40,60,.10)' }}>
                  <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                    <path d="M3 4h14a1 1 0 011 1v8a1 1 0 01-1 1H8l-4 3V5a1 1 0 011-1z" stroke="#1C283C" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M7 8l2 2 4-4" stroke="#1C283C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="prof-section-title">Feedback</span>
              </div>
            </div>
            <Link href="/profile/feedback" className="section-link-row">
              <div className="section-link-left">
                <div className="section-link-body">
                  <div className="section-name">Share Your Summit Experience</div>
                  <div className="section-link-sub">A few minutes helps us shape next year</div>
                </div>
              </div>
              <svg className="prof-chevron" viewBox="0 0 12 12" fill="none" width="16" height="16">
                <path d="M4.5 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>

          {/* ── Sponsors ── */}
          <div className="prof-section">
            <div className="prof-section-hd">
              <div className="prof-section-hd-left">
                <div className="prof-section-icon" style={{ background: 'rgba(227,149,72,.10)', border: '1px solid rgba(227,149,72,.20)' }}>
                  <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                    <rect x="3" y="10" width="18" height="11" rx="1.5" stroke="#D07B38" strokeWidth="1.6"/>
                    <path d="M8 21V14h4v7" stroke="#D07B38" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 10l10-7 10 7" stroke="#D07B38" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="prof-section-title">Our Sponsors</span>
              </div>
            </div>
            <div className="sponsors-grid">
              {SPONSORS_DATA.map((s) => (
                <Link key={s.slug} href={`/sponsors/${s.slug}`} className={`sponsor-tile${s.dark ? ' dark' : ''}`}>
                  <img src={s.logo} alt={s.name} className="sponsor-logo" />
                </Link>
              ))}
            </div>
          </div>

          <div style={{ height: 28 }} />
        </div>
      </div>
    </>
  );
}
