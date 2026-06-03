'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { readAdminToken, isTokenExpired, clearAdminToken, decodeAdminRole, canDo, type AdminRole } from '@/lib/auth';

// minRole: the minimum role required to SEE this item.
// Items without minRole are visible to all authenticated admins.
const NAV_GROUPS: Array<{
  label: string;
  minRole?: AdminRole;
  items: Array<{ href: string; label: string; minRole?: AdminRole }>;
}> = [
  {
    label: 'Live',
    items: [
      { href: '/admin',           label: 'Dashboard'     },
      { href: '/admin/analytics', label: 'Analytics'     },
    ],
  },
  {
    label: 'Review',
    items: [
      { href: '/admin/golden-points',   label: 'Golden Points'  },
      { href: '/admin/users',           label: 'Users'          },
      { href: '/admin/avatars',         label: 'Avatars'        },
      { href: '/admin/announcements',   label: 'Announcements'  },
    ],
  },
  {
    label: 'Setup',
    items: [
      { href: '/admin/activities', label: 'Activities'    },
      { href: '/admin/agenda',     label: 'Agenda'        },
      { href: '/admin/invitees',   label: 'Invitees'      },
      { href: '/admin/features',   label: 'Feature Flags', minRole: 'moderator' as AdminRole },
    ],
  },
  {
    label: 'Admin',
    minRole: 'moderator' as AdminRole,
    items: [
      { href: '/admin/audit-log', label: 'Audit Log' },
      { href: '/admin/jobs',      label: 'Jobs'                                           },
      { href: '/admin/system',    label: 'System',    minRole: 'super_admin' as AdminRole },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [isPwa,  setIsPwa]  = useState<boolean | null>(null);
  const [role,   setRole]   = useState<AdminRole | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    const iosSa = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsPwa(standalone || iosSa);
    setRole(decodeAdminRole());
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

  if (isPwa === null) return null;

  // ── PWA block ────────────────────────────────────────────────────────────
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
            border: 1px solid rgba(255,255,255,.20);
            border-radius: var(--r-lg);
            padding: 36px 28px;
            text-align: center;
            max-width: 320px;
            width: 100%;
            box-shadow: var(--shadow);
          }
          .pwa-block-icon { display: flex; justify-content: center; margin-bottom: 16px; }
          .pwa-block-title {
            font-family: 'Sora', sans-serif;
            font-size: 22px; font-weight: 800;
            color: #1C283C; margin: 0 0 10px;
            letter-spacing: -.02em;
          }
          .pwa-block-body { font-size: 14px; color: #4a6080; line-height: 1.55; }
        `}</style>
        <div className="pwa-block">
          <div className="pwa-block-card">
            <div className="pwa-block-icon">
              <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" width="40" height="40" style={{ color: "#4a8aff" }}>
                <rect x="4" y="6" width="32" height="22" rx="3"/>
                <path d="M14 34h12M20 28v6"/>
              </svg>
            </div>
            <h1 className="pwa-block-title">Desktop Only</h1>
            <p className="pwa-block-body">
              The admin panel is only accessible in a desktop browser — not inside the AgentX app.
            </p>
          </div>
        </div>
      </>
    );
  }

  // ── Login page — no chrome ────────────────────────────────────────────────
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // ── Admin shell with sidebar ──────────────────────────────────────────────
  return (
    <>
      <style>{`
        /* ── Shell ─────────────────────────────────────────────────────────── */
        .adm-shell {
          position: fixed; inset: 0;
          display: flex; flex-direction: row;
          background: var(--bg);
          font-family: 'DM Sans', sans-serif;
          overflow: hidden;
        }

        /* ── Sidebar ────────────────────────────────────────────────────────── */
        .adm-sidebar {
          width: 208px;
          flex-shrink: 0;
          background: var(--bg2);
          border-right: 1px solid rgba(255,255,255,.07);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: none;
        }
        .adm-sidebar::-webkit-scrollbar { display: none; }

        /* Branding */
        .adm-brand {
          padding: 20px 18px 16px;
          border-bottom: 1px solid rgba(255,255,255,.07);
          flex-shrink: 0;
        }
        .adm-brand-event {
          font-size: 10px; font-weight: 800; letter-spacing: .10em;
          text-transform: uppercase; color: var(--t4);
          margin-bottom: 5px;
        }
        .adm-brand-name {
          font-family: 'Sora', sans-serif;
          font-size: 18px; font-weight: 800;
          color: #fff; letter-spacing: -.02em;
          line-height: 1;
        }

        /* Nav groups */
        .adm-nav { flex: 1; padding: 10px 0 8px; }

        .adm-nav-group { margin-bottom: 2px; }

        .adm-nav-group-label {
          display: block;
          padding: 12px 18px 4px;
          font-size: 9.5px; font-weight: 800; letter-spacing: .12em;
          text-transform: uppercase; color: var(--t5);
          user-select: none;
        }

        .adm-nav-item {
          display: block;
          padding: 8px 18px;
          font-size: 13px; font-weight: 600;
          color: var(--t3);
          text-decoration: none;
          position: relative;
          transition: color var(--tr), background var(--tr);
        }
        .adm-nav-item:hover {
          color: var(--t);
          background: rgba(255,255,255,.04);
        }
        .adm-nav-item.active {
          color: #fff;
          background: rgba(255,255,255,.09);
        }
        .adm-nav-item.active::before {
          content: '';
          position: absolute;
          left: 0; top: 5px; bottom: 5px;
          width: 3px;
          background: #4a8aff;
          border-radius: 0 2px 2px 0;
        }

        /* Sidebar footer */
        .adm-sidebar-footer {
          padding: 12px 14px calc(14px + env(safe-area-inset-bottom, 0px));
          border-top: 1px solid rgba(255,255,255,.07);
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex-shrink: 0;
        }
        .adm-back-link {
          display: flex; align-items: center; gap: 5px;
          font-size: 12px; font-weight: 600; color: var(--t4);
          text-decoration: none;
          padding: 5px 4px;
          border-radius: 6px;
          transition: color var(--tr);
        }
        .adm-back-link:hover { color: var(--t); }
        .adm-logout {
          width: 100%;
          padding: 8px 12px;
          background: rgba(186,24,24,.16);
          color: #e05c5c;
          border: 1px solid rgba(186,24,24,.25);
          border-radius: 8px;
          font-size: 12px; font-weight: 700; letter-spacing: .03em;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: opacity var(--tr);
          text-align: center;
        }
        .adm-logout:active { opacity: .7; }

        /* ── Role-locked sections (shared across all admin pages) ──────────── */
        .adm-locked { opacity: 0.35; pointer-events: none; user-select: none; }
        .adm-lock-notice {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 11px;
          background: rgba(92,117,144,.09);
          border: 1px solid rgba(92,117,144,.18);
          border-radius: 8px;
          font-size: 11px; font-weight: 700; letter-spacing: .02em;
          color: var(--t3);
          margin-bottom: 10px;
        }
        .adm-lock-notice svg { flex-shrink: 0; opacity: .7; }
        /* Role badge shown inline next to section labels */
        .adm-role-badge {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 10px; font-weight: 700; letter-spacing: .05em;
          text-transform: uppercase; padding: 2px 7px; border-radius: 20px;
          background: rgba(92,117,144,.12); color: var(--t4);
          border: 1px solid rgba(92,117,144,.18);
          vertical-align: middle; margin-left: 6px;
        }

        /* ── Content area ───────────────────────────────────────────────────── */
        .adm-main {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          /* Declare dark-text defaults so all content reads correctly on var(--bg) */
          --t:  #CCDEE7;
          --t2: #A8BECB;
          --t3: #7A96A8;
          --t4: #5c7590;
          --t5: #3d5570;
        }
        .adm-main-inner {
          padding: 24px 24px calc(28px + env(safe-area-inset-bottom, 0px));
          min-height: 100%;
        }

        /* ═══════════════════════════════════════════════════════════════════
           CARD ZONE — any element whose class contains "card" switches to
           silver-surface text vars. Also covers named non-card elements that
           sit on silver surfaces.
        ═══════════════════════════════════════════════════════════════════ */
        [class*="card"],
        [class*="dialog"],
        .adm-quick-link,
        .alog-entry,
        .adum-expanded,
        .agd-edit-wrap,
        .gpa-full-text,
        .gpa-feedback,
        .sys-refresh-btn {
          --t:  #1C283C;
          --t2: #2A3C52;
          --t3: #4a6080;
          --t4: #7a8eae;
          --t5: #9caec8;
        }
      `}</style>

      <div className="adm-shell">

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="adm-sidebar">

          <div className="adm-brand">
            <div className="adm-brand-event">WFG Executive Summit</div>
            <span className="adm-brand-name">Admin</span>
          </div>

          <nav className="adm-nav">
            {NAV_GROUPS
              .filter((group) => !group.minRole || canDo(role, group.minRole))
              .map((group) => {
                const visibleItems = group.items.filter(
                  (item) => !item.minRole || canDo(role, item.minRole)
                );
                if (visibleItems.length === 0) return null;
                return (
                  <div key={group.label} className="adm-nav-group">
                    <span className="adm-nav-group-label">{group.label}</span>
                    {visibleItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`adm-nav-item${pathname === item.href ? ' active' : ''}`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                );
              })}
          </nav>

          <div className="adm-sidebar-footer">
            <Link href="/profile" className="adm-back-link">
              <svg viewBox="0 0 12 12" fill="none" width="14" height="14">
                <path d="M7.5 2.5l-4 4 4 4" stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back to app
            </Link>
            <button className="adm-logout" onClick={handleLogout}>Log out</button>
          </div>

        </aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main className="adm-main">
          <div className="adm-main-inner">
            {children}
          </div>
        </main>

      </div>
    </>
  );
}
