'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const TOUR_STEPS = [
  {
    targetId: 'nb-home',
    title: 'Home',
    desc: "See what's happening now, upcoming sessions, and your summit overview.",
  },
  {
    targetId: 'nb-agenda',
    title: 'Agenda',
    desc: 'Browse the full 3-day schedule. Sessions, speakers, and locations all in one place.',
  },
  {
    targetId: 'nb-explore',
    title: 'Explore',
    desc: 'Discover ATS AI initiatives transforming the title & escrow industry.',
  },
  {
    targetId: 'nb-activities',
    title: 'Activities',
    desc: 'Earn points by completing trivia, challenges, and touchpoints. Climb the leaderboard!',
  },
  {
    targetId: 'owl-fab',
    title: 'Agent X',
    desc: "Your AI summit companion. Ask anything: sessions, points, ATS initiatives.",
  },
];

interface SpotRect { cx: number; cy: number; r: number; }

export default function TourPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [spotRect, setSpotRect] = useState<SpotRect | null>(null);
  const [tooltipBelow, setTooltipBelow] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  useEffect(() => {
    updateSpot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function updateSpot() {
    const el = document.getElementById(TOUR_STEPS[step].targetId);
    if (!el) {
      setSpotRect(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const r = Math.max(rect.width, rect.height) / 2 + 18;
    setSpotRect({ cx, cy, r });
    // Position tooltip: above if target is in bottom half of screen
    setTooltipBelow(cy < window.innerHeight / 2);
  }

  function goNext() {
    if (isLast) {
      router.replace('/home');
    } else {
      setStep((s) => s + 1);
    }
  }

  function goBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  function skipTour() {
    router.replace('/home');
  }

  const tooltipY = spotRect
    ? tooltipBelow
      ? spotRect.cy + spotRect.r + 18
      : spotRect.cy - spotRect.r - 18 - 140
    : (typeof window !== 'undefined' ? window.innerHeight : 600) / 2 - 70;

  return (
    <>
      <style>{`
        .tour-overlay {
          position: fixed; inset: 0; z-index: 500;
          pointer-events: all;
        }
        .tour-svg {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
        }
        /* Tooltip */
        .tour-tooltip {
          position: fixed;
          left: 24px; right: 24px;
          background: var(--surface);
          border-radius: var(--r-lg);
          padding: 20px;
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--border-metal);
          z-index: 501;
          transition: top .25s cubic-bezier(.4,0,.2,1);
        }
        .tour-step-chip {
          display: inline-flex; align-items: center;
          font-size: 11px; font-weight: 800;
          letter-spacing: .08em; text-transform: uppercase;
          color: var(--blue); margin-bottom: 8px;
        }
        .tour-title {
          font-family: 'Sora', sans-serif;
          font-size: 20px; font-weight: 700; color: var(--t);
          margin-bottom: 6px; letter-spacing: -.02em;
        }
        .tour-desc { font-size: 15px; color: var(--t2); line-height: 1.5; margin-bottom: 18px; }
        .tour-dots {
          display: flex; gap: 5px; margin-bottom: 16px;
        }
        .tour-dot {
          height: 6px; border-radius: 3px;
          background: var(--border-metal);
          transition: all .2s;
        }
        .tour-dot.active { background: var(--blue); width: 20px; }
        .tour-dot:not(.active) { width: 6px; }
        .tour-actions {
          display: flex; align-items: center; justify-content: space-between;
        }
        .tour-btn-back {
          font-size: 15px; font-weight: 600; color: var(--t3);
          background: none; border: none; cursor: pointer;
          padding: 8px; border-radius: 8px; font-family: inherit;
        }
        .tour-btn-back:disabled { opacity: .35; }
        .tour-btn-next {
          height: 46px; padding: 0 22px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--blue-mid), var(--blue));
          color: #fff; font-size: 15px; font-weight: 700;
          font-family: 'Sora', sans-serif;
          border: none; cursor: pointer;
          box-shadow: var(--shadow-blue);
        }
        .tour-skip {
          position: fixed; top: calc(14px + env(safe-area-inset-top, 0px)); right: 18px;
          z-index: 502;
          font-size: 14px; font-weight: 600; color: rgba(255,255,255,.70);
          background: rgba(8,24,64,.30);
          border: 1px solid rgba(255,255,255,.18);
          border-radius: 20px; padding: 8px 16px;
          cursor: pointer; backdrop-filter: blur(8px);
          font-family: inherit;
        }
      `}</style>

      <div className="tour-overlay" ref={overlayRef}>
        {/* SVG mask with spotlight cutout */}
        <svg className="tour-svg" preserveAspectRatio="xMidYMid slice">
          <defs>
            <mask id="tourMask">
              <rect width="100%" height="100%" fill="white" />
              {spotRect && (
                <circle cx={spotRect.cx} cy={spotRect.cy} r={spotRect.r} fill="black" />
              )}
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(8,24,64,.78)" mask="url(#tourMask)" />
          {spotRect && (
            <circle
              cx={spotRect.cx} cy={spotRect.cy} r={spotRect.r + 2}
              fill="none" stroke="rgba(255,255,255,.30)" strokeWidth="1.5"
            />
          )}
        </svg>

        {/* Skip */}
        <button className="tour-skip" onClick={skipTour}>Skip tour</button>

        {/* Tooltip */}
        {current && (
          <div className="tour-tooltip" style={{ top: tooltipY }}>
            <div className="tour-step-chip">Step {step + 1} of {TOUR_STEPS.length}</div>
            <div className="tour-title">{current.title}</div>
            <div className="tour-desc">{current.desc}</div>
            <div className="tour-dots">
              {TOUR_STEPS.map((_, i) => (
                <span key={i} className={`tour-dot${i === step ? ' active' : ''}`} />
              ))}
            </div>
            <div className="tour-actions">
              <button className="tour-btn-back" onClick={goBack} disabled={step === 0}>← Back</button>
              <button className="tour-btn-next" onClick={goNext}>
                {isLast ? 'Done →' : 'Next →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
