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
          background: var(--surface);
          border-radius: 28px 28px 0 0;
          border-top: 1px solid var(--border-metal);
          box-shadow: 0 -8px 40px rgba(8,24,64,.12);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }
        .ax-handle {
          width: 40px; height: 4px;
          background: var(--border-metal);
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
          border-bottom: 1px solid var(--border-metal);
          flex-shrink: 0;
          position: relative;
          z-index: 1;
        }
        .ax-avatar {
          width: 64px; height: 64px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--blue-lt);
          box-shadow: 0 4px 12px rgba(8,24,64,.12);
        }
        .ax-header-info { flex: 1; }
        .ax-name {
          font-family: 'Sora', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: var(--t);
        }
        .ax-status {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 13px;
          color: var(--t3);
          margin-top: 1px;
        }
        .ax-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--green);
          box-shadow: 0 0 6px rgba(21,122,64,.40);
        }
        .ax-close {
          width: 34px; height: 34px;
          border-radius: 50%;
          background: var(--bg2);
          border: 1px solid var(--border-metal);
          color: var(--t3);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
          cursor: pointer;
          line-height: 1;
          font-family: inherit;
          transition: background .15s;
        }
        .ax-close:active { background: var(--bg3); }
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
        .owl-bubble.ai {
          max-width: 84%;
          padding: 11px 15px;
          border-radius: 18px;
          font-size: 15px;
          line-height: 1.45;
          background: var(--blue-lt);
          color: var(--t);
          border: 1px solid var(--border-metal);
          border-bottom-left-radius: 4px;
          align-self: flex-start;
          box-shadow: var(--shadow-card);
        }
        .owl-bubble.user {
          max-width: 84%;
          padding: 11px 15px;
          border-radius: 18px;
          font-size: 15px;
          line-height: 1.45;
          background: linear-gradient(135deg, var(--blue-mid), var(--blue));
          color: #fff;
          border-bottom-right-radius: 4px;
          align-self: flex-end;
          box-shadow: var(--shadow-blue);
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
          color: var(--blue);
          background: var(--blue-lt);
          border: 1px solid rgba(27,79,196,.18);
          border-radius: 20px;
          padding: 7px 14px;
          cursor: pointer;
          transition: background var(--tr);
          flex-shrink: 0;
          font-family: inherit;
        }
        .owl-qbtn:active { background: #c6d8ff; }
        .ax-input-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 18px calc(10px + env(safe-area-inset-bottom, 0px));
          border-top: 1px solid var(--border-metal);
          background: var(--surface);
          flex-shrink: 0;
          position: relative; z-index: 1;
        }
        .owl-input {
          flex: 1;
          background: var(--bg);
          border: 1.5px solid var(--border-metal);
          border-radius: 22px;
          padding: 10px 16px;
          font-size: 15px;
          color: var(--t);
          outline: none;
          font-family: 'DM Sans', sans-serif;
        }
        .owl-input::placeholder { color: var(--t4); }
        .owl-input:focus {
          border-color: var(--blue);
          box-shadow: 0 0 0 3px rgba(27,79,196,.08);
        }
        .ax-send {
          width: 44px; height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--blue-mid), var(--blue));
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          border: none;
          box-shadow: var(--shadow-blue);
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
