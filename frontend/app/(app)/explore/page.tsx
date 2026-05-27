'use client';

import { useState, useRef, useCallback } from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullIndicator } from '@/components/PullIndicator';

interface Initiative {
  name: string;
  team: string;
  mono: string;
  color: string;
  bg: string;
  shortDesc: string;
  what: string;
  audience: string;
  why: string;
  rollout: string;
}

const INITIATIVES: Initiative[] = [
  {
    name: 'eRemit',
    team: 'Payments · Built with Verndale',
    mono: 'eR',
    color: '#067a98',
    bg: '#c2e9f3',
    shortDesc: 'Digital remittance payments for title agents. No manual steps, no back-and-forth.',
    what: 'A platform that lets title agents pay their remittances directly to WFG, eliminating manual wire transfers and reducing errors.',
    audience: 'Title agents and office managers processing monthly remittances.',
    why: 'Manual remittance processes are error-prone, time-consuming, and frustrating. eRemit automates the entire workflow.',
    rollout: 'Live and in use. Visit the ATS kiosk for a walkthrough demo.',
  },
  {
    name: 'FieldIQ',
    team: 'Field Sales Intelligence · Live',
    mono: 'FQ',
    color: '#a45f0a',
    bg: '#f5d8b0',
    shortDesc: 'AI-powered tracking for every field activity: lunches, pop-bys, CE classes, and more.',
    what: 'Captures and analyzes every field activity that title agents perform. Relationship work that never got tracked before now becomes actionable data.',
    audience: 'Title agents and sales representatives doing field business development.',
    why: 'Field sales activities are invisible to management and hard to correlate with results. FieldIQ changes that.',
    rollout: 'Live. Ask the ATS team for a demo at the Innovation Hub kiosk.',
  },
  {
    name: 'My Home Prompt',
    team: 'WFG Advisory · AI Homebuyer Guide',
    mono: 'mH',
    color: '#1d4dd9',
    bg: '#d0e2ff',
    shortDesc: 'AI-guided support for homebuyers through every step of a real estate transaction.',
    what: 'Gives homebuyers and real estate agents AI-guided assistance through the full transaction lifecycle, from offer to close.',
    audience: 'Homebuyers, real estate agents, and title companies using WFG.',
    why: 'The homebuying process is confusing. My Home Prompt makes it transparent, guided, and human.',
    rollout: 'In development. Launching 2026.',
  },
];

const ALSO_IN_WORKS = [
  'Fraud Detection Tools',
  'Intelligence Briefs',
  'AI Toolkit',
  'Title Survey Processing',
  'FAR/BAR Deadline Tracker',
];

export default function ExplorePage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const onRefresh = useCallback(async () => {}, []);
  const indicatorRef = usePullToRefresh(scrollRef, onRefresh);

  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});

  function toggleInit(i: number) {
    setOpenIdx((prev) => (prev === i ? null : i));
  }

  function submitNote(i: number) {
    if (!notes[i]?.trim()) return;
    setSaved((prev) => ({ ...prev, [i]: true }));
  }

  function editNote(i: number) {
    setSaved((prev) => ({ ...prev, [i]: false }));
  }

  return (
    <>
      <style>{`
        .explore-page {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .explore-header {
          padding: 20px 18px 0;
          flex-shrink: 0;
        }
        .page-title {
          font-family: 'Sora', sans-serif;
          font-size: 26px; font-weight: 700;
          color: var(--t); letter-spacing: .02em;
          text-transform: uppercase; margin: 0 0 6px;
        }
        .explore-subtitle {
          font-size: 17px; color: var(--t3); margin: 6px 0 14px;
          line-height: 1.6;
        }
        .explore-scroll {
          flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
          padding: 0 18px calc(20px + var(--nav-h) + env(safe-area-inset-bottom, 0px) + 96px);
          overscroll-behavior: contain;
        }
        .sec-label {
          font-size: 12px; font-weight: 800; letter-spacing: .08em;
          text-transform: uppercase; color: var(--steel); margin-bottom: 12px;
        }

        /* ── Initiative cards ───────────────── */
        .init-card {
          background: var(--metallic);
          border: 1.5px solid rgba(255,255,255,.45);
          border-radius: var(--r);
          margin-bottom: 14px;
          box-shadow: var(--shadow-card);
          overflow: hidden;
          transition: box-shadow .2s, border-color .2s;
        }
        .init-card.open {
          box-shadow: var(--shadow-card), 0 0 0 1px rgba(227,149,72,.20);
          border-color: rgba(227,149,72,.40);
        }
        .init-header {
          display: flex; align-items: center; gap: 16px;
          padding: 18px;
          cursor: pointer;
          transition: opacity .15s;
          min-height: 80px;
        }
        .init-header:active { opacity: .88; }
        .init-icon {
          width: 54px; height: 54px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          border: 1px solid rgba(255,255,255,.4);
          box-shadow: 0 1px 2px rgba(10,24,64,.06), inset 0 1px 0 rgba(255,255,255,.4);
        }
        .init-name {
          font-family: 'Sora', sans-serif;
          font-size: 20px; font-weight: 700;
          letter-spacing: -.015em; color: var(--t);
        }
        .init-team {
          font-size: 14px; font-weight: 700;
          color: var(--t3);
          letter-spacing: .04em; text-transform: uppercase;
          margin-top: 4px;
        }
        .init-short-desc {
          font-size: 17px; color: var(--t2);
          padding: 0 18px 18px;
          line-height: 1.6;
        }
        .init-chevron {
          margin-left: auto; flex-shrink: 0;
          color: var(--t4); transition: transform .25s, color .25s;
        }
        .init-card.open .init-chevron {
          transform: rotate(180deg);
          color: var(--amber);
        }
        .init-expand {
          max-height: 0; overflow: hidden;
          transition: max-height .42s cubic-bezier(.4,0,.2,1);
        }
        .init-card.open .init-expand { max-height: 900px; }
        .init-expand-body {
          padding: 16px 18px 18px;
          border-top: 1px solid rgba(0,0,0,.10);
          background: rgba(0,0,0,.04);
        }
        .init-detail-row { margin-bottom: 14px; }
        .init-detail-label {
          font-family: 'Sora', sans-serif;
          font-size: 12px; font-weight: 800;
          text-transform: uppercase; letter-spacing: .10em;
          color: var(--steel);
          margin-bottom: 6px;
        }
        .init-detail-val { font-size: 17px; color: var(--t2); line-height: 1.65; }
        .init-video-holder {
          background:
            radial-gradient(ellipse 60% 45% at 70% 30%, rgba(6,182,212,.25), transparent 60%),
            linear-gradient(135deg, var(--navy) 0%, #1a3380 100%);
          border-radius: 12px;
          height: 140px;
          margin-bottom: 16px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          border: 1px solid rgba(6,182,212,.25);
          position: relative; overflow: hidden;
          box-shadow: 0 1px 2px rgba(10,24,64,.06);
        }
        .init-splash-btn {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          background: linear-gradient(135deg, rgba(227,149,72,.20), rgba(227,149,72,.12));
          color: var(--amber);
          border: 1.5px solid rgba(227,149,72,.38);
          border-radius: 12px;
          padding: 14px 18px;
          font-family: inherit; font-size: 15px; font-weight: 700;
          cursor: pointer;
          transition: all .15s;
          width: 100%; margin-top: 12px;
          min-height: 50px;
          box-shadow: 0 1px 4px rgba(227,149,72,.15);
        }
        .init-splash-btn:active { opacity: .88; }

        /* ── Notes section ───────────────── */
        .init-notes {
          margin-top: 14px;
          padding: 16px 18px;
          border-radius: 14px;
          background: rgba(0,0,0,.07);
          border: 1px solid rgba(0,0,0,.10);
        }
        .init-notes-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px; gap: 10px;
        }
        .init-notes-label {
          font-family: 'Sora', sans-serif;
          font-size: 13px; font-weight: 800;
          letter-spacing: .08em; text-transform: uppercase;
          color: var(--steel);
          display: flex; align-items: center; gap: 8px;
        }
        .init-notes-textarea {
          width: 100%;
          background: rgba(255,255,255,.62);
          border: 1.5px solid rgba(0,0,0,.14);
          border-radius: 12px;
          font-family: inherit;
          font-size: 16px;
          color: #0d1e38;
          padding: 14px 16px;
          resize: none;
          line-height: 1.55;
          outline: none;
          min-height: 80px;
          transition: border-color var(--tr), box-shadow var(--tr);
        }
        .init-notes-textarea::placeholder { color: #7a8eae; }
        .init-notes-textarea:focus {
          border-color: var(--amber);
          background: rgba(255,255,255,.80);
          box-shadow: 0 0 0 4px rgba(227,149,72,.12);
        }
        .init-notes-submit-wrap {
          display: flex; flex-direction: column; align-items: center;
          margin-top: 10px; gap: 6px;
        }
        .init-notes-submit {
          width: 100%;
          padding: 12px 18px;
          border-radius: 10px;
          background: linear-gradient(180deg, #F0A55A, #E39548, #D07B38);
          color: #1C283C; border: none; cursor: pointer;
          font-family: inherit; font-size: 14px; font-weight: 700;
          min-height: 44px;
          box-shadow: 0 4px 14px rgba(227,149,72,.40);
        }
        .init-notes-submit:active { opacity: .88; }
        .init-notes-disclaimer {
          font-size: 11px; color: var(--t2);
          text-align: center; margin: 0;
        }
        .init-notes-saved {
          display: flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, var(--green-lt), #c8efd9);
          color: var(--green);
          border: 1px solid rgba(20,102,54,.18);
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 15px; font-weight: 600;
        }
        .edit-note-btn {
          margin-left: auto; background: none; border: none;
          color: var(--green); font-family: inherit;
          font-size: 14px; font-weight: 700;
          cursor: pointer; text-decoration: underline;
        }

        /* ── Also in the works card ───────── */
        .also-card {
          background: var(--metallic);
          border: 1.5px solid rgba(255,255,255,.45);
          border-radius: var(--r);
          padding: 18px;
          margin-top: 6px; margin-bottom: 10px;
          box-shadow: var(--shadow-card);
        }
        .also-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(0,0,0,.09);
        }
        .also-item:last-child { border-bottom: none; }
        .also-dot {
          width: 9px; height: 9px; border-radius: 50%;
          background: var(--gold); flex-shrink: 0;
          box-shadow: 0 0 8px rgba(212,160,23,.4);
        }
        .also-text { font-size: 17px; font-weight: 600; color: var(--t2); }
        .explore-gap { height: 28px; }
      `}</style>

      <div className="explore-page">
        <PullIndicator ref={indicatorRef} />
        <div className="explore-header">
          <h1 className="page-title">Explore</h1>
          <p className="explore-subtitle">Discover what ATS is building for the title industry.</p>
        </div>

        <div className="explore-scroll" ref={scrollRef}>
          <div className="sec-label">ATS AI Initiatives</div>

          {INITIATIVES.map((it, i) => (
            <div key={i} className={`init-card${openIdx === i ? ' open' : ''}`} id={`init_${i}`}>
              <div className="init-header" onClick={() => toggleInit(i)}>
                <div className="init-icon" style={{ background: it.bg, color: it.color }}>
                  <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: '-.02em' }}>
                    {it.mono}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="init-name">{it.name}</div>
                  <div className="init-team">{it.team}</div>
                </div>
                <svg className="init-chevron" viewBox="0 0 12 12" fill="none" width="18" height="18">
                  <path d="M2.5 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <div className="init-short-desc">{it.shortDesc}</div>

              <div className="init-expand" id={`initExp_${i}`}>
                <div className="init-expand-body">
                  <div className="init-video-holder">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,.16)', border: '2px solid rgba(255,255,255,.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 18px rgba(6,182,212,.30)' }}>
                        <svg viewBox="0 0 16 16" fill="white" width="20" height="20">
                          <polygon points="5,3 13,8 5,13"/>
                        </svg>
                      </div>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,.66)', fontWeight: 500 }}>Demo video coming soon</span>
                    </div>
                  </div>

                  <div className="init-detail-row">
                    <div className="init-detail-label">What it does</div>
                    <div className="init-detail-val">{it.what}</div>
                  </div>
                  <div className="init-detail-row">
                    <div className="init-detail-label">Audience</div>
                    <div className="init-detail-val">{it.audience}</div>
                  </div>
                  <div className="init-detail-row">
                    <div className="init-detail-label">Why we built it</div>
                    <div className="init-detail-val">{it.why}</div>
                  </div>
                  <div className="init-detail-row">
                    <div className="init-detail-label">Rollout</div>
                    <div className="init-detail-val">{it.rollout}</div>
                  </div>

                  <div className="init-notes">
                    <div className="init-notes-head">
                      <div className="init-notes-label">
                        <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                          <path d="M4 3h6l2 2v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                          <path d="M5.5 7h5M5.5 9.5h5M5.5 12h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                        Live Notes for ATS
                      </div>
                    </div>

                    {saved[i] ? (
                      <div className="init-notes-saved">
                        <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                          <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Sent to ATS · You can update anytime.
                        <button className="edit-note-btn" onClick={() => editNote(i)}>Edit</button>
                      </div>
                    ) : (
                      <>
                        <textarea
                          className="init-notes-textarea"
                          placeholder="Share thoughts, ideas or questions about this product"
                          value={notes[i] || ''}
                          onChange={(e) => setNotes((prev) => ({ ...prev, [i]: e.target.value }))}
                        />
                        <div className="init-notes-submit-wrap">
                          <button className="init-notes-submit" onClick={() => submitNote(i)}>Send to ATS</button>
                          <p className="init-notes-disclaimer">Only the ATS team reads this!</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="also-card">
            <div className="sec-label" style={{ marginBottom: 14 }}>Also in the works</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {ALSO_IN_WORKS.map((t) => (
                <div key={t} className="also-item">
                  <div className="also-dot" />
                  <span className="also-text">{t}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="explore-gap" />
        </div>
      </div>
    </>
  );
}
