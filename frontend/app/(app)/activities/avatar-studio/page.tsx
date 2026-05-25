'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { uploadSelfieAndGenerate, getAvatarStatus, claimAvatarPrint } from '../../../../lib/api/activities';

type Status = 'idle' | 'uploading' | 'generating' | 'done' | 'error';

const BACKDROPS = [
  { id: '1' as const, label: 'Backdrop 1', src: '/backdrops/backdrop1.png' },
  { id: '2' as const, label: 'Backdrop 2', src: '/backdrops/backdrop2.png' },
];

export default function AvatarStudioPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [selectedBackdrop, setSelectedBackdrop] = useState<'1' | '2' | null>(null);

  const [status, setStatus] = useState<Status>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [ptsFromGenerate, setPtsFromGenerate] = useState(0);
  const [ptsFromPrint, setPtsFromPrint] = useState(0);
  const [printClaimed, setPrintClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const totalPts = ptsFromGenerate + ptsFromPrint;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelfieFile(file);
    const reader = new FileReader();
    reader.onload = () => setSelfiePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleGenerate() {
    if (!selfieFile || !selectedBackdrop) return;
    setStatus('uploading');
    setErrorMsg('');
    try {
      const { jobId: id, pointsAwarded } = await uploadSelfieAndGenerate(selfieFile, selectedBackdrop);
      setJobId(id);
      setPtsFromGenerate(pointsAwarded);
      setStatus('generating');
    } catch {
      setErrorMsg('Upload failed. Please try again.');
      setStatus('error');
    }
  }

  // Poll for generation result
  useEffect(() => {
    if (status !== 'generating' || !jobId) return;
    const interval = setInterval(async () => {
      try {
        const res = await getAvatarStatus(jobId);
        if (res.status === 'done' && res.avatarUrl) {
          setAvatarUrl(res.avatarUrl);
          setStatus('done');
          clearInterval(interval);
          queryClient.invalidateQueries({ queryKey: ['profile'] });
          queryClient.invalidateQueries({ queryKey: ['activities'] });
        } else if (res.status === 'failed') {
          setErrorMsg('Avatar generation failed. Please try again.');
          setStatus('error');
          clearInterval(interval);
        }
      } catch {
        setErrorMsg('Connection error while checking status.');
        setStatus('error');
        clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [status, jobId, queryClient]);

  async function handleClaimPrint() {
    setClaiming(true);
    try {
      const { pointsAwarded } = await claimAvatarPrint();
      setPtsFromPrint(pointsAwarded);
      setPrintClaimed(true);
    } catch {
      /* non-blocking — kiosk staff can manually verify */
    }
    setClaiming(false);
  }

  const canGenerate = !!selfieFile && !!selectedBackdrop && status === 'idle';
  const isGenerating = status === 'uploading' || status === 'generating';

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

        .pts-tally {
          display: flex; align-items: center; justify-content: space-between;
          background: var(--gold-lt);
          border: 1px solid rgba(176,122,0,.20);
          border-radius: var(--r); padding: 14px 16px;
          margin-bottom: 22px;
        }
        .pts-tally-label { font-size: 14px; font-weight: 600; color: var(--t3); }
        .pts-tally-num { font-family: 'Sora', sans-serif; font-size: 22px; font-weight: 800; color: var(--gold); }
        .pts-tally-max { font-size: 12px; color: var(--t4); font-weight: 600; }

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
        .av-section-title { font-family: 'Sora', sans-serif; font-size: 17px; font-weight: 700; color: var(--t); }
        .av-pts-badge {
          background: var(--gold-lt); color: var(--gold);
          border: 1px solid rgba(176,122,0,.18);
          border-radius: 8px; padding: 4px 10px;
          font-size: 13px; font-weight: 800; font-family: 'Sora', sans-serif;
        }
        .av-pts-badge.earned { background: var(--green-lt); color: var(--green); border-color: rgba(21,122,64,.18); }

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
        .photo-upload-label { font-size: 15px; font-weight: 600; color: var(--t2); text-align: center; }
        .photo-upload-sub { font-size: 13px; color: var(--t3); text-align: center; }

        .backdrop-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
        .backdrop-option {
          aspect-ratio: 4/3; border-radius: 12px;
          border: 2px solid var(--border-metal);
          cursor: pointer; transition: all var(--tr);
          overflow: hidden; position: relative;
        }
        .backdrop-option.selected {
          border-color: var(--blue); border-width: 2.5px;
          box-shadow: 0 0 0 3px rgba(27,79,196,.12);
        }
        .backdrop-option img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .backdrop-label {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 6px 10px;
          background: linear-gradient(transparent, rgba(0,0,0,.55));
          font-size: 12px; font-weight: 700; color: #fff;
          letter-spacing: .02em;
        }
        .backdrop-option.selected .backdrop-label { color: #fff; }

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
          border: 1px solid rgba(21,122,64,.22); box-shadow: none; pointer-events: none;
        }
        .av-btn.gold-btn {
          background: linear-gradient(135deg, #d4941c, var(--gold-rich));
          box-shadow: var(--shadow-gold);
        }
        .av-btn.secondary-btn {
          background: var(--bg2); color: var(--t2);
          border: 1px solid var(--border-metal); box-shadow: none;
        }

        .result-img-wrap {
          border-radius: var(--r); overflow: hidden;
          margin-bottom: 14px; aspect-ratio: 1;
          background: var(--bg2);
        }
        .result-img-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }

        .generating-state {
          display: flex; flex-direction: column; align-items: center;
          gap: 12px; padding: 28px 0;
        }
        .spinner {
          width: 40px; height: 40px; border-radius: 50%;
          border: 3px solid var(--border-metal);
          border-top-color: var(--blue);
          animation: spin .8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .generating-label { font-size: 15px; font-weight: 600; color: var(--t2); text-align: center; }
        .generating-sub { font-size: 13px; color: var(--t3); text-align: center; }

        .error-msg {
          font-size: 14px; color: #c0392b; font-weight: 600;
          background: rgba(192,57,43,.08); border-radius: 10px;
          padding: 12px 14px; margin-bottom: 14px; text-align: center;
        }

        .check-circle {
          width: 22px; height: 22px; border-radius: 50%;
          background: var(--green); display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .print-note { font-size: 13px; color: var(--t3); text-align: center; margin-top: 10px; line-height: 1.4; }
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

          {/* Step 1: Upload selfie */}
          <div className="av-section">
            <div className="av-section-header">
              <div className="av-section-title">1. Take or upload a photo</div>
            </div>
            <div className="photo-upload-area" onClick={() => !isGenerating && fileRef.current?.click()}>
              {selfiePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selfiePreview} alt="Selfie preview" />
              ) : (
                <>
                  <span className="photo-upload-icon">📸</span>
                  <span className="photo-upload-label">Tap to take or upload a photo</span>
                  <span className="photo-upload-sub">JPG or PNG · used to generate your avatar</span>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="user"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          {/* Step 2: Choose backdrop */}
          <div className="av-section">
            <div className="av-section-header">
              <div className="av-section-title">2. Choose a backdrop</div>
            </div>
            <div className="backdrop-grid">
              {BACKDROPS.map((bd) => (
                <button
                  key={bd.id}
                  type="button"
                  className={`backdrop-option${selectedBackdrop === bd.id ? ' selected' : ''}`}
                  onClick={() => !isGenerating && setSelectedBackdrop(bd.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={bd.src} alt={bd.label} />
                  <div className="backdrop-label">{bd.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Generate */}
          <div className={`av-section${status === 'done' ? ' done' : ''}`}>
            <div className="av-section-header">
              <div className="av-section-title">
                {status === 'done' ? '✅ Avatar generated' : '3. Generate your avatar'}
              </div>
              <span className={`av-pts-badge${ptsFromGenerate > 0 ? ' earned' : ''}`}>+50 pts</span>
            </div>

            {status === 'idle' || status === 'error' ? (
              <>
                {status === 'error' && <div className="error-msg">{errorMsg}</div>}
                <button className="av-btn" onClick={handleGenerate} disabled={!canGenerate}>
                  ✨ Generate Avatar · +50 pts
                </button>
                {!selfieFile && (
                  <p className="print-note">Upload a photo first to get started.</p>
                )}
                {selfieFile && !selectedBackdrop && (
                  <p className="print-note">Choose a backdrop to continue.</p>
                )}
              </>
            ) : isGenerating ? (
              <div className="generating-state">
                <div className="spinner" />
                <div className="generating-label">
                  {status === 'uploading' ? 'Uploading your photo…' : 'AI is generating your avatar…'}
                </div>
                <div className="generating-sub">This takes 15–30 seconds</div>
              </div>
            ) : status === 'done' && avatarUrl ? (
              <>
                <div className="result-img-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatarUrl} alt="Your AI avatar" />
                </div>
                <a
                  href={avatarUrl}
                  download="agentx-avatar.jpg"
                  target="_blank"
                  rel="noreferrer"
                  className="av-btn secondary-btn"
                  style={{ textDecoration: 'none', marginBottom: 0 }}
                >
                  ⬇ Download Avatar
                </a>
              </>
            ) : null}
          </div>

          {/* Step 4: Claim print */}
          <div className={`av-section${printClaimed ? ' done' : ''}`}>
            <div className="av-section-header">
              <div className="av-section-title">
                {printClaimed ? '✅ Print claimed' : '4. Claim your print'}
              </div>
              <span className={`av-pts-badge${printClaimed ? ' earned' : ''}`}>+100 pts</span>
            </div>

            {printClaimed ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                <div className="check-circle">
                  <svg viewBox="0 0 14 14" fill="none" width="14" height="14">
                    <path d="M2.5 7l3.5 3.5 5.5-5.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)' }}>Print queued at the Agent X kiosk!</span>
              </div>
            ) : (
              <>
                <button
                  className="av-btn gold-btn"
                  onClick={handleClaimPrint}
                  disabled={claiming || status !== 'done'}
                >
                  {claiming ? 'Processing…' : '🖨 Claim Print at Kiosk · +100 pts'}
                </button>
                {status !== 'done' && (
                  <p className="print-note">Generate your avatar first to unlock print claiming.</p>
                )}
                {status === 'done' && (
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
