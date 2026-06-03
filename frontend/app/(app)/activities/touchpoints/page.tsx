'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { checkinTouchpoint, getTouchpointCheckins } from '@/lib/api/activities';
import { useUiStore } from '@/store/ui';

const TOUCHPOINTS = [
  { id: 'tp1', zone: 'Main Stage',      prompt: 'What stood out most from the opening keynote or main stage session today?' },
  { id: 'tp2', zone: 'Sponsor Hall',    prompt: 'Which technology solution at the sponsor hall caught your attention most, and why?' },
  { id: 'tp3', zone: 'Breakout Session',prompt: 'What operational bottleneck affects your agency most right now?' },
  { id: 'tp4', zone: 'Networking Lounge',prompt: 'What AI workflow would save you the most time in your daily work?' },
  { id: 'tp5', zone: 'ATS Demo Area',   prompt: 'What would you most like WFG and ATS to build or improve next?' },
] as const;

type TpId = typeof TOUCHPOINTS[number]['id'];
type TpResult = { pointsAwarded: number; reason: string; answer: string };

export default function TouchpointsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { pushToast } = useUiStore();
  const [expanded, setExpanded] = useState<TpId | null>(null);
  const [drafts, setDrafts]     = useState<Record<string, string>>({});
  const [done, setDone]         = useState<Record<string, TpResult>>({});
  const [submitting, setSub]    = useState<TpId | null>(null);

  const totalPts  = Object.values(done).reduce((s, d) => s + d.pointsAwarded, 0);
  const doneCount = Object.keys(done).length;

  useEffect(() => {
    getTouchpointCheckins().then((checkins) => {
      const restored: Record<string, TpResult> = {};
      for (const c of checkins) {
        restored[c.locationId] = { pointsAwarded: c.pointsAwarded, reason: 'Previously submitted', answer: c.response ?? '' };
      }
      setDone((prev) => ({ ...restored, ...prev }));
    }).catch(() => {});
  }, []);

  async function handleSubmit(tp: typeof TOUCHPOINTS[number]) {
    const answer = (drafts[tp.id] ?? '').trim();
    if (answer.length < 20) return;
    setSub(tp.id);
    try {
      const res = await checkinTouchpoint(tp.id, answer, crypto.randomUUID());
      setDone((prev) => ({ ...prev, [tp.id]: { pointsAwarded: res.pointsAwarded, reason: 'Submitted', answer } }));
      setExpanded(null);
      pushToast({ message: `Response recorded! +${res.pointsAwarded} pts`, points: res.pointsAwarded });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        pushToast({ message: 'Already submitted for this zone' });
        setDone((prev) => ({ ...prev, [tp.id]: { pointsAwarded: 0, reason: 'Previously submitted', answer: '' } }));
        setExpanded(null);
      }
    } finally {
      setSub(null);
    }
  }

  return (
    <>
      <style>{`
        .tp-page { position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden; }
        .tp-scroll {
          flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
          padding: 8px 18px calc(20px + var(--nav-h) + env(safe-area-inset-bottom, 0px) + 90px);
          overscroll-behavior: contain;
        }
        .back-btn {
          display: flex; align-items: center; gap: 5px;
          font-size: 15px; font-weight: 600; color: var(--amber);
          background: none; border: none; cursor: pointer;
          padding: 10px 18px 6px; flex-shrink: 0;
        }
        .back-btn:active { opacity: .75; }
        .page-title {
          font-family: 'Sora', sans-serif; font-size: 32px; font-weight: 800;
          color: #CCDEE7; letter-spacing: .02em; text-transform: uppercase; margin: 0 0 8px;
        }
        .page-sub { font-size: 15px; color: rgba(204,222,231,.55); margin: 0 0 6px; }
        .progress-bar-wrap {
          height: 4px; background: rgba(255,255,255,.10); border-radius: 4px;
          margin-bottom: 20px; overflow: hidden;
        }
        .progress-bar-fill {
          height: 100%; background: linear-gradient(90deg, #E39548, #D4A017);
          border-radius: 4px; transition: width .4s ease;
        }
        .tp-card {
          background: var(--metallic); border: 1.5px solid rgba(255,255,255,.45);
          border-radius: var(--r-lg); padding: 16px 18px; margin-bottom: 10px;
          box-shadow: var(--shadow-card); cursor: pointer;
          transition: box-shadow var(--tr), border-color .2s;
        }
        .tp-card.expanded { border-color: rgba(227,149,72,.45); cursor: default; }
        .tp-card.tp-done { border-color: rgba(20,102,54,.30); }
        .tp-card-top { display: flex; align-items: center; gap: 12px; }
        .tp-zone-chip {
          display: inline-flex; align-items: center;
          font-size: 10px; font-weight: 800; letter-spacing: .09em;
          text-transform: uppercase; color: rgba(28,40,60,.60);
          background: rgba(28,40,60,.07); border: 1px solid rgba(28,40,60,.12);
          border-radius: 5px; padding: 3px 8px; flex-shrink: 0;
        }
        .tp-card.tp-done .tp-zone-chip { color: #0f5028; background: rgba(20,102,54,.10); border-color: rgba(20,102,54,.22); }
        .tp-prompt-text {
          font-family: 'Sora', sans-serif; font-size: 17px; font-weight: 700;
          color: #1C283C; line-height: 1.45; flex: 1;
        }
        .tp-done-pts {
          font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 800;
          color: var(--green); flex-shrink: 0; white-space: nowrap;
        }
        .tp-done-preview {
          margin-top: 10px; padding-top: 10px;
          border-top: 1px solid rgba(28,40,60,.08);
          font-size: 13px; color: #4a6080; line-height: 1.5;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .tp-expand-body { margin-top: 14px; }
        .tp-textarea {
          width: 100%; min-height: 110px;
          background: rgba(28,40,60,.04); border: 1.5px solid rgba(28,40,60,.12);
          border-radius: 12px; padding: 12px 14px;
          font-size: 15px; color: #1C283C; font-family: 'Sora', sans-serif;
          resize: none; outline: none; line-height: 1.55;
          transition: border-color var(--tr);
        }
        .tp-textarea:focus { border-color: #E39548; box-shadow: 0 0 0 3px rgba(227,149,72,.12); }
        .tp-char-hint {
          font-size: 12px; color: rgba(28,40,60,.35);
          margin: 6px 0 12px; text-align: right;
          transition: color .2s;
        }
        .tp-char-hint.ok { color: var(--green); font-weight: 600; }
        .btn-tp-submit {
          width: 100%; height: 48px; border-radius: 12px;
          background: #1C283C; color: #E39548;
          font-size: 14px; font-weight: 700; font-family: 'Sora', sans-serif;
          border: 1px solid rgba(227,149,72,.18); cursor: pointer;
          box-shadow: 0 2px 10px rgba(0,0,0,.14), inset 0 1px 0 rgba(255,255,255,.04);
          transition: background .15s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .btn-tp-submit:hover { background: #243352; }
        .btn-tp-submit:disabled { opacity: .5; cursor: not-allowed; }
        .tp-spinner {
          width: 16px; height: 16px; border-radius: 50%;
          border: 2px solid rgba(227,149,72,.25); border-top-color: #E39548;
          animation: tpSpin .7s linear infinite; flex-shrink: 0;
        }
        @keyframes tpSpin { to { transform: rotate(360deg); } }
        .tp-done-check { color: var(--green); flex-shrink: 0; }
        .tp-chev { color: var(--t4); flex-shrink: 0; }
      `}</style>

      <div className="tp-page">
        <button className="back-btn" onClick={() => router.back()}>‹ Activities</button>
        <div className="tp-scroll">
          <h1 className="page-title">Touchpoints</h1>
          <p className="page-sub">{doneCount} / 5 responses · {totalPts} / 150 pts</p>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${Math.min(100, (totalPts / 150) * 100)}%` }} />
          </div>

          {TOUCHPOINTS.map((tp, idx) => {
            const isDone     = !!done[tp.id];
            const isExpanded = expanded === tp.id && !isDone;
            const draft      = drafts[tp.id] ?? '';
            const charOk     = draft.trim().length >= 20;
            const isSub      = submitting === tp.id;

            return (
              <div
                key={tp.id}
                className={`tp-card${isExpanded ? ' expanded' : ''}${isDone ? ' tp-done' : ''}`}
                onClick={() => { if (!isDone && !isExpanded) setExpanded(tp.id); }}
              >
                <div className="tp-card-top">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span className="tp-zone-chip">{tp.zone}</span>
                    </div>
                    <div className="tp-prompt-text">{tp.prompt}</div>
                  </div>
                  {isDone
                    ? <><div className="tp-done-pts">+{done[tp.id].pointsAwarded} pts</div>
                        <div className="tp-done-check">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                        </div>
                      </>
                    : isExpanded
                      ? null
                      : <div className="tp-chev"><svg width="16" height="16" viewBox="0 0 12 12" fill="none"><path d="M4.5 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                  }
                </div>

                {isDone && (
                  <div className="tp-done-preview">{done[tp.id].answer}</div>
                )}

                {isExpanded && (
                  <div className="tp-expand-body" onClick={(e) => e.stopPropagation()}>
                    <textarea
                      className="tp-textarea"
                      placeholder="Share your thoughts… (20 chars minimum)"
                      value={draft}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [tp.id]: e.target.value }))}
                      maxLength={250}
                      autoFocus
                    />
                    <div className={`tp-char-hint${charOk ? ' ok' : ''}`}>
                      {charOk ? `${draft.trim().length} / 250 chars` : `${draft.trim().length} / 20 minimum`}
                    </div>
                    <button
                      className="btn-tp-submit"
                      onClick={() => handleSubmit(tp)}
                      disabled={!charOk || isSub}
                    >
                      {isSub ? <><div className="tp-spinner" /> Submitting…</> : 'Submit Response'}
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
