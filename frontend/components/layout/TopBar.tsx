'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function TopBar() {
  return (
    <>
      <style>{`
        .top-bar {
          display: flex;
          flex-direction: column;
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

        .top-bar::after {
          content: '';
          position: absolute;
          left: 0; right: 0; bottom: -1px;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(227,149,72,.30) 25%,
            rgba(227,149,72,.45) 50%,
            rgba(227,149,72,.30) 75%,
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

      `}</style>

      <header className="top-bar" role="banner">
        <div className="tb-brand-row">

          {/* ES26 left */}
          <Link href="/home" className="tb-es26" aria-label="Go to home">
            <Image
              src="https://pub-9849080621014a8e9c12e5989f01a96e.r2.dev/brand/es26logo.png"
              alt="ES 26"
              width={42}
              height={42}
              className="tb-es26-img"
              style={{ width: 42, height: 42, objectFit: 'cover' }}
              priority
            />
          </Link>

          {/* WFG right */}
          <div className="tb-wfg">
            <Image
              src="https://pub-9849080621014a8e9c12e5989f01a96e.r2.dev/brand/wfg-ntic-logo-white.png"
              alt="WFG National Title Insurance Company"
              width={80}
              height={34}
              className="tb-wfg-logo"
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>

        </div>

      </header>
    </>
  );
}
