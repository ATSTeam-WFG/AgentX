'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/layout/TopBar';
import TabBar from '@/components/layout/TabBar';
import OwlFab from '@/components/layout/OwlFab';
import AgentXSheet from '@/components/AgentXSheet';
import { useAuthStore } from '@/store/auth';
import { readToken, isTokenExpired, decodeToken } from '@/lib/auth';
import type { User } from '@/lib/api/auth';
import { initOutboxListeners, flushOutbox } from '@/lib/outbox';
import OfflineBanner from '@/components/OfflineBanner';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    // Rehydrate store from localStorage on every mount (page refresh, direct navigation)
    if (user) return; // already hydrated this session
    const token = readToken();
    if (!token || isTokenExpired(token)) {
      clearAuth();
      router.replace('/');
      return;
    }
    const claims = decodeToken(token);
    if (claims) {
      // JWT only carries sub/name/email/role — cast to User, extra fields will be undefined
      const hydratedUser = {
        id: claims.sub,
        name: claims.name,
        email: claims.email,
        role: claims.role,
        attendeeType: 'invited',
        pendingAdminApproval: false,
      } as User;
      setAuth(hydratedUser, token);
    }
  }, [user, setAuth, clearAuth, router]);

  // Wire outbox: flush queued entries from previous sessions, then keep
  // listening for the 'online' event so writes retry automatically on reconnect.
  useEffect(() => {
    flushOutbox();
    const cleanup = initOutboxListeners();
    return cleanup;
  }, []);

  return (
    <>
      <TopBar />
      <OfflineBanner />
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {children}
      </main>
      <TabBar />
      <OwlFab />
      <AgentXSheet />
    </>
  );
}
