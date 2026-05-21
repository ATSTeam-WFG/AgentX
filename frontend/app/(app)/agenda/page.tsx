'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAgenda, type AgendaEvent } from '@/lib/api/agenda';
import { V7_EVENTS } from '@/lib/v7-agenda';

const DAY_DEFS = [
  { day: 0, label: 'Day 1',  date: 'Wed, June 3',  title: 'Arrivals & Welcome Dinner',  summary: 'Registration & opening reception' },
  { day: 1, label: 'Day 2',  date: 'Thu, June 4',  title: 'Summit Day One',              summary: 'Keynote, breakouts, ATS demos & awards' },
  { day: 2, label: 'Day 3',  date: 'Fri, June 5',  title: 'Departures',                 summary: 'Safe travels — see you next year!' },
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

function SessionRow({ event }: { event: AgendaEvent }) {
  const status = getStatus(event.startsAt, event.endsAt);
  return (
    <div className={`ag-session${status === 'past' ? ' past' : status === 'live' ? ' live' : ''}`}>
      <div className="ag-session-time-col">
        <span className="ag-session-time">{formatTime(event.startsAt)}</span>
        {status === 'live' && <span className="ag-live-pip" />}
        {status === 'past' && <span className="ag-past-check">✓</span>}
      </div>
      <div className="ag-session-info">
        <div className="ag-session-name">{event.name}</div>
        {event.speakerName && <div className="ag-session-meta">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M3 21c0-4.5 4-8 9-8s9 3.5 9 8"/></svg>
          {event.speakerName}
        </div>}
        {event.location && <div className="ag-session-meta">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {event.location}
        </div>}
      </div>
      {status === 'live' && <span className="ag-live-badge">Live</span>}
    </div>
  );
}

function DayAccordion({ dayDef, events, defaultOpen }: {
  dayDef: typeof DAY_DEFS[0];
  events: AgendaEvent[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const liveCount = events.filter((e) => getStatus(e.startsAt, e.endsAt) === 'live').length;

  return (
    <div className={`ag-accordion${open ? ' open' : ''}`}>
      <button className="ag-accordion-hd" onClick={() => setOpen((v) => !v)}>
        <div className="ag-accordion-hd-left">
          <div>
            <div className="ag-accordion-label">{dayDef.label}</div>
            <div className="ag-accordion-date">{dayDef.date}</div>
          </div>
          {liveCount > 0 && (
            <span className="ag-live-chip">
              <span className="ag-live-dot" />
              Live
            </span>
          )}
        </div>
        <div className="ag-accordion-right">
          <span className="ag-session-count">{events.length} sessions</span>
          <span className="ag-chevron">
            <svg viewBox="0 0 12 12" fill="none" width="16" height="16">
              <path d="M2.5 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </div>
      </button>
      <div className="ag-accordion-body">
        <div className="ag-accordion-body-inner">
          {events.length > 0
            ? events.map((e) => <SessionRow key={e.id} event={e} />)
            : <div className="ag-empty">No sessions scheduled.</div>
          }
        </div>
      </div>
    </div>
  );
}

export default function AgendaPage() {
  const { data } = useQuery({
    queryKey: ['agenda'],
    queryFn: () => getAgenda(),
    staleTime: 60_000,
  });

  const allEvents = data?.events ?? V7_EVENTS;

  return (
    <>
      <style>{`
        .agenda-page { position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden; }
        .agenda-header { padding: 20px 18px 14px; flex-shrink: 0; }
        .agenda-title {
          font-family: 'Sora', sans-serif;
          font-size: 28px; font-weight: 700; color: var(--t);
          letter-spacing: -.025em; margin: 0;
          display: flex; align-items: center; gap: 10px;
        }
        .agenda-date-badge {
          font-size: 13px; font-weight: 700;
          background: var(--blue-lt); color: var(--blue);
          border: 1px solid rgba(27,79,196,.18);
          border-radius: 20px; padding: 3px 12px;
        }
        .agenda-scroll {
          flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
          padding: 0 18px calc(20px + var(--nav-h) + env(safe-area-inset-bottom, 0px) + 90px);
          overscroll-behavior: contain;
        }

        /* Accordion */
        .ag-accordion {
          margin-bottom: 10px;
          border-radius: var(--r-lg);
          border: 1px solid var(--border-metal);
          box-shadow: var(--shadow-card);
          overflow: hidden;
        }
        .ag-accordion-hd {
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 16px 18px;
          background: var(--surface);
          border: none; cursor: pointer;
          width: 100%; font-family: inherit;
          transition: background var(--tr);
        }
        .ag-accordion-hd:active { background: var(--bg2); }
        .ag-accordion.open .ag-accordion-hd {
          border-bottom: 1px solid var(--border-metal);
        }
        .ag-accordion-hd-left {
          display: flex; align-items: center; gap: 12px; text-align: left;
        }
        .ag-accordion-label {
          font-family: 'Sora', sans-serif;
          font-size: 17px; font-weight: 700; color: var(--t);
          letter-spacing: -.02em;
        }
        .ag-accordion-date {
          font-size: 13px; color: var(--t3); margin-top: 2px;
        }
        .ag-live-chip {
          display: inline-flex; align-items: center; gap: 5px;
          background: var(--green-lt); color: var(--green);
          border: 1px solid rgba(21,122,64,.18);
          border-radius: 20px; padding: 4px 10px;
          font-size: 12px; font-weight: 700;
        }
        .ag-live-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--green);
          animation: agLivePulse 1.6s ease-in-out infinite;
        }
        @keyframes agLivePulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .ag-accordion-right {
          display: flex; align-items: center; gap: 10px; flex-shrink: 0;
        }
        .ag-session-count {
          font-size: 13px; color: var(--t3); font-weight: 500;
        }
        .ag-chevron {
          color: var(--t3);
          transition: transform .22s ease;
          display: flex; align-items: center;
        }
        .ag-accordion.open .ag-chevron { transform: rotate(180deg); }

        /* Accordion body */
        .ag-accordion-body {
          max-height: 0;
          overflow: hidden;
          transition: max-height .35s cubic-bezier(.4,0,.2,1);
          background: var(--surface);
        }
        .ag-accordion.open .ag-accordion-body { max-height: 2000px; }
        .ag-accordion-body-inner { padding: 8px 0; }

        /* Session rows */
        .ag-session {
          display: flex; align-items: flex-start; gap: 14px;
          padding: 13px 18px;
          border-bottom: 1px solid var(--border);
          transition: background var(--tr);
        }
        .ag-session:last-child { border-bottom: none; }
        .ag-session:active { background: var(--bg2); }
        .ag-session.past { opacity: .52; }
        .ag-session.live {
          background: linear-gradient(90deg, rgba(21,122,64,.04), transparent);
        }
        .ag-session-time-col {
          display: flex; flex-direction: column; align-items: center;
          min-width: 58px; flex-shrink: 0; padding-top: 2px; gap: 4px;
        }
        .ag-session-time {
          font-family: 'Sora', sans-serif;
          font-size: 12px; font-weight: 700; color: var(--blue);
          white-space: nowrap; text-align: center;
        }
        .ag-session.past .ag-session-time { color: var(--t4); }
        .ag-live-pip {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--green);
          box-shadow: 0 0 6px rgba(21,122,64,.5);
          animation: agLivePulse 2s ease-in-out infinite;
        }
        .ag-past-check { font-size: 11px; font-weight: 800; color: var(--green); }
        .ag-session-info { flex: 1; min-width: 0; }
        .ag-session-name {
          font-size: 15px; font-weight: 700; color: var(--t);
          line-height: 1.3; margin-bottom: 4px;
        }
        .ag-session.past .ag-session-name { color: var(--t3); }
        .ag-session-meta {
          font-size: 13px; color: var(--t3); margin-top: 3px;
          display: flex; align-items: center; gap: 4px;
        }
        .ag-live-badge {
          flex-shrink: 0; align-self: flex-start;
          font-size: 11px; font-weight: 800; letter-spacing: .06em;
          text-transform: uppercase;
          background: var(--green); color: #fff;
          border-radius: 6px; padding: 3px 8px; margin-top: 2px;
        }
        .ag-empty {
          text-align: center; padding: 28px 20px;
          color: var(--t4); font-size: 15px;
        }
      `}</style>

      <div className="agenda-page">
        <div className="agenda-header">
          <h1 className="agenda-title">
            Agenda
            <span className="agenda-date-badge">June 3–5</span>
          </h1>
        </div>

        <div className="agenda-scroll">
          {DAY_DEFS.map((dayDef, i) => {
            const events = allEvents.filter((e) => e.day === dayDef.day);
            return (
              <DayAccordion
                key={dayDef.day}
                dayDef={dayDef}
                events={events}
                defaultOpen={i === 1}
              />
            );
          })}
          <div style={{ height: 16 }} />
        </div>
      </div>
    </>
  );
}
