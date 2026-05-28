'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Os = 'ios' | 'android';
type AndroidStep = 'detecting' | 'available' | 'installing' | 'installed';

export default function InstallPage() {
  const router = useRouter();
  const [os, setOs] = useState<Os | null>(null);
  const [androidStep, setAndroidStep] = useState<AndroidStep>('detecting');
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const android = /android/i.test(navigator.userAgent);

    if (!ios && !android) {
      router.replace('/onboarding');
      return;
    }

    if (ios) {
      setOs('ios');
      return;
    }

    // Android — listen for native install prompt
    setOs('android');
    let resolved = false;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      resolved = true;
      deferredRef.current = e as BeforeInstallPromptEvent;
      setAndroidStep('available');
    };

    const onInstalled = () => {
      deferredRef.current = null;
      setAndroidStep('installed');
      // Optimistic attempt — works if the tab was opened via window.open(),
      // silently no-ops otherwise. The Close Tab button below is the fallback.
      setTimeout(() => window.close(), 800);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // If beforeinstallprompt never fires (already installed / unsupported browser),
    // fall through to onboarding after a short grace period.
    const timeout = setTimeout(() => {
      if (!resolved) router.replace('/onboarding');
    }, 2000);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      clearTimeout(timeout);
    };
  }, [router]);

  async function handleInstall() {
    const prompt = deferredRef.current;
    if (!prompt) return;
    setAndroidStep('installing');
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      deferredRef.current = null;
      if (outcome === 'dismissed') setAndroidStep('available');
      // accepted → appinstalled event fires → sets 'installed'
    } catch {
      setAndroidStep('available');
    }
  }

  // Don't render until OS is known — avoids a layout flash
  if (!os) return null;

  return (
    <>
      <style>{`
        .install-page {
          position: fixed; inset: 0;
          display: flex; flex-direction: column;
          align-items: center;
          background: var(--bg);
          overflow: hidden;
          padding: calc(28px + env(safe-area-inset-top, 0px)) 24px
                   calc(28px + env(safe-area-inset-bottom, 0px));
        }
        .install-page::before {
          content: '';
          position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 80% 55% at 50% -5%, rgba(42,92,212,.28), transparent 60%),
            radial-gradient(ellipse 50% 40% at 90% 85%, rgba(6,182,212,.08), transparent 60%);
        }

        /* ── Branding (mirrors welcome page top) ── */
        .install-top {
          display: flex; flex-direction: column;
          align-items: center; gap: 14px;
          position: relative; z-index: 1;
          width: 100%;
        }
        .install-wfg-logo {
          height: 53px; width: auto; object-fit: contain;
        }
        .install-presents {
          font-family: 'Sora', sans-serif;
          font-size: 11px; font-weight: 700;
          letter-spacing: .22em; text-transform: uppercase;
          color: rgba(204,222,231,.45);
        }
        .install-brand-row {
          display: flex; align-items: center;
          gap: 14px; width: 100%;
          justify-content: center;
        }
        .install-es26-logo {
          width: 68px; height: 68px;
          object-fit: cover;
          mix-blend-mode: screen;
          border-radius: 18px;
          flex-shrink: 0;
        }
        .install-summit-title {
          font-family: 'Sora', sans-serif;
          font-size: 30px; font-weight: 800;
          letter-spacing: .03em; line-height: 1.08;
          color: #CCDEE7; text-align: left;
        }

        /* ── Middle content area ── */
        .install-content {
          flex: 1; width: 100%;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          position: relative; z-index: 1;
          padding: 24px 0 8px;
        }

        /* ── Section heading ── */
        .install-heading {
          font-family: 'Sora', sans-serif;
          font-size: 22px; font-weight: 700;
          color: #CCDEE7; letter-spacing: -.02em;
          margin: 0 0 6px; text-align: center;
        }
        .install-sub {
          font-size: 15px; color: rgba(204,222,231,.50);
          text-align: center; line-height: 1.5;
          margin: 0 0 24px;
        }

        /* ── iOS step cards ── */
        .install-steps {
          width: 100%;
          display: flex; flex-direction: column; gap: 10px;
        }
        .install-step {
          display: flex; align-items: center; gap: 14px;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 16px;
          padding: 14px 16px;
        }
        .install-step-num {
          width: 32px; height: 32px; border-radius: 50%;
          background: rgba(227,149,72,.15);
          border: 1.5px solid rgba(227,149,72,.35);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          font-family: 'Sora', sans-serif;
          font-size: 14px; font-weight: 800;
          color: var(--amber);
        }
        .install-step-body {
          flex: 1;
        }
        .install-step-title {
          font-size: 16px; font-weight: 600;
          color: #CCDEE7; line-height: 1.3;
          margin: 0;
        }
        .install-step-icon {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; flex-shrink: 0;
          color: rgba(204,222,231,.35);
        }

        /* ── iOS hint bar (at the arrow pointing to Share) ── */
        .install-ios-hint {
          width: 100%; margin-top: 16px;
          background: rgba(42,92,212,.12);
          border: 1px solid rgba(42,92,212,.25);
          border-radius: 12px;
          padding: 12px 16px;
          display: flex; align-items: center; gap: 10px;
        }
        .install-ios-hint-text {
          font-size: 13px; color: rgba(204,222,231,.65); line-height: 1.4;
        }
        .install-ios-hint-text strong {
          color: rgba(204,222,231,.90); font-weight: 700;
        }

        /* ── Android install button ── */
        .install-android-icon {
          width: 72px; height: 72px; border-radius: 20px;
          background: rgba(227,149,72,.12);
          border: 1.5px solid rgba(227,149,72,.25);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px;
        }
        .btn-install-app {
          width: 100%; height: 54px; border-radius: 14px;
          background: var(--amber); color: #1C283C;
          border: none; cursor: pointer;
          font-size: 16px; font-weight: 700; font-family: 'Sora', sans-serif;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 4px 20px rgba(227,149,72,.35);
          transition: opacity .15s, transform .15s;
        }
        .btn-install-app:active  { opacity: .88; transform: scale(.98); }
        .btn-install-app:disabled { opacity: .55; cursor: not-allowed; }

        /* ── Android done state ── */
        .install-done-check {
          width: 80px; height: 80px; border-radius: 50%;
          background: rgba(20,102,54,.15);
          border: 2px solid rgba(20,102,54,.40);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px;
          animation: checkPop .4s cubic-bezier(.34,1.56,.64,1) both;
        }
        @keyframes checkPop {
          from { opacity: 0; transform: scale(.6); }
          to   { opacity: 1; transform: scale(1); }
        }
        .install-done-title {
          font-family: 'Sora', sans-serif;
          font-size: 24px; font-weight: 700;
          color: #CCDEE7; text-align: center; margin: 0 0 8px;
        }
        .install-done-sub {
          font-size: 15px; color: rgba(204,222,231,.55);
          text-align: center; line-height: 1.5; margin: 0 0 24px;
        }
        .install-done-card {
          width: 100%;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 16px;
          padding: 18px 20px;
          display: flex; align-items: center; gap: 14px;
        }
        .install-done-card-icon {
          width: 40px; height: 40px; border-radius: 12px;
          background: rgba(227,149,72,.12);
          border: 1px solid rgba(227,149,72,.20);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .install-done-card-text {
          font-size: 14px; color: rgba(204,222,231,.70); line-height: 1.45;
        }
        .install-done-card-text strong {
          color: #CCDEE7; font-weight: 700;
          display: block; margin-bottom: 2px; font-size: 15px;
        }

        /* ── Spinner ── */
        .install-spinner {
          width: 20px; height: 20px; animation: spin .8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Footer ── */
        .install-footer {
          font-size: 12px; color: rgba(255,255,255,.25);
          text-align: center;
          position: relative; z-index: 1;
        }
      `}</style>

      <div className="install-page">

        {/* Branding — identical to welcome page */}
        <div className="install-top">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://pub-9849080621014a8e9c12e5989f01a96e.r2.dev/brand/wfg-ntic-logo-white.png"
            alt="WFG"
            className="install-wfg-logo"
          />
          <div className="install-presents">Presents</div>
          <div className="install-brand-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://pub-9849080621014a8e9c12e5989f01a96e.r2.dev/brand/es26logo.png"
              alt="ES26"
              className="install-es26-logo"
            />
            <div className="install-summit-title">EXECUTIVE<br />SUMMIT 2026</div>
          </div>
        </div>

        {/* OS-specific install content */}
        <div className="install-content">

          {/* ── iOS ── */}
          {os === 'ios' && (
            <>
              <p className="install-heading">Add to Home Screen</p>
              <p className="install-sub">For the full summit experience, let's get this lightweight app on your Home Screen. 3 quick steps.</p>

              <div className="install-steps">

                <div className="install-step">
                  <div className="install-step-num">1</div>
                  <div className="install-step-body">
                    <div className="install-step-title">Tap Share</div>
                  </div>
                  <div className="install-step-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                      <polyline points="15 3 12 0 9 3"/>
                      <line x1="12" y1="0" x2="12" y2="13"/>
                    </svg>
                  </div>
                </div>

                <div className="install-step">
                  <div className="install-step-num">2</div>
                  <div className="install-step-body">
                    <div className="install-step-title">Add to Home Screen</div>
                  </div>
                  <div className="install-step-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="4"/>
                      <line x1="12" y1="8" x2="12" y2="16"/>
                      <line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                  </div>
                </div>

                <div className="install-step">
                  <div className="install-step-num">3</div>
                  <div className="install-step-body">
                    <div className="install-step-title">Tap Add, open ES26</div>
                  </div>
                  <div className="install-step-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" rx="2"/>
                      <rect x="14" y="3" width="7" height="7" rx="2"/>
                      <rect x="3" y="14" width="7" height="7" rx="2"/>
                      <rect x="14" y="14" width="7" height="7" rx="2"/>
                    </svg>
                  </div>
                </div>

              </div>

              <div className="install-ios-hint">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(99,143,212,.80)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span className="install-ios-hint-text">
                  Already added? <strong>Open ES26 from your Home Screen.</strong>
                </span>
              </div>
              <button className="btn-install-app" style={{ marginTop: 10 }} onClick={() => router.push('/onboarding')}>
                Continue
              </button>
            </>
          )}

          {/* ── Android: available ── */}
          {os === 'android' && androidStep === 'available' && (
            <>
              <div className="install-android-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="3"/>
                  <line x1="12" y1="6" x2="12" y2="14"/>
                  <polyline points="9 11 12 14 15 11"/>
                  <line x1="9" y1="17" x2="15" y2="17"/>
                </svg>
              </div>
              <p className="install-heading">One last step</p>
              <p className="install-sub">For the full summit experience, let's get this lightweight app on your Home Screen.</p>
              <button
                className="btn-install-app"
                onClick={handleInstall}
                disabled={androidStep !== 'available'}
              >
                Install
                <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="btn-install-app" style={{ marginTop: 10 }} onClick={() => router.push('/onboarding')}>
                Continue
              </button>
            </>
          )}

          {/* ── Android: installing (user interacting with OS sheet) ── */}
          {os === 'android' && androidStep === 'installing' && (
            <>
              <div className="install-android-icon">
                <svg className="install-spinner" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="rgba(227,149,72,.25)" strokeWidth="2.5"/>
                  <path d="M12 3 a9 9 0 0 1 9 9" stroke="var(--amber)" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="install-heading">Installing…</p>
            </>
          )}

          {/* ── Android: installed ── */}
          {os === 'android' && androidStep === 'installed' && (
            <>
              <div className="install-done-check">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <p className="install-done-title">ES26 Installed!</p>
              <p className="install-done-sub">Open it from your Home Screen to get started.</p>
              <button className="btn-install-app" onClick={() => window.close()}>
                Close Tab
              </button>
            </>
          )}

        </div>

        <div className="install-footer">WFG Executive Summit 2026 · Powered by ATS</div>

      </div>
    </>
  );
}
