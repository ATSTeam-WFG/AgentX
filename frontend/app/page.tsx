'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { readToken, isTokenExpired } from '@/lib/auth';

export default function WelcomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const token = readToken();
    if (token && !isTokenExpired(token)) {
      router.replace('/home');
      return;
    }
    setReady(true);
  }, [router]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else          { v.pause(); setPlaying(false); }
  }

  if (!ready) return null;

  return (
    <>
      <style>{`
        .welcome-page {
          position: fixed; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: space-between;
          background: var(--bg);
          overflow: hidden;
          padding: calc(28px + env(safe-area-inset-top, 0px)) 24px
                   calc(28px + env(safe-area-inset-bottom, 0px));
        }
        .welcome-page::before {
          content: '';
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 80% 55% at 50% -5%, rgba(42,92,212,.28), transparent 60%),
            radial-gradient(ellipse 50% 40% at 90% 85%, rgba(6,182,212,.08), transparent 60%);
          pointer-events: none;
        }

        /* ── Top branding: WFG logo + PRESENTS + brand row ── */
        .welcome-top {
          display: flex; flex-direction: column;
          align-items: center; gap: 14px;
          position: relative; z-index: 1;
          width: 100%;
        }
        .welcome-wfg-logo {
          height: 53px; width: auto; object-fit: contain;
        }
        .welcome-presents {
          font-family: 'Sora', sans-serif;
          font-size: 11px; font-weight: 700;
          letter-spacing: .22em; text-transform: uppercase;
          color: rgba(204,222,231,.45);
        }

        /* ── ES26 logo + title side-by-side ── */
        .welcome-brand-row {
          display: flex; align-items: center;
          gap: 14px; width: 100%;
          justify-content: center;
        }
        .welcome-es26-logo {
          width: 68px; height: 68px;
          object-fit: cover;
          border-radius: 5px;
          flex-shrink: 0;
        }
        .welcome-summit-title {
          font-family: 'Sora', sans-serif;
          font-size: 30px; font-weight: 800;
          letter-spacing: .03em; line-height: 1.08;
          color: #CCDEE7; text-align: left;
        }

        /* ── Video section ── */
        .welcome-video-section {
          flex: 1; width: 100%;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          z-index: 1; padding: 10px 0 4px;
        }
        .welcome-video-container {
          position: relative;
          max-height: 320px; height: 100%;
          aspect-ratio: 9 / 16;
          border-radius: var(--r-xl);
          overflow: hidden;
          cursor: pointer;
          box-shadow: 0 20px 60px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.07);
        }
        .welcome-video {
          width: 100%; height: 100%;
          object-fit: cover; display: block;
        }
        .video-overlay {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,.18);
          transition: opacity .25s;
        }
        .video-overlay.playing { opacity: 0; pointer-events: none; }
        .video-play-btn {
          width: 64px; height: 64px; border-radius: 50%;
          background: transparent; border: none;
          display: flex; align-items: center; justify-content: center;
        }
        .video-spinner {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,.45);
          pointer-events: none;
        }
        .video-spinner svg {
          animation: spin .9s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .welcome-video-caption {
          font-size: 13px; color: rgba(204,222,231,.50);
          text-align: center; line-height: 1.45;
          margin-top: 10px;
        }

        /* ── CTAs ── */
        .welcome-ctas {
          width: 100%; display: flex; flex-direction: column; gap: 10px;
          position: relative; z-index: 1;
        }
        .btn-get-started {
          width: 100%; height: 54px; border-radius: 14px;
          background: var(--amber); color: #1C283C;
          border: none; cursor: pointer;
          font-size: 16px; font-weight: 700; font-family: 'Sora', sans-serif;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 4px 20px rgba(227,149,72,.35);
          transition: opacity .15s, transform .15s;
        }
        .btn-get-started:active { opacity: .88; transform: scale(.98); }
        .welcome-bottom-note {
          font-size: 12px; color: rgba(255,255,255,.28);
          text-align: center; margin-top: 4px;
        }
      `}</style>

      <div className="welcome-page">

        {/* WFG + PRESENTS + ES26 brand row — equal gap between all three */}
        <div className="welcome-top">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://pub-9849080621014a8e9c12e5989f01a96e.r2.dev/brand/wfg-ntic-logo-white.png" alt="WFG" className="welcome-wfg-logo" />
          <div className="welcome-presents">Presents</div>
          <div className="welcome-brand-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://pub-9849080621014a8e9c12e5989f01a96e.r2.dev/brand/es26logo.png" alt="ES26" className="welcome-es26-logo" />
            <div className="welcome-summit-title">EXECUTIVE<br />SUMMIT 2026</div>
          </div>
        </div>

        {/* Video + caption */}
        <div className="welcome-video-section">
          <div className="welcome-video-container" onClick={togglePlay}>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              className="welcome-video"
              src="/Gene Rebadow ES26_updated.mp4"
              playsInline
              preload="metadata"
              onEnded={() => { setPlaying(false); setBuffering(false); }}
              onWaiting={() => setBuffering(true)}
              onCanPlay={() => setBuffering(false)}
              onPlaying={() => setBuffering(false)}
            />
            <div className={`video-overlay${playing ? ' playing' : ''}`}>
              <div className="video-play-btn">
                <svg viewBox="0 0 24 24" fill="none" width="32" height="32">
                  <polygon points="6,3 20,12 6,21" fill="white" opacity=".9"/>
                </svg>
              </div>
            </div>
            {buffering && (
              <div className="video-spinner">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="20" r="16" stroke="rgba(255,255,255,.25)" strokeWidth="3"/>
                  <path d="M20 4 a16 16 0 0 1 16 16" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </div>
            )}
          </div>
          <div className="welcome-video-caption">
            Welcome Message from Gene Rebadow,<br />Chief Operating Officer, Agency Operations
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
          <div className="welcome-bottom-note">WFG Executive Summit 2026 · Powered by ATS</div>
        </div>

      </div>
    </>
  );
}
