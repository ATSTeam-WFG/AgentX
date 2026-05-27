'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users2, Trophy, Bot, TrendingUp, Award, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const INTERESTS = [
  { id: 'networking',   icon: Users2,      label: 'Networking & Connections' },
  { id: 'leadership',  icon: Trophy,      label: 'Leadership & Growth' },
  { id: 'technology',  icon: Bot,         label: 'AI & Technology' },
  { id: 'business',    icon: TrendingUp,  label: 'Business Strategy' },
  { id: 'recognition', icon: Award,       label: 'Recognition & Awards' },
];

export default function InterestsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading]   = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      await apiFetch('/v1/me', {
        method: 'PATCH',
        body: JSON.stringify({ onboardingInterests: Array.from(selected) }),
      });
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
      localStorage.removeItem('tour_done');
      router.push('/home');
    }
  }

  return (
    <>
      <style>{`
        .onboard-page {
          position: fixed; inset: 0;
          display: flex; flex-direction: column;
          background: var(--bg);
          overflow: hidden;
        }
        .onboard-page::before {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse 80% 50% at 50% -10%, rgba(42,92,212,.22), transparent 55%);
          z-index: 0;
        }
        .onboard-scroll {
          flex: 1; position: relative; z-index: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: calc(36px + env(safe-area-inset-top, 0px)) 24px 140px;
          overscroll-behavior: contain;
        }
        /* ── Headings ── */
        .onboard-heading {
          font-family: 'Sora', sans-serif;
          font-size: 26px; font-weight: 700;
          color: #CCDEE7; letter-spacing: -.02em;
          margin: 0 0 8px; line-height: 1.25;
        }
        .onboard-sub {
          font-size: 16px; color: rgba(204,222,231,.55);
          margin: 0 0 24px;
        }
        /* ── Interest cards ── */
        .interest-card {
          width: 100%;
          display: flex; align-items: center;
          gap: 14px; padding: 13px 18px;
          border-radius: 14px;
          border: 1.5px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.05);
          margin-bottom: 10px;
          cursor: pointer;
          transition: all .2s cubic-bezier(.4,0,.2,1);
          text-align: left; position: relative;
        }
        .interest-card:active { transform: scale(.985); }
        .interest-card.sel {
          background: rgba(227,149,72,.10);
          border-color: var(--amber);
          box-shadow: 0 0 0 1px rgba(227,149,72,.15), 0 4px 20px rgba(227,149,72,.08);
        }
        /* ── Icon box ── */
        .interest-icon {
          width: 44px; height: 44px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,.08);
          border-radius: 12px; flex-shrink: 0;
          color: rgba(204,222,231,.65);
          transition: all .2s;
        }
        .interest-card.sel .interest-icon {
          background: rgba(227,149,72,.15);
          color: var(--amber);
        }
        /* ── Label ── */
        .interest-label {
          font-size: 17px; font-weight: 600;
          color: rgba(204,222,231,.80);
          flex: 1;
        }
        .interest-card.sel .interest-label { color: var(--amber); }
        /* ── Checkmark ── */
        .interest-check {
          color: var(--amber);
          opacity: 0; transition: opacity .2s; flex-shrink: 0;
        }
        .interest-card.sel .interest-check { opacity: 1; }
        /* ── CTA bar ── */
        .onboard-cta-wrap {
          position: fixed; bottom: 0; left: 0; right: 0;
          padding: 16px 24px calc(20px + env(safe-area-inset-bottom, 0px));
          background: linear-gradient(180deg, transparent 0%, var(--bg) 38%);
          z-index: 2;
        }
        .btn-onboard {
          width: 100%; height: 54px; border-radius: 14px;
          background: var(--amber); color: #1C283C;
          font-size: 17px; font-weight: 700;
          font-family: 'Sora', sans-serif;
          border: none; cursor: pointer;
          box-shadow: 0 4px 20px rgba(227,149,72,.35);
          transition: opacity .15s, transform .15s;
          display: flex; align-items: center; justify-content: center;
        }
        .btn-onboard:active { opacity: .88; transform: scale(.98); }
        .btn-onboard:disabled { opacity: .45; cursor: not-allowed; }
        /* ── Step dots ── */
        .step-dots-row {
          display: flex; justify-content: center; gap: 6px; margin-top: 14px;
        }
        .step-dot {
          height: 6px; border-radius: 3px;
          background: rgba(255,255,255,.18); transition: all .2s;
        }
        .step-dot.active { width: 22px; background: var(--amber); }
        .step-dot:not(.active) { width: 6px; }
      `}</style>

      <div className="onboard-page">
        <div className="onboard-scroll">
          <h2 className="onboard-heading">What are you most looking forward to at the summit?</h2>
          <p className="onboard-sub">Pick as many as you like.</p>

          {INTERESTS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              className={`interest-card${selected.has(id) ? ' sel' : ''}`}
              onClick={() => toggle(id)}
              type="button"
            >
              <span className="interest-icon">
                <Icon size={22} strokeWidth={1.8} />
              </span>
              <span className="interest-label">{label}</span>
              <span className="interest-check">
                <CheckCircle2 size={18} strokeWidth={2} />
              </span>
            </button>
          ))}
        </div>

        <div className="onboard-cta-wrap">
          <button
            className="btn-onboard"
            onClick={handleSubmit}
            disabled={loading}
            type="button"
          >
            {loading ? 'Saving…' : 'Enter Summit →'}
          </button>
          <div className="step-dots-row">
            <span className="step-dot" />
            <span className="step-dot active" />
          </div>
        </div>
      </div>
    </>
  );
}
