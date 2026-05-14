'use client';
import TabBar from '@/components/layout/TabBar';
import OwlFab from '@/components/layout/OwlFab';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
      {children}
      <OwlFab />
      <TabBar />
    </div>
  );
}
