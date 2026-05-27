'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFeaturesStore } from '@/store/features';

const TABS = [
  {
    href: '/home',
    id: 'nb-home',
    label: 'Home',
    svg: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11L12 3l9 8v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9z" />
      </svg>
    ),
  },
  {
    href: '/agenda',
    id: 'nb-agenda',
    label: 'Agenda',
    svg: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="16" rx="2.5" />
        <line x1="8" y1="2.5" x2="8" y2="6.5" />
        <line x1="16" y1="2.5" x2="16" y2="6.5" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="8" y1="14" x2="8" y2="14" strokeWidth="2.5" />
        <line x1="12" y1="14" x2="12" y2="14" strokeWidth="2.5" />
        <line x1="16" y1="14" x2="16" y2="14" strokeWidth="2.5" />
        <line x1="8" y1="18" x2="8" y2="18" strokeWidth="2.5" />
        <line x1="12" y1="18" x2="12" y2="18" strokeWidth="2.5" />
      </svg>
    ),
  },
  {
    href: '/explore',
    id: 'nb-explore',
    label: 'Explore',
    svg: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <polygon points="15.5,8.5 12.8,14.5 7,17 9.7,11 15.5,8.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: '/activities',
    id: 'nb-activities',
    label: 'Activities',
    svg: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12,2 14.85,8.6 22,9.2 16.6,13.95 18.2,21 12,17.1 5.8,21 7.4,13.95 2,9.2 9.15,8.6" />
      </svg>
    ),
  },
  {
    href: '/profile',
    id: 'nb-profile',
    label: 'Profile',
    svg: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M3 21c0-4.5 4-8 9-8s9 3.5 9 8" />
      </svg>
    ),
  },
] as const;

export default function TabBar() {
  const pathname = usePathname();
  const isActivitiesOpen = useFeaturesStore((s) => s.isEnabled('activities_open'));
  const isExploreOpen = useFeaturesStore((s) => s.isEnabled('explore_open', true));

  const HIDDEN_HREFS = new Set<string>([
    ...(!isActivitiesOpen ? ['/activities'] : []),
    ...(!isExploreOpen    ? ['/explore']    : []),
  ]);

  return (
    <>
      <style>{`
        .tab-nav {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          display: flex;
          background: rgba(18,28,46,.92);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-top: 1px solid rgba(255,255,255,.08);
          box-shadow:
            0 -8px 32px rgba(0,0,0,.40),
            0 -1px 0 rgba(212,160,23,.15);
          padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
          z-index: 200;
        }
        /* Gold hairline at top */
        .tab-nav::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(212,160,23,.40) 25%,
            rgba(212,160,23,.55) 50%,
            rgba(212,160,23,.40) 75%,
            transparent 100%
          );
        }
        .nb {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding-top: 10px;
          gap: 4px;
          color: rgba(200,215,230,.45);
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
          transition: color var(--tr);
          -webkit-tap-highlight-color: transparent;
        }
        .nb.cur {
          color: var(--amber);
        }
        .nb-inner {
          width: 44px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          transition: background var(--tr), box-shadow var(--tr), transform var(--tr);
        }
        .nb.cur .nb-inner {
          background: linear-gradient(
            145deg,
            rgba(227,149,72,.24) 0%,
            rgba(227,149,72,.12) 100%
          );
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.12),
            0 2px 10px rgba(227,149,72,.28);
          transform: translateY(-1px);
        }
        .nb-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .04em;
          text-transform: uppercase;
        }
      `}</style>
      <nav className="tab-nav" role="navigation" aria-label="Main navigation">
        {TABS.filter(({ href }) => !HIDDEN_HREFS.has(href)).map(({ href, id, label, svg }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              id={id}
              className={`nb${active ? ' cur' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <div className="nb-inner">{svg}</div>
              <span className="nb-label">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
