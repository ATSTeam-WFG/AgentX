'use client';

import { forwardRef } from 'react';

export const PullIndicator = forwardRef<HTMLDivElement>((_, ref) => (
  <>
    <style>{`
      .ptr {
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 56px;
        display: flex; align-items: center; justify-content: center;
        transform: translateY(calc(var(--pull, 0px) - 56px));
        pointer-events: none;
        z-index: 50;
      }
      .ptr-pill {
        display: flex; align-items: center; gap: 8px;
        padding: 8px 16px;
        border-radius: 20px;
        background: rgba(18, 28, 46, 0.92);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border: 1px solid rgba(91, 143, 249, 0.30);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
      }
      .ptr-spinner {
        width: 16px; height: 16px;
        border-radius: 50%;
        border: 2px solid rgba(91, 143, 249, 0.20);
        border-top-color: #5B8FF9;
        display: none;
      }
      .ptr[data-state="refreshing"] .ptr-spinner {
        display: block;
        animation: ptr-spin 0.7s linear infinite;
      }
      @keyframes ptr-spin { to { transform: rotate(360deg); } }
      .ptr-arrow {
        width: 16px; height: 16px;
        color: #5B8FF9;
        transition: transform 0.18s ease;
        display: block;
      }
      .ptr[data-state="refreshing"] .ptr-arrow { display: none; }
      .ptr[data-state="ready"] .ptr-arrow { transform: rotate(180deg); }
      .ptr-label {
        font-size: 12px; font-weight: 600; letter-spacing: 0.03em;
        color: rgba(204, 222, 231, 0.65);
        white-space: nowrap;
      }
      .ptr[data-state="refreshing"] .ptr-label { color: rgba(91, 143, 249, 0.85); }
    `}</style>

    <div className="ptr" ref={ref} data-state="idle">
      <div className="ptr-pill">
        <div className="ptr-spinner" />
        <svg className="ptr-arrow" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
        <span className="ptr-label">Pull to refresh</span>
      </div>
    </div>
  </>
));

PullIndicator.displayName = 'PullIndicator';
