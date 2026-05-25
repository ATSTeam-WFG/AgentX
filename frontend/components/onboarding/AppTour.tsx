'use client';

import { useState, useEffect, useCallback } from 'react';

const TOUR_STEPS = [
  { tab: 'nb-home',       title: 'Home',       desc: 'Your summit hub — live sessions, what\'s happening now, and your daily overview.' },
  { tab: 'nb-agenda',     title: 'Agenda',     desc: 'Full 3-day schedule. Tap any session for details, location, and feedback.' },
  { tab: 'nb-explore',    title: 'Explore',    desc: 'Discover sponsors, ask Agent X anything, and navigate the summit.' },
  { tab: 'nb-activities', title: 'Activities', desc: 'Earn points through trivia, avatar creation, prompts, and more.' },
  { tab: 'nb-profile',    title: 'Profile',    desc: 'Your points, leaderboard rank, and summit badge all in one place.' },
] as const;

interface SpotlightRect { top: number; left: number; width: number; height: number; }

interface Props {
  onComplete: () => void;
}

export default function AppTour({ onComplete }: Props) {
  const [step, setStep]         = useState(0);
  const [spotlight, setSpot]    = useState<SpotlightRect | null>(null);

  const positionSpotlight = useCallback((tabId: string) => {
    const el = document.getElementById(tabId);
    if (!el) return;
    const r = el.getBoundingClientRect();
    setSpot({ top: r.top - 5, left: r.left - 5, width: r.width + 10, height: r.height + 10 });
  }, []);

  useEffect(() => {
    const { tab } = TOUR_STEPS[step];
    positionSpotlight(tab);
    const obs = new ResizeObserver(() => positionSpotlight(tab));
    obs.observe(document.documentElement);
    return () => obs.disconnect();
  }, [step, positionSpotlight]);

  function handleNext() {
    if (step < TOUR_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      onComplete();
    }
  }

  const current = TOUR_STEPS[step];
  const isLast  = step === TOUR_STEPS.length - 1;

  return (
    <>
      <style>{`
        .tour-overlay {
          position: fixed; inset: 0; z-index: 500; pointer-events: all;
        }
        .tour-backdrop {
          position: absolute; inset: 0;
          background: transparent;
        }
        .tour-spotlight {
          position: fixed;
          border-radius: 14px;
          box-shadow:
            0 0 0 3000px rgba(14,22,38,.82),
            0 0 0 2.5px rgba(227,149,72,.65),
            0 0 0 6px rgba(227,149,72,.22),
            0 0 30px rgba(227,149,72,.45);
          transition: top .36s cubic-bezier(.4,0,.2,1),
                      left .36s cubic-bezier(.4,0,.2,1),
                      width .36s cubic-bezier(.4,0,.2,1),
                      height .36s cubic-bezier(.4,0,.2,1);
          pointer-events: none; z-index: 501;
        }
        .tour-card {
          position: fixed;
          bottom: calc(var(--nav-h, 64px) + env(safe-area-inset-bottom, 0px) + 20px);
          left: 20px; right: 20px;
          background: var(--metallic);
          border-radius: 22px;
          border-top: 2px solid rgba(227,149,72,.45);
          box-shadow: 0 12px 50px rgba(0,0,0,.50), 0 0 0 1px rgba(255,255,255,.15);
          padding: 20px 20px 18px;
          z-index: 502;
          animation: tourCardIn .30s cubic-bezier(.34,1.56,.64,1) both;
        }
        @keyframes tourCardIn {
          from { opacity: 0; transform: translateY(16px) scale(.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .tour-card-header {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;
        }
        .tour-owl-row { display: flex; align-items: center; gap: 8px; }
        .tour-owl-circle {
          width: 40px; height: 40px; border-radius: 50%; overflow: hidden;
          background: rgba(227,149,72,.12); border: 1.5px solid rgba(227,149,72,.30);
          flex-shrink: 0;
        }
        .tour-owl-circle img { width: 100%; height: 100%; object-fit: cover; }
        .tour-agent-label {
          font-family: 'Sora', sans-serif;
          font-size: 11px; font-weight: 700; letter-spacing: .08em;
          color: #E39548; text-transform: uppercase;
        }
        .tour-step-indicator {
          font-family: 'Sora', sans-serif;
          font-size: 11px; font-weight: 700;
          color: rgba(204,222,231,.45); letter-spacing: .04em;
        }
        .tour-title {
          font-family: 'Sora', sans-serif;
          font-size: 22px; font-weight: 700; color: #1C283C;
          margin-bottom: 8px;
        }
        .tour-desc {
          font-size: 16px; color: #4a6080; line-height: 1.55; margin-bottom: 18px;
        }
        .tour-dots {
          display: flex; gap: 6px; align-items: center; margin-bottom: 18px;
        }
        .tour-dot {
          height: 6px; width: 6px; border-radius: 3px;
          background: rgba(28,40,60,.14);
          transition: width .25s, background .25s;
        }
        .tour-dot.active { width: 20px; background: #E39548; border-radius: 3px; }
        .tour-btn-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .tour-skip-btn {
          background: none; border: none; cursor: pointer; padding: 8px 0;
          font-size: 14px; color: rgba(28,40,60,.35); font-family: inherit;
        }
        .tour-next-btn {
          height: 48px; border-radius: 12px; padding: 0 24px;
          background: #1C283C; color: #E39548;
          font-size: 15px; font-weight: 700; font-family: 'Sora', sans-serif;
          border: 1px solid rgba(227,149,72,.18); cursor: pointer;
          box-shadow: 0 2px 12px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.04);
          transition: background .15s;
        }
        .tour-next-btn:hover { background: #243352; }
      `}</style>

      <div className="tour-overlay">
        <div className="tour-backdrop" onClick={onComplete} />

        {spotlight && (
          <div
            className="tour-spotlight"
            style={{
              top: spotlight.top,
              left: spotlight.left,
              width: spotlight.width,
              height: spotlight.height,
            }}
          />
        )}

        <div className="tour-card" key={step}>
          <div className="tour-card-header">
            <div className="tour-owl-row">
              <div className="tour-owl-circle">
                <img src="/AgentX.png" alt="Agent X" />
              </div>
              <span className="tour-agent-label">Agent X</span>
            </div>
            <span className="tour-step-indicator">Step {step + 1} of {TOUR_STEPS.length}</span>
          </div>

          <div className="tour-title">{current.title}</div>
          <div className="tour-desc">{current.desc}</div>

          <div className="tour-dots">
            {TOUR_STEPS.map((_, i) => (
              <div key={i} className={`tour-dot${i === step ? ' active' : ''}`} />
            ))}
          </div>

          <div className="tour-btn-row">
            <button className="tour-skip-btn" onClick={onComplete}>Skip</button>
            <button className="tour-next-btn" onClick={handleNext}>
              {isLast ? 'Get Started' : 'Next'} →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
