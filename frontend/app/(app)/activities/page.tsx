'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getActivities } from '@/lib/api/activities';

const ACTIVITIES = [
  {
    id: 'trivia',
    name: 'Title Trivia',
    pts: 500,
    iconBg: '#dde9ff',
    iconColor: '#1a3d9e',
    desc: '50 questions. 60 seconds. Answer as many title-industry questions as you can.',
    href: '/activities/trivia',
    icon: (
      <svg viewBox="0 0 22 22" fill="none" width="22" height="22">
        <path d="M11 2a9 9 0 100 18A9 9 0 0011 2z" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M8.5 8.5a2.5 2.5 0 115 0c0 1.5-2.5 2-2.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
        <circle cx="11" cy="15.5" r=".9" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'avatar',
    name: 'Avatar Studio',
    pts: 150,
    iconBg: '#ead9ed',
    iconColor: '#7c2d9e',
    desc: 'Upload a photo (+50 pts) and print your branded summit avatar (+100 pts).',
    href: '/activities/avatar',
    icon: (
      <svg viewBox="0 0 22 22" fill="none" width="22" height="22">
        <circle cx="11" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M3 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M16 3l2.5 2.5-4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'prompt_challenge',
    name: 'Prompt Challenge',
    pts: 100,
    iconBg: '#cef5f8',
    iconColor: '#036b80',
    desc: '5 real title scenarios. Pick the best AI prompt. Every answer earns points.',
    href: '/activities/prompt-challenge',
    icon: (
      <svg viewBox="0 0 22 22" fill="none" width="22" height="22">
        <path d="M4 6h14a1 1 0 011 1v8a1 1 0 01-1 1H8l-4 3V7a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
        <path d="M8 10h6M8 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'golden_points',
    name: 'Golden Points',
    pts: 100,
    iconBg: '#faecc8',
    iconColor: '#a67710',
    desc: 'Share a real business pain point from the title industry for ATS review.',
    href: '/activities/golden-points',
    icon: (
      <svg viewBox="0 0 22 22" fill="none" width="22" height="22">
        <path d="M11 2l2.5 5h5.5l-4.5 3.5 1.5 5.5L11 13.5 6 16l1.5-5.5L3 7h5.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'touchpoint',
    name: 'Touchpoints',
    pts: 150,
    iconBg: '#d5f5e3',
    iconColor: '#146636',
    desc: 'Scan QR codes at 5 summit locations to earn points and explore the event.',
    href: '/activities/touchpoints',
    icon: (
      <svg viewBox="0 0 22 22" fill="none" width="22" height="22">
        <path d="M9 8V5a2 2 0 014 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M7 10V8.5a2 2 0 014 0V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M7 10v5c0 2 1.8 3 4 3s4-1 4-3v-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M13 10v-1.5a2 2 0 014 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'feedback',
    name: 'Summit Feedback',
    pts: 50,
    iconBg: '#fde8cc',
    iconColor: '#c2671c',
    desc: "Share your overall experience to help us shape next year's Executive Summit.",
    href: '/profile/feedback',
    icon: (
      <svg viewBox="0 0 22 22" fill="none" width="22" height="22">
        <path d="M3 5h14a1 1 0 011 1v8a1 1 0 01-1 1H8l-4 3V6a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
        <path d="M8 8.5l1.5 1.5L13 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

export default function ActivitiesPage() {
  const { data: apiActivities } = useQuery({
    queryKey: ['activities'],
    queryFn: getActivities,
    staleTime: 30_000,
    retry: false,
  });

  const earnedById: Record<string, number> = {};
  const doneById: Record<string, boolean> = {};
  if (apiActivities) {
    for (const a of apiActivities) {
      earnedById[a.type] = a.pointsEarned ?? 0;
      doneById[a.type] = a.isCompleted ?? false;
    }
  }

  const totalPts = Object.values(earnedById).reduce((s, v) => s + v, 0);
  const maxPts = 1000;
  const pct = Math.min(100, (totalPts / maxPts) * 100);

  return (
    <>
      <style>{`
        .acts-page {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .acts-header {
          padding: 20px 18px 0;
          flex-shrink: 0;
        }
        .acts-title-row {
          display: flex; align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .acts-title {
          font-family: 'Sora', sans-serif;
          font-size: 32px; font-weight: 800;
          color: var(--t); letter-spacing: .02em;
          text-transform: uppercase;
          margin: 0; line-height: 1;
        }
        .acts-pts-total {
          text-align: right;
        }
        .acts-pts-num {
          font-family: 'Sora', sans-serif;
          font-size: 28px; font-weight: 800;
          color: var(--gold-rich); letter-spacing: -.03em;
          line-height: 1;
        }
        .acts-pts-of {
          font-size: 14px; font-weight: 600;
          color: var(--t3); margin-top: 2px;
        }
        .acts-progress-wrap {
          height: 6px; background: rgba(255,255,255,.10);
          border-radius: 4px; overflow: hidden;
          margin-bottom: 18px;
        }
        .acts-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--amber-rich), var(--gold-rich), #e8c840);
          border-radius: 4px;
          transition: width .5s ease;
          box-shadow: 0 0 10px rgba(212,160,23,.35);
        }
        .acts-scroll {
          flex: 1; overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 0 18px calc(20px + var(--nav-h) + env(safe-area-inset-bottom, 0px) + 90px);
          overscroll-behavior: contain;
        }
        /* Activity card — 20% smaller than before */
        .v7-act-card {
          background: var(--metallic);
          border: 1.5px solid rgba(255,255,255,.45);
          border-radius: var(--r);
          padding: 14px 16px;
          margin-bottom: 12px;
          box-shadow: var(--shadow-card);
          cursor: pointer;
          text-decoration: none;
          display: block;
          color: inherit;
        }
        .v7-act-card:active { opacity: .88; }
        .v7-act-header {
          display: flex; align-items: center;
          gap: 12px; margin-bottom: 10px;
        }
        .v7-act-icon {
          width: 46px; height: 46px;
          border-radius: 12px;
          display: flex; align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1px solid rgba(255,255,255,.50);
          box-shadow: 0 1px 4px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.50);
        }
        .v7-act-name {
          font-family: 'Sora', sans-serif;
          font-size: 17px; font-weight: 700;
          letter-spacing: -.01em; color: #1C283C;
          flex: 1; min-width: 0;
        }
        .v7-act-pts-wrap { text-align: right; flex-shrink: 0; }
        .v7-act-pts {
          font-family: 'Sora', sans-serif;
          font-size: 20px; font-weight: 700; letter-spacing: -.03em;
          color: #8B6914; line-height: 1;
        }
        .v7-act-pts-label {
          font-family: 'Sora', sans-serif;
          font-size: 9px; font-weight: 700; letter-spacing: .10em;
          text-transform: uppercase; color: rgba(139,105,20,.55);
          text-align: right; margin-top: 2px;
        }
        .v7-act-desc {
          font-size: 15px; color: #4a6080;
          line-height: 1.55; margin-bottom: 12px;
        }
        .v7-act-done {
          display: flex; align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #d5f5e3, #c8efd9);
          color: #146636;
          border-radius: 12px;
          padding: 10px 16px;
          font-size: 14px; font-weight: 700;
          width: 100%; justify-content: center;
          border: 1px solid rgba(20,102,54,.22);
          min-height: 44px;
        }
        .v7-act-btn {
          display: flex; align-items: center;
          justify-content: center; gap: 9px;
          background: #1C283C;
          color: #E39548;
          border: 1px solid rgba(227,149,72,.18);
          border-radius: 14px;
          padding: 11px 18px; font-size: 14px;
          font-weight: 700; letter-spacing: .02em;
          font-family: inherit;
          width: 100%; min-height: 44px;
          cursor: pointer;
          box-shadow: 0 2px 14px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.04);
          transition: transform .18s cubic-bezier(.4,0,.2,1), box-shadow .18s, background .15s;
        }
        .v7-act-btn:hover { background: #243352; }
        .v7-act-btn:active {
          transform: scale(.97);
          box-shadow: 0 1px 6px rgba(0,0,0,.16);
        }
      `}</style>

      <div className="acts-page">
        <div className="acts-header">
          <div className="acts-title-row">
            <h1 className="acts-title">Activities</h1>

            <div className="acts-pts-total">
              <div className="acts-pts-num">{totalPts}</div>
              <div className="acts-pts-of">/ {maxPts.toLocaleString()} pts</div>
            </div>
          </div>
          <div className="acts-progress-wrap">
            <div className="acts-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="acts-scroll">
          {ACTIVITIES.map((act) => {
            const done = doneById[act.id] ?? false;
            const earned = earnedById[act.id] ?? 0;
            return (
              <Link key={act.id} href={act.href} className="v7-act-card">
                <div className="v7-act-header">
                  <div className="v7-act-icon" style={{ background: act.iconBg, color: act.iconColor }}>
                    {act.icon}
                  </div>
                  <div className="v7-act-name">{act.name}</div>
                  <div className="v7-act-pts-wrap">
                    <div className="v7-act-pts">{act.pts}</div>
                    <div className="v7-act-pts-label">pts</div>
                  </div>
                </div>
                <div className="v7-act-desc">{act.desc}</div>
                {done ? (
                  <div className="v7-act-done">
                    <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
                      <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Completed · {earned} pts earned
                  </div>
                ) : (
                  <div className="v7-act-btn">
                    Start Activity
                    <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                      <path d="M6 3l5 5-5 5" stroke="#E39548" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </Link>
            );
          })}
          <div style={{ height: 28 }} />
        </div>
      </div>
    </>
  );
}
