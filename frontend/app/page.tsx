'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readToken, isTokenExpired } from '@/lib/auth';

export default function WelcomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = readToken();
    if (token && !isTokenExpired(token)) {
      // Already authed — skip welcome
      router.replace('/home');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <>
      <style>{`
        .welcome-page {
          position: fixed; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: space-between;
          background: var(--navy);
          overflow: hidden;
          padding: calc(40px + env(safe-area-inset-top, 0px)) 24px
                   calc(40px + env(safe-area-inset-bottom, 0px));
        }
        /* Subtle background gradient */
        .welcome-page::before {
          content: '';
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 50% -10%, rgba(27,79,196,.35), transparent 60%),
            radial-gradient(ellipse 60% 50% at 90% 80%, rgba(10,184,222,.12), transparent 60%);
          pointer-events: none;
        }
        .welcome-top {
          display: flex; flex-direction: column; align-items: center; gap: 10px;
          position: relative; z-index: 1;
        }
        .welcome-logo-mark {
          background: linear-gradient(135deg, var(--blue-mid), var(--blue-deep));
          border-radius: 18px; padding: 12px 18px;
          font-size: 13px; font-weight: 800; color: #fff; letter-spacing: .10em;
          box-shadow: 0 4px 20px rgba(27,79,196,.40);
          margin-bottom: 4px;
        }
        .welcome-app-name {
          font-family: 'Sora', 'DM Sans', sans-serif;
          font-size: 42px; font-weight: 800;
          color: #fff; letter-spacing: -.04em; line-height: 1;
        }
        .welcome-subtitle {
          font-size: 15px; color: rgba(255,255,255,.60);
          font-weight: 500; text-align: center; line-height: 1.5;
        }
        /* Video area (poster) */
        .welcome-video-wrap {
          position: relative; flex: 1;
          display: flex; align-items: center; justify-content: center;
          width: 100%;
          max-height: 340px; z-index: 1;
        }
        .welcome-video-bg {
          width: 100%; max-width: 360px; aspect-ratio: 16/9;
          border-radius: var(--r-xl);
          background: linear-gradient(135deg, #0e1f3a 0%, #1a3060 50%, #0a1830 100%);
          box-shadow: 0 20px 60px rgba(0,0,0,.50);
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; position: relative;
          border: 1px solid rgba(255,255,255,.08);
        }
        .welcome-video-bg::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse 70% 50% at 50% 40%, rgba(27,79,196,.22), transparent 70%);
        }
        .play-btn {
          width: 70px; height: 70px; border-radius: 50%;
          background: rgba(255,255,255,.12);
          backdrop-filter: blur(8px);
          border: 2px solid rgba(255,255,255,.25);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all .2s;
          position: relative; z-index: 1;
          box-shadow: 0 8px 30px rgba(0,0,0,.30);
        }
        .play-btn:active { transform: scale(.93); }
        .welcome-video-label {
          position: absolute; bottom: 14px; left: 16px; right: 16px;
          font-size: 13px; font-weight: 600; color: rgba(255,255,255,.60);
          text-align: center;
          font-family: 'Sora', sans-serif;
        }
        /* CTAs */
        .welcome-ctas {
          width: 100%; display: flex; flex-direction: column; gap: 12px;
          position: relative; z-index: 1;
        }
        .btn-get-started {
          width: 100%; height: 58px;
          border-radius: 16px;
          background: linear-gradient(135deg, var(--blue-mid), var(--blue));
          color: #fff; font-size: 17px; font-weight: 700;
          font-family: 'Sora', sans-serif;
          border: none; cursor: pointer;
          box-shadow: 0 6px 24px rgba(27,79,196,.45);
          transition: opacity .15s, transform .15s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .btn-get-started:active { opacity: .88; transform: scale(.98); }
        .btn-skip {
          width: 100%; height: 50px;
          border-radius: 14px;
          background: transparent;
          color: rgba(255,255,255,.55);
          font-size: 15px; font-weight: 600;
          font-family: 'Sora', sans-serif;
          border: 1px solid rgba(255,255,255,.14);
          cursor: pointer;
          transition: color .15s;
        }
        .btn-skip:active { color: rgba(255,255,255,.80); }
        .welcome-bottom-note {
          font-size: 12px; color: rgba(255,255,255,.30);
          text-align: center; margin-top: 6px;
        }
      `}</style>

      <div className="welcome-page">
        {/* Top branding */}
        <div className="welcome-top">
          <div className="welcome-logo-mark">WFG</div>
          <div className="welcome-app-name">AgentX</div>
          <div className="welcome-subtitle">
            Your official companion for<br />WFG Executive Summit 2026
          </div>
        </div>

        {/* Video poster area */}
        <div className="welcome-video-wrap">
          <div className="welcome-video-bg">
            <button className="play-btn" aria-label="Play intro video">
              <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
                <polygon points="6,3 20,12 6,21" fill="#fff" opacity=".9" />
              </svg>
            </button>
            <div className="welcome-video-label">Executive Summit 2026 · Official Recap</div>
          </div>
        </div>

        {/* CTAs */}
        <div className="welcome-ctas">
          <button className="btn-get-started" onClick={() => router.push('/onboarding')}>
            Get Started
            <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="btn-skip" onClick={() => router.push('/onboarding')}>
            Skip intro
          </button>
          <div className="welcome-bottom-note">
            WFG Executive Summit 2026 · Powered by ATS
          </div>
        </div>
      </div>
    </>
  );
}
