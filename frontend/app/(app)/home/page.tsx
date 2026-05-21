'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getAgenda, type AgendaEvent } from '@/lib/api/agenda';
import { V7_EVENTS } from '@/lib/v7-agenda';
import { useAuthStore } from '@/store/auth';
import TourOverlay from '@/components/TourOverlay';

function getDayGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getActiveSession(events: AgendaEvent[]): AgendaEvent | undefined {
  const now = Date.now();
  return events.find((e) => {
    const start = new Date(e.startsAt).getTime();
    const end   = new Date(e.endsAt).getTime();
    return now >= start && now <= end;
  });
}

function getNextSession(events: AgendaEvent[]): AgendaEvent | undefined {
  const now = Date.now();
  return events
    .filter((e) => new Date(e.startsAt).getTime() > now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function SessionProgress({ event }: { event: AgendaEvent }) {
  const now = Date.now();
  const start = new Date(event.startsAt).getTime();
  const end   = new Date(event.endsAt).getTime();
  const pct   = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  return (
    <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--blue), var(--cyan))', borderRadius: 2, transition: 'width 1s linear' }} />
    </div>
  );
}

export default function HomePage() {
  const user = useAuthStore((s) => s.user);

  const { data: agenda } = useQuery({
    queryKey: ['agenda'],
    queryFn: () => getAgenda(),
    staleTime: 30_000,
  });

  const events   = agenda?.events ?? V7_EVENTS;
  const current  = getActiveSession(events);
  const upcoming = getNextSession(events);
  const featured = current ?? upcoming;

  const firstName = (user?.name ?? 'Summit Guest').split(' ')[0];
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  return (
    <>
      <style>{`
        .home-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px 22px 0;
          flex-shrink: 0;
        }
        .home-greeting {
          font-size: 15px;
          color: var(--t3);
          font-weight: 500;
          margin-bottom: 2px;
        }
        .home-name {
          font-family: 'Sora', sans-serif;
          font-size: 30px;
          font-weight: 800;
          color: var(--t);
          letter-spacing: -.03em;
          line-height: 1.1;
        }
        .home-day-wrap { text-align: right; }
        .home-day-chip {
          display: inline-block;
          font-family: 'Sora', sans-serif;
          font-size: 13px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 20px;
          background: var(--blue-lt);
          color: var(--blue);
          border: 1px solid rgba(27,79,196,.20);
          margin-bottom: 3px;
        }
        .home-date {
          display: block;
          font-size: 13px;
          color: var(--t3);
          text-align: right;
        }
        .home-scroll {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 16px 22px calc(16px + var(--nav-h) + env(safe-area-inset-bottom, 0px) + 90px);
          overscroll-behavior: contain;
        }
        .sec-label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: var(--t3);
          margin-bottom: 10px;
          margin-top: 6px;
        }
        /* What's Next card — v7 style */
        .whats-next-card {
          background: var(--surface);
          border: 1px solid var(--border-metal);
          border-radius: var(--r-lg);
          padding: 16px;
          box-shadow: var(--shadow-card);
          margin-bottom: 16px;
          position: relative;
          overflow: hidden;
        }
        .wn-eyebrow {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: var(--blue);
          margin-bottom: 8px;
        }
        .live-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--green);
          box-shadow: 0 0 6px rgba(21,122,64,.5);
          animation: pulse 2s ease-in-out infinite;
          flex-shrink: 0;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .4; }
        }
        .wn-title {
          font-family: 'Sora', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: var(--t);
          margin-bottom: 6px;
          line-height: 1.3;
        }
        .wn-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          font-size: 13px;
          color: var(--t3);
        }
        .wn-meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        /* Sponsor card */
        .sponsor-card {
          background: var(--surface);
          border: 1px solid var(--border-metal);
          border-radius: var(--r-lg);
          padding: 18px;
          box-shadow: var(--shadow-card);
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 16px;
        }
        .sponsor-logo-sq {
          width: 52px; height: 52px;
          border-radius: 12px;
          background: var(--navy);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 22px;
        }
        .sponsor-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: var(--amber);
          margin-bottom: 3px;
        }
        .sponsor-name {
          font-family: 'Sora', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: var(--t);
        }
        .sponsor-tagline {
          font-size: 13px;
          color: var(--t3);
          margin-top: 2px;
        }
        /* Summit banner */
        .summit-banner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 10px 22px 8px;
          flex-shrink: 0;
          position: relative;
        }
        .summit-banner::before,
        .summit-banner::after {
          content: '';
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--border-metal));
        }
        .summit-banner::after {
          background: linear-gradient(90deg, var(--border-metal), transparent);
        }
        .summit-banner-text {
          font-family: 'Sora', sans-serif;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: var(--t3);
          white-space: nowrap;
        }
        .no-session {
          text-align: center;
          padding: 28px 20px;
          color: var(--t3);
          font-size: 15px;
        }
        /* Resort map card */
        .resort-map-card {
          background: linear-gradient(135deg, var(--blue-lt), #eef4ff);
          border: 1px solid rgba(27,79,196,.16);
          border-radius: var(--r-lg);
          padding: 16px 18px;
          box-shadow: var(--shadow-card);
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 16px;
          cursor: pointer;
          text-decoration: none;
          transition: opacity var(--tr);
        }
        .resort-map-card:active { opacity: .85; }
        .resort-map-icon {
          width: 46px; height: 46px;
          border-radius: 12px;
          background: var(--blue);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(27,79,196,.25);
        }
        .resort-map-title {
          font-family: 'Sora', sans-serif;
          font-size: 16px; font-weight: 700;
          color: var(--t);
        }
        .resort-map-sub { font-size: 13px; color: var(--t3); margin-top: 2px; }
        .resort-map-chev { margin-left: auto; color: var(--blue); flex-shrink: 0; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', inset: 0 }}>
        {/* Summit identity banner */}
        <div className="summit-banner">
          <span className="summit-banner-text">Executive Summit 2026</span>
        </div>

        {/* Greeting header */}
        <div className="home-header">
          <div>
            <div className="home-greeting">{getDayGreeting()},</div>
            <div className="home-name">{firstName}</div>
          </div>
          <div className="home-day-wrap">
            <span className="home-day-chip">Day 1</span>
            <span className="home-date">{today}</span>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="home-scroll">
          {/* What's Next */}
          <div className="sec-label">What&apos;s Next</div>

          {featured ? (
            <div className="whats-next-card">
              <div className="wn-eyebrow">
                {current ? <><span className="live-dot" /> Live Now</> : 'Coming Up'}
              </div>
              <div className="wn-title">{featured.name}</div>
              <div className="wn-meta">
                {featured.speakerName && (
                  <span className="wn-meta-item">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M3 21c0-4.5 4-8 9-8s9 3.5 9 8"/></svg>
                    {featured.speakerName}
                  </span>
                )}
                {featured.location && (
                  <span className="wn-meta-item">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {featured.location}
                  </span>
                )}
                <span className="wn-meta-item">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {formatTime(featured.startsAt)} – {formatTime(featured.endsAt)}
                </span>
              </div>
              {current && <SessionProgress event={featured} />}
            </div>
          ) : (
            <div className="whats-next-card">
              <div className="no-session">No sessions scheduled right now.</div>
            </div>
          )}

          {/* Summit Sponsor */}
          <div className="sec-label">Summit Sponsor</div>
          <div className="sponsor-card">
            <div className="sponsor-logo-sq">🏢</div>
            <div>
              <div className="sponsor-eyebrow">Official Summit Sponsor</div>
              <div className="sponsor-name">WFG Title &amp; Escrow</div>
              <div className="sponsor-tagline">Your trusted partner for every closing</div>
            </div>
          </div>

          {/* Resort Map */}
          <a className="resort-map-card" href="#" aria-label="View resort map">
            <div className="resort-map-icon">
              <svg viewBox="0 0 24 24" fill="none" width="24" height="24" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z"/>
                <path d="M9 4v13M15 7v13"/>
              </svg>
            </div>
            <div>
              <div className="resort-map-title">Resort Map</div>
              <div className="resort-map-sub">Venues, session rooms &amp; amenities</div>
            </div>
            <span className="resort-map-chev">›</span>
          </a>
        </div>
      </div>

      <TourOverlay />
    </>
  );
}
