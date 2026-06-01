'use client';
import { useState, useEffect } from 'react';

const MESSAGES = [
  'Analyzing your photo…',
  'Building your portrait…',
  'Applying artistic style…',
  'Adding the final touches…',
  'Almost ready…',
];

interface Props {
  progress: number;
}

export default function AvatarGeneratingScreen({ progress }: Props) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setMsgIdx(i => Math.min(i + 1, MESSAGES.length - 1));
        setVisible(true);
      }, 300);
    }, 4500);
    return () => clearInterval(t);
  }, []);

  const clampedProgress = Math.min(100, Math.max(0, progress));
  const isDone = clampedProgress >= 100;

  return (
    <>
      <style>{`
        .avgen-screen {
          position: absolute; inset: 0;
          background: #1C283C;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 0; z-index: 10;
        }
        .avgen-logo {
          width: 88px;
          border-radius: 5px;
          animation: avgenBreath 2.4s ease-in-out infinite;
          margin-bottom: 32px;
        }
        @keyframes avgenBreath {
          0%, 100% { opacity: .92; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.03); }
        }
        .avgen-msg {
          font-family: 'Sora', sans-serif;
          font-size: 15px; font-weight: 600;
          color: rgba(204,222,231,.75); letter-spacing: .02em;
          height: 22px;
          transition: opacity .28s ease;
          margin-bottom: 24px;
        }
        .avgen-bar-wrap {
          display: flex; flex-direction: column; align-items: center; gap: 12px;
        }
        .avgen-bar-track {
          width: 220px; height: 6px;
          background: rgba(227,149,72,.12);
          border-radius: 3px;
          overflow: hidden;
          position: relative;
        }
        .avgen-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #C8793A, #E39548, #F5C27A);
          background-size: 200% 100%;
          border-radius: 3px;
          transition: width ${isDone ? '0.4s' : '0.25s'} ${isDone ? 'cubic-bezier(.4,0,.2,1)' : 'linear'};
          animation: avgenShine 2s linear infinite;
        }
        @keyframes avgenShine {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .avgen-sub {
          font-family: 'Sora', sans-serif;
          font-size: 12px; font-weight: 400;
          color: rgba(204,222,231,.32); letter-spacing: .01em;
        }
        .avgen-done-label {
          font-family: 'Sora', sans-serif;
          font-size: 13px; font-weight: 700;
          color: #E39548; letter-spacing: .02em;
          transition: opacity .3s ease;
        }
      `}</style>
      <div className="avgen-screen">
        <img
          src="https://pub-9849080621014a8e9c12e5989f01a96e.r2.dev/brand/es26logo.png"
          alt="ES26"
          className="avgen-logo"
        />
        <div className="avgen-msg" style={{ opacity: visible ? 1 : 0 }}>
          {isDone ? 'Portrait ready!' : MESSAGES[msgIdx]}
        </div>
        <div className="avgen-bar-wrap">
          <div className="avgen-bar-track">
            <div className="avgen-bar-fill" style={{ width: `${clampedProgress}%` }} />
          </div>
          {!isDone && (
            <div className="avgen-sub">Usually 20–30 seconds</div>
          )}
          {isDone && (
            <div className="avgen-done-label">Done!</div>
          )}
        </div>
      </div>
    </>
  );
}
