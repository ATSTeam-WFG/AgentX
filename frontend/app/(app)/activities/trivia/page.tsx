'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { startTrivia, completeTrivia, getActivities, type TriviaQuestion } from '@/lib/api/activities';
import { useUiStore } from '@/store/ui';

type Phase = 'hub' | 'play' | 'result';
type ShuffledQuestion = TriviaQuestion & { originalIndexMap: number[]; correctDisplayIdx: number };

const TIMER_SECS = 90;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function TimerCircle({ seconds, total }: { seconds: number; total: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = circ * (seconds / total);
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="30" cy="30" r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="4" />
      <circle
        cx="30" cy="30" r={r} fill="none"
        stroke={seconds <= 10 ? 'var(--rose)' : '#E39548'}
        strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray .5s linear, stroke .3s' }}
      />
      <text
        x="30" y="30"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="14" fontWeight="700"
        fill={seconds <= 10 ? 'var(--rose)' : '#CCDEE7'}
        style={{ transform: 'rotate(90deg)', transformOrigin: '30px 30px', fontSize: '13px', fontFamily: 'Sora, sans-serif' }}
      >
        {seconds}
      </text>
    </svg>
  );
}

export default function TriviaPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [phase, setPhase]           = useState<Phase>('hub');
  const [attemptId, setAttemptId]   = useState('');
  const [questions, setQuestions]   = useState<ShuffledQuestion[]>([]);
  const [qIdx, setQIdx]             = useState(0);
  const [answers, setAnswers]       = useState<{ questionId: string; selectedIndex: number }[]>([]);
  const [selected, setSelected]     = useState<number | null>(null);
  const [timer, setTimer]           = useState(TIMER_SECS);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<{ pointsAwarded: number; correctCount: number; totalQuestions: number } | null>(null);
  const submittedRef                = useRef(false);

  const { pushToast } = useUiStore();
  const { data: activities } = useQuery({ queryKey: ['activities'], queryFn: getActivities, staleTime: 30_000 });
  const triviaActivity = activities?.find((a) => a.type === 'trivia');

  useEffect(() => {
    if (triviaActivity?.isCompleted && phase === 'hub') {
      setResult({ pointsAwarded: triviaActivity.pointsEarned, correctCount: 0, totalQuestions: 0 });
      setPhase('result');
    }
  }, [triviaActivity, phase]);

  const current = questions[qIdx];

  const doSubmit = useCallback((allAnswers: { questionId: string; selectedIndex: number }[]) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    completeTrivia(attemptId, allAnswers, crypto.randomUUID())
      .then((r) => {
        setResult(r);
        setPhase('result');
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.invalidateQueries({ queryKey: ['activities'] });
      })
      .catch(() => {
        setResult({ pointsAwarded: 0, correctCount: 0, totalQuestions: questions.length });
        setPhase('result');
      });
  }, [attemptId, questions.length, queryClient]);

  const advanceQuestion = useCallback((idx: number, sel: number | null) => {
    const originalSel = sel !== null ? questions[idx].originalIndexMap[sel] : -1;
    const ans = [...answers, { questionId: questions[idx].id, selectedIndex: originalSel }];
    setAnswers(ans);
    setSelected(null);

    if (idx + 1 < questions.length) {
      setQIdx(idx + 1);
    } else {
      doSubmit(ans);
    }
  }, [answers, questions, doSubmit]);

  // Global countdown — runs once for the whole quiz, not per question
  useEffect(() => {
    if (phase !== 'play' || timer <= 0) return;
    const t = setTimeout(() => setTimer((prev) => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timer]);

  // Auto-submit everything when time runs out
  useEffect(() => {
    if (phase !== 'play' || timer !== 0 || submittedRef.current) return;
    submittedRef.current = true;
    const pending = [...answers];
    for (let i = qIdx; i < questions.length; i++) {
      pending.push({ questionId: questions[i].id, selectedIndex: -1 });
    }
    completeTrivia(attemptId, pending, crypto.randomUUID())
      .then((r) => {
        setResult(r);
        setPhase('result');
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.invalidateQueries({ queryKey: ['activities'] });
      })
      .catch(() => {
        setResult({ pointsAwarded: 0, correctCount: 0, totalQuestions: questions.length });
        setPhase('result');
      });
  }, [phase, timer, answers, qIdx, questions, attemptId, queryClient]);

  async function handleStart() {
    submittedRef.current = false;
    setLoading(true);
    try {
      const res = await startTrivia();
      const shuffledQs: ShuffledQuestion[] = shuffle(res.questions).map((q) => {
        const indices = q.optionsJson.map((_, i) => i);
        const shuffledIndices = shuffle(indices);
        return {
          ...q,
          optionsJson: shuffledIndices.map((i) => q.optionsJson[i]),
          originalIndexMap: shuffledIndices,
          correctDisplayIdx: shuffledIndices.indexOf(1), // original correct is always index 1
        };
      });
      setAttemptId(res.attemptId);
      setQuestions(shuffledQs);
      setQIdx(0);
      setAnswers([]);
      setSelected(null);
      setTimer(TIMER_SECS);
      setPhase('play');
    } catch {
      pushToast({ message: 'Could not start trivia. Please try again.', type: 'warn' });
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    setTimeout(() => advanceQuestion(qIdx, idx), 600);
  }

  function optionClass(idx: number) {
    if (selected === null) return 'tv-opt';
    const correctIdx = current.correctDisplayIdx;
    if (idx === selected && idx === correctIdx) return 'tv-opt tv-opt-correct';
    if (idx === selected && idx !== correctIdx) return 'tv-opt tv-opt-wrong';
    if (idx === correctIdx) return 'tv-opt tv-opt-reveal';
    return 'tv-opt tv-opt-dim';
  }

  return (
    <>
      <style>{`
        .trivia-page {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .trivia-scroll {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
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
          font-family: 'Sora', sans-serif;
          font-size: 32px;
          font-weight: 800;
          color: #CCDEE7;
          letter-spacing: .02em;
          text-transform: uppercase;
          margin: 0 0 8px;
        }
        .page-sub { font-size: 15px; color: rgba(204,222,231,.55); margin: 0 0 24px; }
        .rules-card {
          background: var(--metallic);
          border: 1.5px solid rgba(255,255,255,.45);
          border-radius: var(--r-lg);
          padding: 18px;
          box-shadow: var(--shadow-card);
          margin-bottom: 0;
        }
        .rules-title {
          font-family: 'Sora', sans-serif;
          font-size: 13px;
          font-weight: 800;
          color: #1C283C;
          text-transform: uppercase;
          letter-spacing: .08em;
          margin-bottom: 12px;
        }
        .rules-list {
          list-style: none;
          padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 8px;
        }
        .rules-list li {
          display: flex; align-items: flex-start; gap: 8px;
          font-size: 14px; color: #4a6080;
        }
        .rules-list li::before {
          content: '•';
          color: #E39548;
          font-weight: 800;
          flex-shrink: 0;
        }
        .btn-start {
          width: 100%;
          height: 52px;
          border-radius: 14px;
          background: #1C283C;
          color: #E39548;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: .02em;
          font-family: 'Sora', sans-serif;
          border: 1px solid rgba(227,149,72,.18);
          cursor: pointer;
          box-shadow: 0 2px 14px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.04);
          transition: transform .18s cubic-bezier(.4,0,.2,1), background .15s;
          margin-top: 16px;
        }
        .btn-start:hover { background: #243352; }
        .btn-start:active { transform: scale(.97); }
        .btn-start:disabled { opacity: .5; }

        /* Play phase */
        .play-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 18px;
          margin-bottom: 12px;
          flex-shrink: 0;
        }
        .q-counter {
          font-family: 'Sora', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #CCDEE7;
        }
        .q-progress-track {
          height: 4px;
          background: rgba(255,255,255,.10);
          border-radius: 2px;
          margin: 0 18px 16px;
          flex-shrink: 0;
          overflow: hidden;
        }
        .q-progress-fill {
          height: 100%;
          border-radius: 2px;
          background: linear-gradient(90deg, #F0A55A, #E39548);
          transition: width .3s ease;
        }
        .tv-q-card {
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: var(--r-lg);
          padding: 20px;
          margin: 0 18px 16px;
          box-shadow: var(--shadow);
          font-family: 'Sora', sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: var(--navy);
          line-height: 1.3;
        }
        .tv-opts {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 0 18px;
          flex-shrink: 0;
        }
        .tv-opt {
          background: var(--surface);
          border: 1.5px solid var(--border-metal);
          border-radius: 14px;
          padding: 14px 18px;
          font-size: 17px;
          font-weight: 600;
          color: var(--navy);
          cursor: pointer;
          transition: all var(--tr);
          text-align: left;
          line-height: 1.45;
        }
        .tv-opt:active { transform: scale(.98); }
        .tv-opt-correct {
          background: rgba(34,197,94,.15);
          border-color: #22c55e;
          color: #22c55e;
        }
        .tv-opt-wrong {
          background: rgba(239,68,68,.12);
          border-color: var(--rose, #f43f5e);
          color: var(--rose, #f43f5e);
        }
        .tv-opt-reveal {
          background: rgba(34,197,94,.10);
          border-color: #22c55e;
          color: #22c55e;
          opacity: .75;
        }
        .tv-opt-dim { opacity: .35; }

        /* Result phase */
        .result-wrap {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px 18px calc(20px + var(--nav-h) + env(safe-area-inset-bottom, 0px) + 90px);
          overflow-y: auto;
        }
        .score-ring-wrap {
          position: relative;
          margin-bottom: 24px;
        }
        .score-number {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .score-val {
          font-family: 'Sora', sans-serif;
          font-size: 42px;
          font-weight: 800;
          color: #CCDEE7;
          line-height: 1;
        }
        .score-pts {
          font-size: 13px;
          font-weight: 700;
          color: var(--gold-rich);
          margin-top: 4px;
        }
        .result-title {
          font-family: 'Sora', sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: #CCDEE7;
          margin-bottom: 6px;
          text-align: center;
        }
        .result-sub {
          font-size: 17px;
          color: rgba(204,222,231,.55);
          margin-bottom: 28px;
          text-align: center;
        }
        .result-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          width: 100%;
          margin-bottom: 28px;
        }
        .result-stat {
          background: var(--metallic);
          border: 1.5px solid rgba(255,255,255,.45);
          border-radius: var(--r);
          padding: 14px 8px;
          text-align: center;
          box-shadow: var(--shadow-card);
        }
        .rs-val {
          font-family: 'Sora', sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: #1C283C;
        }
        .rs-lbl {
          font-size: 12px;
          color: #4a6080;
          margin-top: 3px;
          font-weight: 600;
        }
        .btn-back {
          width: 100%;
          height: 52px;
          border-radius: 14px;
          background: #1C283C;
          color: #E39548;
          font-size: 15px;
          font-weight: 700;
          font-family: 'Sora', sans-serif;
          border: 1px solid rgba(227,149,72,.18);
          cursor: pointer;
          box-shadow: 0 2px 14px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.04);
        }
      `}</style>

      <div className="trivia-page">
        {/* Hub */}
        {phase === 'hub' && (
          <>
            <button className="back-btn" onClick={() => router.back()}>‹ Activities</button>
            <div className="trivia-scroll">
            <h1 className="page-title">Title Trivia</h1>
            <p className="page-sub">Test your title &amp; escrow knowledge</p>
            <div className="rules-card">
              <div className="rules-title">How it works</div>
              <ul className="rules-list">
                <li>Answer 10 multiple-choice questions</li>
                <li>You have 90 seconds for the entire quiz</li>
                <li>Earn up to 200 points total</li>
                <li>Can only be played once</li>
              </ul>
              <button className="btn-start" onClick={handleStart} disabled={loading}>
                {loading ? 'Loading…' : 'Start Quiz →'}
              </button>
            </div>
            </div>
          </>
        )}

        {/* Play */}
        {phase === 'play' && current && (
          <>
            <div className="play-header">
              <span className="q-counter">Q {qIdx + 1} / {questions.length}</span>
              <TimerCircle seconds={timer} total={TIMER_SECS} />
            </div>
            <div className="q-progress-track">
              <div className="q-progress-fill" style={{ width: `${(qIdx / questions.length) * 100}%` }} />
            </div>
            <div className="tv-q-card">{current.questionText}</div>
            <div className="tv-opts">
              {current.optionsJson.map((opt, i) => (
                <button key={i} className={optionClass(i)} onClick={() => handleSelect(i)}>
                  {opt}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Result */}
        {phase === 'result' && result && (
          <div className="result-wrap">
            <div className="score-ring-wrap">
              <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="80" cy="80" r="68" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="10" />
                <circle
                  cx="80" cy="80" r="68" fill="none"
                  stroke="#E39548"
                  strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 68 * (result.correctCount / result.totalQuestions)} ${2 * Math.PI * 68}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 1s ease' }}
                />
              </svg>
              <div className="score-number">
                <span className="score-val">{result.correctCount}/{result.totalQuestions}</span>
                <span className="score-pts">+{result.pointsAwarded} pts</span>
              </div>
            </div>
            <div className="result-title">
              {result.correctCount >= result.totalQuestions * 0.8 ? '🎉 Excellent!' : result.correctCount >= result.totalQuestions * 0.5 ? '👍 Good job!' : '💪 Keep learning!'}
            </div>
            <div className="result-sub">You got {result.correctCount} out of {result.totalQuestions} correct.</div>
            <div className="result-stats">
              <div className="result-stat">
                <div className="rs-val">{result.correctCount}</div>
                <div className="rs-lbl">Correct</div>
              </div>
              <div className="result-stat">
                <div className="rs-val">{result.totalQuestions - result.correctCount}</div>
                <div className="rs-lbl">Missed</div>
              </div>
              <div className="result-stat">
                <div className="rs-val" style={{ color: 'var(--gold-rich)' }}>+{result.pointsAwarded}</div>
                <div className="rs-lbl">Points</div>
              </div>
            </div>
            <button className="btn-back" onClick={() => router.push('/activities')}>
              ← Back to Activities
            </button>
          </div>
        )}
      </div>
    </>
  );
}
