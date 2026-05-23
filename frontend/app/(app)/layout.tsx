'use client';

import { useState, useEffect } from 'react';
import TopBar from '@/components/layout/TopBar';
import TabBar from '@/components/layout/TabBar';
import OwlFab from '@/components/layout/OwlFab';
import AgentXSheet from '@/components/AgentXSheet';
import PointsToast from '@/components/PointsToast';
import AppTour from '@/components/onboarding/AppTour';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('tour_done')) setShowTour(true);
  }, []);

  function completeTour() {
    localStorage.setItem('tour_done', '1');
    setShowTour(false);
  }

  return (
    <>
      <TopBar />
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {children}
      </main>
      <TabBar />
      <OwlFab />
      <AgentXSheet />
      <PointsToast />
      {showTour && <AppTour onComplete={completeTour} />}
    </>
  );
}
