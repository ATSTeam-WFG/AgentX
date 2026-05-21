'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

const TOUCHPOINTS = [
  {
    id: 'main-stage',
    name: 'Main Stage',
    sub: 'Grand Ballroom · +30 pts',
    icon: '🎤',
    question: 'What was the most impactful moment or takeaway from the Main Stage sessions?',
    placeholder: 'Share what stood out to you — a speaker, idea, or insight…',
    pts: 30,
  },
  {
    id: 'sponsor-hall',
    name: 'Sponsor Hall',
    sub: 'Exhibit Floor · +30 pts',
    icon: '🤝',
    question: 'Which sponsor or partner caught your attention, and what did you learn from them?',
    placeholder: 'Describe a conversation, product demo, or connection you made…',
    pts: 30,
  },
  {
    id: 'agent-x-kiosk',
    name: 'Agent X Kiosk',
    sub: 'Technology Demo Area · +30 pts',
    icon: '🤖',
    question: 'After interacting with Agent X at the kiosk, how do you see AI changing your workflow?',
    placeholder: 'What excites you most about AI in the title & escrow industry?',
    pts: 30,
  },
  {
    id: 'networking-lounge',
    name: 'Networking Lounge',
    sub: 'Level 2 Terrace · +30 pts',
    icon: '💬',
    question: 'What was the most valuable conversation or connection you made today?',
    placeholder: 'Describe who you met, what you discussed, or what you plan to follow up on…',
    pts: 30,
  },
  {
    id: 'keynote-stage',
    name: 'Keynote Stage',
    sub: 'Grand Auditorium · +30 pts',
    icon: '🏆',
    question: 'What is one action or change you plan to make after attending the keynote?',
    placeholder: 'Describe how this session will influence your approach or strategy going forward…',
    pts: 30,
  },
];

type SubmitState = 'idle' | 'submitting' | 'done';

export default function TouchpointsPage() {
  const router = useRouter();
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [submitState, setSubmitState] = useState<Record<string, SubmitState>>({});

  function handleChange(id: string, value: string) {
    setResponses((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSubmit(tp: typeof TOUCHPOINTS[0]) {
    const text = responses[tp.id] ?? '';
    if (text.trim().length < 15) return;
    setSubmitState((prev) => ({ ...prev, [tp.id]: 'submitting' }));
    try {
      await apiFetch('/v1/touchpoints/checkin', {
        method: 'POST',
        body: JSON.stringify({ locationId: tp.id, response: text, dedupeKey: crypto.randomUUID() }),
      });
    } catch {
      // Non-blocking
    } finally {
      setSubmitted((prev) => ({ ...prev, [tp.id]: true }));
      setSubmitState((prev) => ({ ...prev, [tp.id]: 'done' }));
    }
  }

  const completedCount = Object.values(submitted).filter(Boolean).length;

  return (
    <>
      <style>{`
        .tp-page { position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden; }
        .tp-scroll {
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
          letter-spacing: -.025em; margin: 0 0 6px;
        }
        .page-sub { font-size: 15px; color: var(--t3); margin: 0 0 8px; }
        .tp-progress {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 22px;
        }
        .tp-progress-track {
          flex: 1; height: 6px; background: var(--bg3);
          border-radius: 4px; overflow: hidden;
        }
        .tp-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--blue), var(--cyan));
          border-radius: 4px; transition: width .4s ease;
        }
        .tp-progress-label {
          font-family: 'Sora', sans-serif;
          font-size: 13px; font-weight: 700; color: var(--t3);
          flex-shrink: 0; white-space: nowrap;
        }

        /* Location card */
        .tp-card {
          background: var(--surface);
          border: 1px solid var(--border-metal);
          border-radius: var(--r-lg);
          margin-bottom: 14px;
          box-shadow: var(--shadow-card);
          overflow: hidden;
          transition: border-color var(--tr);
        }
        .tp-card.done { border-color: rgba(21,122,64,.30); }
        .tp-card-header {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 16px;
        }
        .tp-card.done .tp-card-header {
          background: var(--green-lt);
        }
        .tp-icon {
          width: 40px; height: 40px; border-radius: 11px;
          background: var(--blue-lt);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; flex-shrink: 0;
        }
        .tp-card.done .tp-icon { background: var(--green-lt); }
        .tp-name {
          font-family: 'Sora', sans-serif;
          font-size: 16px; font-weight: 700; color: var(--t);
          flex: 1;
        }
        .tp-sub { font-size: 13px; color: var(--t3); margin-top: 2px; }
        .tp-badge-done {
          font-size: 13px; font-weight: 700;
          color: var(--green); flex-shrink: 0;
          display: flex; align-items: center; gap: 4px;
        }
        /* Body (form) */
        .tp-card-body { padding: 0 16px 16px; }
        .tp-divider { height: 1px; background: var(--border-metal); margin: 0 0 14px; }
        .tp-question {
          font-size: 15px; font-weight: 600; color: var(--t2);
          margin-bottom: 10px; line-height: 1.4;
        }
        .tp-textarea {
          width: 100%;
          min-height: 100px;
          background: var(--bg2);
          border: 1.5px solid var(--border-metal);
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 15px;
          color: var(--t);
          font-family: 'DM Sans', sans-serif;
          line-height: 1.55;
          resize: none;
          outline: none;
          transition: border-color var(--tr), box-shadow var(--tr);
          margin-bottom: 10px;
        }
        .tp-textarea:focus {
          border-color: var(--blue);
          box-shadow: 0 0 0 3px rgba(27,79,196,.08);
        }
        .tp-char-count {
          font-size: 12px; color: var(--t4); text-align: right;
          margin-bottom: 10px; margin-top: -6px;
        }
        .tp-char-count.ok { color: var(--green); font-weight: 600; }
        .tp-submit-btn {
          width: 100%; height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--blue-mid), var(--blue));
          color: #fff;
          font-size: 15px; font-weight: 700;
          font-family: 'Sora', sans-serif;
          border: none; cursor: pointer;
          box-shadow: var(--shadow-blue);
          transition: opacity var(--tr);
        }
        .tp-submit-btn:disabled { opacity: .45; cursor: not-allowed; }
      `}</style>

      <div className="tp-page">
        <div className="tp-scroll">
          <button className="back-btn" onClick={() => router.back()}>‹ Activities</button>
          <h1 className="page-title">Touchpoints</h1>
          <p className="page-sub">Share your experience at each summit location</p>

          <div className="tp-progress">
            <div className="tp-progress-track">
              <div className="tp-progress-fill" style={{ width: `${(completedCount / TOUCHPOINTS.length) * 100}%` }} />
            </div>
            <span className="tp-progress-label">{completedCount} / {TOUCHPOINTS.length}</span>
          </div>

          {TOUCHPOINTS.map((tp) => {
            const isDone = submitted[tp.id] ?? false;
            const text = responses[tp.id] ?? '';
            const charOk = text.trim().length >= 15;
            const state = submitState[tp.id] ?? 'idle';

            return (
              <div key={tp.id} className={`tp-card${isDone ? ' done' : ''}`}>
                <div className="tp-card-header">
                  <div className="tp-icon">{isDone ? '✅' : tp.icon}</div>
                  <div>
                    <div className="tp-name">{tp.name}</div>
                    <div className="tp-sub">{tp.sub}</div>
                  </div>
                  {isDone && (
                    <div className="tp-badge-done">
                      <svg viewBox="0 0 14 14" fill="none" width="14" height="14">
                        <path d="M2.5 7l3.5 3.5 5.5-5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      +{tp.pts} pts
                    </div>
                  )}
                </div>

                {!isDone && (
                  <div className="tp-card-body">
                    <div className="tp-divider" />
                    <div className="tp-question">{tp.question}</div>
                    <textarea
                      className="tp-textarea"
                      placeholder={tp.placeholder}
                      value={text}
                      onChange={(e) => handleChange(tp.id, e.target.value)}
                      disabled={state === 'submitting'}
                    />
                    <div className={`tp-char-count${charOk ? ' ok' : ''}`}>
                      {text.trim().length} / 15 chars min {charOk ? '✓' : ''}
                    </div>
                    <button
                      className="tp-submit-btn"
                      onClick={() => handleSubmit(tp)}
                      disabled={!charOk || state === 'submitting'}
                    >
                      {state === 'submitting' ? 'Submitting…' : `Submit · +${tp.pts} pts`}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
