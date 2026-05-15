'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { startTrivia, completeTrivia, type TriviaQuestion } from '@/lib/api/activities';

type Phase = 'hub' | 'play' | 'result';

const TIMER_SECS = 60;

function TimerCircle({ seconds, total }: { seconds: number; total: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = circ * (seconds / total);
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="30" cy="30" r={r} fill="none" stroke="var(--surface2)" strokeWidth="4" />
      <circle
        cx="30" cy="30" r={r} fill="none"
        stroke={seconds <= 10 ? 'var(--rose)' : 'var(--blue)'}
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
        fill={seconds <= 10 ? 'var(--rose)' : 'var(--navy)'}
        style={{ transform: 'rotate(90deg)', transformOrigin: '30px 30px', fontSize: '13px', fontFamily: 'Sora, sans-serif' }}
      >
        {seconds}
      </text>
    </svg>
  );
}

export default function TriviaPage() {
  const router = useRouter();
  const [phase, setPhase]           = useState<Phase>('hub');
  const [attemptId, setAttemptId]   = useState('');
  const [questions, setQuestions]   = useState<TriviaQuestion[]>([]);
  const [qIdx, setQIdx]             = useState(0);
  const [answers, setAnswers]       = useState<{ question_id: string; selected_index: number }[]>([]);
  const [selected, setSelected]     = useState<number | null>(null);
  const [timer, setTimer]           = useState(TIMER_SECS);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<{ points_awarded: number; correct: number; total: number } | null>(null);

  const current = questions[qIdx];

  const advanceQuestion = useCallback((idx: number, sel: number | null) => {
    const ans = sel !== null
      ? [...answers, { question_id: questions[idx].id, selected_index: sel }]
      : [...answers, { question_id: questions[idx].id, selected_index: -1 }];
    setAnswers(ans);
    setSelected(null);
    setTimer(TIMER_SECS);

    if (idx + 1 < questions.length) {
      setQIdx(idx + 1);
    } else {
      // Submit
      completeTrivia(attemptId, ans, crypto.randomUUID())
        .then((r) => { setResult(r); setPhase('result'); })
        .catch(() => { setResult({ points_awarded: 0, correct: 0, total: questions.length }); setPhase('result'); });
    }
  }, [answers, attemptId, questions]);

  useEffect(() => {
    if (phase !== 'play') return;
    const t = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          advanceQuestion(qIdx, null);
          return TIMER_SECS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, qIdx, advanceQuestion]);

  async function handleStart() {
    setLoading(true);
    try {
      const res = await startTrivia();
      setAttemptId(res.attempt_id);
      setQuestions(res.questions);
      setQIdx(0);
      setAnswers([]);
      setSelected(null);
      setTimer(TIMER_SECS);
      setPhase('play');
    } catch {
      alert('Could not start trivia. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    setTimeout(() => advanceQuestion(qIdx, idx), 1400);
  }

  function optionClass(idx: number) {
    if (selected === null) return 'tv-opt';
    if (idx === selected) return 'tv-opt tv-opt-sel';
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
          padding: 20px 18px calc(20px + var(--nav-h) + env(safe-area-inset-bottom, 0px) + 90px);
          overscroll-behavior: contain;
        }
        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 15px;
          font-weight: 600;
          color: var(--blue);
          background: none;
          border: none;
          cursor: pointer;
          margin-bottom: 16px;
          padding: 0;
        }
        .page-title {
          font-family: 'Sora', sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: var(--navy);
          letter-spacing: -.025em;
          margin: 0 0 8px;
        }
        .page-sub { font-size: 15px; color: var(--t3); margin: 0 0 24px; }
        .rules-card {
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: var(--r-lg);
          padding: 18px;
          box-shadow: var(--shadow-sm);
          margin-bottom: 20px;
        }
        .rules-title {
          font-family: 'Sora', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: var(--navy);
          margin-bottom: 10px;
        }
        .rules-list {
          list-style: none;
          padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 8px;
        }
        .rules-list li {
          display: flex; align-items: flex-start; gap: 8px;
          font-size: 14px; color: var(--t2);
        }
        .rules-list li::before {
          content: '•';
          color: var(--blue);
          font-weight: 800;
          flex-shrink: 0;
        }
        .btn-start {
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
          transition: opacity var(--tr);
        }
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
          color: var(--navy);
        }
        .q-progress-track {
          height: 4px;
          background: var(--surface2);
          border-radius: 2px;
          margin: 0 18px 16px;
          flex-shrink: 0;
          overflow: hidden;
        }
        .q-progress-fill {
          height: 100%;
          border-radius: 2px;
          background: linear-gradient(90deg, var(--blue), var(--cyan));
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
          font-size: 16px;
          font-weight: 600;
          color: var(--navy);
          cursor: pointer;
          transition: all var(--tr);
          text-align: left;
        }
        .tv-opt:active { transform: scale(.98); }
        .tv-opt-sel {
          background: var(--blue-lt);
          border-color: var(--blue);
          color: var(--blue);
        }
        .tv-opt-dim { opacity: .45; }

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
          color: var(--navy);
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
          color: var(--navy);
          margin-bottom: 6px;
          text-align: center;
        }
        .result-sub {
          font-size: 15px;
          color: var(--t3);
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
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: var(--r);
          padding: 14px 8px;
          text-align: center;
          box-shadow: var(--shadow-xs);
        }
        .rs-val {
          font-family: 'Sora', sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: var(--navy);
        }
        .rs-lbl {
          font-size: 12px;
          color: var(--t4);
          margin-top: 3px;
          font-weight: 600;
        }
        .btn-back {
          width: 100%;
          height: 54px;
          border-radius: 14px;
          background: var(--surface2);
          color: var(--navy);
          font-size: 16px;
          font-weight: 700;
          font-family: 'Sora', sans-serif;
          border: 1.5px solid var(--border-metal);
          cursor: pointer;
        }
      `}</style>

      <div className="trivia-page">
        {/* Hub */}
        {phase === 'hub' && (
          <div className="trivia-scroll">
            <button className="back-btn" onClick={() => router.back()}>‹ Activities</button>
            <h1 className="page-title">Title Trivia</h1>
            <p className="page-sub">Test your title &amp; escrow knowledge</p>
            <div className="rules-card">
              <div className="rules-title">How it works</div>
              <ul className="rules-list">
                <li>Answer 10 multiple-choice questions</li>
                <li>You have 60 seconds per question</li>
                <li>Earn up to 200 points total</li>
                <li>Can only be played once</li>
              </ul>
            </div>
            <button className="btn-start" onClick={handleStart} disabled={loading}>
              {loading ? 'Loading…' : 'Start Quiz →'}
            </button>
          </div>
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
            <div className="tv-q-card">{current.question_text}</div>
            <div className="tv-opts">
              {current.options_json.map((opt, i) => (
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
                <circle cx="80" cy="80" r="68" fill="none" stroke="var(--surface2)" strokeWidth="10" />
                <circle
                  cx="80" cy="80" r="68" fill="none"
                  stroke="var(--blue)"
                  strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 68 * (result.correct / result.total)} ${2 * Math.PI * 68}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 1s ease' }}
                />
              </svg>
              <div className="score-number">
                <span className="score-val">{result.correct}/{result.total}</span>
                <span className="score-pts">+{result.points_awarded} pts</span>
              </div>
            </div>
            <div className="result-title">
              {result.correct >= result.total * 0.8 ? '🎉 Excellent!' : result.correct >= result.total * 0.5 ? '👍 Good job!' : '💪 Keep learning!'}
            </div>
            <div className="result-sub">You got {result.correct} out of {result.total} correct.</div>
            <div className="result-stats">
              <div className="result-stat">
                <div className="rs-val">{result.correct}</div>
                <div className="rs-lbl">Correct</div>
              </div>
              <div className="result-stat">
                <div className="rs-val">{result.total - result.correct}</div>
                <div className="rs-lbl">Missed</div>
              </div>
              <div className="result-stat">
                <div className="rs-val" style={{ color: 'var(--gold-rich)' }}>+{result.points_awarded}</div>
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
