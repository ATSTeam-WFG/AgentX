'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

const CATEGORIES = ['App Experience', 'Session Content', 'Venue & Logistics', 'Other'] as const;
type Category = typeof CATEGORIES[number];

type Status = 'idle' | 'submitting' | 'done' | 'error';

export default function FeedbackPage() {
  const router = useRouter();
  const [category, setCategory] = useState<Category | null>(null);
  const [text, setText]         = useState('');
  const [status, setStatus]     = useState<Status>('idle');

  async function handleSubmit() {
    if (!category || !text.trim()) return;
    setStatus('submitting');
    try {
      await apiFetch('/v1/feedback', {
        method: 'POST',
        body: JSON.stringify({ category, text: text.trim() }),
      });
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  return (
    <>
      <style>{`
        .fb-page {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          overflow: hidden; background: var(--bg);
        }
        .fb-scroll {
          flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
          padding: 20px 20px calc(40px + var(--nav-h) + env(safe-area-inset-bottom, 0px));
          overscroll-behavior: contain;
        }
        .back-btn {
          display: flex; align-items: center; gap: 6px; width: 100%;
          font-size: 15px; font-weight: 600; color: var(--amber);
          background: var(--bg); border: none; cursor: pointer;
          padding: 10px 0 8px; margin-bottom: 8px;
          position: sticky; top: 0; z-index: 10;
        }
        .fb-heading {
          font-family: 'Sora', sans-serif;
          font-size: 26px; font-weight: 700;
          color: #CCDEE7; letter-spacing: -.02em;
          margin: 0 0 6px;
        }
        .fb-sub {
          font-size: 15px; color: rgba(204,222,231,.50);
          margin: 0 0 28px; line-height: 1.55;
        }
        /* ── Category pills ── */
        .fb-label {
          font-size: 11px; font-weight: 800; letter-spacing: .10em;
          text-transform: uppercase; color: rgba(204,222,231,.45);
          margin-bottom: 12px;
        }
        .fb-cats {
          display: flex; flex-wrap: wrap; gap: 8px;
          margin-bottom: 24px;
        }
        .fb-cat {
          padding: 9px 18px; border-radius: 24px;
          border: 1.5px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.05);
          font-size: 14px; font-weight: 600;
          color: rgba(204,222,231,.70);
          cursor: pointer; transition: all .18s ease;
          font-family: inherit;
        }
        .fb-cat:active { transform: scale(.97); }
        .fb-cat.sel {
          background: rgba(227,149,72,.12);
          border-color: var(--amber);
          color: var(--amber);
          box-shadow: 0 0 0 1px rgba(227,149,72,.12);
        }
        /* ── Textarea ── */
        .fb-textarea-wrap { margin-bottom: 6px; }
        .fb-textarea {
          width: 100%; min-height: 140px;
          background: rgba(255,255,255,.06);
          border: 1.5px solid rgba(255,255,255,.10);
          border-radius: 14px;
          padding: 16px; resize: none; outline: none;
          font-size: 16px; color: rgba(204,222,231,.90);
          font-family: 'DM Sans', sans-serif;
          line-height: 1.6;
          transition: border-color .18s, box-shadow .18s;
        }
        .fb-textarea::placeholder { color: rgba(204,222,231,.30); }
        .fb-textarea:focus {
          border-color: var(--amber);
          box-shadow: 0 0 0 3px rgba(227,149,72,.10);
        }
        .fb-textarea:disabled { opacity: .5; }
        /* ── Submit ── */
        .fb-submit-wrap { margin-top: 20px; }
        .btn-fb-submit {
          width: 100%; height: 54px; border-radius: 14px;
          background: var(--amber); color: #1C283C;
          font-size: 17px; font-weight: 700;
          font-family: 'Sora', sans-serif;
          border: none; cursor: pointer;
          box-shadow: 0 4px 20px rgba(227,149,72,.32);
          transition: opacity .15s, transform .15s;
          display: flex; align-items: center; justify-content: center;
        }
        .btn-fb-submit:active { opacity: .88; transform: scale(.98); }
        .btn-fb-submit:disabled { opacity: .40; cursor: not-allowed; }
        .fb-error {
          margin-top: 10px; font-size: 14px;
          color: var(--rose); text-align: center;
        }
        /* ── Success state ── */
        .fb-success {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 80px 28px 40px;
          gap: 14px; text-align: center;
          min-height: 60vh;
        }
        .fb-success-check {
          width: 72px; height: 72px;
          border-radius: 50%;
          background: rgba(227,149,72,.12);
          border: 2px solid rgba(227,149,72,.30);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 8px;
        }
        .fb-success-title {
          font-family: 'Sora', sans-serif;
          font-size: 28px; font-weight: 700;
          color: #CCDEE7; letter-spacing: -.02em;
        }
        .fb-success-note {
          font-size: 16px; color: rgba(204,222,231,.50);
          line-height: 1.55; max-width: 280px;
        }
      `}</style>

      <div className="fb-page">
        <div className="fb-scroll">
          <button className="back-btn" onClick={() => router.back()}>‹ Profile</button>

          {status === 'done' ? (
            <div className="fb-success">
              <div className="fb-success-check">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E39548" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
              <div className="fb-success-title">Thank you</div>
              <div className="fb-success-note">Your feedback helps shape the summit experience.</div>
            </div>
          ) : (
            <>
              <h1 className="fb-heading">Share Feedback</h1>
              <p className="fb-sub">A few minutes helps us make next year even better.</p>

              <div className="fb-label">Category</div>
              <div className="fb-cats">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    className={`fb-cat${category === cat ? ' sel' : ''}`}
                    onClick={() => setCategory(cat)}
                    type="button"
                    disabled={status === 'submitting'}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="fb-label">Your Feedback</div>
              <div className="fb-textarea-wrap">
                <textarea
                  className="fb-textarea"
                  placeholder="What's on your mind…"
                  value={text}
                  onChange={(e) => { setText(e.target.value); if (status === 'error') setStatus('idle'); }}
                  disabled={status === 'submitting'}
                />
              </div>

              <div className="fb-submit-wrap">
                <button
                  className="btn-fb-submit"
                  onClick={handleSubmit}
                  disabled={!category || !text.trim() || status === 'submitting'}
                  type="button"
                >
                  {status === 'submitting' ? 'Sending…' : 'Submit Feedback'}
                </button>
                {status === 'error' && (
                  <div className="fb-error">Something went wrong. Try again.</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
