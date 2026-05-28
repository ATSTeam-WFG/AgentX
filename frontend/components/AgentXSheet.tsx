'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useUiStore } from '@/store/ui';
import { apiFetch } from '@/lib/api';

interface Message {
  role: 'ai' | 'user';
  text: string;
}

const QUICK_ACTIONS = [
  "What's on the agenda today?",
  "Where's the next session?",
  "Show leaderboard",
  "Help me earn points",
];

const INITIAL_MESSAGES: Message[] = [
  { role: 'ai', text: "Hi! I'm Agent X, your personal summit companion. How can I help you today?" },
];

function renderMarkdown(text: string) {
  return text.split('\n').map((line, i) => {
    const parts = line.split(/(\*\*[^*\n]+\*\*)/g).map((part, j) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={j}>{part.slice(2, -2)}</strong>
        : <span key={j}>{part}</span>
    );
    return <span key={i}>{i > 0 && <br />}{parts}</span>;
  });
}

export default function AgentXSheet() {
  const sheetOpen = useUiStore((s) => s.sheetOpen);
  const closeSheet = useUiStore((s) => s.closeSheet);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sheetOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sheetOpen, messages, thinking]);

  async function handleSend(text: string) {
    if (!text.trim() || thinking) return;
    const userMsg = text.trim();
    const updatedMessages = [...messages, { role: 'user' as const, text: userMsg }];
    setMessages(updatedMessages);
    setInput('');
    setThinking(true);
    try {
      const history = updatedMessages.slice(0, -1).slice(-10).map((m) => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.text,
      }));
      const res = await apiFetch<{ reply: string }>('/v1/chat/message', {
        method: 'POST',
        body: JSON.stringify({ message: userMsg, history }),
      });
      setMessages((prev) => [...prev, { role: 'ai', text: res.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: "Agent X is momentarily unavailable. Please try again." },
      ]);
    } finally {
      setThinking(false);
    }
  }

  if (!sheetOpen) return null;

  return (
    <>
      <style>{`
        .ax-overlay {
          position: fixed;
          inset: 0;
          background: rgba(6,12,24,.80);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 300;
          display: flex;
          align-items: flex-end;
        }
        .ax-sheet {
          width: 100%;
          max-height: 84vh;
          background: #0E1825;
          border-radius: 28px 28px 0 0;
          border-top: 1.5px solid rgba(212,160,23,.35);
          box-shadow:
            0 -16px 60px rgba(0,0,0,.65),
            0 -1px 0 rgba(212,160,23,.20),
            inset 0 1px 0 rgba(255,255,255,.05);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }
        .ax-handle {
          width: 36px; height: 4px;
          background: rgba(255,255,255,.12);
          border-radius: 2px;
          margin: 10px auto 0;
          flex-shrink: 0;
        }
        .ax-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px 14px;
          background: rgba(255,255,255,.03);
          border-bottom: 1px solid rgba(255,255,255,.07);
          flex-shrink: 0;
        }
        .ax-avatar {
          width: 48px; height: 48px;
          border-radius: 50%;
          object-fit: cover;
          border: 1.5px solid rgba(212,160,23,.40);
          box-shadow:
            0 0 0 3px rgba(212,160,23,.08),
            0 4px 12px rgba(0,0,0,.35);
        }
        .ax-header-info { flex: 1; }
        .ax-name {
          font-family: 'Sora', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #CCDEE7;
          letter-spacing: .01em;
        }
        .ax-status {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: rgba(204,222,231,.45);
          margin-top: 2px;
        }
        .ax-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px rgba(34,197,94,.60);
        }
        .ax-close {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: rgba(255,255,255,.07);
          border: 1px solid rgba(255,255,255,.10);
          color: rgba(204,222,231,.55);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px;
          cursor: pointer;
          transition: background .15s, color .15s;
          font-family: inherit;
        }
        .ax-close:active { background: rgba(255,255,255,.14); color: #CCDEE7; }
        .ax-msgs {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 18px 16px 10px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .ax-msgs::-webkit-scrollbar { display: none; }

        /* AI bubble — dark navy with readable light text */
        .owl-bubble.ai {
          max-width: 86%;
          padding: 12px 16px;
          border-radius: 18px;
          border-bottom-left-radius: 4px;
          font-size: 15px;
          line-height: 1.60;
          background: linear-gradient(145deg, #1C2E48, #1A2A42);
          color: rgba(204,222,231,.92);
          border: 1px solid rgba(212,160,23,.14);
          align-self: flex-start;
          box-shadow: 0 2px 14px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.04);
        }
        .owl-bubble.ai strong {
          color: #D4A017;
          font-weight: 700;
        }

        /* User bubble — amber gradient */
        .owl-bubble.user {
          max-width: 82%;
          padding: 11px 16px;
          border-radius: 18px;
          border-bottom-right-radius: 4px;
          font-size: 15px;
          line-height: 1.50;
          background: linear-gradient(135deg, #F0A55A, #E08A38);
          color: #0E1825;
          align-self: flex-end;
          box-shadow: 0 2px 12px rgba(227,149,72,.28);
          font-weight: 500;
        }

        /* Quick action buttons */
        .ax-qbtns {
          display: flex;
          gap: 7px;
          padding: 10px 16px 8px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          flex-shrink: 0;
          border-top: 1px solid rgba(255,255,255,.05);
        }
        .ax-qbtns::-webkit-scrollbar { display: none; }
        .owl-qbtn {
          white-space: nowrap;
          font-size: 12px;
          font-weight: 600;
          color: rgba(212,160,23,.90);
          background: rgba(212,160,23,.08);
          border: 1px solid rgba(212,160,23,.22);
          border-radius: 20px;
          padding: 6px 13px;
          cursor: pointer;
          transition: background .15s, color .15s;
          flex-shrink: 0;
          font-family: inherit;
        }
        .owl-qbtn:active {
          background: rgba(212,160,23,.18);
          color: #D4A017;
        }

        /* Input row */
        .ax-input-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px calc(12px + env(safe-area-inset-bottom, 0px));
          border-top: 1px solid rgba(255,255,255,.06);
          background: rgba(0,0,0,.15);
          flex-shrink: 0;
        }
        .owl-input {
          flex: 1;
          background: rgba(255,255,255,.07);
          border: 1.5px solid rgba(255,255,255,.10);
          border-radius: 22px;
          padding: 10px 16px;
          font-size: 15px;
          color: #CCDEE7;
          outline: none;
          font-family: 'DM Sans', sans-serif;
          transition: border-color .2s, box-shadow .2s;
        }
        .owl-input::placeholder { color: rgba(204,222,231,.28); }
        .owl-input:focus {
          border-color: rgba(212,160,23,.45);
          box-shadow: 0 0 0 3px rgba(212,160,23,.10);
        }
        .owl-input:disabled { opacity: .5; }
        .ax-send {
          width: 42px; height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, #D4A017, #B88A12);
          color: #0E1825;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          border: none;
          box-shadow: 0 4px 14px rgba(212,160,23,.35);
          flex-shrink: 0;
          transition: transform .12s, box-shadow .12s;
          font-family: inherit;
        }
        .ax-send:active { transform: scale(.90); box-shadow: 0 2px 8px rgba(212,160,23,.25); }
        .ax-send:disabled { opacity: .4; cursor: not-allowed; transform: none; }

        /* Typing indicator */
        .ax-typing {
          max-width: 68px; padding: 12px 16px;
          border-radius: 18px; border-bottom-left-radius: 4px;
          background: linear-gradient(145deg, #1C2E48, #1A2A42);
          border: 1px solid rgba(212,160,23,.14);
          align-self: flex-start;
          display: flex; align-items: center; gap: 5px;
          box-shadow: 0 2px 14px rgba(0,0,0,.30);
        }
        .ax-typing-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: rgba(212,160,23,.55);
          animation: axDotPulse 1.3s ease-in-out infinite;
        }
        .ax-typing-dot:nth-child(2) { animation-delay: .22s; }
        .ax-typing-dot:nth-child(3) { animation-delay: .44s; }
        @keyframes axDotPulse {
          0%, 80%, 100% { transform: scale(.65); opacity: .35; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div className="ax-overlay" onClick={closeSheet}>
        <div className="ax-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="ax-handle" />

          <div className="ax-header">
            <Image src="https://pub-9849080621014a8e9c12e5989f01a96e.r2.dev/brand/agentx.png" alt="Agent X" width={48} height={48} className="ax-avatar" />
            <div className="ax-header-info">
              <div className="ax-name">Agent X</div>
              <div className="ax-status">
                <span className="ax-dot" />
                Online · Summit AI
              </div>
            </div>
            <button className="ax-close" onClick={closeSheet} aria-label="Close">✕</button>
          </div>

          <div className="ax-msgs" ref={scrollRef}>
            {messages.map((msg, i) => (
              <div key={i} className={`owl-bubble ${msg.role}`}>
                {msg.role === 'ai' ? renderMarkdown(msg.text) : msg.text}
              </div>
            ))}
            {thinking && (
              <div className="ax-typing">
                <div className="ax-typing-dot" />
                <div className="ax-typing-dot" />
                <div className="ax-typing-dot" />
              </div>
            )}
          </div>

          <div className="ax-qbtns">
            {QUICK_ACTIONS.map((q) => (
              <button key={q} className="owl-qbtn" onClick={() => handleSend(q)}>{q}</button>
            ))}
          </div>

          <div className="ax-input-row">
            <input
              className="owl-input"
              type="text"
              placeholder="Ask Agent X anything…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !thinking && handleSend(input)}
              disabled={thinking}
            />
            <button className="ax-send" onClick={() => handleSend(input)} disabled={thinking} aria-label="Send">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22,2 15,22 11,13 2,9" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
