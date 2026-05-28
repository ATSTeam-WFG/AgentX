'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { submitGoldenPoints, getGoldenPointsStatus, getActivities } from '@/lib/api/activities';
import { getPushState, requestAndSubscribe } from '@/lib/push';

type Status = 'idle' | 'submitting' | 'scoring' | 'done' | 'error';
const MIN_WORDS = 50;

const CUE_CHIPS = [
  'Reducing closing delays',
  'Wire fraud prevention',
  'Client communication gaps',
  'Escrow reconciliation issues',
  'Remote notarization workflows',
  'Title search automation',
  'Agent onboarding friction',
];

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function GoldenPointsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [text, setText]       = useState('');
  const [status, setStatus]   = useState<Status>('idle');
  const [submissionId, setId] = useState('');
  const [points, setPoints]   = useState(0);
  const [feedback, setFeedback] = useState('');
  const [error, setError]     = useState('');
  const [pushState, setPushState] = useState<'idle' | 'asking' | 'granted' | 'denied' | 'unsupported'>('idle');
  const wc = wordCount(text);
  const canSubmit = wc >= MIN_WORDS && (status === 'idle' || status === 'error');

  const { data: activities } = useQuery({ queryKey: ['activities'], queryFn: getActivities, staleTime: 30_000 });
  const gpActivity = activities?.find((a) => a.type === 'golden_points');

  useEffect(() => {
    if (gpActivity?.isCompleted && status === 'idle') {
      setPoints(gpActivity.pointsEarned);
      setStatus('done');
    }
  }, [gpActivity, status]);

  // Initialize push state from current browser permission on mount
  useEffect(() => {
    const s = getPushState();
    if (s === 'unsupported' || s === 'denied') setPushState(s);
    else if (s === 'granted') setPushState('granted');
  }, []);

  useEffect(() => {
    if (status !== 'scoring' || !submissionId) return;
    const interval = setInterval(async () => {
      try {
        const res = await getGoldenPointsStatus(submissionId);
        if (res.status === 'scored' && res.pointsAwarded != null) {
          setPoints(res.pointsAwarded);
          if (res.feedback) setFeedback(res.feedback);
          setStatus('done');
          clearInterval(interval);
          queryClient.invalidateQueries({ queryKey: ['profile'] });
          queryClient.invalidateQueries({ queryKey: ['activities'] });
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

  async function handleNotifyMe() {
    setPushState('asking');
    const result = await requestAndSubscribe();
    setPushState(result);
  }

  function appendChip(chip: string) {
    setText((prev) => {
      const trimmed = prev.trimEnd();
      return trimmed ? `${trimmed} ${chip} ` : `${chip} `;
    });
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
          flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
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
          font-size: 28px; font-weight: 700; color: var(--t);
          letter-spacing: -.025em; margin: 0 0 8px;
        }
        .page-sub { font-size: 15px; color: var(--t3); margin: 0 0 24px; }
        .prompt-card {
          background: var(--surface);
          border: 1px solid var(--border-metal);
          border-radius: var(--r-lg);
          padding: 18px; margin-bottom: 16px;
          box-shadow: var(--shadow-card);
        }
        .prompt-label {
          font-size: 11px; font-weight: 800; letter-spacing: .08em;
          text-transform: uppercase; color: var(--t3); margin-bottom: 8px;
        }
        .prompt-text {
          font-family: 'Sora', sans-serif;
          font-size: 17px; font-weight: 700; color: var(--t); line-height: 1.35;
        }
        .cue-section-label {
          font-size: 12px; font-weight: 700; letter-spacing: .06em;
          text-transform: uppercase; color: var(--t3); margin-bottom: 10px;
        }
        .gp-cue-chips {
          display: flex; gap: 8px; overflow-x: auto;
          -webkit-overflow-scrolling: touch; scrollbar-width: none;
          padding-bottom: 4px; margin-bottom: 14px;
        }
        .gp-cue-chips::-webkit-scrollbar { display: none; }
        .gp-cue-chip {
          white-space: nowrap; font-size: 13px; font-weight: 600;
          color: var(--blue); background: var(--blue-lt);
          border: 1px solid rgba(27,79,196,.22);
          border-radius: 20px; padding: 7px 14px;
          cursor: pointer; flex-shrink: 0;
          font-family: inherit; transition: all var(--tr);
        }
        .gp-cue-chip:active { background: var(--blue-lt2); }
        .textarea-wrap { position: relative; margin-bottom: 10px; }
        .gp-textarea {
          width: 100%; min-height: 180px;
          background: var(--surface);
          border: 1.5px solid var(--border-metal);
          border-radius: var(--r); padding: 14px 16px;
          font-size: 16px; color: var(--t);
          font-family: 'DM Sans', sans-serif;
          line-height: 1.55; resize: none; outline: none;
          transition: border-color var(--tr), box-shadow var(--tr);
        }
        .gp-textarea:focus {
          border-color: var(--blue);
          box-shadow: 0 0 0 3px rgba(27,79,196,.08);
        }
        .word-count {
          text-align: right; font-size: 13px;
          color: var(--t4); margin-bottom: 18px;
        }
        .word-count.ok { color: var(--green); font-weight: 600; }
        .btn-submit {
          width: 100%; height: 54px; border-radius: 14px;
          background: linear-gradient(135deg, var(--blue-mid), var(--blue));
          color: #fff; font-size: 17px; font-weight: 700;
          font-family: 'Sora', sans-serif;
          border: none; cursor: pointer;
          box-shadow: var(--shadow-blue); transition: opacity var(--tr);
        }
        .btn-submit:disabled { opacity: .45; cursor: not-allowed; }
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
          font-size: 18px; font-weight: 700; color: var(--t);
        }
        .scoring-sub { font-size: 14px; color: var(--t3); text-align: center; }
        .done-wrap {
          display: flex; flex-direction: column; align-items: center;
          padding: 60px 24px; gap: 12px;
        }
        .done-icon { font-size: 56px; }
        .done-title {
          font-family: 'Sora', sans-serif;
          font-size: 26px; font-weight: 800; color: var(--t);
        }
        .done-pts {
          font-family: 'Sora', sans-serif;
          font-size: 48px; font-weight: 800; color: var(--gold-rich); line-height: 1;
        }
        .done-sub { font-size: 15px; color: var(--t3); text-align: center; margin-bottom: 8px; }
        .done-feedback {
          font-size: 14px; color: var(--t2); text-align: center;
          font-style: italic; margin-bottom: 20px; line-height: 1.5;
          padding: 0 8px;
        }
        .btn-back {
          width: 100%; height: 54px; border-radius: 14px;
          background: var(--surface); color: var(--t);
          font-size: 16px; font-weight: 700;
          font-family: 'Sora', sans-serif;
          border: 1.5px solid var(--border-metal); cursor: pointer;
          box-shadow: var(--shadow-card);
        }
        .error-msg { font-size: 14px; color: var(--rose); margin-top: 8px; text-align: center; }
        .push-prompt {
          display: flex; flex-direction: column; align-items: center; gap: 10px;
          margin-top: 14px; padding: 14px 20px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: var(--r);
        }
        .push-prompt-text { font-size: 14px; color: var(--mute); text-align: center; margin: 0; }
        .push-prompt-btn {
          background: rgba(91,143,249,0.15); color: var(--ac); font-size: 14px; font-weight: 700;
          font-family: 'Sora', sans-serif; border: 1px solid rgba(91,143,249,0.25);
          border-radius: 10px; padding: 10px 20px; cursor: pointer;
        }
        .push-prompt-sub { font-size: 13px; color: var(--dim); text-align: center; margin-top: 8px; }
      `}</style>

      <div className="gp-page">
        {status === 'scoring' ? (
          <div className="scoring-wrap">
            <div className="scoring-spinner" />
            <div className="scoring-label">AI is scoring your response…</div>
            <div className="scoring-sub">This usually takes 10–20 seconds.</div>
            {pushState === 'idle' && (
              <div className="push-prompt">
                <p className="push-prompt-text">Get notified when your score is ready?</p>
                <button className="push-prompt-btn" onClick={handleNotifyMe}>Notify me</button>
              </div>
            )}
            {pushState === 'asking' && <p className="push-prompt-sub">Waiting for permission…</p>}
            {pushState === 'granted' && <p className="push-prompt-sub">You&apos;ll be notified when scoring is done.</p>}
          </div>
        ) : status === 'done' ? (
          <div className="done-wrap">
            <span className="done-icon">🏆</span>
            <div className="done-title">Points Awarded!</div>
            <div className="done-pts">+{points}</div>
            <div className="done-sub">Your response was scored by Agent X.</div>
            {feedback && <div className="done-feedback">&ldquo;{feedback}&rdquo;</div>}
            <button className="btn-back" onClick={() => router.push('/activities')}>← Back to Activities</button>
          </div>
        ) : (
          <div className="gp-scroll">
            <button className="back-btn" onClick={() => router.back()}>‹ Activities</button>
            <h1 className="page-title">Golden Points</h1>
            <p className="page-sub">Share a real insight. AI evaluates quality and awards up to 100 pts.</p>

            <div className="prompt-card">
              <div className="prompt-label">Your Prompt</div>
              <div className="prompt-text">
                How is AI transforming the title &amp; escrow industry, and what excites you most about WFG&#39;s use of technology at this summit?
              </div>
            </div>

            <div className="cue-section-label">Quick suggestions</div>
            <div className="gp-cue-chips">
              {CUE_CHIPS.map((chip) => (
                <button key={chip} className="gp-cue-chip" onClick={() => appendChip(chip)} type="button">
                  {chip}
                </button>
              ))}
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
