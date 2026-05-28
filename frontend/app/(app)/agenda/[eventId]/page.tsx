'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAgendaEvent, postSessionFeedback, getSessionFeedbackStatus, type Speaker } from '@/lib/api/agenda';
import { V7_EVENTS } from '@/lib/v7-agenda';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function SessionDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { eventId } = use(params);
  const [rating, setRating]   = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: apiEvent } = useQuery({
    queryKey: ['agenda-event', eventId],
    queryFn: () => getAgendaEvent(eventId),
    staleTime: 300_000,
    retry: false,
  });
  const event = apiEvent ?? V7_EVENTS.find((e) => e.id === eventId);

  const { data: feedbackStatus } = useQuery({
    queryKey: ['agenda-feedback', eventId],
    queryFn: () => getSessionFeedbackStatus(eventId),
    staleTime: 300_000,
    retry: false,
  });
  const submitted = feedbackStatus?.submitted ?? false;

  async function handleFeedback() {
    if (!rating || !event) return;
    setLoading(true);
    try {
      await postSessionFeedback(event.id, { ratings: { overall: rating }, comment });
      queryClient.invalidateQueries({ queryKey: ['agenda-feedback', eventId] });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        .detail-page { position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden; }
        .detail-scroll {
          flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
          padding: 20px 18px calc(20px + var(--nav-h) + env(safe-area-inset-bottom, 0px) + 90px);
        }
        .back-btn {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 15px; font-weight: 600; color: var(--amber);
          background: none; border: none; cursor: pointer; margin-bottom: 20px; padding: 0;
        }
        .session-title {
          font-family: 'Sora', sans-serif;
          font-size: 24px; font-weight: 700; color: #CCDEE7; margin: 0 0 14px; line-height: 1.2;
        }
        .event-meta {
          display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;
        }
        .event-meta-row {
          display: flex; align-items: center; gap: 8px;
          font-size: 14px; font-weight: 600; color: rgba(204,222,231,.70);
        }
        .event-meta-icon { flex-shrink: 0; color: var(--amber); }
        .desc-card {
          background: var(--metallic); border: 1.5px solid rgba(255,255,255,.45);
          border-radius: var(--r-lg); padding: 18px; margin-bottom: 20px;
          box-shadow: var(--shadow-card);
        }
        .desc-subtitle {
          font-family: 'Sora', sans-serif;
          font-size: 16px; font-weight: 700; color: #1C283C;
          line-height: 1.3; margin: 0 0 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(28,40,60,.10);
        }
        .desc-text { font-size: 15px; color: #4a6080; line-height: 1.6; margin: 0 0 10px; }
        .desc-text:last-child { margin-bottom: 0; }
        .speakers-section { margin-top: 18px; padding-top: 14px; border-top: 1px solid rgba(28,40,60,.08); }
        .speakers-label {
          font-size: 11px; font-weight: 800; letter-spacing: .10em;
          text-transform: uppercase; color: rgba(28,40,60,.45); margin-bottom: 14px;
        }
        .speaker-row { display: flex; flex-direction: column; gap: 12px; }
        .speaker-item { padding-bottom: 12px; border-bottom: 1px dashed rgba(28,40,60,.08); }
        .speaker-item:last-child { border-bottom: none; padding-bottom: 0; }
        .speaker-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
        .speaker-avatar {
          width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0;
          overflow: hidden; background: rgba(227,149,72,.15);
          display: flex; align-items: center; justify-content: center;
        }
        .speaker-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .speaker-initials {
          font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700; color: #E39548;
        }
        .speaker-name { font-size: 15px; font-weight: 700; color: #1C283C; margin-bottom: 2px; }
        .speaker-title-text { font-size: 13px; font-weight: 400; color: #4a6080; }
        .speaker-bio { font-size: 14px; color: #4a6080; line-height: 1.55; }
        .desc-bullets {
          list-style: none; margin: 6px 0 0; padding: 0;
          display: flex; flex-direction: column; gap: 10px;
        }
        .desc-bullet {
          display: flex; align-items: flex-start; gap: 10px;
          font-size: 15px; color: #4a6080; line-height: 1.55;
        }
        .desc-bullet::before {
          content: '';
          flex-shrink: 0;
          width: 6px; height: 6px; border-radius: 50%;
          background: #E39548;
          margin-top: 7px;
        }
        .feedback-card {
          background: var(--metallic); border: 1.5px solid rgba(255,255,255,.45);
          border-radius: var(--r-lg); padding: 18px; box-shadow: var(--shadow-card);
        }
        .feedback-title {
          font-family: 'Sora', sans-serif;
          font-size: 13px; font-weight: 800; color: #1C283C;
          text-transform: uppercase; letter-spacing: .08em; margin-bottom: 12px;
        }
        .stars { display: flex; gap: 8px; margin-bottom: 14px; }
        .star {
          font-size: 30px; cursor: pointer;
          transition: transform .1s; filter: grayscale(1);
        }
        .star.lit { filter: grayscale(0); transform: scale(1.1); }
        .star:active { transform: scale(.9); }
        .fb-textarea {
          width: 100%; min-height: 90px;
          background: rgba(28,40,60,.06); border: 1.5px solid rgba(28,40,60,.12);
          border-radius: 12px; padding: 12px 14px;
          font-size: 15px; color: #1C283C; font-family: 'Sora', sans-serif;
          resize: none; outline: none; margin-bottom: 14px;
          transition: border-color var(--tr);
        }
        .fb-textarea:focus { border-color: #E39548; box-shadow: 0 0 0 3px rgba(227,149,72,.12); }
        .btn-fb {
          width: 100%; height: 50px; border-radius: 12px;
          background: #1C283C; color: #E39548;
          font-size: 15px; font-weight: 700; font-family: 'Sora', sans-serif;
          border: 1px solid rgba(227,149,72,.18); cursor: pointer;
          box-shadow: 0 2px 14px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.04);
          transition: background .15s;
        }
        .btn-fb:hover { background: #243352; }
        .btn-fb:disabled { opacity: .5; }
        .done-msg {
          display: flex; align-items: center; gap: 8px;
          font-size: 15px; font-weight: 600; color: var(--green);
          padding: 8px 0;
        }
        .skeleton {
          background: rgba(255,255,255,.08); border-radius: 8px; height: 20px; margin-bottom: 10px;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0%, 100% { opacity: .5; }
          50% { opacity: 1; }
        }
      `}</style>

      <div className="detail-page">
        <div className="detail-scroll">
          <button className="back-btn" onClick={() => router.back()}>‹ Agenda</button>

          {event ? (
            <>
              <h1 className="session-title">{event.name}</h1>
              <div className="event-meta">
                <div className="event-meta-row">
                  <svg className="event-meta-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {formatTime(event.startsAt)} – {formatTime(event.endsAt)}
                </div>
                {event.location && (
                  <div className="event-meta-row">
                    <svg className="event-meta-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {event.location}
                  </div>
                )}
              </div>

              {event.description && (
                <div className="desc-card">
                  {event.description.split('\n\n').map((block, i) => {
                    const lines = block.split('\n');
                    const bullets = lines.filter((l) => l.startsWith('•'));
                    const prose = lines.filter((l) => !l.startsWith('•'));
                    // First block with no bullets → styled subtitle
                    if (i === 0 && bullets.length === 0) {
                      return <p key={i} className="desc-subtitle">{block}</p>;
                    }
                    return (
                      <div key={i}>
                        {prose.map((line, j) => line.trim() && (
                          <p key={j} className="desc-text">{line}</p>
                        ))}
                        {bullets.length > 0 && (
                          <ul className="desc-bullets">
                            {bullets.map((b, j) => (
                              <li key={j} className="desc-bullet">{b.replace(/^•\s*/, '')}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {event.speakers && event.speakers.length > 0 && (
                <div className="desc-card" style={{ marginBottom: 20 }}>
                  <div className="speakers-section" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                    <div className="speakers-label">Speakers</div>
                    <div className="speaker-row">
                      {event.speakers.map((sp: Speaker, i: number) => (
                        <div key={i} className="speaker-item">
                          <div className="speaker-header">
                            <div className="speaker-avatar">
                              {sp.photoUrl
                                ? <img src={sp.photoUrl} alt={sp.name} />
                                : <span className="speaker-initials">{sp.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
                              }
                            </div>
                            <div>
                              <div className="speaker-name">{sp.name}</div>
                              <div className="speaker-title-text">{sp.title}</div>
                            </div>
                          </div>
                          <div className="speaker-bio">{sp.bio}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Feedback */}
              <div className="feedback-card">
                <div className="feedback-title">Rate this session</div>
                {submitted ? (
                  <div className="done-msg">✓ Thanks for your feedback!</div>
                ) : (
                  <>
                    <div className="stars">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} className={`star${rating >= n ? ' lit' : ''}`} onClick={() => setRating(n)}>⭐</span>
                      ))}
                    </div>
                    <textarea
                      className="fb-textarea"
                      placeholder="Any comments? (optional)"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    <button className="btn-fb" onClick={handleFeedback} disabled={!rating || loading}>
                      {loading ? 'Submitting…' : 'Submit Feedback'}
                    </button>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="skeleton" style={{ width: '70%', height: 28 }} />
              <div className="skeleton" style={{ width: '50%' }} />
              <div className="skeleton" style={{ height: 80 }} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
