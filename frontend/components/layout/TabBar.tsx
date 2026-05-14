'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, Calendar, Sparkles, Trophy, User } from 'lucide-react';

const TABS = [
  { href: '/home',       icon: House,     label: 'Home' },
  { href: '/agenda',     icon: Calendar,  label: 'Agenda' },
  { href: '/explore',    icon: Sparkles,  label: 'Explore AI' },
  { href: '/activities', icon: Trophy,    label: 'Activities' },
  { href: '/profile',    icon: User,      label: 'Profile' },
] as const;

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      display: 'flex',
      background: 'var(--bg2)',
      borderTop: '1px solid rgba(238,241,250,0.08)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      zIndex: 100,
    }}>
      {TABS.map(({ href, icon: Icon, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link key={href} href={href} style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '56px',
            gap: '3px',
            color: active ? 'var(--ac)' : 'var(--dim)',
            fontSize: '10px',
            fontWeight: 500,
            textDecoration: 'none',
            transition: 'color 0.15s',
          }}>
            <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
