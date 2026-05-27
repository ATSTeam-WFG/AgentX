'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users2, Trophy, Bot, TrendingUp, Leaf, Award, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const INTERESTS = [
  { id: 'networking',   icon: Users2,      label: 'Networking & Connections' },
  { id: 'leadership',  icon: Trophy,      label: 'Leadership & Growth' },
  { id: 'technology',  icon: Bot,         label: 'AI & Technology' },
  { id: 'business',    icon: TrendingUp,  label: 'Business Strategy' },
  { id: 'wellness',    icon: Leaf,        label: 'Wellness & Balance' },
  { id: 'recognition', icon: Award,       label: 'Recognition & Awards' },
];

export default function InterestsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

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
        .onboard-scroll {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 40px 24px 140px;
          overscroll-behavior: contain;
        }
        .onboard-heading {
          font-family: 'Sora', sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: #CCDEE7;
          letter-spacing: -.025em;
          margin: 0 0 8px;
          line-height: 1.2;
        }
        .onboard-sub {
          font-size: 17px;
          color: var(--t2);
          margin: 0 0 28px;
        }
        .interest-card {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 18px;
          border-radius: 14px;
          border: 1.5px solid var(--border-metal);
          background: var(--surface);
          margin-bottom: 10px;
          cursor: pointer;
          transition: all var(--tr);
          text-align: left;
          position: relative;
        }
        .interest-card.sel {
          background: linear-gradient(135deg, rgba(29,77,217,.08), rgba(6,182,212,.06));
          border-color: var(--blue);
          box-shadow: inset 0 0 0 1px rgba(29,77,217,.15), 0 2px 10px rgba(29,77,217,.08);
        }
        .interest-icon {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--surface2);
          border-radius: 12px;
          flex-shrink: 0;
          color: #1C283C;
          transition: all var(--tr);
        }
        .interest-card.sel .interest-icon {
          background: var(--blue-lt);
          color: var(--blue);
        }
        .interest-label {
          font-size: 17px;
          font-weight: 600;
          color: #1C283C;
          flex: 1;
        }
        .interest-card.sel .interest-label { color: var(--blue); }
        .interest-check {
          color: var(--blue);
          opacity: 0;
          transition: opacity var(--tr);
          flex-shrink: 0;
        }
        .interest-card.sel .interest-check { opacity: 1; }
        .onboard-cta-wrap {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          padding: 16px 24px calc(16px + env(safe-area-inset-bottom, 0px));
          background: linear-gradient(180deg, transparent 0%, var(--bg) 40%);
        }
        .btn-onboard {
          width: 100%;
          height: 54px;
          border-radius: 14px;
          background: var(--blue);
          color: #fff;
          font-size: 17px;
          font-weight: 700;
          font-family: 'Sora', sans-serif;
          border: none;
          cursor: pointer;
          box-shadow: var(--shadow-blue);
          transition: opacity var(--tr), transform var(--tr);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-onboard:active { opacity: .85; transform: scale(.98); }
        .btn-onboard:disabled { opacity: .5; cursor: not-allowed; }
        .step-dots-row {
          display: flex;
          justify-content: center;
          gap: 6px;
          margin-top: 14px;
        }
        .step-dot {
          height: 6px;
          border-radius: 3px;
          background: var(--border-metal);
          transition: all var(--tr);
        }
        .step-dot.active { width: 22px; background: var(--blue); }
        .step-dot:not(.active) { width: 6px; }
      `}</style>

      <div className="onboard-page">
        <div className="onboard-scroll">
          <h2 className="onboard-heading">What are you most looking<br />forward to at the Executive Summit 2026?</h2>
          <p className="onboard-sub">Select all that apply.</p>

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
            {loading ? 'Saving...' : 'Looks good'}
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
