'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { scanTouchpoint } from '@/lib/api/activities';
import Link from 'next/link';

const LOCATIONS = [
  { name: 'Main Stage', description: 'Conference ballroom entrance', completed: false },
  { name: 'Sponsor Hall', description: 'Exhibit floor — south entrance', completed: false },
  { name: 'Agent X Kiosk', description: 'Technology demo area', completed: false },
  { name: 'Networking Lounge', description: 'Level 2 terrace', completed: false },
  { name: 'Keynote Stage', description: 'Grand auditorium', completed: false },
];

export default function TouchpointsPage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned]   = useState<Set<number>>(new Set());
  const [reward, setReward]     = useState<{ name: string; pts: number } | null>(null);

  async function handleScan() {
    // Navigate to QR scan route
    router.push('/scan');
  }

  return (
    <>
      <style>{`
        .tp-page { position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden; }
        .tp-scroll {
          flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
          padding: 20px 18px calc(20px + var(--nav-h) + env(safe-area-inset-bottom, 0px) + 90px);
        }
        .back-btn {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 15px; font-weight: 600; color: var(--blue);
          background: none; border: none; cursor: pointer; margin-bottom: 16px; padding: 0;
        }
        .page-title { font-family: 'Sora', sans-serif; font-size: 28px; font-weight: 700; color: var(--navy); margin: 0 0 8px; }
        .page-sub { font-size: 15px; color: var(--t3); margin: 0 0 20px; }
        .scan-cta {
          background: linear-gradient(135deg, var(--blue-mid), var(--blue-deep));
          border-radius: var(--r-xl); padding: 22px 20px;
          display: flex; align-items: center; gap: 16px;
          margin-bottom: 24px;
          box-shadow: var(--shadow-blue); cursor: pointer; border: none;
          width: 100%; text-align: left;
          transition: opacity var(--tr);
        }
        .scan-cta:active { opacity: .88; }
        .scan-icon {
          width: 54px; height: 54px; border-radius: 14px;
          background: rgba(255,255,255,.15);
          display: flex; align-items: center; justify-content: center;
          font-size: 26px; flex-shrink: 0;
        }
        .scan-label {
          font-family: 'Sora', sans-serif;
          font-size: 18px; font-weight: 700; color: #fff; line-height: 1.2;
        }
        .scan-sub { font-size: 14px; color: rgba(255,255,255,.72); margin-top: 3px; }
        .sec-label {
          font-size: 11px; font-weight: 800; letter-spacing: .08em;
          text-transform: uppercase; color: var(--steel); margin-bottom: 10px;
        }
        .tp-card {
          background: var(--surface); border: 1.5px solid var(--border);
          border-radius: var(--r-lg); padding: 14px 16px; margin-bottom: 10px;
          box-shadow: var(--shadow-xs);
          display: flex; align-items: center; gap: 12px;
        }
        .tp-card.done { opacity: .65; }
        .tp-pin {
          width: 36px; height: 36px; border-radius: 10px;
          background: var(--blue-lt); font-size: 18px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .tp-card.done .tp-pin { background: var(--green-lt); }
        .tp-name { font-size: 16px; font-weight: 700; color: var(--navy); }
        .tp-desc { font-size: 13px; color: var(--t3); margin-top: 2px; }
        .tp-badge {
          margin-left: auto;
          font-size: 13px; font-weight: 700;
          color: var(--green); flex-shrink: 0;
        }
        .tp-lock { margin-left: auto; font-size: 18px; color: var(--t5); flex-shrink: 0; }
        .reward-toast {
          position: fixed; bottom: calc(var(--nav-h) + 20px + env(safe-area-inset-bottom, 0px) + 90px);
          left: 18px; right: 18px;
          background: var(--surface); border: 1.5px solid var(--green);
          border-radius: var(--r); padding: 14px 16px;
          box-shadow: var(--shadow-lg);
          display: flex; align-items: center; gap: 10px;
          z-index: 400;
        }
        .reward-text { font-size: 15px; font-weight: 600; color: var(--navy); }
        .reward-pts { font-family: 'Sora', sans-serif; font-size: 18px; font-weight: 800; color: var(--gold-rich); margin-left: auto; }
      `}</style>

      <div className="tp-page">
        <div className="tp-scroll">
          <button className="back-btn" onClick={() => router.back()}>‹ Activities</button>
          <h1 className="page-title">Venue Touchpoints</h1>
          <p className="page-sub">Scan QR codes at key locations to earn points</p>

          <button className="scan-cta" onClick={handleScan}>
            <div className="scan-icon">📷</div>
            <div>
              <div className="scan-label">Scan QR Code</div>
              <div className="scan-sub">Tap to open camera scanner</div>
            </div>
          </button>

          <div className="sec-label">Locations ({scanned.size} / {LOCATIONS.length})</div>
          {LOCATIONS.map((loc, i) => {
            const done = scanned.has(i);
            return (
              <div key={i} className={`tp-card${done ? ' done' : ''}`}>
                <div className="tp-pin">{done ? '✅' : '📍'}</div>
                <div>
                  <div className="tp-name">{loc.name}</div>
                  <div className="tp-desc">{loc.description}</div>
                </div>
                {done
                  ? <span className="tp-badge">+40 pts</span>
                  : <span className="tp-lock">○</span>
                }
              </div>
            );
          })}
        </div>

        {reward && (
          <div className="reward-toast">
            <span style={{ fontSize: 22 }}>📍</span>
            <div className="reward-text">{reward.name} scanned!</div>
            <div className="reward-pts">+{reward.pts} pts</div>
          </div>
        )}
      </div>
    </>
  );
}
