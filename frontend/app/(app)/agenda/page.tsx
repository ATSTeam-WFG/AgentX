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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getStatus(startsAt: string, endsAt: string): 'past' | 'live' | 'upcoming' {
  const now = Date.now();
  const s = new Date(startsAt).getTime();
  const e = new Date(endsAt).getTime();
  if (now > e) return 'past';
  if (now >= s && now <= e) return 'live';
  return 'upcoming';
}

function SessionCard({ event, hideTime }: { event: AgendaEvent; hideTime?: boolean }) {
  const status = getStatus(event.startsAt, event.endsAt);
  return (
    <Link href={`/agenda/${event.id}`} style={{ textDecoration: 'none' }}>
      <div className={`session-card ${status}`}>
        {!hideTime && (
          <div className="session-time-col">
            <span className="session-time">{formatTime(event.startsAt)}</span>
            {status === 'live' && <span className="live-pip" />}
            {status === 'past' && (
              <span className="past-dot">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            )}
          </div>
        )}
        <div className="session-info">
          <div className="session-name-row">
            {hideTime && status === 'live' && <span className="live-pip-inline" />}
            {hideTime && status === 'past' && (
              <span className="past-check-inline">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            )}
            <div className="session-name">{event.name}</div>
          </div>
          {event.speakerName && (
            <div className="session-meta" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M3 21c0-4.5 4-8 9-8s9 3.5 9 8"/></svg>
              {event.speakerName}
            </div>
          )}
          {event.location && (
            <div className="session-meta" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {event.location}
            </div>
          )}
        </div>
        {status === 'live' && <span className="live-badge">Live</span>}
        {status !== 'live' && (
          <span className="session-chev" style={event.description ? { color: '#E39548' } : {}}>
            <svg width="16" height="16" viewBox="0 0 12 12" fill="none">
              <path d="M4.5 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        )}
      </div>
    </Link>
  );
}

export default function AgendaPage() {
  const [activeDay, setActiveDay] = useState(2);
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

  // While fetching: show skeleton. Once settled: use live data or fall back to V7_EVENTS.
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

        .agenda-scroll {
          flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
          padding: 12px 18px calc(20px + var(--nav-h) + env(safe-area-inset-bottom, 0px) + 96px);
          overscroll-behavior: contain;
        }
        .time-group { margin-bottom: 4px; }
        .time-header {
          font-size: 13px; font-weight: 700; letter-spacing: .06em;
          color: #E39548;
          padding: 10px 2px 5px;
        }
        .session-name-row { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
        .live-pip-inline {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--green); flex-shrink: 0;
          box-shadow: 0 0 6px rgba(20,102,54,.6);
          animation: pipPulse 2s ease-in-out infinite;
        }
        .past-check-inline { color: var(--green); display: flex; flex-shrink: 0; }

        .session-card {
          background: var(--metallic); border: 1.5px solid rgba(255,255,255,.45);
          border-radius: var(--r-lg); padding: 14px 16px;
          margin-bottom: 10px; box-shadow: var(--shadow-card);
          display: flex; align-items: flex-start; gap: 12px;
          transition: box-shadow var(--tr), transform var(--tr);
        }
        .session-card:active { transform: scale(.98); opacity: .88; }
        .session-card.past { opacity: .52; }
        .session-card.live {
          border-color: rgba(212,160,23,.55);
          box-shadow: var(--shadow-card), 0 0 0 3px rgba(212,160,23,.15);
        }

        .session-time-col {
          display: flex; flex-direction: column; align-items: center;
          min-width: 56px; flex-shrink: 0; padding-top: 2px;
          gap: 4px;
        }
        .session-time {
          font-family: 'Sora', sans-serif;
          font-size: 14px; font-weight: 700; color: #1C283C;
          white-space: nowrap; text-align: center;
        }
        .session-card.past .session-time { color: var(--t4); }
        .live-pip {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--green);
          box-shadow: 0 0 6px rgba(20,102,54,.6);
          animation: pipPulse 2s ease-in-out infinite;
        }
        @keyframes pipPulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .past-dot { color: var(--green); }

        .session-info { flex: 1; min-width: 0; }
        .session-name {
          font-size: 17px; font-weight: 700; color: var(--t);
          line-height: 1.3;
        }
        .session-card.past .session-name { color: var(--t3); }
        .session-meta { font-size: 15px; color: var(--t3); margin-top: 3px; }

        .session-chev { color: var(--t4); flex-shrink: 0; margin-top: 2px; }
        .live-badge {
          flex-shrink: 0; align-self: flex-start;
          font-size: 11px; font-weight: 800; letter-spacing: .06em;
          text-transform: uppercase;
          background: var(--green); color: #fff;
          border-radius: 6px; padding: 3px 8px; margin-top: 2px;
        }

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
                  return timeSlots.map((ts) => (
                    <div key={ts} className="time-group">
                      <div className="time-header">{formatTime(ts)}</div>
                      {groups[ts].map((e) => <SessionCard key={e.id} event={e} hideTime />)}
                    </div>
                  ));
                })()
              : <div className="empty-state">No sessions for this day.</div>
          }
        </div>
      </div>
    </>
  );
}
