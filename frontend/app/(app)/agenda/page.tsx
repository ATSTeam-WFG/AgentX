'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getAgenda, type AgendaEvent } from '@/lib/api/agenda';
import { V7_EVENTS } from '@/lib/v7-agenda';

const DAY_TABS = [
  { day: 0, label: 'Wed · Jun 3',  title: 'Arrivals & Welcome Dinner',    badge: 'Pre-Summit' },
  { day: 1, label: 'Thu · Jun 4',  title: 'Summit Day One',               badge: 'Day 1'      },
  { day: 2, label: 'Fri · Jun 5',  title: 'Departures',                   badge: 'Day 2'      },
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

function SessionCard({ event }: { event: AgendaEvent }) {
  const status = getStatus(event.startsAt, event.endsAt);
  return (
    <Link href={`/agenda/${event.id}`} style={{ textDecoration: 'none' }}>
      <div className={`session-card ${status}`}>
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
        <div className="session-info">
          <div className="session-name">{event.name}</div>
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
          <span className="session-chev">
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
  const [activeDay, setActiveDay] = useState(1);

  const { data } = useQuery({
    queryKey: ['agenda'],
    queryFn: () => getAgenda(),
    staleTime: 60_000,
  });

  // Prefer live API data; fall back to v7 static data
  const allEvents   = data?.events ?? V7_EVENTS;
  const filtered    = allEvents.filter((e) => e.day === activeDay);
  const activeTab   = DAY_TABS.find((t) => t.day === activeDay)!;

  return (
    <>
      <style>{`
        .agenda-page { position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden; }

        .agenda-header { padding: 20px 18px 0; flex-shrink: 0; }

        .page-title {
          font-family: 'Sora', sans-serif;
          font-size: 32px; font-weight: 800; color: var(--t);
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
          background: linear-gradient(180deg, #F0A55A, #E39548, #D07B38);
          color: #1C283C;
          border-color: rgba(227,149,72,.50);
          box-shadow: 0 4px 14px rgba(227,149,72,.40), 0 2px 6px rgba(227,149,72,.26);
        }

        .day-header {
          padding: 12px 18px 14px;
          flex-shrink: 0;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }
        .day-header-title {
          font-family: 'Sora', sans-serif;
          font-size: 17px; font-weight: 700; color: var(--t);
        }
        .day-header-summary {
          font-size: 15px; color: var(--t3); margin-top: 2px;
        }

        .agenda-scroll {
          flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
          padding: 12px 18px calc(20px + var(--nav-h) + env(safe-area-inset-bottom, 0px) + 90px);
          overscroll-behavior: contain;
        }

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
          line-height: 1.3; margin-bottom: 5px;
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
      `}</style>

      <div className="agenda-page">
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

        {activeTab && (
          <div className="day-header">
            <div className="day-header-title">{activeTab.title}</div>
            <div className="day-header-summary">
              {activeTab.day === 0 && 'Registration & opening reception'}
              {activeTab.day === 1 && 'Keynote, breakouts, ATS demos & awards'}
              {activeTab.day === 2 && 'Safe travels — see you next year!'}
            </div>
          </div>
        )}

        <div className="agenda-scroll">
          {filtered.length > 0
            ? filtered.map((e) => <SessionCard key={e.id} event={e} />)
            : <div className="empty-state">No sessions for this day.</div>
          }
        </div>
      </div>
    </>
  );
}
