'use client';

import { ScanLine } from 'lucide-react';

export default function OwlFab() {
  const handleScan = () => {
    // Opens native camera or redirects to /scan
    // TODO: integrate camera overlay
  };

  return (
    <button
      aria-label="Scan QR code"
      onClick={handleScan}
      style={{
        position: 'fixed',
        right: '20px',
        bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: 'var(--ac)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 0 4px rgba(91,143,249,0.25), 0 4px 16px rgba(0,0,0,0.4)',
        zIndex: 99,
        cursor: 'pointer',
        border: 'none',
        transition: 'transform 0.1s',
      }}
    >
      <ScanLine size={26} />
    </button>
  );
}
