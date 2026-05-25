'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { readAdminToken, isTokenExpired, clearAdminToken } from '@/lib/auth';

const NAV_ITEMS = [
  { href: '/admin',                 label: 'Dashboard'  },
  { href: '/admin/golden-points',   label: 'Golden Pts' },
  { href: '/admin/users',           label: 'Users'      },
  { href: '/admin/announcements',   label: 'Announce'   },
  { href: '/admin/activities',      label: 'Activities' },
  { href: '/admin/agenda',          label: 'Agenda'     },
  { href: '/admin/invitees',        label: 'Invitees'   },
  { href: '/admin/audit-log',       label: 'Audit Log'  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPwa, setIsPwa] = useState<boolean | null>(null);

  useEffect(() => {
    // Detect PWA / standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    const iosSa = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsPwa(standalone || iosSa);
  }, []);

  useEffect(() => {
    if (pathname === '/admin/login') return;
    const token = readAdminToken();
    if (!token || isTokenExpired(token)) {
      router.replace('/admin/login');
    }
  }, [pathname, router]);

  function handleLogout() {
    clearAdminToken();
    router.replace('/admin/login');
  }

  // Waiting for PWA check — render nothing to avoid flash
  if (isPwa === null) return null;

  // Block access in PWA / installed app mode
  if (isPwa) {
    return (
      <>
        <style>{`
          .pwa-block {
            position: fixed; inset: 0;
            background: var(--bg);
            display: flex; align-items: center; justify-content: center;
            font-family: 'DM Sans', sans-serif;
            padding: 24px;
          }
          .pwa-block-card {
            background: var(--surface);
            border: 1px solid rgba(255,255,255,.30);
            border-radius: var(--r-lg);
            padding: 36px 28px;
            text-align: center;
            max-width: 320px;
            width: 100%;
            box-shadow: var(--shadow-card);
          }
          .pwa-block-icon { font-size: 40px; margin-bottom: 16px; }
          .pwa-block-title {
            font-family: 'Sora', sans-serif;
            font-size: 22px; font-weight: 800;
            color: #1C283C; margin: 0 0 10px;
            letter-spacing: -.02em;
          }
          .pwa-block-body {
            font-size: 14px; color: #4a6080;
            line-height: 1.55;
          }
        `}</style>
        <div className="pwa-block">
          <div className="pwa-block-card">
            <div className="pwa-block-icon">🖥️</div>
            <h1 className="pwa-block-title">Desktop Only</h1>
            <p className="pwa-block-body">
              The admin panel is only accessible in a desktop browser — not inside the AgentX app.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        /* ── Shell ─────────────────────────────────────────────────── */
        .admin-shell {
          position: fixed; inset: 0;
          display: flex; flex-direction: column;
          background: var(--bg); overflow: hidden;
          font-family: 'DM Sans', sans-serif;
        }

        /* ── Topbar ─────────────────────────────────────────────────── */
        .admin-topbar {
          display: flex; align-items: center; gap: 12px;
          padding: calc(14px + env(safe-area-inset-top, 0px)) 18px 14px;
          background: var(--navy);
          border-bottom: 1px solid rgba(255,255,255,.10);
          flex-shrink: 0;
        }
        .admin-back {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 14px; font-weight: 600; color: rgba(255,255,255,.65);
          background: none; border: none; cursor: pointer;
          text-decoration: none; padding: 0;
        }
        .admin-back:active { opacity: .7; }
        .admin-title {
          font-family: 'Sora', sans-serif;
          font-size: 18px; font-weight: 800;
          color: #fff; letter-spacing: -.01em;
        }
        .admin-logout {
          margin-left: auto;
          background: rgba(186,24,24,.18);
          color: #e05c5c;
          border: 1px solid rgba(186,24,24,.28);
          border-radius: 7px; padding: 5px 11px;
          font-size: 12px; font-weight: 700;
          letter-spacing: .02em; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: opacity var(--tr);
        }
        .admin-logout:active { opacity: .7; }

        /* ── Tab strip ──────────────────────────────────────────────── */
        .admin-tabs {
          display: flex; gap: 0;
          background: var(--surface);
          border-bottom: 1.5px solid rgba(28,40,60,.14);
          flex-shrink: 0; overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .admin-tabs::-webkit-scrollbar { display: none; }
        .admin-tab {
          flex-shrink: 0; padding: 11px 15px;
          font-size: 13px; font-weight: 600;
          color: #4a6080;
          border-bottom: 2.5px solid transparent; margin-bottom: -1.5px;
          text-decoration: none; transition: all var(--tr);
          white-space: nowrap;
        }
        .admin-tab:hover { color: #2A3C52; }
        .admin-tab.active { color: #2a5cd4; border-bottom-color: #2a5cd4; }

        /* ── Content area ───────────────────────────────────────────── */
        .admin-content {
          flex: 1; overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 20px 18px calc(20px + env(safe-area-inset-bottom, 0px));
          overscroll-behavior: contain;
        }

        /* ── Page titles (on dark navy bg) ──────────────────────────── */
        .admin-content > h1,
        [class*="-title"]:not([class*="card"] [class*="-title"]) {
          color: var(--t);
        }

        /* ════════════════════════════════════════════════════════════════
           CARD ZONE — override text vars to dark on silver surfaces.
           Any element with "card" in its class becomes a dark-text zone.
           Also covers named non-card elements that sit on silver surfaces.
        ════════════════════════════════════════════════════════════════ */
        [class*="card"],
        .adm-quick-link,
        .alog-entry,
        .adum-expanded,
        .agd-edit-wrap,
        .gpa-full-text,
        .gpa-feedback {
          --t:  #1C283C;
          --t2: #2A3C52;
          --t3: #4a6080;
          --t4: #7a8eae;
          --t5: #9caec8;
        }
      `}</style>

      <div className="admin-shell">
        <div className="admin-topbar">
          <Link href="/profile" className="admin-back">
            <svg viewBox="0 0 12 12" fill="none" width="16" height="16">
              <path d="M7.5 2.5l-4 4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </Link>
          <span className="admin-title">Admin</span>
          {pathname !== '/admin/login' && (
            <button className="admin-logout" onClick={handleLogout}>Log out</button>
          )}
        </div>

        {pathname !== '/admin/login' && (
          <nav className="admin-tabs">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-tab${pathname === item.href ? ' active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="admin-content">
          {children}
        </div>
      </div>
    </>
  );
}
