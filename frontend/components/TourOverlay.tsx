'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'agentx_tour_done';

const STEPS = [
  {
    targetId: 'nb-home',
    title: 'Home',
    desc: 'Your summit hub — greeting, sponsor, and what\'s coming up.',
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
    desc: 'Your AI summit companion — tap the owl anytime to ask about sessions, points, or ATS initiatives.',
  },
];

interface Spot { cx: number; cy: number; r: number; }

export default function TourOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [spot, setSpot] = useState<Spot | null>(null);

  const measureSpot = useCallback((stepIdx: number) => {
    const el = document.getElementById(STEPS[stepIdx].targetId);
    if (!el) { setSpot(null); return; }
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const r = Math.max(rect.width, rect.height) / 2 + 20;
    setSpot({ cx, cy, r });
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    // Small delay lets layout paint before measuring
    const t = setTimeout(() => measureSpot(step), 60);
    return () => clearTimeout(t);
  }, [visible, step, measureSpot]);

  // Re-measure on resize
  useEffect(() => {
    if (!visible) return;
    const handler = () => measureSpot(step);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [visible, step, measureSpot]);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  function goNext() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }

  function goBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // Card sits above the spotlight — if spot is in bottom half, card goes above it
  const cardBottom = spot
    ? (window.innerHeight - (spot.cy - spot.r - 12))
    : 90;

  return (
    <>
      <style>{`
        .tour-ov-svg {
          position: fixed; inset: 0;
          width: 100%; height: 100%;
          z-index: 400;
          pointer-events: all;
        }
        .tour-ov-ring {
          fill: none;
          stroke: rgba(255,255,255,.55);
          stroke-width: 2;
          pointer-events: none;
        }
        .tour-ov-card {
          position: fixed;
          left: 16px; right: 16px;
          background: #fff;
          border-radius: 20px;
          padding: 22px 20px 18px;
          box-shadow: 0 8px 40px rgba(8,24,64,.22), 0 2px 8px rgba(8,24,64,.10);
          z-index: 401;
          pointer-events: all;
          transition: bottom .25s cubic-bezier(.4,0,.2,1);
        }
        .tour-ov-dots {
          display: flex;
          gap: 5px;
          margin-bottom: 14px;
        }
        .tour-ov-dot {
          height: 6px;
          border-radius: 3px;
          transition: all .2s;
        }
        .tour-ov-dot.active {
          width: 22px;
          background: var(--blue);
        }
        .tour-ov-dot:not(.active) {
          width: 6px;
          background: #d0d8ec;
        }
        .tour-ov-step {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: var(--blue);
          margin-bottom: 8px;
        }
        .tour-ov-title {
          font-family: 'Sora', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: var(--t);
          margin-bottom: 8px;
          letter-spacing: -.02em;
        }
        .tour-ov-desc {
          font-size: 15px;
          color: var(--t3);
          line-height: 1.5;
          margin-bottom: 20px;
        }
        .tour-ov-btns {
          display: flex;
          gap: 10px;
          margin-bottom: 14px;
        }
        .tour-ov-back {
          flex: 1;
          height: 50px;
          border-radius: 14px;
          background: none;
          border: 1.5px solid var(--border-metal);
          font-size: 16px;
          font-weight: 600;
          color: var(--t3);
          cursor: pointer;
          font-family: inherit;
          transition: background var(--tr);
        }
        .tour-ov-back:disabled { opacity: .35; }
        .tour-ov-back:not(:disabled):active { background: var(--bg2); }
        .tour-ov-next {
          flex: 1;
          height: 50px;
          border-radius: 14px;
          background: var(--blue);
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          font-family: 'Sora', sans-serif;
          border: none;
          cursor: pointer;
          box-shadow: var(--shadow-blue);
          transition: opacity var(--tr);
        }
        .tour-ov-next:active { opacity: .88; }
        .tour-ov-skip {
          display: block;
          width: 100%;
          text-align: center;
          font-size: 14px;
          font-weight: 600;
          color: var(--t4);
          background: none;
          border: none;
          cursor: pointer;
          font-family: inherit;
          padding: 4px 0;
        }
        .tour-ov-skip:active { color: var(--t3); }
      `}</style>

      {/* SVG overlay with mask cutout */}
      <svg className="tour-ov-svg" onClick={dismiss}>
        <defs>
          <mask id="tourSpotMask">
            <rect width="100%" height="100%" fill="white" />
            {spot && (
              <circle cx={spot.cx} cy={spot.cy} r={spot.r} fill="black" />
            )}
          </mask>
        </defs>
        <rect
          width="100%" height="100%"
          fill="rgba(8,24,64,.72)"
          mask="url(#tourSpotMask)"
        />
        {spot && (
          <circle
            className="tour-ov-ring"
            cx={spot.cx} cy={spot.cy} r={spot.r + 3}
          />
        )}
      </svg>

      {/* Tooltip card */}
      <div
        className="tour-ov-card"
        style={{ bottom: cardBottom }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tour-ov-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`tour-ov-dot${i === step ? ' active' : ''}`} />
          ))}
        </div>
        <div className="tour-ov-step">Step {step + 1} of {STEPS.length}</div>
        <div className="tour-ov-title">{current.title}</div>
        <div className="tour-ov-desc">{current.desc}</div>
        <div className="tour-ov-btns">
          <button className="tour-ov-back" onClick={goBack} disabled={step === 0}>Back</button>
          <button className="tour-ov-next" onClick={goNext}>
            {isLast ? 'Done' : 'Next'}
          </button>
        </div>
        <button className="tour-ov-skip" onClick={dismiss}>Skip tour</button>
      </div>
    </>
  );
}
