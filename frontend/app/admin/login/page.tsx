'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogin } from '@/lib/api/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      await adminLogin(email, password);
      router.replace('/admin');
    } catch {
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        .al-shell {
          position: fixed; inset: 0;
          display: flex; align-items: center; justify-content: center;
          background: var(--bg); padding: 24px;
          font-family: 'DM Sans', sans-serif;
        }
        .al-card {
          width: 100%; max-width: 380px;
          background: var(--surface);
          border: 1px solid rgba(255,255,255,.30);
          border-radius: var(--r-lg);
          padding: 36px 30px;
          box-shadow: var(--shadow-card);
        }
        .al-eyebrow {
          font-size: 11px; font-weight: 800; letter-spacing: .10em;
          text-transform: uppercase; color: #4a6080; margin-bottom: 6px;
        }
        .al-title {
          font-family: 'Sora', sans-serif;
          font-size: 26px; font-weight: 800; color: #1C283C;
          letter-spacing: -.03em; margin: 0 0 28px;
        }
        .al-label {
          display: block; font-size: 13px; font-weight: 700;
          color: #2A3C52; margin-bottom: 6px;
        }
        .al-input {
          width: 100%; height: 48px;
          background: rgba(28,40,60,.06);
          border: 1.5px solid rgba(28,40,60,.18);
          border-radius: var(--r);
          padding: 0 14px; font-size: 15px; color: #1C283C;
          font-family: inherit; outline: none; margin-bottom: 16px;
          transition: border-color var(--tr), box-shadow var(--tr);
          box-sizing: border-box;
        }
        .al-input::placeholder { color: #7a8eae; }
        .al-input:focus {
          border-color: #2a5cd4;
          box-shadow: 0 0 0 3px rgba(42,92,212,.14);
        }
        .al-btn {
          width: 100%; height: 50px; border-radius: 14px;
          background: linear-gradient(135deg, #3068e8, #2a5cd4);
          color: #fff; font-size: 16px; font-weight: 700;
          font-family: 'Sora', sans-serif;
          border: none; cursor: pointer;
          box-shadow: 0 6px 20px rgba(42,92,212,.38);
          transition: opacity var(--tr); margin-top: 4px;
        }
        .al-btn:disabled { opacity: .5; cursor: not-allowed; }
        .al-error {
          font-size: 13px; color: #ba1818;
          text-align: center; margin-top: 12px; font-weight: 600;
        }
      `}</style>

      <div className="al-shell">
        <div className="al-card">
          <div className="al-eyebrow">AgentX · Internal</div>
          <h1 className="al-title">Admin Login</h1>

          <form onSubmit={handleSubmit}>
            <label className="al-label" htmlFor="email">Email</label>
            <input
              id="email"
              className="al-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@wfg.com"
              disabled={loading}
            />

            <label className="al-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="al-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />

            <button className="al-btn" type="submit" disabled={loading || !email || !password}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {error && <div className="al-error">{error}</div>}
        </div>
      </div>
    </>
  );
}
