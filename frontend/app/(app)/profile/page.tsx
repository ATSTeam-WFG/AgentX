'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getMe } from '@/lib/api/profile';
import { getLeaderboard, type LeaderboardEntry } from '@/lib/api/leaderboard';
import { useAuthStore } from '@/store/auth';

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

const SPONSORS = [
  { name: 'WFG Title & Escrow', role: 'Title Partner', icon: '🏢' },
  { name: 'Stewart Title',       role: 'Underwriting Partner', icon: '🏛' },
  { name: 'First American',      role: 'Technology Partner', icon: '⭐' },
];

const FEEDBACK_QUESTIONS = [
  'Overall summit experience',
  'Content quality & relevance',
  'Networking opportunities',
  'Venue & logistics',
];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="star-row">
      {[1,2,3,4,5].map((s) => (
        <button key={s} className={`star-btn${value >= s ? ' active' : ''}`} onClick={() => onChange(s)} type="button">
          {value >= s ? '★' : '☆'}
        </button>
      ))}
    </div>
  );
}

function CollapseSection({
  icon, iconBg, title, defaultOpen, children
}: {
  icon: React.ReactNode; iconBg: string; title: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className={`prof-section${open ? ' open' : ''}`}>
      <button className="prof-section-hd" onClick={() => setOpen((v) => !v)}>
        <div className="prof-section-hd-left">
          <div className="prof-section-icon" style={{ background: iconBg }}>{icon}</div>
          <span className="prof-section-title">{title}</span>
        </div>
        <svg className={`prof-chevron${open ? ' rot' : ''}`} viewBox="0 0 12 12" fill="none" width="18" height="18">
          <path d="M2.5 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div className="prof-section-body">
        {children}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const [ratings, setRatings] = useState<number[]>([0,0,0,0]);
  const [feedbackText, setFeedbackText] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);

  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getMe, staleTime: 60_000, retry: false });
  const { data: lb } = useQuery({ queryKey: ['leaderboard', 5], queryFn: () => getLeaderboard(5), staleTime: 30_000, retry: false });

  const name       = profile?.name ?? user?.name ?? 'Summit Guest';
  const role       = (user as { role?: string } | null)?.role ?? 'Summit Attendee';
  const points     = profile?.totalPoints ?? 0;
  const activities = profile?.activitiesCompleted ?? 0;
  const touchpts   = (profile as { touchpointsCompleted?: number } | null)?.touchpointsCompleted ?? 0;
  const rank       = profile?.rank ?? '–';
  const leaderboard = lb?.leaderboard ?? STATIC_LB;

  async function handleFeedbackSubmit() {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/v1/activities/feedback/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('agentx_token') : ''}` },
        body: JSON.stringify({ ratings, comments: feedbackText, anonymous }),
      });
    } catch { /* non-blocking */ }
    setFeedbackDone(true);
  }

  return (
    <>
      <style>{`
        .profile-page { position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden; }
        .profile-scroll {
          flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
          padding: 20px 18px calc(20px + var(--nav-h) + env(safe-area-inset-bottom, 0px) + 90px);
          overscroll-behavior: contain;
        }
        .profile-page-title {
          font-family: 'Sora', sans-serif;
          font-size: 28px; font-weight: 700;
          color: var(--t); letter-spacing: -.025em; margin: 0 0 18px;
        }
        /* Hero card */
        .profile-hero-v7 {
          background: linear-gradient(160deg, #1a2d50 0%, #0e1f3a 55%, #0a1830 100%);
          border-radius: var(--r-xl); padding: 24px 20px;
          margin-bottom: 18px;
          box-shadow: 0 10px 36px rgba(8,24,64,.22), inset 0 1px 0 rgba(255,255,255,.06);
          position: relative; overflow: hidden;
          border: 1px solid rgba(255,255,255,.06);
        }
        .profile-hero-v7::before {
          content: ''; position: absolute; top: -40%; right: -15%;
          width: 280px; height: 280px;
          background: radial-gradient(circle, rgba(27,79,196,.14), transparent 70%);
          border-radius: 50%; pointer-events: none;
        }
        .hero-top-row {
          display: flex; align-items: center;
          gap: 18px; margin-bottom: 20px; position: relative; z-index: 1;
        }
        .hero-avatar {
          width: 56px; height: 56px;
          background: rgba(255,255,255,.10);
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          border: 1.5px solid rgba(255,255,255,.16); flex-shrink: 0;
        }
        .hero-name {
          font-family: 'Sora', sans-serif;
          font-size: 22px; font-weight: 800;
          letter-spacing: -.02em; color: #fff; line-height: 1.1;
        }
        .hero-role { font-size: 14px; color: rgba(255,255,255,.60); margin-top: 3px; font-weight: 500; }
        .hero-rank-chip {
          display: inline-flex; align-items: center; margin-top: 10px;
          background: rgba(27,79,196,.28);
          border: 1px solid rgba(27,79,196,.45);
          border-radius: 10px; padding: 5px 12px;
          font-size: 12px; font-weight: 700;
          color: rgba(180,210,255,.95); letter-spacing: .02em;
          font-family: 'Sora', sans-serif;
        }
        .hero-stats {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 14px; position: relative; z-index: 1;
        }
        .hero-stat-cell { text-align: center; }
        .hero-stat-cell:nth-child(2) {
          border-left: 1px solid rgba(255,255,255,.12);
          border-right: 1px solid rgba(255,255,255,.12);
        }
        .hero-pts {
          font-family: 'Sora', sans-serif;
          font-size: 36px; font-weight: 800;
          letter-spacing: -.04em; color: #fff; line-height: 1;
        }
        .hero-pts-label {
          font-size: 11px; color: rgba(255,255,255,.55);
          font-weight: 600; letter-spacing: .03em;
          margin-top: 3px; text-transform: uppercase;
        }

        /* Collapse section card */
        .prof-section {
          background: var(--surface);
          border: 1px solid var(--border-metal);
          border-radius: var(--r-lg);
          box-shadow: var(--shadow-card);
          overflow: hidden;
          margin-bottom: 14px;
        }
        .prof-section-hd {
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 16px 18px;
          border: none; cursor: pointer;
          width: 100%; font-family: inherit;
          background: none; transition: background var(--tr);
        }
        .prof-section-hd:active { background: var(--bg2); }
        .prof-section.open .prof-section-hd { border-bottom: 1px solid var(--border-metal); }
        .prof-section-hd-left { display: flex; align-items: center; gap: 12px; }
        .prof-section-icon {
          width: 38px; height: 38px; border-radius: 11px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .prof-section-title {
          font-family: 'Sora', sans-serif;
          font-size: 16px; font-weight: 700;
          color: var(--t); letter-spacing: -.01em;
        }
        .prof-chevron { color: var(--t3); transition: transform .22s ease; flex-shrink: 0; }
        .prof-chevron.rot { transform: rotate(180deg); }

        /* Collapse body */
        .prof-section-body {
          max-height: 0; overflow: hidden;
          transition: max-height .35s cubic-bezier(.4,0,.2,1);
        }
        .prof-section.open .prof-section-body { max-height: 1800px; }

        /* Leaderboard rows */
        .lb-row-v7 {
          display: flex; align-items: center;
          gap: 12px; padding: 14px 18px;
          border-bottom: 1px solid var(--border);
        }
        .lb-row-v7:last-child { border-bottom: none; }
        .lb-row-v7.me {
          background: linear-gradient(90deg, rgba(27,79,196,.06), transparent);
        }
        .lb-medal {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Sora', sans-serif;
          font-size: 13px; font-weight: 800; flex-shrink: 0;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 1px 3px rgba(0,0,0,.14);
        }
        .lb-medal.gold {
          background: linear-gradient(135deg, #f8d77a 0%, #d4a017 50%, #a67710 100%);
          color: #4a3308; border: 1px solid rgba(166,119,16,.35);
        }
        .lb-medal.silver {
          background: linear-gradient(135deg, #e6ecf6 0%, #b8c4d8 50%, #94a3b8 100%);
          color: #3a4858; border: 1px solid rgba(120,140,180,.40);
        }
        .lb-medal.bronze {
          background: linear-gradient(135deg, #e8b78a 0%, #c2671c 60%, #8a4a14 100%);
          color: #3a1f0a; border: 1px solid rgba(140,80,30,.38);
        }
        .lb-rank-num {
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Sora', sans-serif;
          font-size: 13px; font-weight: 700; color: var(--t3); flex-shrink: 0;
        }
        .lb-name-v7 { flex: 1; font-size: 15px; font-weight: 600; color: var(--t); }
        .lb-pts-v7 {
          font-family: 'Sora', sans-serif;
          font-size: 14px; font-weight: 800; color: var(--gold);
        }

        /* Sponsors */
        .sponsor-row {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 18px;
          border-bottom: 1px solid var(--border);
        }
        .sponsor-row:last-child { border-bottom: none; }
        .sponsor-icon {
          width: 38px; height: 38px; border-radius: 10px;
          background: var(--bg2); font-size: 20px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .sponsor-name-text { font-size: 15px; font-weight: 700; color: var(--t); }
        .sponsor-role-text { font-size: 13px; color: var(--t3); margin-top: 2px; }

        /* Feedback */
        .feedback-inner { padding: 14px 18px; }
        .anonymous-row {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 18px;
        }
        .anonymous-label { font-size: 15px; font-weight: 600; color: var(--t2); }
        .toggle-track {
          width: 44px; height: 26px; border-radius: 13px;
          background: var(--bg3); border: 1.5px solid var(--border-metal);
          position: relative; cursor: pointer; transition: background var(--tr);
          flex-shrink: 0;
        }
        .toggle-track.on { background: var(--blue); border-color: var(--blue); }
        .toggle-thumb {
          position: absolute; top: 3px; left: 3px;
          width: 18px; height: 18px; border-radius: 50%;
          background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.18);
          transition: transform .2s ease;
        }
        .toggle-track.on .toggle-thumb { transform: translateX(18px); }

        .fb-q-row {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 14px; gap: 12px;
        }
        .fb-q-label { font-size: 14px; font-weight: 600; color: var(--t2); flex: 1; }
        .star-row { display: flex; gap: 2px; flex-shrink: 0; }
        .star-btn {
          background: none; border: none; cursor: pointer;
          font-size: 22px; color: var(--border-metal);
          transition: color .1s; padding: 2px;
          line-height: 1;
        }
        .star-btn.active { color: var(--gold-rich); }
        .fb-textarea {
          width: 100%; min-height: 90px;
          background: var(--bg2);
          border: 1.5px solid var(--border-metal);
          border-radius: 12px; padding: 12px 14px;
          font-size: 15px; color: var(--t);
          font-family: 'DM Sans', sans-serif;
          line-height: 1.55; resize: none; outline: none;
          margin-bottom: 14px;
          transition: border-color var(--tr), box-shadow var(--tr);
        }
        .fb-textarea:focus {
          border-color: var(--blue);
          box-shadow: 0 0 0 3px rgba(27,79,196,.08);
        }
        .fb-submit-btn {
          width: 100%; height: 50px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--blue-mid), var(--blue));
          color: #fff; font-size: 15px; font-weight: 700;
          font-family: 'Sora', sans-serif;
          border: none; cursor: pointer;
          box-shadow: var(--shadow-blue);
        }
        .fb-thanks {
          text-align: center; padding: 24px 0 8px;
          font-family: 'Sora', sans-serif;
          font-size: 17px; font-weight: 700; color: var(--green);
        }
        .fb-thanks-sub { text-align: center; font-size: 14px; color: var(--t3); padding-bottom: 8px; }

        /* Admin link */
        .admin-link {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 16px; text-decoration: none;
          font-size: 14px; font-weight: 600; color: var(--t3);
          border: 1px dashed var(--border-metal);
          border-radius: var(--r); margin-top: 4px;
          transition: color var(--tr), border-color var(--tr);
        }
        .admin-link:active { color: var(--t2); }
      `}</style>

      <div className="profile-page">
        <div className="profile-scroll">
          <h1 className="profile-page-title">Profile</h1>

          {/* Hero */}
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
                <div className="hero-pts">{activities}/5</div>
                <div className="hero-pts-label">Activities</div>
              </div>
              <div className="hero-stat-cell">
                <div className="hero-pts">{touchpts}/5</div>
                <div className="hero-pts-label">Touchpoints</div>
              </div>
            </div>
          </div>

          {/* Leaderboard (default open) */}
          <CollapseSection
            defaultOpen
            title="Leaderboard"
            iconBg="linear-gradient(135deg, #fff8e0, var(--gold-lt))"
            icon={<svg viewBox="0 0 20 20" fill="none" width="20" height="20"><path d="M5 10H3a1 1 0 00-1 1v6a1 1 0 001 1h14a1 1 0 001-1v-6a1 1 0 00-1-1h-2M10 2v12M7 5l3-3 3 3" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          >
            {leaderboard.map((entry) => (
              <LbRow key={entry.rank} entry={entry} highlight={entry.rank === lb?.currentUser?.rank} />
            ))}
            {lb?.currentUser && !leaderboard.some((e) => e.rank === lb.currentUser?.rank) && (
              <LbRow entry={{ rank: lb.currentUser.rank, name, totalPoints: lb.currentUser.totalPoints }} highlight />
            )}
          </CollapseSection>

          {/* Sponsors */}
          <CollapseSection
            title="Summit Sponsors"
            iconBg="linear-gradient(135deg, #eef4ff, var(--blue-lt))"
            icon={<svg viewBox="0 0 20 20" fill="none" width="20" height="20"><rect x="2" y="6" width="16" height="11" rx="2" stroke="var(--blue)" strokeWidth="1.6"/><path d="M6 6V5a4 4 0 018 0v1" stroke="var(--blue)" strokeWidth="1.6"/></svg>}
          >
            {SPONSORS.map((s) => (
              <div key={s.name} className="sponsor-row">
                <div className="sponsor-icon">{s.icon}</div>
                <div>
                  <div className="sponsor-name-text">{s.name}</div>
                  <div className="sponsor-role-text">{s.role}</div>
                </div>
              </div>
            ))}
          </CollapseSection>

          {/* Feedback */}
          <CollapseSection
            title="Summit Feedback"
            iconBg="linear-gradient(135deg, #fff4e0, var(--amber-lt))"
            icon={<svg viewBox="0 0 20 20" fill="none" width="20" height="20"><path d="M3 4h14a1 1 0 011 1v8a1 1 0 01-1 1H8l-4 3V5a1 1 0 011-1z" stroke="var(--amber)" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 8l2 2 4-4" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          >
            {feedbackDone ? (
              <div className="feedback-inner">
                <div className="fb-thanks">Thank you for your feedback! 🎉</div>
                <div className="fb-thanks-sub">Your response helps us improve every year.</div>
              </div>
            ) : (
              <div className="feedback-inner">
                <div className="anonymous-row">
                  <span className="anonymous-label">Submit anonymously</span>
                  <button
                    className={`toggle-track${anonymous ? ' on' : ''}`}
                    onClick={() => setAnonymous((v) => !v)}
                    type="button"
                    aria-label="Toggle anonymous"
                  >
                    <span className="toggle-thumb" />
                  </button>
                </div>
                {FEEDBACK_QUESTIONS.map((q, i) => (
                  <div key={q} className="fb-q-row">
                    <span className="fb-q-label">{q}</span>
                    <StarRating value={ratings[i]} onChange={(v) => setRatings((prev) => { const n = [...prev]; n[i] = v; return n; })} />
                  </div>
                ))}
                <textarea
                  className="fb-textarea"
                  placeholder="Any other thoughts? (optional)"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                />
                <button className="fb-submit-btn" onClick={handleFeedbackSubmit} type="button">
                  Submit Feedback →
                </button>
              </div>
            )}
          </CollapseSection>

          {/* Admin link */}
          <Link href="/admin" className="admin-link">
            <svg viewBox="0 0 18 18" fill="none" width="16" height="16">
              <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.05 3.05l1.42 1.42M13.53 13.53l1.42 1.42M13.53 4.47l1.42-1.42M3.05 14.95l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Admin Access
            <svg viewBox="0 0 12 12" fill="none" width="12" height="12">
              <path d="M4.5 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>

          <div style={{ height: 28 }} />
        </div>
      </div>
    </>
  );
}
