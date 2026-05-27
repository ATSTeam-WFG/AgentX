'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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

  const [name, setName]     = useState('');
  const [email, setEmail]   = useState('');
  const [role, setRole]     = useState<RoleType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

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
          padding: 0;
          overflow: hidden;
        }
        .onboard-scroll {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 0 24px 140px;
          overscroll-behavior: contain;
        }
        .onboard-logo {
          display: flex;
          justify-content: center;
          padding: 40px 0 24px;
        }
        .onboard-heading {
          font-family: 'Sora', sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: #CCDEE7;
          letter-spacing: -.025em;
          margin: 0 0 8px;
        }
        .onboard-sub {
          font-size: 17px;
          color: var(--t2);
          margin: 0 0 28px;
          line-height: 1.45;
        }
        .field-group { margin-bottom: 20px; }
        .input-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: var(--steel);
          letter-spacing: .04em;
          text-transform: uppercase;
          margin-bottom: 7px;
        }
        .input-field {
          width: 100%;
          background: var(--surface);
          border: 1.5px solid var(--border-metal);
          border-radius: 12px;
          padding: 13px 16px;
          font-size: 16px;
          color: #1C283C;
          outline: none;
          font-family: 'DM Sans', sans-serif;
          transition: border-color var(--tr), box-shadow var(--tr);
        }
        .input-field::placeholder { color: var(--t4); }
        .input-field:focus {
          border-color: var(--cyan);
          box-shadow: 0 0 0 3px var(--cyan-s);
        }
        .role-label {
          font-size: 14px;
          font-weight: 700;
          color: var(--steel);
          letter-spacing: .04em;
          text-transform: uppercase;
          margin: 24px 0 10px;
        }
        .role-pill {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 14px 18px;
          border-radius: 14px;
          border: 1.5px solid var(--border-metal);
          background: var(--surface);
          margin-bottom: 10px;
          cursor: pointer;
          transition: all var(--tr);
          text-align: left;
        }
        .role-pill.sel {
          background: linear-gradient(135deg, rgba(29,77,217,.08), rgba(6,182,212,.06));
          border-color: var(--blue);
          box-shadow: inset 0 0 0 1px rgba(29,77,217,.15), 0 2px 10px rgba(29,77,217,.10);
        }
        .role-pill-title {
          font-size: 18px;
          font-weight: 700;
          color: #1C283C;
          line-height: 1.2;
        }
        .role-pill.sel .role-pill-title { color: var(--blue); }
        .error-msg {
          font-size: 14px;
          color: var(--rose);
          margin: 8px 0 0;
        }
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
          gap: 8px;
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
        .step-dot.active {
          width: 22px;
          background: var(--blue);
        }
        .step-dot:not(.active) { width: 6px; }
      `}</style>

      <div className="onboard-page">
        <div className="onboard-scroll">
          <div className="onboard-logo">
            <Image src="/ES26logo.png" alt="ES 26" width={120} height={48} style={{ objectFit: 'contain', mixBlendMode: 'screen' }} />
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
