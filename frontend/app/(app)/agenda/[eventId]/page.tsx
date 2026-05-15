'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getAgendaEvent, postSessionFeedback } from '@/lib/api/agenda';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function SessionDetailPage({ params }: { params: { eventId: string } }) {
  const router = useRouter();
  const [rating, setRating]   = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setDone]  = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: event } = useQuery({
    queryKey: ['agenda-event', params.eventId],
    queryFn: () => getAgendaEvent(params.eventId),
    staleTime: 300_000,
  });

  async function handleFeedback() {
    if (!rating || !event) return;
    setLoading(true);
    try {
      await postSessionFeedback(event.id, { rating, comment });
      setDone(true);
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
          font-size: 15px; font-weight: 600; color: var(--blue);
          background: none; border: none; cursor: pointer; margin-bottom: 20px; padding: 0;
        }
        .session-title {
          font-family: 'Sora', sans-serif;
          font-size: 24px; font-weight: 700; color: var(--navy); margin: 0 0 14px; line-height: 1.2;
        }
        .meta-row {
          display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;
        }
        .meta-chip {
          display: inline-flex; align-items: center; gap: 6px;
          background: var(--surface2); border: 1px solid var(--border-metal);
          border-radius: 20px; padding: 6px 12px;
          font-size: 13px; font-weight: 600; color: var(--t2);
        }
        .desc-card {
          background: var(--surface); border: 1.5px solid var(--border);
          border-radius: var(--r-lg); padding: 18px; margin-bottom: 20px;
          box-shadow: var(--shadow-xs);
        }
        .desc-text { font-size: 15px; color: var(--t2); line-height: 1.6; }
        .feedback-card {
          background: var(--surface); border: 1.5px solid var(--border);
          border-radius: var(--r-lg); padding: 18px; box-shadow: var(--shadow-xs);
        }
        .feedback-title {
          font-family: 'Sora', sans-serif;
          font-size: 16px; font-weight: 700; color: var(--navy); margin-bottom: 12px;
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
          background: var(--surface2); border: 1.5px solid var(--border-metal);
          border-radius: 12px; padding: 12px 14px;
          font-size: 15px; color: var(--t); font-family: 'DM Sans', sans-serif;
          resize: none; outline: none; margin-bottom: 14px;
          transition: border-color var(--tr);
        }
        .fb-textarea:focus { border-color: var(--cyan); }
        .btn-fb {
          width: 100%; height: 50px; border-radius: 12px;
          background: var(--blue); color: #fff;
          font-size: 16px; font-weight: 700; font-family: 'Sora', sans-serif;
          border: none; cursor: pointer; box-shadow: var(--shadow-blue);
          transition: opacity var(--tr);
        }
        .btn-fb:disabled { opacity: .5; }
        .done-msg {
          display: flex; align-items: center; gap: 8px;
          font-size: 15px; font-weight: 600; color: var(--green);
          padding: 8px 0;
        }
        .skeleton {
          background: var(--surface2); border-radius: 8px; height: 20px; margin-bottom: 10px;
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
              <div className="meta-row">
                <span className="meta-chip">🕐 {formatTime(event.starts_at)} – {formatTime(event.ends_at)}</span>
                {event.location && <span className="meta-chip">📍 {event.location}</span>}
                {event.speaker && <span className="meta-chip">👤 {event.speaker}</span>}
                <span className="meta-chip">📅 Day {event.day}</span>
              </div>

              {event.description && (
                <div className="desc-card">
                  <p className="desc-text">{event.description}</p>
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
