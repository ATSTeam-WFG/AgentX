'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { submitGoldenPoints, getGoldenPointsStatus } from '@/lib/api/activities';

type Status = 'idle' | 'submitting' | 'scoring' | 'done' | 'error';
const MIN_WORDS = 50;

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function GoldenPointsPage() {
  const router = useRouter();
  const [text, setText]       = useState('');
  const [status, setStatus]   = useState<Status>('idle');
  const [submissionId, setId] = useState('');
  const [points, setPoints]   = useState(0);
  const [error, setError]     = useState('');
  const wc = wordCount(text);
  const canSubmit = wc >= MIN_WORDS && (status === 'idle' || status === 'error');

  useEffect(() => {
    if (status !== 'scoring' || !submissionId) return;
    const interval = setInterval(async () => {
      try {
        const res = await getGoldenPointsStatus(submissionId);
        if (res.status === 'scored' && res.pointsAwarded != null) {
          setPoints(res.pointsAwarded);
          setStatus('done');
          clearInterval(interval);
        }
      } catch {
        setStatus('error');
        clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [status, submissionId]);

  async function handleSubmit() {
    if (!canSubmit) return;
    setStatus('submitting');
    try {
      const res = await submitGoldenPoints(text, crypto.randomUUID());
      setId(res.id);
      setStatus('scoring');
    } catch {
      setError('Submission failed. Please try again.');
      setStatus('error');
    }
  }

  return (
    <>
      <style>{`
        .gp-page {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .gp-scroll {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 20px 18px calc(20px + var(--nav-h) + env(safe-area-inset-bottom, 0px) + 90px);
          overscroll-behavior: contain;
        }
        .back-btn {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 15px; font-weight: 600; color: var(--blue);
          background: none; border: none; cursor: pointer; margin-bottom: 16px; padding: 0;
        }
        .page-title {
          font-family: 'Sora', sans-serif;
          font-size: 28px; font-weight: 700; color: var(--navy); letter-spacing: -.025em;
          margin: 0 0 8px;
        }
        .page-sub { font-size: 15px; color: var(--t3); margin: 0 0 24px; }
        .prompt-card {
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: var(--r-lg);
          padding: 18px;
          margin-bottom: 16px;
          box-shadow: var(--shadow-sm);
        }
        .prompt-label {
          font-size: 13px; font-weight: 700; color: var(--steel);
          letter-spacing: .04em; text-transform: uppercase; margin-bottom: 8px;
        }
        .prompt-text {
          font-family: 'Sora', sans-serif;
          font-size: 17px; font-weight: 700; color: var(--navy); line-height: 1.35;
        }
        .textarea-wrap { position: relative; margin-bottom: 10px; }
        .gp-textarea {
          width: 100%;
          min-height: 180px;
          background: var(--surface);
          border: 1.5px solid var(--border-metal);
          border-radius: var(--r);
          padding: 14px 16px;
          font-size: 16px;
          color: var(--t);
          font-family: 'DM Sans', sans-serif;
          line-height: 1.55;
          resize: none;
          outline: none;
          transition: border-color var(--tr), box-shadow var(--tr);
        }
        .gp-textarea:focus {
          border-color: var(--cyan);
          box-shadow: 0 0 0 3px var(--cyan-s);
        }
        .word-count {
          text-align: right;
          font-size: 13px;
          color: var(--t4);
          margin-bottom: 18px;
        }
        .word-count.ok { color: var(--green); font-weight: 600; }
        .btn-submit {
          width: 100%;
          height: 54px; border-radius: 14px;
          background: var(--blue); color: #fff;
          font-size: 17px; font-weight: 700;
          font-family: 'Sora', sans-serif;
          border: none; cursor: pointer;
          box-shadow: var(--shadow-blue);
          transition: opacity var(--tr);
        }
        .btn-submit:disabled { opacity: .5; cursor: not-allowed; }
        .scoring-wrap {
          display: flex; flex-direction: column; align-items: center;
          padding: 60px 24px; gap: 16px;
        }
        .scoring-spinner {
          width: 52px; height: 52px;
          border: 4px solid var(--border-metal);
          border-top-color: var(--blue);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .scoring-label {
          font-family: 'Sora', sans-serif;
          font-size: 18px; font-weight: 700; color: var(--navy);
        }
        .scoring-sub { font-size: 14px; color: var(--t3); text-align: center; }
        .done-wrap {
          display: flex; flex-direction: column; align-items: center;
          padding: 60px 24px; gap: 12px;
        }
        .done-icon { font-size: 56px; }
        .done-title {
          font-family: 'Sora', sans-serif;
          font-size: 26px; font-weight: 800; color: var(--navy);
        }
        .done-pts {
          font-family: 'Sora', sans-serif;
          font-size: 48px; font-weight: 800; color: var(--gold-rich);
          line-height: 1;
        }
        .done-sub { font-size: 15px; color: var(--t3); text-align: center; margin-bottom: 20px; }
        .btn-back {
          width: 100%; height: 54px; border-radius: 14px;
          background: var(--surface2); color: var(--navy);
          font-size: 16px; font-weight: 700;
          font-family: 'Sora', sans-serif;
          border: 1.5px solid var(--border-metal); cursor: pointer;
        }
        .error-msg { font-size: 14px; color: var(--rose); margin-top: 8px; text-align: center; }
      `}</style>

      <div className="gp-page">
        {status === 'scoring' ? (
          <div className="scoring-wrap">
            <div className="scoring-spinner" />
            <div className="scoring-label">AI is scoring your response…</div>
            <div className="scoring-sub">This usually takes 10–20 seconds.</div>
          </div>
        ) : status === 'done' ? (
          <div className="done-wrap">
            <span className="done-icon">🏆</span>
            <div className="done-title">Points Awarded!</div>
            <div className="done-pts">+{points}</div>
            <div className="done-sub">Your response was scored by Agent X. Great job!</div>
            <button className="btn-back" onClick={() => router.push('/activities')}>← Back to Activities</button>
          </div>
        ) : (
          <div className="gp-scroll">
            <button className="back-btn" onClick={() => router.back()}>‹ Activities</button>
            <h1 className="page-title">Golden Points</h1>
            <p className="page-sub">Write a thoughtful response to earn up to 300 points</p>

            <div className="prompt-card">
              <div className="prompt-label">Your Prompt</div>
              <div className="prompt-text">
                How is AI transforming the title &amp; escrow industry, and what excites you most about WFG&#39;s use of technology at this summit?
              </div>
            </div>

            <div className="textarea-wrap">
              <textarea
                className="gp-textarea"
                placeholder={`Share your thoughts here (min. ${MIN_WORDS} words)…`}
                value={text}
                onChange={(e) => { setText(e.target.value); if (status === 'error') setStatus('idle'); }}
                disabled={status === 'submitting'}
              />
            </div>
            <div className={`word-count${wc >= MIN_WORDS ? ' ok' : ''}`}>
              {wc} / {MIN_WORDS} words minimum {wc >= MIN_WORDS ? '✓' : ''}
            </div>

            <button className="btn-submit" onClick={handleSubmit} disabled={!canSubmit}>
              {status === 'submitting' ? 'Submitting…' : 'Submit for AI Scoring →'}
            </button>
            {status === 'error' && <div className="error-msg">{error}</div>}
          </div>
        )}
      </div>
    </>
  );
}
