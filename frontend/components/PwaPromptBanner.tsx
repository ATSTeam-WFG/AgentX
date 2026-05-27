'use client'

import { usePwaPrompts } from '@/hooks/usePwaPrompts'

export function PwaPromptBanner() {
  const {
    showInstallPrompt,
    showIosInstall,
    showNotifPrompt,
    installApp,
    dismissInstall,
    enableNotifications,
    dismissNotif,
  } = usePwaPrompts()

  if (!showInstallPrompt && !showIosInstall && !showNotifPrompt) return null

  return (
    <>
      <style>{`
        .pwa-banner {
          background: rgba(255,255,255,.97);
          border: 1px solid rgba(227,149,72,.18);
          border-left: 3px solid var(--amber);
          border-radius: 14px;
          box-shadow: 0 6px 28px rgba(0,0,0,.16), 0 1px 4px rgba(0,0,0,.08);
          padding: 10px 12px;
          margin-bottom: 14px;
        }
        .pwa-banner-ios { border-left-color: rgba(28,40,60,.22); border-color: rgba(28,40,60,.12); }
        .pwa-banner-inner {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }
        .pwa-banner-icon {
          width: 30px; height: 30px;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .pwa-banner-install .pwa-banner-icon,
        .pwa-banner-notif   .pwa-banner-icon { background: rgba(227,149,72,.12); }
        .pwa-banner-ios     .pwa-banner-icon { background: rgba(28,40,60,.07); }
        .pwa-banner-body { flex: 1; min-width: 0; }
        .pwa-banner-title {
          font-family: 'Sora', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #1C283C;
          line-height: 1.3;
          margin-bottom: 2px;
        }
        .pwa-banner-desc {
          font-size: 12px;
          color: rgba(28,40,60,.65);
          line-height: 1.4;
          margin-bottom: 10px;
        }
        .pwa-banner-ios-steps {
          margin: 5px 0 10px;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .pwa-banner-ios-steps li {
          font-size: 12px;
          color: rgba(28,40,60,.62);
          display: flex;
          gap: 7px;
          align-items: flex-start;
          line-height: 1.4;
        }
        .pwa-banner-ios-steps .step-num {
          flex-shrink: 0;
          width: 18px; height: 18px;
          border-radius: 50%;
          background: rgba(28,40,60,.08);
          border: 1px solid rgba(28,40,60,.14);
          font-size: 10px;
          font-weight: 700;
          color: rgba(28,40,60,.55);
          display: flex; align-items: center; justify-content: center;
          margin-top: 1px;
        }
        .pwa-banner-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .pwa-btn-primary {
          padding: 7px 14px;
          background: var(--amber);
          color: #06090f;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
        }
        .pwa-btn-primary:active { opacity: .85; }
        .pwa-btn-ghost {
          padding: 7px 10px;
          background: transparent;
          color: rgba(28,40,60,.45);
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
        }
        .pwa-btn-ghost:active { background: rgba(28,40,60,.06); }
      `}</style>

      {showInstallPrompt && (
        <div className="pwa-banner pwa-banner-install">
          <div className="pwa-banner-inner">
            <div className="pwa-banner-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F0A55A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v13M5 9l7 7 7-7"/><rect x="3" y="19" width="18" height="2" rx="1"/>
              </svg>
            </div>
            <div className="pwa-banner-body">
              <div className="pwa-banner-title">Install AgentX</div>
              <div className="pwa-banner-desc">
                Faster access to your score, agenda, and activities.
              </div>
              <div className="pwa-banner-actions">
                <button className="pwa-btn-primary" onClick={installApp}>Install App</button>
                <button className="pwa-btn-ghost" onClick={dismissInstall}>Not now</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showIosInstall && (
        <div className="pwa-banner pwa-banner-ios">
          <div className="pwa-banner-inner">
            <div className="pwa-banner-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(204,222,231,.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
            </div>
            <div className="pwa-banner-body">
              <div className="pwa-banner-title">Install for notifications</div>
              <div className="pwa-banner-desc">
                iPhone needs the app installed before push alerts work.
              </div>
              <ol className="pwa-banner-ios-steps">
                <li><span className="step-num">1</span>Tap the <strong style={{ color: 'rgba(28,40,60,.85)' }}>Share</strong> button at the bottom of Safari</li>
                <li><span className="step-num">2</span>Scroll down and tap <strong style={{ color: 'rgba(28,40,60,.85)' }}>"Add to Home Screen"</strong></li>
                <li><span className="step-num">3</span>Open AgentX from your home screen and enable notifications</li>
              </ol>
              <div className="pwa-banner-actions">
                <button className="pwa-btn-ghost" onClick={dismissInstall}>Got it</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNotifPrompt && (
        <div className="pwa-banner pwa-banner-notif">
          <div className="pwa-banner-inner">
            <div className="pwa-banner-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F0A55A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <div className="pwa-banner-body">
              <div className="pwa-banner-title">Get Notified Instantly</div>
              <div className="pwa-banner-desc">
                Do not miss any key moment at the Executive Summit 2026.
              </div>
              <div className="pwa-banner-actions">
                <button className="pwa-btn-primary" onClick={enableNotifications}>Enable</button>
                <button className="pwa-btn-ghost" onClick={dismissNotif}>Not now</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
