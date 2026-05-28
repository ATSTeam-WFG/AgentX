'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPromptQuestions, answerPrompt, type PromptQuestion } from '@/lib/api/activities';
import { useUiStore } from '@/store/ui';

const STATIC_PROMPT_QUESTIONS: PromptQuestion[] = [
  {
    id: 'pq1',
    category: 'Underwriting',
    scenarioText: 'A title agent receives a contract showing a property value of $850,000, but county records indicate an unpermitted addition valued at $120,000. What is the best AI prompt to analyze this situation?',
    optionsJson: [
      'A. "Analyze all recent title transfers and flag any discrepancies in recorded ownership history."',
      'B. "Compare the contract value against county assessment records, flag unpermitted improvements, and outline the full underwriting risk exposure."',
      'C. "Generate a standard underwriting report based on the provided property address and transaction details."',
      'D. "Search for any open liens or judgments against the seller\'s name in public records."',
    ],
    correctIndex: 1,
    explanation: 'Option B is the most effective because it directly addresses the core issue: the value discrepancy from unpermitted work, while also prompting a full risk analysis.',
  },
  {
    id: 'pq2',
    category: 'Client Communication',
    scenarioText: 'A buyer is anxious about a closing delay caused by a title defect discovered 48 hours before closing. Which AI prompt would best help you communicate with the client professionally and clearly?',
    optionsJson: [
      'A. "Draft a formal legal letter explaining the closing delay and providing a new estimated timeline."',
      'B. "Create a brief text message to notify the client that the closing is delayed without specific details."',
      'C. "Draft a reassuring, plain-language explanation of the title issue, the steps being taken to resolve it, and a realistic timeline, in a warm, professional tone."',
      'D. "Generate a legal disclaimer explaining our company\'s liability limitations regarding closing delays."',
    ],
    correctIndex: 2,
    explanation: 'Option C prioritizes client experience by combining empathy, transparency, and actionable information, reducing anxiety while maintaining professionalism.',
  },
  {
    id: 'pq3',
    category: 'Fraud Detection',
    scenarioText: 'You receive a wire transfer request from an email that appears to come from your escrow officer, but subtle signs suggest it could be fraudulent. What AI prompt would help you verify the authenticity?',
    optionsJson: [
      'A. "Check the wire transfer amount against our standard escrow fee schedule for this transaction type."',
      'B. "Analyze the email headers, sender domain, and writing pattern against known communications to flag potential anomalies."',
      'C. "Forward the email to our IT department and wait for their security team response."',
      'D. "Call the phone number listed in the email signature to confirm the request directly."',
    ],
    correctIndex: 1,
    explanation: 'Option B uses AI\'s pattern analysis capabilities to detect technical and linguistic anomalies. It is the most systematic first step in verifying a suspected phishing attempt.',
  },
  {
    id: 'pq4',
    category: 'Operational Efficiency',
    scenarioText: 'Your office handles 80 closings per month and manual title searches average 3 hours each. Which AI prompt would most effectively help automate and streamline this workflow?',
    optionsJson: [
      'A. "Create a spreadsheet template for tracking title search status and assigned examiner for each file."',
      'B. "Write a job posting for an additional title examiner to reduce our current workload backlog."',
      'C. "Generate a workflow diagram mapping our current title search process from order intake to delivery."',
      'D. "Build an automated title search checklist that pulls county recorder data, cross-references lien databases, and flags exceptions requiring manual review."',
    ],
    correctIndex: 3,
    explanation: 'Option D is the only prompt that directly leverages automation, integrating multiple data sources and intelligent exception flagging to reduce manual effort at scale.',
  },
  {
    id: 'pq5',
    category: 'Business Development',
    scenarioText: 'You want to grow your referral network with local real estate agents and position your agency as a tech-forward title partner. Which AI prompt would generate the most effective outreach strategy?',
    optionsJson: [
      'A. "Write a formal business proposal outlining our title company\'s full service menu and competitive fee schedule."',
      'B. "Draft a LinkedIn post announcing our new digital closing capabilities and inviting agents to connect."',
      'C. "Create a personalized outreach sequence for real estate agents, including relevant value propositions, local market insights, and a warm call-to-action for a 15-minute coffee meeting."',
      'D. "Generate a comprehensive list of all licensed real estate agents operating in my zip code."',
    ],
    correctIndex: 2,
    explanation: 'Option C is the most strategic because it combines personalization, market relevance, and a low-friction ask: the key ingredients for a successful referral development campaign.',
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Underwriting: '#E39548',
  'Client Communication': '#5B8DB8',
  'Fraud Detection': '#C45E5E',
  'Operational Efficiency': '#4A9070',
  'Business Development': '#7B6EB8',
};

type ViewState = 'list' | { question: PromptQuestion };

export default function PromptChallengePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { pushToast } = useUiStore();
  const [view, setView]      = useState<ViewState>('list');
  const [selected, setSel]   = useState<number | null>(null);
  const [answered, setAns]   = useState<Map<string, { isCorrect: boolean; pointsAwarded: number; explanation?: string }>>(new Map());
  const [submitting, setSub] = useState(false);

  const { data: apiQuestions } = useQuery({
    queryKey: ['prompt-questions'],
    queryFn: getPromptQuestions,
    staleTime: 300_000,
  });

  const questions = apiQuestions?.length ? apiQuestions : STATIC_PROMPT_QUESTIONS;
  const totalPts = [...answered.values()].reduce((s, a) => s + a.pointsAwarded, 0);

  function goToNext(currentId: string) {
    const next = questions.find((q) => !answered.has(q.id) && q.id !== currentId);
    if (next) { setView({ question: next }); setSel(null); }
    else { setView('list'); setSel(null); }
  }

  async function handleAnswer(q: PromptQuestion, idx: number) {
    if (submitting || answered.has(q.id)) return;
    setSel(idx);
    setSub(true);
    try {
      const res = await answerPrompt(q.id, idx, crypto.randomUUID());
      setAns((prev) => new Map(prev).set(q.id, { isCorrect: res.isCorrect, pointsAwarded: res.pointsAwarded, explanation: res.explanation }));
      pushToast({
        message: res.isCorrect ? 'Best prompt selected' : 'Good choice — not the best prompt',
        points: res.pointsAwarded,
        type: res.isCorrect ? 'success' : 'warn',
      });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch {
      const isCorrect = q.correctIndex != null && idx === q.correctIndex;
      const pts = isCorrect ? 20 : 10;
      setAns((prev) => new Map(prev).set(q.id, { isCorrect, pointsAwarded: pts, explanation: q.explanation ?? undefined }));
      pushToast({
        message: isCorrect ? 'Best prompt selected' : 'Good choice — not the best prompt',
        points: pts,
        type: isCorrect ? 'success' : 'warn',
      });
    } finally {
      setSub(false);
    }
  }

  const isQuestion = (v: ViewState): v is { question: PromptQuestion } => v !== 'list';

  if (isQuestion(view)) {
    const q   = view.question;
    const ans = answered.get(q.id);
    const catColor = CATEGORY_COLORS[q.category] ?? '#E39548';

    return (
      <>
        <style>{`
          .pc-page { position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden; }
          .pc-scroll {
            flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
            padding: 20px 18px calc(20px + var(--nav-h) + env(safe-area-inset-bottom, 0px) + 90px);
          }
          .back-btn {
            display: flex; align-items: center; gap: 6px; width: 100%;
            font-size: 15px; font-weight: 600; color: var(--amber);
            background: var(--bg); border: none; cursor: pointer;
            padding: 10px 0 8px; margin-bottom: 8px;
            position: sticky; top: 0; z-index: 10;
          }
          .q-cat-chip {
            display: inline-flex; align-items: center; gap: 6px;
            font-size: 11px; font-weight: 700; letter-spacing: .08em;
            text-transform: uppercase; border-radius: 20px; padding: 5px 12px;
            margin-bottom: 14px; border-width: 1px; border-style: solid;
          }
          .q-cat-chip::before {
            content: ''; width: 5px; height: 5px; border-radius: 50%;
            background: currentColor; flex-shrink: 0; opacity: .85;
          }
          .q-card {
            background: var(--metallic); border: 1.5px solid rgba(255,255,255,.45);
            border-radius: var(--r-lg); padding: 20px; margin-bottom: 20px;
            box-shadow: var(--shadow-card);
          }
          .q-text { font-family: 'Sora', sans-serif; font-size: 17px; font-weight: 700; color: #1C283C; line-height: 1.4; }
          .opts { display: flex; flex-direction: column; gap: 10px; }
          .opt-btn {
            background: var(--metallic); border: 1.5px solid rgba(255,255,255,.45);
            border-radius: 14px; padding: 14px 18px;
            font-size: 15px; font-weight: 600; color: #1C283C;
            cursor: pointer; text-align: left; transition: all var(--tr);
            box-shadow: var(--shadow-card); line-height: 1.45;
          }
          .opt-btn:active { transform: scale(.98); }
          .opt-btn.correct { background: rgba(20,102,54,.08); border-color: var(--green); color: #146636; }
          .opt-btn.wrong   { background: rgba(192,50,50,.08); border-color: #C03232; color: #C03232; }
          .opt-btn.dim     { opacity: .4; }
          .result-block { margin-top: 20px; }
          .result-badge {
            padding: 14px 18px; border-radius: var(--r);
            display: flex; align-items: center; gap: 10px;
            font-size: 15px; font-weight: 700;
          }
          .result-badge.win  { background: rgba(20,102,54,.08); color: #146636; border: 1.5px solid rgba(20,102,54,.20); border-radius: 12px; }
          .result-badge.warn { background: rgba(227,149,72,.08); color: #C47A1A; border: 1.5px solid rgba(227,149,72,.28); border-radius: 12px; }
          .btn-next {
            margin-top: 16px; width: 100%; height: 52px; border-radius: 14px;
            background: var(--amber); color: #1C283C;
            font-size: 15px; font-weight: 700; font-family: 'Sora', sans-serif;
            border: none; cursor: pointer;
            box-shadow: 0 4px 20px rgba(227,149,72,.30);
          }
          .result-explanation {
            margin-top: 14px; padding: 14px 16px;
            background: rgba(28,40,60,.04); border-radius: 12px;
            border-left: 3px solid #E39548;
          }
          .result-exp-label {
            font-size: 10px; font-weight: 800; letter-spacing: .10em;
            text-transform: uppercase; color: rgba(28,40,60,.45); margin-bottom: 6px;
          }
          .result-exp-text { font-size: 14px; color: #4a6080; line-height: 1.55; }
          .btn-back-list {
            margin-top: 16px; width: 100%; height: 52px; border-radius: 14px;
            background: #1C283C; color: #E39548;
            font-size: 15px; font-weight: 700; font-family: 'Sora', sans-serif;
            border: 1px solid rgba(227,149,72,.18); cursor: pointer;
            box-shadow: 0 2px 14px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.04);
          }
        `}</style>
        <div className="pc-page">
          <div className="pc-scroll">
            <button className="back-btn" onClick={() => { setView('list'); setSel(null); }}>‹ All Prompts</button>
            <div className="q-cat-chip" style={{ background: `${catColor}18`, color: catColor, border: `1px solid ${catColor}40` }}>
              {q.category}
            </div>
            <div className="q-card">
              <div className="q-text">{q.scenarioText}</div>
            </div>
            <div className="opts">
              {q.optionsJson.map((opt, i) => {
                let cls = 'opt-btn';
                if (ans) {
                  if (i === selected && ans.isCorrect)  cls += ' correct';
                  if (i === selected && !ans.isCorrect) cls += ' wrong';
                  if (i !== selected)                   cls += ' dim';
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
              <div className="result-block">
                <div className={`result-badge ${ans.isCorrect ? 'win' : 'warn'}`}>
                  {ans.isCorrect
                    ? <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg> Best prompt selected! +{ans.pointsAwarded} pts</>
                    : <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg> Good choice — not the best prompt. +{ans.pointsAwarded} pts</>
                  }
                </div>
                {(ans.explanation ?? q.explanation) && (
                  <div className="result-explanation">
                    <div className="result-exp-label">Why this answer</div>
                    <div className="result-exp-text">{ans.explanation ?? q.explanation}</div>
                  </div>
                )}
                <button className="btn-next" onClick={() => goToNext(q.id)}>
                  Next Prompt →
                </button>
                <button className="btn-back-list" onClick={() => { setView('list'); setSel(null); }}>
                  Back to All Prompts
                </button>
              </div>
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
          display: flex; align-items: center; gap: 6px; width: 100%;
          font-size: 15px; font-weight: 600; color: var(--amber);
          background: var(--bg); border: none; cursor: pointer;
          padding: 10px 0 8px; margin-bottom: 8px;
          position: sticky; top: 0; z-index: 10;
        }
        .page-title {
          font-family: 'Sora', sans-serif; font-size: 26px; font-weight: 700;
          color: #CCDEE7; letter-spacing: .02em; text-transform: uppercase; margin: 0 0 4px;
        }
        .pc-intro {
          font-size: 15px; color: rgba(204,222,231,.55); line-height: 1.65;
          margin: 0 0 10px;
        }
        .page-sub { font-size: 13px; font-weight: 600; color: rgba(204,222,231,.45); margin: 0 0 6px; }
        .progress-bar-wrap {
          height: 4px; background: rgba(255,255,255,.10); border-radius: 4px;
          margin-bottom: 20px; overflow: hidden;
        }
        .progress-bar-fill {
          height: 100%; background: linear-gradient(90deg, #E39548, #D4A017);
          border-radius: 4px; transition: width .4s ease;
        }
        .pc-card {
          background: var(--metallic); border: 1.5px solid rgba(255,255,255,.45);
          border-radius: var(--r-lg); padding: 16px 18px; margin-bottom: 10px;
          box-shadow: var(--shadow-card); cursor: pointer; transition: all var(--tr);
          display: flex; align-items: center; gap: 14px;
        }
        .pc-card:active { transform: scale(.98); }
        .pc-card.done { opacity: .75; }
        .pc-cat-chip {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 10px; font-weight: 700; letter-spacing: .07em;
          text-transform: uppercase; border-radius: 20px; padding: 4px 10px;
          border: 1px solid; flex-shrink: 0; width: fit-content;
        }
        .pc-cat-chip::before {
          content: ''; width: 4px; height: 4px; border-radius: 50%;
          background: currentColor; flex-shrink: 0; opacity: .85;
        }
        .pc-card-text { flex: 1; min-width: 0; }
        .pc-card-title { font-size: 15px; font-weight: 700; color: #1C283C; margin-bottom: 4px; line-height: 1.35; }
        .pc-card-sub { font-size: 13px; color: #4a6080; }
        .pc-done-icon { flex-shrink: 0; color: var(--green); }
        .pc-chev { flex-shrink: 0; color: var(--t4); }
      `}</style>
      <div className="pc-page">
        <div className="pc-scroll">
          <button className="back-btn" onClick={() => router.back()}>‹ Activities</button>
          <h1 className="page-title">Prompt Challenge</h1>
          <p className="pc-intro">Five real-world title industry scenarios. Each question presents four AI prompt options. Select the most effective one for the situation. Every answer earns points; the sharpest choice earns the most.</p>
          <p className="page-sub">{totalPts} / 100 pts · {answered.size} of {questions.length} answered</p>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${Math.min(100, (totalPts / 100) * 100)}%` }} />
          </div>
          {questions.map((q) => {
            const ans = answered.get(q.id);
            const catColor = CATEGORY_COLORS[q.category] ?? '#E39548';
            return (
              <div key={q.id} className={`pc-card${ans ? ' done' : ''}`} onClick={() => { if (!ans) { setView({ question: q }); setSel(null); } }}>
                <div className="pc-card-text">
                  <div className="pc-cat-chip" style={{ color: catColor, borderColor: `${catColor}40`, background: `${catColor}10` }}>{q.category}</div>
                  <div className="pc-card-title" style={{ marginTop: 6 }}>{q.scenarioText.slice(0, 85)}{q.scenarioText.length > 85 ? '…' : ''}</div>
                  {ans && <div className="pc-card-sub">{ans.isCorrect ? `Correct! +${ans.pointsAwarded} pts earned` : `Answered, +${ans.pointsAwarded} pts`}</div>}
                </div>
                {ans
                  ? <div className="pc-done-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg></div>
                  : <div className="pc-chev"><svg width="16" height="16" viewBox="0 0 12 12" fill="none"><path d="M4.5 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                }
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
