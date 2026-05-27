'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { SPONSORS_DATA } from '@/lib/sponsors-data';

export default function SponsorDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const { slug } = use(params);
  const sponsor = SPONSORS_DATA.find((s) => s.slug === slug);

  return (
    <>
      <style>{`
        .sp-page { position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden; }
        .sp-scroll {
          flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
          padding: 20px 18px calc(20px + var(--nav-h) + env(safe-area-inset-bottom, 0px) + 90px);
          overscroll-behavior: contain;
        }
        .back-btn {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 15px; font-weight: 600; color: var(--amber);
          background: none; border: none; cursor: pointer; margin-bottom: 24px; padding: 0;
        }
        .sp-logo-wrap {
          background: #fff;
          border-radius: 18px;
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 120px;
          margin-bottom: 24px;
          box-shadow: 0 2px 16px rgba(0,0,0,.12);
          border: 1px solid rgba(0,0,0,.06);
        }
        .sp-logo-wrap.dark { background: #1C283C; border-color: rgba(255,255,255,.10); }
        .sp-logo { max-width: 100%; height: 64px; object-fit: contain; object-position: center; }
        .sp-name {
          font-family: 'Sora', sans-serif;
          font-size: 26px; font-weight: 700; color: #CCDEE7;
          letter-spacing: -.025em; margin: 0 0 18px;
        }
        .sp-desc-card {
          background: var(--metallic);
          border: 1.5px solid rgba(255,255,255,.45);
          border-radius: var(--r-lg);
          padding: 18px;
          box-shadow: var(--shadow-card);
          margin-bottom: 20px;
        }
        .sp-desc-label {
          font-size: 11px; font-weight: 800; letter-spacing: .10em;
          text-transform: uppercase; color: rgba(204,222,231,.45);
          margin-bottom: 10px;
        }
        .sp-desc-text {
          font-size: 15px; color: #1C283C; line-height: 1.65;
        }
        .sp-website-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; height: 52px; border-radius: 14px;
          background: #1C283C;
          border: 1px solid rgba(227,149,72,.18);
          color: var(--amber);
          font-size: 16px; font-weight: 700; font-family: 'Sora', sans-serif;
          text-decoration: none;
          margin-top: 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.04);
        }
        .not-found {
          display: flex; flex-direction: column; align-items: center;
          padding: 60px 24px; gap: 12px;
          text-align: center; color: var(--t3);
        }
        .not-found-title {
          font-family: 'Sora', sans-serif;
          font-size: 20px; font-weight: 700; color: var(--t);
        }
      `}</style>

      <div className="sp-page">
        <div className="sp-scroll">
          <button className="back-btn" onClick={() => router.back()}>‹ Back</button>

          {sponsor ? (
            <>
              <div className={`sp-logo-wrap${sponsor.dark ? ' dark' : ''}`}>
                <img src={sponsor.logo} alt={sponsor.name} className="sp-logo" />
              </div>

              <h1 className="sp-name">{sponsor.name}</h1>

              <div className="sp-desc-card">
                <div className="sp-desc-label">About</div>
                <p className="sp-desc-text">{sponsor.description}</p>
                {sponsor.website && (
                  <a
                    className="sp-website-btn"
                    href={sponsor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                    Visit Website
                  </a>
                )}
              </div>
            </>
          ) : (
            <div className="not-found">
              <div className="not-found-title">Sponsor not found</div>
              <p>This sponsor page doesn&apos;t exist.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
