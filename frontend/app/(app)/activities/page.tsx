'use client';

import { useRef, useCallback } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getActivities } from '@/lib/api/activities';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullIndicator } from '@/components/PullIndicator';
import { useFeaturesStore } from '@/store/features';

const ACTIVITIES = [
  {
    id: 'trivia',
    name: 'Title Trivia',
    pts: 500,
    iconBg: '#1C283C',
    iconColor: '#E39548',
    desc: 'Test your title industry knowledge. 10 questions, instant scoring.',
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
    iconBg: '#1C283C',
    iconColor: '#E39548',
    desc: 'AI-generated executive portrait in the ES26 summit backdrop.',
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
    iconBg: '#1C283C',
    iconColor: '#E39548',
    desc: '5 real title scenarios. Pick the sharpest AI prompt.',
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
    name: 'Sharp Insight',
    pts: 100,
    iconBg: '#1C283C',
    iconColor: '#E39548',
    desc: 'Share a real industry insight. AI scores your response for quality.',
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
    iconBg: '#1C283C',
    iconColor: '#E39548',
    desc: 'Respond to 5 summit zone prompts to earn reflection points.',
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
];

function PtsRing({ pts, max }: { pts: number; max: number }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(1, pts / max));
  return (
    <svg width="80" height="80" viewBox="0 0 76 76" aria-label={`${pts} of ${max} points`}>
      <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="5.5"/>
      <circle
        cx="38" cy="38" r={r} fill="none"
        stroke={pts > 0 ? 'var(--gold-rich)' : 'rgba(227,149,72,.25)'}
        strokeWidth="5.5"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 38 38)"
        style={{ transition: 'stroke-dashoffset .8s ease' }}
      />
      <text x="38" y="36" textAnchor="middle" fill={pts > 0 ? 'var(--gold-rich)' : 'rgba(204,222,231,.45)'} fontSize="15" fontWeight="800" fontFamily="Sora, sans-serif">{pts}</text>
      <text x="38" y="50" textAnchor="middle" fill="rgba(204,222,231,.28)" fontSize="10" fontFamily="Sora, sans-serif">/ {max}</text>
    </svg>
  );
}

export default function ActivitiesPage() {
  const isActivitiesOpen = useFeaturesStore((s) => s.isEnabled('activities_open'));
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const onRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['activities'] });
  }, [queryClient]);
  const indicatorRef = usePullToRefresh(scrollRef, onRefresh);

  const { data: apiActivities, isError: activitiesError, isPending: activitiesPending } = useQuery({
    queryKey: ['activities'],
    queryFn: getActivities,
    staleTime: 0,
    retry: false,
  });

  const earnedById: Record<string, number> = {};
  const doneById: Record<string, boolean> = {};
  const oneShotById: Record<string, boolean> = {};
  if (apiActivities) {
    for (const a of apiActivities) {
      earnedById[a.type] = a.pointsEarned ?? 0;
      doneById[a.type] = a.isCompleted ?? false;
      oneShotById[a.type] = a.isOneShot ?? false;
    }
  }

  const totalPts = Object.values(earnedById).reduce((s, v) => s + v, 0);
  const maxPts = 1000;

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
          display: flex; align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .acts-title {
          font-family: 'Sora', sans-serif;
          font-size: 26px; font-weight: 700;
          color: var(--t); letter-spacing: .02em;
          text-transform: uppercase;
          margin: 0; line-height: 1;
        }
        .acts-subtitle {
          font-size: 17px; color: var(--t3);
          line-height: 1.6; margin: 6px 0 14px;
        }
        .acts-scroll {
          flex: 1; overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 0 18px calc(16px + var(--nav-h) + env(safe-area-inset-bottom, 0px));
          overscroll-behavior: contain;
        }
        /* Activity card */
        .v7-act-card {
          position: relative;
          background: var(--metallic);
          border: 1.5px solid rgba(255,255,255,.45);
          border-radius: var(--r);
          padding: 18px 16px;
          margin-bottom: 14px;
          box-shadow: var(--shadow-card);
          cursor: pointer;
          text-decoration: none;
          display: block;
          color: inherit;
          overflow: hidden;
        }
        .v7-act-card:active { opacity: .88; }
        .v7-act-card--done {
          opacity: .72;
          border-left: 3px solid #125c34;
        }
        .v7-act-done-overlay {
          position: absolute; inset: 0;
          border-radius: var(--r);
          background: rgba(0,0,0,.18);
          pointer-events: none;
        }
        .v7-act-row {
          display: flex; align-items: center; gap: 12px;
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
        .v7-act-body {
          flex: 1; min-width: 0;
        }
        .v7-act-name {
          font-family: 'Sora', sans-serif;
          font-size: 16px; font-weight: 700;
          letter-spacing: -.01em; color: #243352;
          line-height: 1.2; margin-bottom: 4px;
        }
        .v7-act-desc {
          font-size: 13px; color: #4a6080;
          line-height: 1.4;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .v7-act-right {
          display: flex; flex-direction: column;
          align-items: flex-end; gap: 3px;
          flex-shrink: 0;
        }
        .v7-act-pts-wrap {
          display: flex; align-items: baseline; gap: 2px;
        }
        .v7-act-pts {
          font-family: 'Sora', sans-serif;
          font-size: 20px; font-weight: 700; letter-spacing: -.03em;
          color: #243352; line-height: 1;
        }
        .v7-act-pts-label {
          font-family: 'Sora', sans-serif;
          font-size: 8px; font-weight: 700; letter-spacing: .10em;
          text-transform: uppercase; color: #243352;
        }
        .v7-act-pts-done {
          font-family: 'Sora', sans-serif;
          font-size: 20px; font-weight: 700; letter-spacing: -.03em;
          line-height: 1;
        }
        .v7-act-go-circle {
          width: 26px; height: 26px; border-radius: 50%;
          background: #243352;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,.22);
          flex-shrink: 0;
          margin-top: 6px;
        }
        .v7-act-pts-skeleton {
          width: 52px; height: 22px; border-radius: 6px;
          background: linear-gradient(90deg, rgba(28,40,60,.12) 25%, rgba(28,40,60,.22) 50%, rgba(28,40,60,.12) 75%);
          background-size: 200% 100%;
          animation: v7-shimmer 1.4s infinite;
        }
        @keyframes v7-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        /* Locked state */
        .acts-locked {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 32px;
          text-align: center;
        }
        .acts-locked-icon {
          font-size: 52px; margin-bottom: 24px;
          opacity: .75;
        }
        .acts-locked-title {
          font-family: 'Sora', sans-serif;
          font-size: 22px; font-weight: 700;
          color: var(--t); letter-spacing: -.01em;
          margin: 0 0 10px;
        }
        .acts-locked-body {
          font-size: 15px; color: rgba(200,215,230,.55);
          line-height: 1.55; max-width: 280px;
          margin: 0;
        }
      `}</style>

      <div className="acts-page">
        {!isActivitiesOpen ? (
          <div className="acts-locked">
            <div className="acts-locked-icon">🔒</div>
            <h2 className="acts-locked-title">Activities open soon</h2>
            <p className="acts-locked-body">
              Check back right before the summit kicks off — activities will go live then.
            </p>
          </div>
        ) : (
        <>
        <PullIndicator ref={indicatorRef} />
        <div className="acts-header">
          <div className="acts-title-row">
            <h1 className="acts-title">Activities</h1>
            <PtsRing pts={totalPts} max={maxPts} />
          </div>
          <p className="acts-subtitle">Win points in activities and get a chance to win WFG branded Merch at ES26</p>
        </div>

        <div className="acts-scroll" ref={scrollRef}>
          {activitiesError && (
            <div style={{
              background: 'rgba(227,149,72,.08)', border: '1px solid rgba(227,149,72,.25)',
              borderRadius: 12, padding: '10px 14px', marginBottom: 14,
              fontSize: 13, color: 'rgba(227,149,72,.85)', lineHeight: 1.4,
            }}>
              Could not load activity progress. Pull down to retry.
            </div>
          )}
          {ACTIVITIES.map((act) => {
            const done = activitiesPending ? false : (doneById[act.id] ?? false);
            const earned = earnedById[act.id] ?? 0;
            const disabled = done && act.id !== 'avatar';
            const locked = activitiesPending || disabled;
            const cardClass = `v7-act-card${disabled ? ' v7-act-card--done' : ''}`;
            const cardContent = (
              <>
                {disabled && <div className="v7-act-done-overlay" aria-hidden />}
                <div className="v7-act-row">
                  <div className="v7-act-icon" style={{ background: act.iconBg, color: act.iconColor }}>
                    {act.icon}
                  </div>
                  <div className="v7-act-body">
                    <div className="v7-act-name">{act.name}</div>
                    <div className="v7-act-desc">{act.desc}</div>
                  </div>
                  <div className="v7-act-right">
                    {activitiesPending ? (
                      <div className="v7-act-pts-skeleton" />
                    ) : done ? (
                      <div className="v7-act-pts-done">
                        <span style={{ color: '#125c34' }}>{earned}</span>
                        <span style={{ color: '#125c34', fontSize: 14 }}>/{act.pts}</span>
                        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase' as const, color: '#125c34', marginLeft: 2 }}>PTS</span>
                      </div>
                    ) : (
                      <>
                        <div className="v7-act-pts-wrap">
                          <span className="v7-act-pts">{act.pts}</span>
                          <span className="v7-act-pts-label">PTS</span>
                        </div>
                        <div className="v7-act-go-circle">
                          <svg viewBox="0 0 10 10" fill="none" width="10" height="10">
                            <path d="M3 2l4 3-4 3" stroke="#E39548" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            );
            return locked
              ? <div key={act.id} className={cardClass} style={{ cursor: 'default' }}>{cardContent}</div>
              : <Link key={act.id} href={act.href} className={cardClass}>{cardContent}</Link>;
          })}
          <div style={{ height: 16 }} />
        </div>
        </>
        )}
      </div>
    </>
  );
}
