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
          gap: 5px;
          padding: calc(10px + env(safe-area-inset-top, 0px)) 18px 10px;
          background: rgba(18,28,46,.92);
          backdrop-filter: blur(22px) saturate(180%);
          -webkit-backdrop-filter: blur(22px) saturate(180%);
          border-bottom: 1px solid rgba(255,255,255,.06);
          flex-shrink: 0;
          position: relative;
          z-index: 100;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.05),
            0 4px 24px rgba(0,0,0,.35);
        }

        /* Gold hairline at bottom */
        .top-bar::after {
          content: '';
          position: absolute;
          left: 0; right: 0; bottom: -1px;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(212,160,23,.40) 25%,
            rgba(212,160,23,.55) 50%,
            rgba(212,160,23,.40) 75%,
            transparent 100%
          );
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
          box-shadow:
            0 2px 8px rgba(0,0,0,.40),
            inset 0 1px 0 rgba(255,255,255,.12);
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
          background: linear-gradient(
            135deg,
            rgba(212,160,23,.22) 0%,
            rgba(194,103,28,.14) 100%
          );
          color: var(--gold-rich);
          border-radius: 22px;
          padding: 7px 14px;
          font-size: 13px;
          font-weight: 700;
          font-family: 'Sora', sans-serif;
          text-decoration: none;
          border: 1px solid rgba(212,160,23,.32);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.08),
            0 2px 8px rgba(212,160,23,.18);
          min-height: 34px;
          transition: box-shadow var(--tr), transform var(--tr);
          white-space: nowrap;
        }
        .tb-pts-pill:active { transform: scale(.96); }

        /* WFG right */
        .tb-wfg {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          flex-shrink: 0;
        }
        .tb-wfg-logo {
          height: 34px;
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
          color: rgba(180,200,220,.42);
          letter-spacing: .07em;
          text-transform: uppercase;
          line-height: 1;
          padding-left: 2px;
        }
        .tb-microline strong { color: rgba(200,215,230,.60); font-weight: 700; }
        .tb-ml-dot {
          width: 3px; height: 3px;
          border-radius: 50%;
          background: rgba(180,200,220,.25);
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
              src="/WFG NTIC Logo white.png"
              alt="WFG National Title Insurance Company"
              width={80}
              height={34}
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
