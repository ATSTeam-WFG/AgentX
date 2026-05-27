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
          background: var(--metallic);
          border: 1.5px solid rgba(255,255,255,.45);
          border-radius: var(--r-lg);
          box-shadow: var(--shadow-card);
          padding: 16px;
          margin-bottom: 16px;
          position: relative;
          overflow: hidden;
        }
        .pwa-banner::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          border-radius: var(--r-lg) var(--r-lg) 0 0;
        }
        .pwa-banner-install::before  { background: var(--amber); }
        .pwa-banner-ios::before      { background: rgba(204,222,231,.30); }
        .pwa-banner-notif::before    { background: var(--amber); }
        .pwa-banner-inner {
          display: flex;
          gap: 13px;
          align-items: flex-start;
        }
        .pwa-banner-icon {
          width: 40px; height: 40px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .pwa-banner-install .pwa-banner-icon,
        .pwa-banner-notif   .pwa-banner-icon { background: rgba(240,165,90,.14); }
        .pwa-banner-ios     .pwa-banner-icon { background: rgba(204,222,231,.10); }
        .pwa-banner-body { flex: 1; min-width: 0; }
        .pwa-banner-title {
          font-family: 'Sora', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #fff;
          line-height: 1.3;
          margin-bottom: 4px;
        }
        .pwa-banner-desc {
          font-size: 14px;
          color: var(--t3);
          line-height: 1.5;
          margin-bottom: 14px;
        }
        .pwa-banner-ios-steps {
          margin: 6px 0 14px;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .pwa-banner-ios-steps li {
          font-size: 14px;
          color: var(--t3);
          display: flex;
          gap: 8px;
          align-items: flex-start;
          line-height: 1.4;
        }
        .pwa-banner-ios-steps .step-num {
          flex-shrink: 0;
          width: 20px; height: 20px;
          border-radius: 50%;
          background: rgba(204,222,231,.12);
          border: 1px solid rgba(204,222,231,.20);
          font-size: 11px;
          font-weight: 700;
          color: var(--t3);
          display: flex; align-items: center; justify-content: center;
          margin-top: 1px;
        }
        .pwa-banner-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .pwa-btn-primary {
          padding: 9px 16px;
          background: var(--amber);
          color: #06090f;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
        }
        .pwa-btn-primary:active { opacity: .85; }
        .pwa-btn-ghost {
          padding: 9px 12px;
          background: transparent;
          color: var(--t3);
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
        }
        .pwa-btn-ghost:active { background: rgba(255,255,255,.06); }
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
              <div className="pwa-banner-title">Add AgentX to your home screen</div>
              <div className="pwa-banner-desc">
                Install the app for faster access to your score, agenda, and activities. No browser needed.
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
              <div className="pwa-banner-title">Install to get score notifications</div>
              <div className="pwa-banner-desc">
                iPhone requires the app to be installed before push notifications can be enabled.
              </div>
              <ol className="pwa-banner-ios-steps">
                <li><span className="step-num">1</span>Tap the <strong style={{ color: 'var(--t2)' }}>Share</strong> button at the bottom of Safari</li>
                <li><span className="step-num">2</span>Scroll down and tap <strong style={{ color: 'var(--t2)' }}>"Add to Home Screen"</strong></li>
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
              <div className="pwa-banner-title">Get notified when you're scored</div>
              <div className="pwa-banner-desc">
                Enable notifications and we'll alert you the moment AI finishes scoring your Golden Points response.
              </div>
              <div className="pwa-banner-actions">
                <button className="pwa-btn-primary" onClick={enableNotifications}>Enable Notifications</button>
                <button className="pwa-btn-ghost" onClick={dismissNotif}>Not now</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
