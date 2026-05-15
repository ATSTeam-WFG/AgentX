'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getPromptQuestions, answerPrompt, type PromptQuestion } from '@/lib/api/activities';

type ViewState = 'list' | { question: PromptQuestion };

export default function PromptChallengePage() {
  const router = useRouter();
  const [view, setView]     = useState<ViewState>('list');
  const [selected, setSel]  = useState<number | null>(null);
  const [answered, setAns]  = useState<Map<string, { isCorrect: boolean; pointsAwarded: number }>>(new Map());
  const [submitting, setSub] = useState(false);

  const { data: questions = [] } = useQuery({
    queryKey: ['prompt-questions'],
    queryFn: getPromptQuestions,
    staleTime: 300_000,
  });

  async function handleAnswer(q: PromptQuestion, idx: number) {
    if (submitting || selected !== null) return;
    setSel(idx);
    setSub(true);
    try {
      const res = await answerPrompt(q.id, idx, crypto.randomUUID());
      setAns((prev) => new Map(prev).set(q.id, res));
    } catch {
      // Show as answered anyway
      setAns((prev) => new Map(prev).set(q.id, { isCorrect: false, pointsAwarded: 0 }));
    } finally {
      setSub(false);
    }
  }

  const isQuestion = (v: ViewState): v is { question: PromptQuestion } => v !== 'list';

  if (isQuestion(view)) {
    const q   = view.question;
    const ans = answered.get(q.id);

    return (
      <>
        <style>{`
          .pc-page { position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden; }
          .pc-scroll {
            flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
            padding: 20px 18px calc(20px + var(--nav-h) + env(safe-area-inset-bottom, 0px) + 90px);
          }
          .back-btn {
            display: inline-flex; align-items: center; gap: 6px;
            font-size: 15px; font-weight: 600; color: var(--blue);
            background: none; border: none; cursor: pointer; margin-bottom: 16px; padding: 0;
          }
          .q-category {
            font-size: 12px; font-weight: 700; letter-spacing: .06em;
            text-transform: uppercase; color: var(--steel); margin-bottom: 10px;
          }
          .q-card {
            background: var(--surface); border: 1.5px solid var(--border);
            border-radius: var(--r-lg); padding: 20px; margin-bottom: 20px;
            box-shadow: var(--shadow);
          }
          .q-text {
            font-family: 'Sora', sans-serif;
            font-size: 18px; font-weight: 700; color: var(--navy); line-height: 1.35;
          }
          .opts { display: flex; flex-direction: column; gap: 10px; }
          .opt-btn {
            background: var(--surface); border: 1.5px solid var(--border-metal);
            border-radius: 14px; padding: 14px 18px;
            font-size: 16px; font-weight: 600; color: var(--navy);
            cursor: pointer; text-align: left; transition: all var(--tr);
          }
          .opt-btn.correct { background: var(--green-lt); border-color: var(--green); color: var(--green); }
          .opt-btn.wrong   { background: var(--rose-lt);  border-color: var(--rose);  color: var(--rose);  }
          .opt-btn.dim     { opacity: .4; }
          .result-badge {
            margin-top: 20px; padding: 14px 18px;
            border-radius: var(--r); text-align: center;
            font-size: 15px; font-weight: 700;
          }
          .result-badge.win { background: var(--green-lt); color: var(--green); }
          .result-badge.lose { background: var(--rose-lt); color: var(--rose); }
          .btn-back-list {
            margin-top: 16px; width: 100%; height: 50px; border-radius: 14px;
            background: var(--surface2); color: var(--navy);
            font-size: 16px; font-weight: 700; font-family: 'Sora', sans-serif;
            border: 1.5px solid var(--border-metal); cursor: pointer;
          }
        `}</style>
        <div className="pc-page">
          <div className="pc-scroll">
            <button className="back-btn" onClick={() => { setView('list'); setSel(null); }}>‹ All Prompts</button>
            <div className="q-category">{q.category}</div>
            <div className="q-card">
              <div className="q-text">{q.scenarioText}</div>
            </div>
            <div className="opts">
              {q.optionsJson.map((opt, i) => {
                let cls = 'opt-btn';
                if (ans) {
                  if (i === selected && ans.isCorrect)  cls += ' correct';
                  if (i === selected && !ans.isCorrect) cls += ' wrong';
                  if (i !== selected)                    cls += ' dim';
                } else if (selected === i) {
                  cls += ' dim';
                }
                return (
                  <button key={i} className={cls} onClick={() => handleAnswer(q, i)} disabled={!!ans || submitting}>
                    {opt}
                  </button>
                );
              })}
            </div>
            {ans && (
              <>
                <div className={`result-badge ${ans.isCorrect ? 'win' : 'lose'}`}>
                  {ans.isCorrect ? `✓ Correct! +${ans.pointsAwarded} pts` : '✕ Not quite — best prompt selected!'}
                </div>
                <button className="btn-back-list" onClick={() => { setView('list'); setSel(null); }}>
                  ← See all prompts
                </button>
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        .pc-page { position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden; }
        .pc-scroll {
          flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
          padding: 20px 18px calc(20px + var(--nav-h) + env(safe-area-inset-bottom, 0px) + 90px);
        }
        .back-btn {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 15px; font-weight: 600; color: var(--blue);
          background: none; border: none; cursor: pointer; margin-bottom: 16px; padding: 0;
        }
        .page-title { font-family: 'Sora', sans-serif; font-size: 28px; font-weight: 700; color: var(--navy); margin: 0 0 8px; }
        .page-sub { font-size: 15px; color: var(--t3); margin: 0 0 20px; }
        .pc-card {
          background: var(--surface); border: 1.5px solid var(--border);
          border-radius: var(--r-lg); padding: 16px 18px; margin-bottom: 12px;
          box-shadow: var(--shadow-sm); cursor: pointer; transition: all var(--tr);
          display: flex; align-items: center; gap: 14px;
        }
        .pc-card:active { transform: scale(.98); }
        .pc-card.done { opacity: .7; }
        .pc-cat-chip {
          font-size: 11px; font-weight: 700; letter-spacing: .05em;
          text-transform: uppercase; color: var(--steel);
          background: var(--surface2); border-radius: 8px; padding: 3px 8px;
          flex-shrink: 0;
        }
        .pc-card-text { flex: 1; }
        .pc-card-title { font-size: 16px; font-weight: 700; color: var(--navy); margin-bottom: 2px; }
        .pc-card-sub { font-size: 13px; color: var(--t3); }
        .pc-check { font-size: 18px; color: var(--green); flex-shrink: 0; }
      `}</style>
      <div className="pc-page">
        <div className="pc-scroll">
          <button className="back-btn" onClick={() => router.back()}>‹ Activities</button>
          <h1 className="page-title">Prompt Challenge</h1>
          <p className="page-sub">Pick the best AI prompt for each scenario</p>
          {questions.map((q) => {
            const ans = answered.get(q.id);
            return (
              <div key={q.id} className={`pc-card${ans ? ' done' : ''}`} onClick={() => { setView({ question: q }); setSel(null); }}>
                <div className="pc-card-text">
                  <div className="pc-cat-chip">{q.category}</div>
                  <div className="pc-card-title" style={{ marginTop: 6 }}>{q.scenarioText.slice(0, 80)}{q.scenarioText.length > 80 ? '…' : ''}</div>
                  {ans && <div className="pc-card-sub">{ans.isCorrect ? `+${ans.pointsAwarded} pts earned` : 'Answered'}</div>}
                </div>
                {ans ? <span className="pc-check">✓</span> : <span style={{ color: 'var(--t4)', fontSize: 20 }}>›</span>}
              </div>
            );
          })}
          {questions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t4)' }}>Loading challenges…</div>
          )}
        </div>
      </div>
    </>
  );
}
