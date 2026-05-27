'use client';

import { useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { getAgenda, type AgendaEvent } from '@/lib/api/agenda';
import { getMe } from '@/lib/api/profile';
import { V7_EVENTS } from '@/lib/v7-agenda';
import { useAuthStore } from '@/store/auth';
import { PwaPromptBanner } from '@/components/PwaPromptBanner';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullIndicator } from '@/components/PullIndicator';

function getDayGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getSummitDayInfo(): { label: string; value: string; sub?: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed
  const d = now.getDate();

  const summit = [
    new Date(2026, 5, 3), // June 3
    new Date(2026, 5, 4), // June 4
    new Date(2026, 5, 5), // June 5
  ];

  for (let i = 0; i < summit.length; i++) {
    const s = summit[i];
    if (y === s.getFullYear() && m === s.getMonth() && d === s.getDate()) {
      return { label: 'Day', value: String(i + 1) };
    }
  }

  const start = summit[0].getTime();
  if (now.getTime() < start) {
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysLeft = Math.ceil((start - now.getTime()) / msPerDay);
    return { label: 'Days to go', value: String(daysLeft) };
  }

  return {
    label: '',
    value: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  };
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
    <div style={{ height: 4, background: 'rgba(0,0,0,.12)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #F0A55A, #E39548)', borderRadius: 2, transition: 'width 1s linear' }} />
    </div>
  );
}

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const onRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['agenda'] }),
      queryClient.invalidateQueries({ queryKey: ['me'] }),
    ]);
  }, [queryClient]);
  const indicatorRef = usePullToRefresh(scrollRef, onRefresh);

  const { data: agenda } = useQuery({
    queryKey: ['agenda'],
    queryFn: () => getAgenda(),
    staleTime: 30_000,
  });

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: getMe,
    staleTime: 60_000,
    retry: false,
  });

  const events   = agenda?.events ?? V7_EVENTS;
  const current  = getActiveSession(events);
  const upcoming = getNextSession(events);
  const featured = current ?? upcoming;

  const rawName  = profile?.name ?? user?.name ?? '';
  const firstName = rawName ? rawName.split(' ')[0] : 'there';
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const summitDay = getSummitDayInfo();

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
          font-size: 17px;
          color: rgba(200,215,230,.55);
          font-weight: 500;
          margin-bottom: 2px;
        }
        .home-name {
          font-family: 'Sora', sans-serif;
          font-size: 34px;
          font-weight: 700;
          color: var(--t);
          letter-spacing: -.03em;
          line-height: 1.1;
        }
        .home-day-wrap { text-align: right; }
        .home-day-label {
          font-family: 'Sora', sans-serif;
          font-size: 10px; font-weight: 700; letter-spacing: .14em;
          text-transform: uppercase; color: rgba(204,222,231,.40);
          text-align: right;
        }
        .home-day-num {
          font-family: 'Sora', sans-serif;
          font-size: 36px; font-weight: 800; letter-spacing: -.05em;
          color: var(--t); line-height: 1; text-align: right;
        }
        .home-date {
          display: block;
          font-size: 12px;
          color: rgba(200,215,230,.38);
          text-align: right;
          margin-top: 2px;
        }
        .home-scroll {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 16px 22px calc(16px + var(--nav-h) + env(safe-area-inset-bottom, 0px) + 96px);
          overscroll-behavior: contain;
        }
        .sec-label {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: var(--steel);
          margin-bottom: 10px;
          margin-top: 6px;
        }
        .whats-next-card {
          background: var(--metallic);
          border: 1.5px solid rgba(255,255,255,.45);
          border-radius: var(--r-lg);
          border-top: 3px solid var(--amber);
          padding: 16px;
          box-shadow: var(--shadow-card);
          margin-bottom: 16px;
          position: relative;
          overflow: hidden;
        }
        .whats-next-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, rgba(227,149,72,.05) 0%, transparent 60%);
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
          color: var(--amber);
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
          font-size: 20px;
          font-weight: 700;
          color: var(--t);
          margin-bottom: 6px;
          line-height: 1.3;
        }
        .wn-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          font-size: 15px;
          color: var(--t3);
        }
        .wn-meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .card-progress {
          background: var(--metallic);
          border: 1.5px solid rgba(255,255,255,.45);
          border-radius: var(--r-lg);
          padding: 18px;
          box-shadow: var(--shadow-card);
          margin-bottom: 16px;
        }
        .cp-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: var(--t3);
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
          font-size: 19px;
          font-weight: 700;
          color: var(--t);
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
          background: rgba(0,0,0,.12);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 10px;
        }
        .progress-fill {
          height: 100%;
          border-radius: 4px;
          background: linear-gradient(90deg, #F0A55A, #E39548, #D07B38);
          box-shadow: 0 0 12px rgba(227,149,72,.35);
          transition: width .8s ease;
        }
        .cp-link {
          font-size: 14px;
          font-weight: 700;
          color: var(--amber);
          text-decoration: none;
        }
        .sponsor-card-pythonic {
          border: 1.5px solid rgba(255,255,255,.45);
          border-radius: var(--r-lg);
          box-shadow: var(--shadow-card);
          display: flex;
          align-items: stretch;
          overflow: hidden;
          height: 80px;
          margin-bottom: 16px;
        }
        .scp-logo-panel {
          width: 60%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px 16px;
          background: #fff;
          flex-shrink: 0;
        }
        .scp-logo {
          max-height: 48px;
          max-width: 100%;
          object-fit: contain;
        }
        .scp-gradient {
          width: 5%;
          background: linear-gradient(to right, #fff, var(--bg));
          flex-shrink: 0;
        }
        .scp-text-panel {
          flex: 1;
          background: var(--bg);
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 10px 14px;
        }
        .scp-name {
          font-family: 'Sora', sans-serif;
          font-size: 14px; font-weight: 700;
          color: var(--t); margin-bottom: 3px;
        }
        .scp-tagline {
          font-size: 12px; color: var(--t3); line-height: 1.35;
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
            rgba(204,222,231,.20)
          );
        }
        .summit-banner::after {
          background: linear-gradient(
            90deg,
            rgba(204,222,231,.20),
            transparent
          );
        }
        .summit-banner-text {
          font-family: 'Sora', sans-serif;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: rgba(204,222,231,.60);
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
        <PullIndicator ref={indicatorRef} />
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
            {summitDay.label && <div className="home-day-label">{summitDay.label}</div>}
            <div className="home-day-num">{summitDay.value}</div>
            <span className="home-date">{today}</span>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="home-scroll" ref={scrollRef}>

          {/* Happening Now / Up Next */}
          <div className="sec-label">{current ? 'Happening Now' : 'Up Next'}</div>

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

          {/* Sponsor banner */}
          <div className="sec-label">Summit Sponsor</div>
          <Link href="/sponsors/pythonic" style={{ textDecoration: 'none', display: 'block' }}>
            <div className="sponsor-card-pythonic">
              <div className="scp-logo-panel">
                <img
                  src="/sponsors/logos/Pythonic_logo%20horizontal-gradient.png"
                  alt="Pythonic"
                  className="scp-logo"
                />
              </div>
              <div className="scp-gradient" />
              <div className="scp-text-panel">
                <div className="scp-name">Pythonic</div>
                <div className="scp-tagline">AI-driven document intelligence for title</div>
              </div>
            </div>
          </Link>

          <PwaPromptBanner />
        </div>
      </div>
    </>
  );
}
