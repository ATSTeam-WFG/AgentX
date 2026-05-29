'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import ES26LoadingScreen from '@/components/ES26LoadingScreen';
import { useUiStore } from '@/store/ui';
import { uploadSelfieAndGenerate, getAvatarStatus, downloadAvatar } from '@/lib/api/activities';

type Phase = 'intro' | 'camera' | 'generating' | 'result';

const JOB_STORAGE_KEY = 'avatar_pending_job_id';

export default function AvatarStudioPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { pushToast } = useUiStore();

  const [phase, setPhase]         = useState<Phase>('intro');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl]   = useState<string | null>(null);
  const [jobId, setJobId]         = useState('');
  const [resultUrl, setResultUrl] = useState('');

  const captureRef = useRef<HTMLInputElement>(null);

  // On mount: resume a pending job or show existing avatar
  useEffect(() => {
    const storedJobId = localStorage.getItem(JOB_STORAGE_KEY);

    if (storedJobId) {
      getAvatarStatus(storedJobId)
        .then((res) => {
          if (res.status === 'done' && res.avatarUrl) {
            localStorage.removeItem(JOB_STORAGE_KEY);
            setResultUrl(res.avatarUrl);
            setPhase('result');
          } else if (res.status === 'failed') {
            localStorage.removeItem(JOB_STORAGE_KEY);
          } else {
            // still pending/running — resume polling
            setJobId(storedJobId);
            setPhase('generating');
          }
        })
        .catch(() => localStorage.removeItem(JOB_STORAGE_KEY));
      return;
    }

    // No pending job — check if they already have a generated avatar
    const cached = queryClient.getQueryData<{ avatarUrl?: string }>(['profile']);
    if (cached?.avatarUrl) {
      setResultUrl(cached.avatarUrl);
      setPhase('result');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => { if (photoUrl) URL.revokeObjectURL(photoUrl); };
  }, [photoUrl]);

  useEffect(() => {
    if (phase !== 'generating' || !jobId) return;
    const t = setInterval(async () => {
      try {
        const res = await getAvatarStatus(jobId);
        if (res.status === 'done' && res.avatarUrl) {
          clearInterval(t);
          localStorage.removeItem(JOB_STORAGE_KEY);
          setResultUrl(res.avatarUrl);
          setPhase('result');
          pushToast({ message: 'Avatar portrait created!', points: 150 });
          queryClient.invalidateQueries({ queryKey: ['profile'] });
        } else if (res.status === 'failed') {
          clearInterval(t);
          localStorage.removeItem(JOB_STORAGE_KEY);
          setPhase('camera');
          pushToast({ message: 'Portrait generation failed. Please try again.', type: 'warn' });
        }
      } catch {
        // silent retry — transient network error, keep polling
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
      const { jobId: id } = await uploadSelfieAndGenerate(photoFile, '1');
      localStorage.setItem(JOB_STORAGE_KEY, id);
      setJobId(id);
    } catch {
      setPhase('camera');
      pushToast({ message: 'Upload failed. Please check your connection and try again.', type: 'warn' });
    }
  }

  async function handleSaveToGallery() {
    try {
      const blob = await downloadAvatar();
      const file = new File([blob], 'my-executive-portrait.jpg', { type: blob.type });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My Executive Portrait' });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'my-executive-portrait.jpg';
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch {
      // user cancelled
    }
  }

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My ES26 Executive Portrait',
          text: 'Check out my AI-generated executive portrait from the WFG Executive Summit 2026!',
          url: resultUrl,
        });
      } else {
        await navigator.clipboard.writeText(resultUrl);
        pushToast({ message: 'Link copied!' });
      }
    } catch {
      // user cancelled
    }
  }


  return (
    <>
      <style>{`
        .as-page { position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden; }
        .as-scroll {
          flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
          padding: 8px 18px calc(20px + var(--nav-h) + env(safe-area-inset-bottom, 0px) + 90px);
          overscroll-behavior: contain;
        }
        .back-btn {
          display: flex; align-items: center; gap: 5px;
          font-size: 15px; font-weight: 600; color: var(--amber);
          background: none; border: none; cursor: pointer;
          padding: 10px 18px 6px; flex-shrink: 0;
        }
        .back-btn:active { opacity: .75; }
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
        @keyframes revealPortrait {
          from { opacity: 0; transform: scale(.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        .result-frame {
          width: 100%;
          aspect-ratio: 4 / 5;
          border-radius: 20px; overflow: hidden;
          border: 1.5px solid rgba(255,255,255,.18);
          box-shadow: 0 0 0 1px rgba(227,149,72,.20),
                      0 12px 48px rgba(0,0,0,.60),
                      0 0 80px rgba(227,149,72,.08);
          animation: revealPortrait .7s cubic-bezier(.22,1,.36,1) both;
          flex-shrink: 0;
        }
        .result-portrait-img {
          width: 100%; height: 100%;
          object-fit: cover; object-position: center top;
          display: block;
        }
        .result-meta {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: 14px; margin-bottom: 16px;
        }
        .result-label {
          font-family: 'Sora', sans-serif; font-size: 20px; font-weight: 800;
          color: #CCDEE7; letter-spacing: -.02em;
        }
        .result-pts-earned {
          display: inline-flex; align-items: center; gap: 5px;
          background: rgba(20,102,54,.12); color: #4ade80;
          border: 1px solid rgba(74,222,128,.20); border-radius: 20px;
          padding: 5px 12px; font-family: 'Sora', sans-serif;
          font-size: 12px; font-weight: 700; flex-shrink: 0;
        }
        .result-action-row {
          display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
        }
        .btn-action {
          height: 56px; border-radius: 14px;
          background: var(--metallic);
          border: 1.5px solid rgba(255,255,255,.45);
          color: #1C283C;
          font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
          font-family: 'Sora', sans-serif; cursor: pointer;
          box-shadow: var(--shadow-card);
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px;
          transition: transform .18s;
        }
        .btn-action:active { transform: scale(.97); }
        .btn-action.primary {
          background: #1C283C; color: #E39548;
          border-color: rgba(227,149,72,.25);
          box-shadow: 0 4px 16px rgba(0,0,0,.30);
        }
        .btn-action.claimed {
          background: rgba(20,102,54,.08); color: #146636;
          border-color: rgba(20,102,54,.25);
        }
        .btn-action:disabled { opacity: .55; cursor: default; }
        .pts-chip {
          display: inline-flex; align-items: center; gap: 6px;
          border-radius: 20px; padding: 6px 14px;
          font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 700;
        }
        .pts-chip.earned { background: rgba(20,102,54,.10); color: #146636; border: 1px solid rgba(20,102,54,.25); }
        .pts-chip.pending { background: rgba(227,149,72,.10); color: #E39548; border: 1px solid rgba(227,149,72,.25); }

      `}</style>

      {/* ── INTRO ── */}
      {phase === 'intro' && (
        <div className="as-page">
          <button className="back-btn" onClick={() => router.back()}>
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Activities
          </button>
          <div className="as-scroll">
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
          <button className="back-btn" onClick={() => setPhase('intro')}>
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back
          </button>
          <div className="as-scroll">
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
        <div className="as-page">
          <div className="as-scroll">
            <button className="back-btn" onClick={() => router.push('/activities')}>
              <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Activities
            </button>

            {/* Portrait frame */}
            <div className="result-frame">
              <img className="result-portrait-img" src={resultUrl} alt="Your AI executive portrait" />
            </div>

            {/* Label + points */}
            <div className="result-meta">
              <span className="result-label">Your Portrait</span>
              <span className="result-pts-earned">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                +150 pts earned
              </span>
            </div>

            {/* Actions */}
            <div className="result-action-row">
              <button className="btn-action" onClick={handleSaveToGallery}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Save
              </button>
              <button className="btn-action" onClick={handleShare}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                Share
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
