'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useUiStore } from '@/store/ui';

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

export default function AgentXSheet() {
  const sheetOpen = useUiStore((s) => s.sheetOpen);
  const closeSheet = useUiStore((s) => s.closeSheet);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sheetOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sheetOpen, messages]);

  function handleSend(text: string) {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', text: text.trim() }]);
    setInput('');
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: "I'm connecting to the summit data now. Give me a moment!" },
      ]);
    }, 800);
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
          background: linear-gradient(
            145deg,
            #d4dce0 0%,
            #c6ced2 14%,
            #b8c0c3 30%,
            #adb5b7 50%,
            #a2aaad 65%,
            #969ea1 80%,
            #a2aaad 100%
          );
          border-radius: 28px 28px 0 0;
          border-top: 2px solid var(--gold);
          box-shadow:
            0 -16px 60px rgba(0,0,0,.55),
            0 -1px 0 rgba(212,160,23,.30),
            inset 0 1px 0 rgba(255,255,255,.55);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }
        /* Subtle gold glow at top of sheet */
        .ax-sheet::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 100px;
          background: radial-gradient(ellipse 80% 100% at 50% 0%, rgba(212,160,23,.08), transparent);
          pointer-events: none;
          z-index: 0;
        }
        .ax-handle {
          width: 40px; height: 4px;
          background: linear-gradient(90deg, rgba(0,0,0,.12), rgba(0,0,0,.22), rgba(0,0,0,.12));
          border-radius: 2px;
          margin: 10px auto 0;
          flex-shrink: 0;
          position: relative; z-index: 1;
        }
        .ax-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px 12px;
          border-bottom: 1px solid rgba(0,0,0,.10);
          flex-shrink: 0;
          position: relative;
          z-index: 1;
        }
        .ax-avatar {
          width: 64px; height: 64px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(212,160,23,.45);
          box-shadow:
            0 0 0 3px rgba(212,160,23,.12),
            0 4px 12px rgba(0,0,0,.25);
        }
        .ax-header-info { flex: 1; }
        .ax-name {
          font-family: 'Sora', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #0a1840;
        }
        .ax-status {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 13px;
          color: #4a6080;
          margin-top: 1px;
        }
        .ax-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #146636;
          box-shadow: 0 0 6px rgba(20,102,54,.55);
        }
        .ax-close {
          width: 34px; height: 34px;
          border-radius: 50%;
          background: rgba(0,0,0,.10);
          border: 1px solid rgba(0,0,0,.12);
          color: #4a6080;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
          cursor: pointer;
          line-height: 1;
          font-family: inherit;
          transition: background .15s;
        }
        .ax-close:active { background: rgba(0,0,0,.18); }
        .ax-msgs {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          position: relative; z-index: 1;
        }
        .ax-msgs::-webkit-scrollbar { display: none; }
        /* AI bubble: dark navy on metallic */
        .owl-bubble.ai {
          max-width: 84%;
          padding: 11px 15px;
          border-radius: 18px;
          font-size: 15px;
          line-height: 1.45;
          background: rgba(10,24,64,.12);
          color: #0d1e38;
          border: 1px solid rgba(0,0,0,.10);
          border-bottom-left-radius: 4px;
          align-self: flex-start;
          box-shadow: 0 1px 4px rgba(0,0,0,.12);
        }
        /* User bubble: gold gradient */
        .owl-bubble.user {
          max-width: 84%;
          padding: 11px 15px;
          border-radius: 18px;
          font-size: 15px;
          line-height: 1.45;
          background: linear-gradient(135deg, #e8b824, #d4a017);
          color: #0a1840;
          border-bottom-right-radius: 4px;
          align-self: flex-end;
          box-shadow: 0 2px 10px rgba(212,160,23,.30);
          font-weight: 500;
        }
        .ax-qbtns {
          display: flex;
          gap: 8px;
          padding: 0 18px 12px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          flex-shrink: 0;
          position: relative; z-index: 1;
        }
        .ax-qbtns::-webkit-scrollbar { display: none; }
        .owl-qbtn {
          white-space: nowrap;
          font-size: 13px;
          font-weight: 600;
          color: #0a1840;
          background: linear-gradient(135deg, rgba(212,160,23,.22), rgba(194,103,28,.12));
          border: 1px solid rgba(212,160,23,.35);
          border-radius: 20px;
          padding: 7px 14px;
          cursor: pointer;
          transition: background var(--tr);
          flex-shrink: 0;
          font-family: inherit;
          box-shadow: 0 1px 4px rgba(212,160,23,.14);
        }
        .owl-qbtn:active { background: linear-gradient(135deg, rgba(212,160,23,.35), rgba(194,103,28,.22)); }
        .ax-input-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 18px calc(10px + env(safe-area-inset-bottom, 0px));
          border-top: 1px solid rgba(0,0,0,.10);
          background: rgba(0,0,0,.06);
          flex-shrink: 0;
          position: relative; z-index: 1;
        }
        .owl-input {
          flex: 1;
          background: rgba(255,255,255,.45);
          border: 1.5px solid rgba(0,0,0,.14);
          border-radius: 22px;
          padding: 10px 16px;
          font-size: 15px;
          color: #0d1e38;
          outline: none;
          font-family: 'DM Sans', sans-serif;
          box-shadow: inset 0 1px 3px rgba(0,0,0,.08);
        }
        .owl-input::placeholder { color: #7a8eae; }
        .owl-input:focus {
          border-color: var(--gold);
          box-shadow: inset 0 1px 3px rgba(0,0,0,.08), 0 0 0 3px rgba(212,160,23,.15);
        }
        .ax-send {
          width: 44px; height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #e8b824, #d4a017);
          color: #0a1840;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          border: none;
          box-shadow: var(--shadow-gold);
          flex-shrink: 0;
          transition: transform .12s;
          font-family: inherit;
        }
        .ax-send:active { transform: scale(.92); }
      `}</style>

      <div className="ax-overlay" onClick={closeSheet}>
        <div className="ax-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="ax-handle" />

          <div className="ax-header">
            <Image src="/AgentX.png" alt="Agent X" width={64} height={64} className="ax-avatar" />
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
              <div key={i} className={`owl-bubble ${msg.role}`}>{msg.text}</div>
            ))}
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
              onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            />
            <button className="ax-send" onClick={() => handleSend(input)} aria-label="Send">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
