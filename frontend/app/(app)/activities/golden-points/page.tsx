'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { scoreGoldenAnswer } from '@/lib/scoring';
import { useUiStore } from '@/store/ui';

// submitGoldenPoints / getGoldenPointsStatus preserved in lib/api/activities.ts — backend-ready

type Phase = 'idle' | 'submitting' | 'result' | 'maxed';

const QUESTION = 'How is AI transforming the title & escrow industry, and what excites you most about WFG\'s use of technology at this summit?';
const LOCAL_TOTAL_KEY = 'gp_total';

function getStoredTotal(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(LOCAL_TOTAL_KEY) ?? '0', 10) || 0;
}

function QualityCircle({ score }: { score: number }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width="60" height="60" viewBox="0 0 60 60">
      <circle cx="30" cy="30" r={r} fill="none" stroke="rgba(28,40,60,.10)" strokeWidth="5" />
      <circle
        cx="30" cy="30" r={r} fill="none"
        stroke="#E39548" strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 30 30)"
        style={{ transition: 'stroke-dashoffset .6s ease' }}
      />
      <text x="30" y="35" textAnchor="middle" fontFamily="Sora, sans-serif" fontSize="13" fontWeight="800" fill="#1C283C">{score}</text>
    </svg>
  );
}

export default function GoldenPointsPage() {
  const router = useRouter();
  const { pushToast } = useUiStore();
  const [text, setText]     = useState('');
  const [phase, setPhase]   = useState<Phase>(() => getStoredTotal() >= 100 ? 'maxed' : 'idle');
  const [result, setResult] = useState<ReturnType<typeof scoreGoldenAnswer> | null>(null);
  const charCount = text.length;
  const charOk = charCount >= 20;

  async function handleSubmit() {
    if (!charOk || phase !== 'idle') return;
    setPhase('submitting');
    await new Promise((r) => setTimeout(r, 900));
    const total = getStoredTotal();
    const res = scoreGoldenAnswer(QUESTION, text, total);
    if (res.isValid && res.pointsAwarded > 0) {
      localStorage.setItem(LOCAL_TOTAL_KEY, String(res.updatedTotal));
      pushToast({ message: `${res.reason} +${res.pointsAwarded} pts`, points: res.pointsAwarded });
    }
    setResult(res);
    setPhase(res.updatedTotal >= 100 ? 'maxed' : 'result');
  }

  return (
    <>
      <style>{`
        .gp-page { position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden; }
        .gp-scroll {
          flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
          padding: 20px 18px calc(20px + var(--nav-h) + env(safe-area-inset-bottom, 0px) + 90px);
          overscroll-behavior: contain;
        }
        .back-btn {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 15px; font-weight: 600; color: var(--amber);
          background: none; border: none; cursor: pointer; margin-bottom: 16px; padding: 0;
        }
        .page-title {
          font-family: 'Sora', sans-serif; font-size: 32px; font-weight: 800;
          color: #CCDEE7; letter-spacing: .02em; text-transform: uppercase; margin: 0 0 8px;
        }
        .page-sub { font-size: 15px; color: rgba(204,222,231,.55); margin: 0 0 20px; }
        .gp-card {
          background: var(--metallic); border: 1.5px solid rgba(255,255,255,.45);
          border-radius: var(--r-lg); padding: 18px; margin-bottom: 16px;
          box-shadow: var(--shadow-card);
        }
        .gp-card-label {
          font-size: 11px; font-weight: 800; letter-spacing: .10em;
          text-transform: uppercase; color: rgba(28,40,60,.45); margin-bottom: 8px;
        }
        .gp-card-body { font-size: 15px; color: #4a6080; line-height: 1.55; }
        .prompt-text {
          font-family: 'Sora', sans-serif; font-size: 17px; font-weight: 700;
          color: #1C283C; line-height: 1.35;
        }
        .gp-textarea {
          width: 100%; min-height: 160px;
          background: var(--metallic); border: 1.5px solid rgba(255,255,255,.45);
          border-radius: var(--r); padding: 14px 16px;
          font-size: 16px; color: #1C283C; font-family: 'Sora', sans-serif;
          line-height: 1.55; resize: none; outline: none;
          box-shadow: var(--shadow-card);
          transition: border-color var(--tr), box-shadow var(--tr);
        }
        .gp-textarea:focus { border-color: #E39548; box-shadow: 0 0 0 3px rgba(227,149,72,.15); }
        .char-hint {
          font-size: 13px; color: rgba(204,222,231,.45);
          margin: 6px 0 18px; text-align: right;
          transition: color .2s;
        }
        .char-hint.ok { color: var(--green); font-weight: 600; }
        .btn-submit {
          width: 100%; height: 52px; border-radius: 14px;
          background: #1C283C; color: #E39548;
          font-size: 15px; font-weight: 700; letter-spacing: .02em;
          font-family: 'Sora', sans-serif;
          border: 1px solid rgba(227,149,72,.18); cursor: pointer;
          box-shadow: 0 2px 14px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.04);
          transition: transform .18s, background .15s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .btn-submit:hover { background: #243352; }
        .btn-submit:active { transform: scale(.97); }
        .btn-submit:disabled { opacity: .5; cursor: not-allowed; }
        .result-card {
          background: var(--metallic); border: 1.5px solid rgba(255,255,255,.45);
          border-radius: var(--r-lg); padding: 24px 18px; margin-bottom: 16px;
          box-shadow: var(--shadow-card);
          display: flex; flex-direction: column; align-items: center; gap: 12px;
        }
        .result-pts {
          font-family: 'Sora', sans-serif; font-size: 48px; font-weight: 800;
          color: #D4A017; line-height: 1;
        }
        .result-reason {
          font-size: 15px; color: #4a6080; text-align: center; line-height: 1.5;
        }
        .result-retry {
          font-size: 14px; font-weight: 600; color: #E39548;
          background: none; border: none; cursor: pointer; padding: 8px 0;
          text-decoration: underline; text-underline-offset: 3px;
        }
        .maxed-card {
          background: var(--metallic); border: 1.5px solid rgba(255,255,255,.45);
          border-radius: var(--r-lg); padding: 28px 20px;
          box-shadow: var(--shadow-card);
          display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center;
        }
        .maxed-icon { color: var(--green); }
        .maxed-title {
          font-family: 'Sora', sans-serif; font-size: 20px; font-weight: 800; color: #1C283C;
        }
        .maxed-sub { font-size: 15px; color: #4a6080; line-height: 1.5; }
        .eval-row {
          display: flex; align-items: center; gap: 10px;
          font-size: 15px; font-weight: 600; color: rgba(204,222,231,.55);
        }
        .eval-spinner {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2.5px solid rgba(227,149,72,.25); border-top-color: #E39548;
          animation: gpSpin .8s linear infinite; flex-shrink: 0;
        }
        @keyframes gpSpin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="gp-page">
        <div className="gp-scroll">
          <button className="back-btn" onClick={() => router.back()}>‹ Activities</button>
          <h1 className="page-title">Golden Points</h1>
          <p className="page-sub">Share a real insight — AI evaluates quality and awards up to 20 pts</p>

          <div className="gp-card">
            <div className="gp-card-label">Context</div>
            <div className="gp-card-body">
              Share a real challenge or insight from the title industry. AI evaluates your response quality and awards up to 20 points per submission. Max 100 total.
            </div>
          </div>

          <div className="gp-card" style={{ marginBottom: 16 }}>
            <div className="gp-card-label">Your Prompt</div>
            <div className="prompt-text">{QUESTION}</div>
          </div>

          {phase === 'result' && result && (
            <div className="result-card">
              <QualityCircle score={result.qualityScore} />
              {result.pointsAwarded > 0
                ? <div className="result-pts">+{result.pointsAwarded}</div>
                : <div style={{ fontSize: 15, fontWeight: 700, color: '#4a6080' }}>No points this time</div>
              }
              <div className="result-reason">{result.reason}</div>
              <button className="result-retry" onClick={() => { setText(''); setResult(null); setPhase('idle'); }}>
                Submit another response →
              </button>
            </div>
          )}

          {phase === 'maxed' && (
            <div className="maxed-card">
              <div className="maxed-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/></svg>
              </div>
              <div className="maxed-title">Golden Points Maxed!</div>
              <div className="maxed-sub">You've reached the 100-point Golden Points maximum. Outstanding contribution.</div>
            </div>
          )}

          {(phase === 'idle' || phase === 'submitting') && (
            <>
              <textarea
                className="gp-textarea"
                placeholder="Share your thoughts here (20 character minimum)…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={phase === 'submitting'}
                maxLength={500}
              />
              <div className={`char-hint${charOk ? ' ok' : ''}`}>
                {charOk
                  ? `${charCount} / 500 chars`
                  : `${charCount} / 20 minimum`
                }
              </div>
              <button className="btn-submit" onClick={handleSubmit} disabled={!charOk || phase === 'submitting'}>
                {phase === 'submitting'
                  ? <><div className="eval-spinner" /> Evaluating…</>
                  : 'Submit Response →'
                }
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
