'use client';

import Image from 'next/image';
import { useUiStore } from '@/store/ui';

export default function OwlFab() {
  const openSheet = useUiStore((s) => s.openSheet);

  return (
    <>
      <style>{`
        @keyframes fabHalo {
          0%, 100% { transform: scale(1); opacity: .8; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        .owl-fab-wrap {
          position: fixed;
          right: 14px;
          bottom: calc(var(--nav-h) + 14px + env(safe-area-inset-bottom, 0px));
          width: 78px;
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 150;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
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
          width: 78px;
          height: 78px;
          border-radius: 50%;
          object-fit: cover;
          filter: drop-shadow(0 6px 14px rgba(10,24,64,.32)) drop-shadow(0 0 18px rgba(6,182,212,.32));
          transition: transform .18s ease;
        }
        .owl-fab-wrap:active .owl-fab-img {
          transform: scale(0.94);
        }
        .owl-fab-label {
          margin-top: 4px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: var(--blue-deep);
          background: var(--surface-glass-2);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(6,182,212,.3);
          border-radius: 20px;
          padding: 2px 8px;
          white-space: nowrap;
        }
      `}</style>
      <button
        className="owl-fab-wrap"
        aria-label="Open Agent X assistant"
        onClick={openSheet}
      >
        <Image
          src="/AgentX.png"
          alt="Agent X"
          width={78}
          height={78}
          className="owl-fab-img"
          priority
        />
        <span className="owl-fab-label">Agent X</span>
      </button>
    </>
  );
}
