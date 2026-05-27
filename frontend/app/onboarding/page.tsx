'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signup } from '@/lib/api/auth';
import { useAuthStore } from '@/store/auth';

type RoleType = 'title_agent' | 'wfg_employee' | 'guest';

const ROLES: { id: RoleType; title: string }[] = [
  { id: 'title_agent',   title: 'Title Agent / Real Estate Services' },
  { id: 'wfg_employee',  title: 'WFG Employee' },
  { id: 'guest',         title: 'Guest' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [role, setRole]       = useState<RoleType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleContinue() {
    if (!name.trim() || !email.trim() || !role) {
      setError('Please fill in all fields and select your role.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await signup(name.trim(), email.trim());
      setAuth(res.user, res.token);
      router.push('/onboarding/interests');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
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
          padding: 0 24px 140px;
          overscroll-behavior: contain;
        }
        /* ── Logo area ── */
        .onboard-logo {
          display: flex; flex-direction: column;
          align-items: center;
          padding: calc(36px + env(safe-area-inset-top, 0px)) 0 28px;
          gap: 8px;
        }
        .onboard-logo-img {
          height: 52px; width: 52px;
          object-fit: cover;
          mix-blend-mode: screen;
          border-radius: 16px;
        }
        .onboard-logo-sub {
          font-family: 'Sora', sans-serif;
          font-size: 11px; font-weight: 700; letter-spacing: .18em;
          text-transform: uppercase; color: rgba(204,222,231,.38);
        }
        /* ── Headings ── */
        .onboard-heading {
          font-family: 'Sora', sans-serif;
          font-size: 28px; font-weight: 700;
          color: #CCDEE7; letter-spacing: -.025em;
          margin: 0 0 8px;
        }
        .onboard-sub {
          font-size: 16px; color: rgba(204,222,231,.55);
          margin: 0 0 28px; line-height: 1.5;
        }
        /* ── Input fields ── */
        .field-group { margin-bottom: 18px; }
        .input-label {
          display: block;
          font-size: 12px; font-weight: 700;
          color: rgba(204,222,231,.45);
          letter-spacing: .08em; text-transform: uppercase;
          margin-bottom: 8px;
        }
        .input-field {
          width: 100%;
          background: rgba(255,255,255,.92);
          border: 1.5px solid rgba(255,255,255,.20);
          border-radius: 12px;
          padding: 14px 16px;
          font-size: 16px; color: #1C283C;
          outline: none;
          font-family: 'DM Sans', sans-serif;
          transition: border-color .2s, box-shadow .2s;
        }
        .input-field::placeholder { color: #9aafc0; }
        .input-field:focus {
          border-color: var(--amber);
          box-shadow: 0 0 0 3px rgba(227,149,72,.18);
        }
        /* ── Role pills ── */
        .role-label {
          font-size: 12px; font-weight: 700;
          color: rgba(204,222,231,.45);
          letter-spacing: .08em; text-transform: uppercase;
          margin: 26px 0 10px;
        }
        .role-pill {
          width: 100%;
          display: flex; align-items: center;
          padding: 16px 20px;
          border-radius: 14px;
          border: 1.5px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.05);
          margin-bottom: 10px;
          cursor: pointer;
          transition: all .2s cubic-bezier(.4,0,.2,1);
          text-align: left;
        }
        .role-pill:active { transform: scale(.985); }
        .role-pill.sel {
          background: rgba(227,149,72,.10);
          border-color: var(--amber);
          box-shadow: 0 0 0 1px rgba(227,149,72,.15), 0 4px 20px rgba(227,149,72,.08);
        }
        .role-pill-title {
          font-size: 17px; font-weight: 600;
          color: rgba(204,222,231,.80);
          flex: 1;
        }
        .role-pill.sel .role-pill-title { color: var(--amber); }
        .role-sel-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--amber);
          box-shadow: 0 0 8px rgba(227,149,72,.60);
          flex-shrink: 0;
        }
        /* ── Error ── */
        .error-msg {
          font-size: 14px; color: var(--rose); margin: 8px 0 0;
        }
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
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .btn-onboard:active { opacity: .88; transform: scale(.98); }
        .btn-onboard:disabled { opacity: .45; cursor: not-allowed; }
        /* ── Step dots ── */
        .step-dots-row {
          display: flex; justify-content: center; gap: 6px; margin-top: 14px;
        }
        .step-dot {
          height: 6px; border-radius: 3px;
          background: rgba(255,255,255,.18);
          transition: all .2s;
        }
        .step-dot.active { width: 22px; background: var(--amber); }
        .step-dot:not(.active) { width: 6px; }
      `}</style>

      <div className="onboard-page">
        <div className="onboard-scroll">
          <div className="onboard-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ES26logo.png" alt="ES26" className="onboard-logo-img" />
            <div className="onboard-logo-sub">Executive Summit 2026</div>
          </div>

          <h2 className="onboard-heading">Tell us about you</h2>
          <p className="onboard-sub">Set up your summit profile to get started.</p>

          <div className="field-group">
            <label className="input-label" htmlFor="ob-name">Full Name</label>
            <input
              id="ob-name"
              className="input-field"
              type="text"
              placeholder="e.g. Alex Johnson"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>

          <div className="field-group">
            <label className="input-label" htmlFor="ob-email">Email Address</label>
            <input
              id="ob-email"
              className="input-field"
              type="email"
              placeholder="you@wfgtitle.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
            />
          </div>

          <div className="role-label">I am attending as…</div>
          {ROLES.map(({ id, title }) => (
            <button
              key={id}
              className={`role-pill${role === id ? ' sel' : ''}`}
              onClick={() => setRole(id)}
              type="button"
            >
              <span className="role-pill-title">{title}</span>
              {role === id && <span className="role-sel-dot" />}
            </button>
          ))}

          {error && <p className="error-msg">{error}</p>}
        </div>

        <div className="onboard-cta-wrap">
          <button
            className="btn-onboard"
            onClick={handleContinue}
            disabled={loading}
            type="button"
          >
            {loading ? 'Setting up…' : 'Continue →'}
          </button>
          <div className="step-dots-row">
            <span className="step-dot active" />
            <span className="step-dot" />
          </div>
        </div>
      </div>
    </>
  );
}
