'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useUiStore } from '@/store/ui';

export default function OwlFab() {
  const openSheet = useUiStore((s) => s.openSheet);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onScroll() {
      setVisible(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(true), 700);
    }
    document.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('scroll', onScroll, true);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes fabHalo {
          0%, 100% { transform: scale(1); opacity: .8; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        .owl-fab-wrap {
          position: fixed;
          right: 16px;
          bottom: calc(var(--nav-h) + 12px + env(safe-area-inset-bottom, 0px));
          width: 56px;
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 150;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: opacity .3s ease;
        }
        .owl-fab-wrap::before {
          content: '';
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(6,182,212,.18) 0%, transparent 70%);
          animation: fabHalo 3.2s ease-in-out infinite;
          pointer-events: none;
        }
        .owl-fab-img {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          object-fit: cover;
          filter: drop-shadow(0 6px 14px rgba(10,24,64,.32)) drop-shadow(0 0 18px rgba(6,182,212,.32));
          transition: transform .18s ease;
        }
        .owl-fab-wrap:active .owl-fab-img {
          transform: scale(0.94);
        }
        .owl-fab-label {
          margin-top: 5px;
          display: flex; align-items: center; gap: 5px;
          font-size: 9px; font-weight: 800;
          letter-spacing: .14em; text-transform: uppercase;
          color: #CCDEE7;
          white-space: nowrap;
          background: rgba(28,40,60,.82);
          border: 1px solid rgba(227,149,72,.30);
          border-radius: 20px;
          padding: 3px 8px;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }
        .owl-fab-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px rgba(34,197,94,.70);
          flex-shrink: 0;
          animation: fabDotPulse 2.4s ease-in-out infinite;
        }
        @keyframes fabDotPulse { 0%,100%{opacity:1} 50%{opacity:.45} }
      `}</style>
      <button
        className="owl-fab-wrap"
        aria-label="Open Agent X assistant"
        onClick={openSheet}
        style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
      >
        <Image
          src="/AgentX.png"
          alt="Agent X"
          width={56}
          height={56}
          className="owl-fab-img"
          priority
        />
        <div className="owl-fab-label">
          <span className="owl-fab-dot" />
          AGENT X
        </div>
      </button>
    </>
  );
}
