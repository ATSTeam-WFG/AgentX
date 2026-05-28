'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ES26LoadingScreen from '@/components/ES26LoadingScreen';
import { useUiStore } from '@/store/ui';

type Phase = 'intro' | 'camera' | 'generating' | 'result';

async function uploadAndGenerate(_file: File): Promise<{ jobId: string }> {
  await new Promise((r) => setTimeout(r, 500));
  return { jobId: crypto.randomUUID() };
}

async function pollAvatarJob(_jobId: string, photoUrl: string): Promise<{ status: 'generating' | 'done'; resultUrl: string }> {
  await new Promise((r) => setTimeout(r, 15000));
  return { status: 'done', resultUrl: photoUrl };
}

export default function AvatarStudioPage() {
  const router = useRouter();
  const { pushToast } = useUiStore();

  const [phase, setPhase]         = useState<Phase>('intro');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl]   = useState<string | null>(null);
  const [jobId, setJobId]         = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [printDone, setPrintDone] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const captureRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => { if (photoUrl) URL.revokeObjectURL(photoUrl); };
  }, [photoUrl]);

  useEffect(() => {
    if (phase !== 'generating' || !jobId) return;
    const t = setInterval(async () => {
      try {
        const res = await pollAvatarJob(jobId, photoUrl ?? '');
        if (res.status === 'done') {
          clearInterval(t);
          setResultUrl(res.resultUrl);
          setPhase('result');
          pushToast({ message: 'Avatar portrait created!', points: 50 });
        }
      } catch {
        // silent retry
      }
    }, 2000);
    return () => clearInterval(t);
  }, [phase, jobId, pushToast]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoFile(file);
    setPhotoUrl(URL.createObjectURL(file));
    e.target.value = '';
  }, [photoUrl]);

  async function handleGenerate() {
    if (!photoFile) return;
    setPhase('generating');
    try {
      const { jobId: id } = await uploadAndGenerate(photoFile);
      setJobId(id);
    } catch {
      setPhase('camera');
    }
  }

  function handlePrint() {
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = 'my-avatar-portrait.png';
    a.click();
    setPrintDone(true);
    pushToast({ message: 'Portrait saved!', points: 100 });
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setShareOpen(false);
  }

  function handleDownloadPng() {
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = 'my-avatar-portrait.png';
    a.click();
    setShareOpen(false);
  }

  async function handleNativeShare() {
    try {
      const res = await fetch(resultUrl);
      const blob = await res.blob();
      const file = new File([blob], 'avatar-portrait.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My Executive Avatar Portrait' });
      } else {
        handleDownloadPng();
      }
    } catch {
      handleDownloadPng();
    }
    setShareOpen(false);
  }

  return (
    <>
      <style>{`
        .as-page { position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden; }
        .as-scroll {
          flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
          padding: 20px 18px calc(20px + var(--nav-h) + env(safe-area-inset-bottom, 0px) + 90px);
          overscroll-behavior: contain;
        }
        .back-btn {
          display: flex; align-items: center; gap: 6px; width: 100%;
          font-size: 15px; font-weight: 600; color: var(--amber);
          background: var(--bg); border: none; cursor: pointer;
          padding: 10px 0 8px; margin-bottom: 8px;
          position: sticky; top: 0; z-index: 10;
        }
        .page-title {
          font-family: 'Sora', sans-serif; font-size: 32px; font-weight: 800;
          color: #CCDEE7; letter-spacing: .02em; text-transform: uppercase; margin: 0 0 8px;
        }
        .page-sub { font-size: 15px; color: rgba(204,222,231,.55); margin: 0 0 24px; }
        .btn-cta {
          width: 100%; height: 52px; border-radius: 14px;
          background: #1C283C; color: #E39548;
          font-size: 15px; font-weight: 700; letter-spacing: .02em;
          font-family: 'Sora', sans-serif;
          border: 1px solid rgba(227,149,72,.18); cursor: pointer;
          box-shadow: 0 2px 14px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.04);
          transition: transform .18s cubic-bezier(.4,0,.2,1), background .15s;
          display: flex; align-items: center; justify-content: center; gap: 10px;
        }
        .btn-cta:hover { background: #243352; }
        .btn-cta:active { transform: scale(.97); }
        .btn-cta:disabled { opacity: .5; cursor: not-allowed; }

        /* ── INTRO ── */
        .intro-logo-wrap {
          display: flex; align-items: center; justify-content: center;
          margin: 8px 0 28px;
        }
        .intro-logo {
          width: 120px; border-radius: 20px;
          box-shadow: 0 0 40px rgba(227,149,72,.20), 0 4px 20px rgba(0,0,0,.28);
        }
        .intro-card {
          background: var(--metallic); border: 1.5px solid rgba(255,255,255,.45);
          border-radius: var(--r-lg); padding: 18px 18px 14px; margin-bottom: 20px;
          box-shadow: var(--shadow-card);
        }
        .intro-card-text { font-size: 15px; color: #4a6080; line-height: 1.6; margin-bottom: 16px; }

        /* ── CAMERA ── */
        .capture-zone {
          background: var(--metallic); border: 1.5px solid rgba(255,255,255,.45);
          border-radius: 18px; box-shadow: var(--shadow-card);
          overflow: hidden; position: relative;
          width: 100%; aspect-ratio: 3 / 4; max-height: 340px;
          margin-bottom: 16px;
        }
        .capture-zone-inner {
          position: absolute; inset: 12px; border-radius: 12px;
          border: 2px dashed rgba(28,40,60,.20);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 10px;
        }
        .capture-zone-inner.has-photo { border: none; inset: 0; border-radius: 0; }
        .capture-preview {
          width: 100%; height: 100%; object-fit: cover; display: block;
        }
        .capture-placeholder-label {
          font-size: 14px; font-weight: 600; color: rgba(28,40,60,.35);
          text-align: center; padding: 0 20px;
        }
        .capture-btn-row { display: grid; grid-template-columns: 1fr 1.8fr; gap: 10px; margin-bottom: 16px; }
        .btn-secondary {
          height: 52px; border-radius: 14px;
          background: var(--metallic); color: #1C283C;
          border: 1.5px solid rgba(255,255,255,.45);
          font-size: 14px; font-weight: 700;
          font-family: 'Sora', sans-serif; cursor: pointer;
          box-shadow: var(--shadow-card);
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: transform .18s;
        }
        .btn-secondary:active { transform: scale(.97); }

        /* ── RESULT ── */
        .result-header-row {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 16px; gap: 12px;
        }
        .result-pts-chip {
          display: inline-flex; align-items: center; gap: 5px;
          background: rgba(20,102,54,.10); color: #146636;
          border: 1px solid rgba(20,102,54,.25); border-radius: 20px;
          padding: 5px 12px; flex-shrink: 0;
          font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 700;
        }
        .result-frame {
          position: relative; border-radius: var(--r-xl); overflow: hidden;
          aspect-ratio: 3 / 4; max-height: 340px; width: 100%;
          margin-bottom: 20px;
          border: 1.5px solid rgba(255,255,255,.45);
          box-shadow: 0 0 0 1px rgba(227,149,72,.30), 0 8px 40px rgba(0,0,0,.50), 0 0 60px rgba(227,149,72,.10);
          animation: revealPortrait .8s cubic-bezier(.25,1.4,.4,1) both;
        }
        @keyframes revealPortrait {
          from { opacity: 0; transform: scale(.94); }
          to   { opacity: 1; transform: scale(1); }
        }
        .result-avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .result-action-row { display: grid; grid-template-columns: 1fr auto; gap: 10px; margin-bottom: 14px; }
        .btn-share {
          height: 52px; border-radius: 14px;
          background: var(--metallic); color: #E39548;
          border: 1.5px solid rgba(227,149,72,.40);
          font-size: 14px; font-weight: 700;
          font-family: 'Sora', sans-serif; cursor: pointer;
          box-shadow: var(--shadow-card);
          padding: 0 20px; white-space: nowrap;
          display: flex; align-items: center; gap: 8px;
          transition: transform .18s;
        }
        .btn-share:active { transform: scale(.97); }
        .pts-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .pts-chip {
          display: inline-flex; align-items: center; gap: 6px;
          border-radius: 20px; padding: 6px 14px;
          font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 700;
        }
        .pts-chip.earned { background: rgba(20,102,54,.10); color: #146636; border: 1px solid rgba(20,102,54,.25); }
        .pts-chip.pending { background: rgba(227,149,72,.10); color: #E39548; border: 1px solid rgba(227,149,72,.25); }

        /* ── SHARE SHEET ── */
        .share-overlay {
          position: fixed; inset: 0; background: rgba(6,12,24,.78);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          z-index: 300; display: flex; align-items: flex-end; justify-content: center;
          animation: overlayIn .22s ease;
        }
        @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
        .share-sheet {
          background: var(--metallic); border-radius: 28px 28px 0 0;
          padding: 0 20px calc(20px + env(safe-area-inset-bottom, 0px));
          width: 100%; max-width: 520px;
          box-shadow: 0 -16px 60px rgba(0,0,0,.52);
          border-top: 2px solid rgba(227,149,72,.30);
          animation: sheetUp .30s cubic-bezier(.25,1.4,.4,1);
        }
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .share-handle {
          position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
          width: 44px; height: 5px; background: rgba(0,0,0,.14); border-radius: 3px;
        }
        .share-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 22px 0 16px; border-bottom: 1px solid rgba(28,40,60,.10); margin-bottom: 14px;
        }
        .share-title { font-family: 'Sora', sans-serif; font-size: 17px; font-weight: 800; color: #1C283C; }
        .share-close-btn {
          width: 34px; height: 34px; border-radius: 10px;
          background: rgba(0,0,0,.07); border: 1px solid rgba(255,255,255,.45);
          display: flex; align-items: center; justify-content: center;
          color: #4a6080; cursor: pointer; transition: background .15s;
        }
        .share-close-btn:active { background: rgba(0,0,0,.14); }
        .share-options { display: flex; flex-direction: column; gap: 10px; padding-bottom: 4px; }
        .share-opt {
          display: flex; align-items: center; gap: 14px;
          height: 56px; border-radius: 14px;
          background: rgba(255,255,255,.55); border: 1.5px solid rgba(255,255,255,.70);
          padding: 0 18px; cursor: pointer;
          font-size: 15px; font-weight: 600; color: #1C283C;
          font-family: 'Sora', sans-serif;
          box-shadow: 0 2px 8px rgba(0,0,0,.08), inset 0 1px 0 rgba(255,255,255,.70);
          transition: transform .15s;
        }
        .share-opt:active { transform: scale(.98); }
        .share-opt-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: rgba(28,40,60,.06); border: 1px solid rgba(28,40,60,.08);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
      `}</style>

      {/* ── INTRO ── */}
      {phase === 'intro' && (
        <div className="as-page">
          <div className="as-scroll">
            <button className="back-btn" onClick={() => router.back()}>
              <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Activities
            </button>
            <div className="intro-logo-wrap">
              <img src="https://pub-9849080621014a8e9c12e5989f01a96e.r2.dev/brand/es26logo.png" alt="ES26" className="intro-logo" />
            </div>
            <h1 className="page-title">Avatar Studio</h1>
            <p className="page-sub">Your AI-generated executive portrait</p>
            <div className="intro-card">
              <div className="intro-card-text">
                Step into the ES26 scene. Upload your photo and our AI will compose your executive portrait against the summit backdrop.
              </div>
              <button className="btn-cta" onClick={() => setPhase('camera')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                Take Selfie
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CAMERA ── */}
      {phase === 'camera' && (
        <div className="as-page">
          <div className="as-scroll">
            <button className="back-btn" onClick={() => setPhase('intro')}>
              <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Back
            </button>
            <h1 className="page-title">Your Photo</h1>
            <p className="page-sub">Position your face clearly in frame</p>

            <div className="capture-zone">
              <div className={`capture-zone-inner${photoUrl ? ' has-photo' : ''}`}>
                {photoUrl ? (
                  <img className="capture-preview" src={photoUrl} alt="Your photo" />
                ) : (
                  <>
                    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                      <rect width="52" height="52" rx="14" fill="rgba(28,40,60,.06)" />
                      <path d="M18 36h16a2 2 0 002-2V22a2 2 0 00-2-2H32l-2-3H22l-2 3h-2a2 2 0 00-2 2v12a2 2 0 002 2z"
                        stroke="rgba(28,40,60,.28)" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
                      <circle cx="26" cy="28" r="4" stroke="rgba(28,40,60,.28)" strokeWidth="1.6" fill="none" />
                    </svg>
                    <span className="capture-placeholder-label">Tap below to take your selfie</span>
                  </>
                )}
              </div>
            </div>

            <input ref={captureRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={handleFileChange} />

            {!photoUrl ? (
              <button className="btn-cta" onClick={() => captureRef.current?.click()}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                Take Selfie
              </button>
            ) : (
              <div className="capture-btn-row">
                <button className="btn-secondary" onClick={() => { setPhotoFile(null); setPhotoUrl(null); captureRef.current?.click(); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                  Retake
                </button>
                <button className="btn-cta" style={{ flex: 1, width: 'auto' }} onClick={handleGenerate}>
                  Generate Avatar
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── GENERATING ── */}
      {phase === 'generating' && (
        <div className="as-page">
          <ES26LoadingScreen label="Generating your portrait…" />
        </div>
      )}

      {/* ── RESULT ── */}
      {phase === 'result' && (
        <>
          <div className="as-page">
            <div className="as-scroll">
              <button className="back-btn" onClick={() => router.push('/activities')}>
                <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Activities
              </button>

              <div className="result-header-row">
                <h1 className="page-title" style={{ marginBottom: 0 }}>Your Portrait</h1>
                <span className="result-pts-chip">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/></svg>
                  +50 pts
                </span>
              </div>

              <div className="result-frame">
                <img className="result-avatar-img" src={resultUrl} alt="Your AI executive portrait" />
              </div>

              <div className="result-action-row">
                <button className="btn-cta" onClick={handlePrint}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  Print &amp; Save
                </button>
                <button className="btn-share" onClick={() => setShareOpen(true)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  Share
                </button>
              </div>

              <div className="pts-row">
                <span className="pts-chip earned">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  +50 pts earned
                </span>
                <span className={`pts-chip ${printDone ? 'earned' : 'pending'}`}>
                  {printDone
                    ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>+100 pts</>
                    : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>+100 pts when you print</>
                  }
                </span>
              </div>
            </div>
          </div>

          {shareOpen && (
            <div className="share-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShareOpen(false); }}>
              <div className="share-sheet" style={{ position: 'relative' }}>
                <div className="share-handle" />
                <div className="share-header">
                  <span className="share-title">Share Your Portrait</span>
                  <button className="share-close-btn" onClick={() => setShareOpen(false)} aria-label="Close">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                <div className="share-options">
                  <button className="share-opt" onClick={handleCopyLink}>
                    <div className="share-opt-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1C283C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                    </div>
                    Copy Link
                  </button>
                  <button className="share-opt" onClick={handleNativeShare}>
                    <div className="share-opt-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1C283C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                    </div>
                    Share
                  </button>
                  <button className="share-opt" onClick={handleDownloadPng}>
                    <div className="share-opt-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1C283C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </div>
                    Download PNG
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
