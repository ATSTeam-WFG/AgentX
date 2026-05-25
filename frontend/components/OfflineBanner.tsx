'use client'

import { useState, useEffect } from 'react'

export default function OfflineBanner() {
  // Start hidden — matches server render, avoids hydration mismatch
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    setIsOffline(!navigator.onLine)
    const goOffline = () => setIsOffline(true)
    const goOnline  = () => setIsOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online',  goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online',  goOnline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <>
      <style>{`
        @keyframes offlineSlideIn {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        .offline-banner {
          position: fixed;
          top: var(--topbar-h, 72px);
          left: 0;
          right: 0;
          z-index: 99;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 8px 16px;
          background: rgba(18, 28, 46, 0.97);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(227, 149, 72, 0.20);
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.40);
          animation: offlineSlideIn 0.20s cubic-bezier(0.4, 0, 0.2, 1) both;
        }
        .offline-icon { color: #E39548; flex-shrink: 0; }
        .offline-text {
          font-size: 13px;
          font-weight: 600;
          color: #E39548;
          letter-spacing: -0.01em;
        }
        .offline-sub {
          font-size: 12px;
          font-weight: 500;
          color: #7A96A8;
        }
      `}</style>

      <div role="status" aria-live="polite" className="offline-banner">
        <svg
          className="offline-icon"
          width="14" height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <circle cx="12" cy="20" r="1" fill="#E39548" stroke="none" />
        </svg>
        <span className="offline-text">You're offline</span>
        <span className="offline-sub">· cached content shown</span>
      </div>
    </>
  )
}
