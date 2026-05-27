'use client';

import { useEffect } from 'react';
import { useUiStore, type Toast } from '@/store/ui';

export default function PointsToast() {
  const { toastQueue, dismissToast } = useUiStore();

  return (
    <>
      <style>{`
        .pts-toast-wrap {
          position: fixed;
          top: calc(var(--topbar-h, 60px) + 12px + env(safe-area-inset-top, 0px));
          left: 16px; right: 16px;
          z-index: 450;
          display: flex; flex-direction: column; gap: 8px;
          pointer-events: none;
        }
        .pts-toast {
          background: #1C283C;
          border: 1.5px solid rgba(227,149,72,.35);
          border-radius: 16px;
          padding: 12px 14px;
          display: flex; align-items: center; gap: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,.40), 0 0 0 1px rgba(255,255,255,.06);
          pointer-events: all;
          animation: ptsTDown .35s cubic-bezier(.34,1.56,.64,1) forwards;
        }
        @keyframes ptsTDown {
          from { transform: translateY(-110%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        .pts-toast-owl {
          width: 40px; height: 40px; border-radius: 50%;
          overflow: hidden; flex-shrink: 0;
          border: 1.5px solid rgba(227,149,72,.35);
          background: rgba(227,149,72,.12);
        }
        .pts-toast-owl img { width: 100%; height: 100%; object-fit: cover; }
        .pts-toast-body { flex: 1; min-width: 0; }
        .pts-toast-agent {
          font-size: 10px; font-weight: 700; letter-spacing: .10em;
          color: #E39548; text-transform: uppercase; margin-bottom: 2px;
          font-family: 'Sora', sans-serif;
        }
        .pts-toast-msg {
          font-size: 14px; font-weight: 600; color: #CCDEE7;
          line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .pts-toast-badge {
          font-family: 'Sora', sans-serif;
          font-size: 15px; font-weight: 800;
          color: #D4A017; flex-shrink: 0; white-space: nowrap;
        }
        .pts-toast-x {
          background: none; border: none; cursor: pointer; padding: 2px;
          color: rgba(204,222,231,.30); flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
      `}</style>
      <div className="pts-toast-wrap">
        {toastQueue.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
        ))}
      </div>
    </>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div className="pts-toast">
      <div className="pts-toast-owl">
        <img src="https://pub-9849080621014a8e9c12e5989f01a96e.r2.dev/brand/agentx.png" alt="Agent X" />
      </div>
      <div className="pts-toast-body">
        <div className="pts-toast-agent">Agent X</div>
        <div className="pts-toast-msg">{toast.message}</div>
      </div>
      {toast.points != null && (
        <div className="pts-toast-badge">+{toast.points} pts</div>
      )}
      <button className="pts-toast-x" onClick={() => onDismiss(toast.id)} aria-label="Dismiss">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  );
}
