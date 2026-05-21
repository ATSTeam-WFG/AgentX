'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getMe } from '@/lib/api/profile';

export default function TopBar() {
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: getMe,
    staleTime: 60_000,
    retry: false,
  });

  const pts = profile?.totalPoints ?? null;

  return (
    <>
      <style>{`
        .top-bar {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: calc(10px + env(safe-area-inset-top, 0px)) 18px 10px;
          background: var(--surface-glass);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid var(--border-metal);
          flex-shrink: 0;
          position: relative;
          z-index: 100;
          box-shadow: 0 2px 12px rgba(8,24,64,.06);
        }
        .tb-brand-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          min-height: 42px;
        }
        /* ES26 left */
        .tb-es26 {
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
          text-decoration: none;
        }
        .tb-es26-img {
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(8,24,64,.14);
        }
        /* Center — points pill */
        .tb-center {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tb-pts-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--gold-lt);
          color: var(--gold);
          border-radius: 22px;
          padding: 7px 14px;
          font-size: 13px;
          font-weight: 700;
          font-family: 'Sora', sans-serif;
          text-decoration: none;
          border: 1px solid rgba(176,122,0,.22);
          box-shadow: 0 1px 4px rgba(176,122,0,.12);
          min-height: 34px;
          transition: box-shadow var(--tr), transform var(--tr);
          white-space: nowrap;
        }
        .tb-pts-pill:active { transform: scale(.96); }
        .tb-wfg {
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
        }
        .tb-wfg-logo {
          height: 28px;
          width: auto;
          object-fit: contain;
        }
        /* Attribution microline */
        .tb-microline {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 600;
          color: var(--t4);
          letter-spacing: .07em;
          text-transform: uppercase;
          line-height: 1;
          padding-left: 2px;
        }
        .tb-microline strong { color: var(--t3); font-weight: 700; }
        .tb-ml-dot {
          width: 3px; height: 3px;
          border-radius: 50%;
          background: var(--border-metal);
          flex-shrink: 0;
        }
      `}</style>

      <header className="top-bar" role="banner">
        <div className="tb-brand-row">

          {/* ES26 left */}
          <Link href="/home" className="tb-es26" aria-label="Go to home">
            <Image
              src="/ES26logo.png"
              alt="ES 26"
              width={42}
              height={42}
              className="tb-es26-img"
              style={{ width: 42, height: 42, objectFit: 'cover' }}
              priority
            />
          </Link>

          {/* Points pill center */}
          <div className="tb-center">
            {pts !== null && (
              <Link href="/profile" className="tb-pts-pill" aria-label={`${pts} points — view leaderboard`}>
                <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
                  <polygon points="8,1 10,6 15,6 11,9.5 12.5,15 8,11.5 3.5,15 5,9.5 1,6 6,6" fill="currentColor" />
                </svg>
                {pts.toLocaleString()} pts
              </Link>
            )}
          </div>

          {/* WFG right */}
          <div className="tb-wfg">
            <Image
              src="/WFG NTIC Logo.png"
              alt="WFG National Title Insurance Company"
              width={90}
              height={28}
              className="tb-wfg-logo"
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>

        </div>

        <div className="tb-microline">
          <span>An <strong>Agent 3.0 · Agency Advantage</strong> initiative</span>
          <span className="tb-ml-dot" />
          <span>Powered by <strong>ATS</strong></span>
        </div>
      </header>
    </>
  );
}
