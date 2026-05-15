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
          {status === 'past' && <span className="past-dot">✓</span>}
        </div>
        <div className="session-info">
          <div className="session-name">{event.name}</div>
          {event.speakerName && <div className="session-meta">👤 {event.speakerName}</div>}
          {event.location && <div className="session-meta">📍 {event.location}</div>}
        </div>
        {status === 'live' && <span className="live-badge">Live</span>}
        {status !== 'live' && <span className="session-chev">›</span>}
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
          font-size: 28px; font-weight: 700; color: var(--navy);
          letter-spacing: -.025em; margin: 0 0 4px;
          display: flex; align-items: center; gap: 10px;
        }
        .agenda-date-badge {
          font-size: 13px; font-weight: 700;
          background: var(--blue-lt); color: var(--blue);
          border: 1px solid rgba(29,77,217,.2);
          border-radius: 20px; padding: 3px 12px;
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
          font-size: 13px; font-weight: 700;
          border: 1.5px solid var(--border-metal);
          cursor: pointer; transition: all var(--tr);
          background: var(--surface); color: var(--t3);
          font-family: 'Sora', sans-serif;
          white-space: nowrap;
        }
        .day-tab.active {
          background: var(--blue); color: #fff;
          border-color: var(--blue); box-shadow: var(--shadow-blue);
        }

        .day-header {
          padding: 12px 18px 14px;
          flex-shrink: 0;
          border-bottom: 1px solid var(--border);
        }
        .day-header-title {
          font-family: 'Sora', sans-serif;
          font-size: 16px; font-weight: 700; color: var(--navy);
        }
        .day-header-summary {
          font-size: 13px; color: var(--t3); margin-top: 2px;
        }

        .agenda-scroll {
          flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
          padding: 12px 18px calc(20px + var(--nav-h) + env(safe-area-inset-bottom, 0px) + 90px);
          overscroll-behavior: contain;
        }

        .session-card {
          background: var(--surface); border: 1.5px solid var(--border);
          border-radius: var(--r-lg); padding: 14px 16px;
          margin-bottom: 10px; box-shadow: var(--shadow-xs);
          display: flex; align-items: flex-start; gap: 12px;
          transition: box-shadow var(--tr), transform var(--tr);
        }
        .session-card:active { transform: scale(.98); box-shadow: none; }
        .session-card.past { opacity: .58; }
        .session-card.live {
          border-color: var(--blue);
          box-shadow: var(--shadow), 0 0 0 3px rgba(29,77,217,.08);
        }

        .session-time-col {
          display: flex; flex-direction: column; align-items: center;
          min-width: 56px; flex-shrink: 0; padding-top: 2px;
          gap: 4px;
        }
        .session-time {
          font-family: 'Sora', sans-serif;
          font-size: 12px; font-weight: 700; color: var(--blue);
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
        .past-dot {
          font-size: 11px; font-weight: 800; color: var(--green);
        }

        .session-info { flex: 1; min-width: 0; }
        .session-name {
          font-size: 15px; font-weight: 700; color: var(--navy);
          line-height: 1.3; margin-bottom: 5px;
        }
        .session-card.past .session-name { color: var(--t3); }
        .session-meta { font-size: 13px; color: var(--t3); margin-top: 3px; }

        .session-chev { color: var(--t4); font-size: 22px; margin-top: 2px; flex-shrink: 0; }
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
          <h1 className="page-title">
            Agenda
            <span className="agenda-date-badge">June 3–5</span>
          </h1>
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
