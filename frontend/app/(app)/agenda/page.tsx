'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { getAgenda, type AgendaEvent } from '@/lib/api/agenda';
import { V7_EVENTS } from '@/lib/v7-agenda';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullIndicator } from '@/components/PullIndicator';

const DAY_TABS = [
  { day: 1, label: 'Wed · Jun 3',  title: "Women's Leadership Seminar",   badge: 'Pre-Summit' },
  { day: 2, label: 'Thu · Jun 4',  title: 'Summit Day',                   badge: 'Day 1'      },
  { day: 3, label: 'Fri · Jun 5',  title: 'Departures',                   badge: 'Day 2'      },
];

function getDefaultDay(): number {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed; June = 5
  const d = now.getDate();
  // On an actual summit day, open that day.
  if (y === 2026 && m === 5) {
    if (d === 4) return 2;
    if (d === 5) return 3;
  }
  // Before the event (or any other time), open the first day.
  return 1;
}

function formatTimeParts(iso: string) {
  const str = new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
  const [time, period] = str.split(' ');
  return { time, period };
}

function getStatus(startsAt: string, endsAt: string): 'past' | 'live' | 'upcoming' {
  const now = Date.now();
  const s = new Date(startsAt).getTime();
  const e = new Date(endsAt).getTime();
  if (now > e) return 'past';
  if (now >= s && now <= e) return 'live';
  return 'upcoming';
}

function SessionCard({ event }: { event: AgendaEvent }) {
  const status = getStatus(event.startsAt, event.endsAt);
  const speakers = event.speakerName
    ? event.speakerName.split(/\s*·\s*/).filter(Boolean)
    : [];

  return (
    <Link href={`/agenda/${event.id}`} style={{ textDecoration: 'none', display: 'block', width: '100%' }}>
      <div className={`session-card ${status}`}>
        {status === 'live' && <div className="now-badge">NOW</div>}
        <div className="session-header">
          <div className="session-name">{event.name}</div>
          <span className="session-chev" style={event.description ? { color: '#E39548' } : {}}>
            <svg width="16" height="16" viewBox="0 0 12 12" fill="none">
              <path d="M4.5 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </div>
        {(speakers.length > 0 || event.location) && (
          <div className="session-meta-row">
            {speakers.length > 0 && (
              <div className="session-speakers">
                <div className="session-speaker">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="8" r="4"/><path d="M3 21c0-4.5 4-8 9-8s9 3.5 9 8"/>
                  </svg>
                  <span>{speakers[0]}</span>
                </div>
                {speakers.length > 1 && (
                  <div className="session-speaker">
                    <span className="speaker-indent" />
                    <span>+{speakers.length - 1} more</span>
                  </div>
                )}
              </div>
            )}
            {event.location && (
              <div className="session-location">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                <span>{event.location}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function AgendaPage() {
  const [activeDay, setActiveDay] = useState(getDefaultDay);
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const onRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['agenda'] });
  }, [queryClient]);
  const indicatorRef = usePullToRefresh(scrollRef, onRefresh);

  const { data, isLoading } = useQuery({
    queryKey: ['agenda'],
    queryFn: () => getAgenda(),
    staleTime: 60_000,
  });

  const allEvents = isLoading ? [] : (data?.events ?? V7_EVENTS);
  const filtered  = allEvents.filter((e) => e.day === activeDay);

  return (
    <>
      <style>{`
        .agenda-page { position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden; }

        .agenda-header { padding: 20px 18px 0; flex-shrink: 0; }

        .page-title {
          font-family: 'Sora', sans-serif;
          font-size: 26px; font-weight: 700; color: var(--t);
          letter-spacing: .02em; text-transform: uppercase; margin: 0;
        }
        .agenda-dates {
          font-family: 'Sora', sans-serif;
          font-size: 13px; font-weight: 600; letter-spacing: .05em;
          color: rgba(204,222,231,.45);
          margin: 2px 0 14px;
        }

        .day-tabs {
          display: flex; gap: 6px; margin: 14px 0 0;
          overflow-x: auto; -webkit-overflow-scrolling: touch;
          scrollbar-width: none; padding-bottom: 2px;
        }
        .day-tabs::-webkit-scrollbar { display: none; }
        .day-tab {
          flex-shrink: 0;
          height: 36px; border-radius: 10px;
          padding: 0 14px;
          font-size: 14px; font-weight: 700;
          border: 1.5px solid rgba(255,255,255,.14);
          cursor: pointer; transition: all var(--tr);
          background: rgba(255,255,255,.08); color: rgba(200,215,230,.55);
          font-family: 'Sora', sans-serif;
          white-space: nowrap;
        }
        .day-tab.active {
          background: rgba(227,149,72,.12);
          color: #E39548;
          border: 1.5px solid rgba(227,149,72,.55);
          box-shadow: 0 1px 6px rgba(227,149,72,.18);
        }

        /* ── Scroll container ── */
        .agenda-scroll {
          flex: 1; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch;
          padding: 12px 14px calc(20px + var(--nav-h) + env(safe-area-inset-bottom, 0px) + 96px) 14px;
          overscroll-behavior: contain;
        }

        /* ── Time-rail row ── */
        .time-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 10px;
        }
        .time-rail {
          flex-shrink: 0;
          width: 44px;
          display: flex; flex-direction: column; align-items: flex-end;
          padding-top: 14px;
        }
        .rail-hour {
          font-family: 'Sora', sans-serif;
          font-size: 16px; font-weight: 800;
          color: #E39548; line-height: 1; white-space: nowrap;
        }
        .rail-period {
          font-size: 10px; font-weight: 700;
          letter-spacing: .06em; text-transform: uppercase;
          color: rgba(227,149,72,.65); margin-top: 2px;
        }
        .time-cards {
          flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px;
        }

        /* ── Session card ── */
        .session-card {
          background: var(--metallic); border: 1.5px solid rgba(255,255,255,.45);
          border-radius: var(--r-lg); padding: 14px 14px;
          box-shadow: var(--shadow-card);
          display: flex; flex-direction: column;
          transition: box-shadow var(--tr), transform var(--tr);
          width: 100%; box-sizing: border-box;
        }
        .session-header {
          display: flex; align-items: flex-start; gap: 10px;
        }
        .session-card:active { transform: scale(.98); opacity: .88; }
        .session-card.past { opacity: .52; }
        .session-card.live {
          border-left: 3px solid #E39548;
          box-shadow: var(--shadow-card), 0 0 0 1px rgba(212,160,23,.18);
        }

        .now-badge {
          display: inline-flex; align-items: center;
          background: #E39548; color: #1C283C;
          font-size: 10px; font-weight: 800; letter-spacing: .08em;
          text-transform: uppercase;
          border-radius: 5px; padding: 2px 8px;
          margin-bottom: 6px;
        }

        .session-name {
          flex: 1; min-width: 0;
          font-size: 17px; font-weight: 700; color: var(--t);
          line-height: 1.3;
        }
        .session-card.past .session-name { color: var(--t3); }

        .session-meta-row {
          display: flex; align-items: flex-end;
          justify-content: space-between;
          gap: 8px; margin-top: 5px; width: 100%;
        }
        .session-speakers {
          flex: 1; min-width: 0;
          display: flex; flex-direction: column; gap: 2px;
        }
        .session-speaker {
          display: flex; align-items: center; gap: 4px;
          font-size: 15px; font-weight: 500; color: var(--t3);
        }
        .session-speaker span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .speaker-indent { width: 15px; flex-shrink: 0; }
        .session-location {
          display: flex; align-items: center; gap: 3px;
          font-size: 13px; font-weight: 500; color: var(--t4);
          flex-shrink: 0; white-space: nowrap; margin-left: auto;
        }

        .session-chev { color: var(--t4); flex-shrink: 0; margin-top: 2px; }

        /* ── Empty / skeleton ── */
        .empty-state {
          text-align: center; padding: 60px 20px;
          color: var(--t4); font-size: 15px;
        }
        @keyframes agenda-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .session-skel {
          margin: 0 0 12px; padding: 16px;
          border-radius: 14px;
          background: rgba(255,255,255,.06);
          display: flex; gap: 12px; align-items: center;
        }
        .skel-bar {
          border-radius: 6px;
          background: linear-gradient(90deg, rgba(255,255,255,.06) 25%, rgba(255,255,255,.12) 50%, rgba(255,255,255,.06) 75%);
          background-size: 200% 100%;
          animation: agenda-shimmer 1.4s ease-in-out infinite;
        }
      `}</style>

      <div className="agenda-page">
        <PullIndicator ref={indicatorRef} />
        <div className="agenda-header">
          <h1 className="page-title">Agenda</h1>
          <div className="agenda-dates">June 3 – 5 · 2026</div>
          <div className="day-tabs">
            {DAY_TABS.map(({ day, label }) => (
              <button
                key={day}
                className={`day-tab${activeDay === day ? ' active' : ''}`}
                onClick={() => setActiveDay(day)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="agenda-scroll" ref={scrollRef}>
          {isLoading
            ? [60, 45, 70, 50, 55].map((w, i) => (
              <div key={i} className="session-skel">
                <div className="skel-bar" style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="skel-bar" style={{ width: `${w}%`, height: 14 }} />
                  <div className="skel-bar" style={{ width: '35%', height: 11 }} />
                </div>
              </div>
            ))
            : filtered.length > 0
              ? (() => {
                  const groups = filtered.reduce<Record<string, typeof filtered>>((acc, ev) => {
                    (acc[ev.startsAt] ??= []).push(ev);
                    return acc;
                  }, {});
                  const timeSlots = Object.keys(groups).sort();
                  return timeSlots.map((ts) => {
                    const { time, period } = formatTimeParts(ts);
                    return (
                      <div key={ts} className="time-row">
                        <div className="time-rail">
                          <span className="rail-hour">{time}</span>
                          <span className="rail-period">{period}</span>
                        </div>
                        <div className="time-cards">
                          {groups[ts].map((e) => <SessionCard key={e.id} event={e} />)}
                        </div>
                      </div>
                    );
                  });
                })()
              : <div className="empty-state">No sessions for this day.</div>
          }
        </div>
      </div>
    </>
  );
}
