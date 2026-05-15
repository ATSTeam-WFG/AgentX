'use client';
import TopBar from '@/components/layout/TopBar';
import TabBar from '@/components/layout/TabBar';
import OwlFab from '@/components/layout/OwlFab';
import AgentXSheet from '@/components/AgentXSheet';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar />
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {children}
      </main>
      <TabBar />
      <OwlFab />
      <AgentXSheet />
    </>
  );
}
