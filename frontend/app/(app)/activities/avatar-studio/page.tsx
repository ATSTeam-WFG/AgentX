'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

const FRAMES = [
  { id: 'navy',   label: 'Navy Crest',   bg: '#081840', border: '#1b4fc4' },
  { id: 'gold',   label: 'Gold Summit',  bg: '#b07a00', border: '#c99010' },
  { id: 'steel',  label: 'Steel Edge',   bg: '#3a5278', border: '#4a86d0' },
  { id: 'cyan',   label: 'Cyan Wave',    bg: '#0ab8de', border: '#0f2d8a' },
];

export default function AvatarStudioPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  const [printClaimed, setPrintClaimed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const totalPts = (photoUploaded ? 50 : 0) + (selectedFrame ? 0 : 0) + (printClaimed ? 100 : 0);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleUploadPhoto() {
    if (!photoPreview) return;
    setUploading(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/v1/activities/avatar-studio/photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('agentx_token') : ''}`,
        },
        body: JSON.stringify({ photoData: photoPreview, frameId: selectedFrame }),
      });
    } catch { /* non-blocking */ }
    setPhotoUploaded(true);
    setUploading(false);
  }

  async function handleClaimPrint() {
    setClaiming(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/v1/activities/avatar-studio/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('agentx_token') : ''}`,
        },
        body: JSON.stringify({ frameId: selectedFrame }),
      });
    } catch { /* non-blocking */ }
    setPrintClaimed(true);
    setClaiming(false);
  }

  return (
    <>
      <style>{`
        .av-page { position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden; }
        .av-scroll {
          flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
          padding: 20px 18px calc(20px + var(--nav-h) + env(safe-area-inset-bottom, 0px) + 90px);
          overscroll-behavior: contain;
        }
        .back-btn {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 15px; font-weight: 600; color: var(--blue);
          background: none; border: none; cursor: pointer; margin-bottom: 16px; padding: 0;
        }
        .page-title {
          font-family: 'Sora', sans-serif;
          font-size: 28px; font-weight: 700; color: var(--t);
          letter-spacing: -.025em; margin: 0 0 6px;
        }
        .page-sub { font-size: 15px; color: var(--t3); margin: 0 0 24px; }

        /* Points tally */
        .pts-tally {
          display: flex; align-items: center; justify-content: space-between;
          background: var(--gold-lt);
          border: 1px solid rgba(176,122,0,.20);
          border-radius: var(--r); padding: 14px 16px;
          margin-bottom: 22px;
        }
        .pts-tally-label { font-size: 14px; font-weight: 600; color: var(--t3); }
        .pts-tally-num {
          font-family: 'Sora', sans-serif;
          font-size: 22px; font-weight: 800; color: var(--gold);
        }
        .pts-tally-max { font-size: 12px; color: var(--t4); font-weight: 600; }

        /* Section cards */
        .av-section {
          background: var(--surface);
          border: 1px solid var(--border-metal);
          border-radius: var(--r-lg);
          padding: 18px; margin-bottom: 16px;
          box-shadow: var(--shadow-card);
        }
        .av-section.done { border-color: rgba(21,122,64,.30); }
        .av-section-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 14px;
        }
        .av-section-title {
          font-family: 'Sora', sans-serif;
          font-size: 17px; font-weight: 700; color: var(--t);
        }
        .av-pts-badge {
          background: var(--gold-lt); color: var(--gold);
          border: 1px solid rgba(176,122,0,.18);
          border-radius: 8px; padding: 4px 10px;
          font-size: 13px; font-weight: 800;
          font-family: 'Sora', sans-serif;
        }
        .av-pts-badge.earned {
          background: var(--green-lt); color: var(--green);
          border-color: rgba(21,122,64,.18);
        }

        /* Photo upload area */
        .photo-upload-area {
          border: 2px dashed var(--border-metal);
          border-radius: var(--r); padding: 32px 20px;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 10px; cursor: pointer;
          transition: border-color var(--tr), background var(--tr);
          background: var(--bg2);
          margin-bottom: 14px; position: relative; overflow: hidden;
        }
        .photo-upload-area:active { background: var(--bg3); }
        .photo-upload-area img {
          position: absolute; inset: 0;
          width: 100%; height: 100%; object-fit: cover;
          border-radius: calc(var(--r) - 2px);
        }
        .photo-upload-icon { font-size: 36px; }
        .photo-upload-label {
          font-size: 15px; font-weight: 600; color: var(--t2);
          text-align: center;
        }
        .photo-upload-sub { font-size: 13px; color: var(--t3); text-align: center; }

        /* Frame grid */
        .frame-grid {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 10px; margin-bottom: 14px;
        }
        .frame-option {
          aspect-ratio: 1; border-radius: 12px;
          border: 2px solid var(--border-metal);
          cursor: pointer; transition: all var(--tr);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 4px; padding: 8px;
          background: var(--bg2);
        }
        .frame-option.selected {
          border-width: 2.5px;
          box-shadow: 0 0 0 3px rgba(27,79,196,.12);
        }
        .frame-swatch {
          width: 28px; height: 28px; border-radius: 8px;
          border: 2px solid rgba(255,255,255,.3);
        }
        .frame-label { font-size: 10px; font-weight: 700; color: var(--t3); text-align: center; letter-spacing: .02em; }
        .frame-option.selected .frame-label { color: var(--blue); }

        /* Action buttons */
        .av-btn {
          width: 100%; height: 52px; border-radius: 13px;
          background: linear-gradient(135deg, var(--blue-mid), var(--blue));
          color: #fff; font-size: 16px; font-weight: 700;
          font-family: 'Sora', sans-serif;
          border: none; cursor: pointer;
          box-shadow: var(--shadow-blue);
          transition: opacity var(--tr);
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .av-btn:disabled { opacity: .45; cursor: not-allowed; }
        .av-btn.done-btn {
          background: var(--green-lt); color: var(--green);
          border: 1px solid rgba(21,122,64,.22);
          box-shadow: none;
          pointer-events: none;
        }
        .av-btn.gold-btn {
          background: linear-gradient(135deg, #d4941c, var(--gold-rich));
          box-shadow: var(--shadow-gold);
        }
        .check-circle {
          width: 22px; height: 22px; border-radius: 50%;
          background: var(--green); display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .print-note {
          font-size: 13px; color: var(--t3); text-align: center;
          margin-top: 10px; line-height: 1.4;
        }
      `}</style>

      <div className="av-page">
        <div className="av-scroll">
          <button className="back-btn" onClick={() => router.back()}>‹ Activities</button>
          <h1 className="page-title">Avatar Studio</h1>
          <p className="page-sub">Create your personalized summit avatar</p>

          {/* Points tally */}
          <div className="pts-tally">
            <div>
              <div className="pts-tally-label">Points earned</div>
              <div className="pts-tally-max">150 pts total available</div>
            </div>
            <div className="pts-tally-num">+{totalPts} pts</div>
          </div>

          {/* Step 1: Photo */}
          <div className={`av-section${photoUploaded ? ' done' : ''}`}>
            <div className="av-section-header">
              <div className="av-section-title">
                {photoUploaded ? '✅ Photo uploaded' : '1. Upload your photo'}
              </div>
              <span className={`av-pts-badge${photoUploaded ? ' earned' : ''}`}>+50 pts</span>
            </div>

            {!photoUploaded && (
              <>
                <div className="photo-upload-area" onClick={() => fileRef.current?.click()}>
                  {photoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoPreview} alt="Preview" />
                  ) : (
                    <>
                      <span className="photo-upload-icon">📸</span>
                      <span className="photo-upload-label">Tap to take or upload a photo</span>
                      <span className="photo-upload-sub">JPG or PNG, used for your summit avatar</span>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={handleFileChange} />
                <button className="av-btn" onClick={handleUploadPhoto} disabled={!photoPreview || uploading}>
                  {uploading ? 'Uploading…' : 'Upload Photo · +50 pts'}
                </button>
              </>
            )}
          </div>

          {/* Step 2: Frame */}
          <div className="av-section">
            <div className="av-section-header">
              <div className="av-section-title">2. Choose a frame</div>
              <span className="av-pts-badge">Included</span>
            </div>
            <div className="frame-grid">
              {FRAMES.map((frame) => (
                <button
                  key={frame.id}
                  className={`frame-option${selectedFrame === frame.id ? ' selected' : ''}`}
                  style={{ borderColor: selectedFrame === frame.id ? frame.border : undefined }}
                  onClick={() => setSelectedFrame(frame.id)}
                  type="button"
                >
                  <div className="frame-swatch" style={{ background: frame.bg, borderColor: frame.border }} />
                  <div className="frame-label">{frame.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Print */}
          <div className={`av-section${printClaimed ? ' done' : ''}`}>
            <div className="av-section-header">
              <div className="av-section-title">
                {printClaimed ? '✅ Print claimed' : '3. Claim your print'}
              </div>
              <span className={`av-pts-badge${printClaimed ? ' earned' : ''}`}>+100 pts</span>
            </div>

            {printClaimed ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                <div className="check-circle">
                  <svg viewBox="0 0 14 14" fill="none" width="14" height="14">
                    <path d="M2.5 7l3.5 3.5 5.5-5.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)' }}>Print queued at the Agent X kiosk!</span>
              </div>
            ) : (
              <>
                <button
                  className={`av-btn gold-btn`}
                  onClick={handleClaimPrint}
                  disabled={claiming || !photoUploaded}
                >
                  {claiming ? 'Processing…' : '🖨 Claim Print at Kiosk · +100 pts'}
                </button>
                {!photoUploaded && (
                  <p className="print-note">Upload your photo first to unlock print claiming.</p>
                )}
                {photoUploaded && (
                  <p className="print-note">Visit the Agent X kiosk to pick up your printed avatar.</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
