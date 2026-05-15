'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getAgenda, type AgendaEvent } from '@/lib/api/agenda';
import { V7_EVENTS } from '@/lib/v7-agenda';
import { useAuthStore } from '@/store/auth';

function getDayGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getActiveSession(events: AgendaEvent[]): AgendaEvent | undefined {
  const now = Date.now();
  return events.find((e) => {
    const start = new Date(e.starts_at).getTime();
    const end   = new Date(e.ends_at).getTime();
    return now >= start && now <= end;
  });
}

function getNextSession(events: AgendaEvent[]): AgendaEvent | undefined {
  const now = Date.now();
  return events
    .filter((e) => new Date(e.starts_at).getTime() > now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function SessionProgress({ event }: { event: AgendaEvent }) {
  const now = Date.now();
  const start = new Date(event.starts_at).getTime();
  const end   = new Date(event.ends_at).getTime();
  const pct   = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  return (
    <div style={{ height: 4, background: 'rgba(29,77,217,.12)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
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
          font-size: 16px;
          color: rgba(200,215,230,.55);
          font-weight: 500;
          margin-bottom: 2px;
        }
        .home-name {
          font-family: 'Sora', sans-serif;
          font-size: 30px;
          font-weight: 800;
          color: var(--silver);
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
          background: linear-gradient(135deg, rgba(212,160,23,.18), rgba(194,103,28,.10));
          color: var(--gold-rich);
          border: 1px solid rgba(212,160,23,.28);
          margin-bottom: 3px;
        }
        .home-date {
          display: block;
          font-size: 13px;
          color: rgba(200,215,230,.45);
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
          color: var(--steel);
          margin-bottom: 10px;
          margin-top: 6px;
        }
        .whats-next-card {
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: var(--r-lg);
          border-top: 3px solid var(--blue);
          padding: 16px;
          box-shadow: var(--shadow);
          margin-bottom: 16px;
          position: relative;
          overflow: hidden;
        }
        .whats-next-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, rgba(29,77,217,.04) 0%, transparent 60%);
          pointer-events: none;
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
          box-shadow: 0 0 6px rgba(20,102,54,.6);
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .4; }
        }
        .wn-title {
          font-family: 'Sora', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: var(--navy);
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
        .card-progress {
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: var(--r-lg);
          padding: 18px;
          box-shadow: var(--shadow);
          margin-bottom: 16px;
        }
        .cp-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: var(--steel);
          margin-bottom: 4px;
        }
        .cp-head-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        .cp-heading {
          font-family: 'Sora', sans-serif;
          font-size: 17px;
          font-weight: 700;
          color: var(--navy);
          line-height: 1.25;
          flex: 1;
          padding-right: 12px;
        }
        .cp-points {
          font-family: 'Sora', sans-serif;
          font-size: 28px;
          font-weight: 800;
          color: var(--gold-rich);
          line-height: 1;
          flex-shrink: 0;
        }
        .cp-pts-label {
          font-size: 12px;
          color: var(--t4);
          font-weight: 500;
          text-align: right;
          margin-top: 2px;
        }
        .progress-track {
          height: 8px;
          background: var(--surface2);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 10px;
        }
        .progress-fill {
          height: 100%;
          border-radius: 4px;
          background: linear-gradient(90deg, var(--blue), var(--cyan), var(--gold-rich));
          box-shadow: 0 0 12px rgba(6,182,212,.35);
          transition: width .8s ease;
        }
        .cp-link {
          font-size: 14px;
          font-weight: 700;
          color: var(--blue);
          text-decoration: none;
        }
        .sponsor-card {
          background: linear-gradient(135deg, var(--amber-lt), #fff8ed);
          border: 1.5px solid var(--amber-s);
          border-radius: var(--r-lg);
          padding: 18px;
          box-shadow: var(--shadow-sm);
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 16px;
        }
        .sponsor-logo-sq {
          width: 52px; height: 52px;
          border-radius: 12px;
          background: #fff;
          border: 1.5px solid var(--border-metal);
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
          color: var(--navy);
        }
        .sponsor-tagline {
          font-size: 13px;
          color: var(--t3);
          margin-top: 2px;
        }
        /* ── Summit banner ── */
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
          background: linear-gradient(
            90deg,
            transparent,
            rgba(212,160,23,.35)
          );
        }
        .summit-banner::after {
          background: linear-gradient(
            90deg,
            rgba(212,160,23,.35),
            transparent
          );
        }
        .summit-banner-text {
          font-family: 'Sora', sans-serif;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: var(--gold);
          white-space: nowrap;
        }
        .no-session {
          text-align: center;
          padding: 28px 20px;
          color: var(--t3);
          font-size: 15px;
        }
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
          {/* Happening Now */}
          <div className="sec-label">Happening Now</div>

          {featured ? (
            <div className="whats-next-card">
              <div className="wn-eyebrow">
                {current ? <><span className="live-dot" /> Live Now</> : 'Coming Up'}
              </div>
              <div className="wn-title">{featured.name}</div>
              <div className="wn-meta">
                {featured.speaker && (
                  <span className="wn-meta-item">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M3 21c0-4.5 4-8 9-8s9 3.5 9 8"/></svg>
                    {featured.speaker}
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
                  {formatTime(featured.starts_at)} – {formatTime(featured.ends_at)}
                </span>
              </div>
              {current && <SessionProgress event={featured} />}
            </div>
          ) : (
            <div className="whats-next-card">
              <div className="no-session">No sessions scheduled right now.</div>
            </div>
          )}

          {/* Sponsor banner */}
          <div className="sec-label">Summit Sponsor</div>
          <div className="sponsor-card">
            <div className="sponsor-logo-sq">🏢</div>
            <div>
              <div className="sponsor-eyebrow">Official Summit Sponsor</div>
              <div className="sponsor-name">WFG Title &amp; Escrow</div>
              <div className="sponsor-tagline">Your trusted partner for every closing</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
