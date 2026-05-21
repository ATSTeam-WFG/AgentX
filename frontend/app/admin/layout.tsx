'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin',              label: 'Dashboard' },
  { href: '/admin/golden-points', label: 'Golden Points' },
  { href: '/admin/users',        label: 'Users' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <style>{`
        .admin-shell {
          position: fixed; inset: 0;
          display: flex; flex-direction: column;
          background: var(--bg); overflow: hidden;
          font-family: 'DM Sans', sans-serif;
        }
        .admin-topbar {
          display: flex; align-items: center; gap: 12px;
          padding: calc(14px + env(safe-area-inset-top, 0px)) 18px 14px;
          background: var(--navy);
          border-bottom: 1px solid rgba(255,255,255,.08);
          flex-shrink: 0;
        }
        .admin-back {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 14px; font-weight: 600; color: rgba(255,255,255,.70);
          background: none; border: none; cursor: pointer;
          text-decoration: none; padding: 0;
        }
        .admin-back:active { opacity: .7; }
        .admin-title {
          font-family: 'Sora', sans-serif;
          font-size: 18px; font-weight: 800;
          color: #fff; letter-spacing: -.01em;
        }
        .admin-badge {
          background: rgba(27,79,196,.40);
          color: rgba(180,210,255,.90);
          border-radius: 6px; padding: 3px 8px;
          font-size: 11px; font-weight: 700;
          letter-spacing: .04em; text-transform: uppercase;
          margin-left: auto;
        }
        .admin-tabs {
          display: flex; gap: 0;
          background: var(--surface);
          border-bottom: 1px solid var(--border-metal);
          flex-shrink: 0; overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .admin-tabs::-webkit-scrollbar { display: none; }
        .admin-tab {
          flex-shrink: 0; padding: 12px 18px;
          font-size: 14px; font-weight: 600;
          color: var(--t3); border-bottom: 2.5px solid transparent;
          text-decoration: none; transition: all var(--tr);
          white-space: nowrap;
        }
        .admin-tab.active { color: var(--blue); border-bottom-color: var(--blue); }
        .admin-content {
          flex: 1; overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 20px 18px calc(20px + env(safe-area-inset-bottom, 0px));
          overscroll-behavior: contain;
        }
      `}</style>

      <div className="admin-shell">
        <div className="admin-topbar">
          <Link href="/profile" className="admin-back">
            <svg viewBox="0 0 12 12" fill="none" width="16" height="16">
              <path d="M7.5 2.5l-4 4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Profile
          </Link>
          <span className="admin-title">Admin</span>
          <span className="admin-badge">Internal</span>
        </div>

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

        <div className="admin-content">
          {children}
        </div>
      </div>
    </>
  );
}
