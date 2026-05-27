'use client';

import { useRef, useCallback, useEffect, RefObject } from 'react';

const THRESHOLD = 90;   // px drag to trigger refresh
const MAX_PULL  = 130;  // cap visual travel
const SNAP_MS   = 280;  // snap-back animation duration

export function usePullToRefresh(
  scrollRef: RefObject<HTMLElement | null>,
  onRefresh: () => Promise<void>,
): RefObject<HTMLDivElement | null> {
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const startY       = useRef(0);
  const pulling      = useRef(false);
  const refreshing   = useRef(false);

  const setIndicator = useCallback((pull: number, state: 'idle' | 'pulling' | 'ready' | 'refreshing') => {
    const el = indicatorRef.current;
    if (!el) return;
    el.style.setProperty('--pull', `${Math.min(pull, MAX_PULL)}px`);
    el.dataset.state = state;
  }, []);

  const reset = useCallback(() => {
    const el = indicatorRef.current;
    if (!el) return;
    el.style.transition = `transform ${SNAP_MS}ms cubic-bezier(.4,0,.2,1)`;
    setIndicator(0, 'idle');
    setTimeout(() => { if (el) el.style.transition = ''; }, SNAP_MS);
  }, [setIndicator]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    function onTouchStart(e: TouchEvent) {
      if (container!.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!pulling.current || refreshing.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) { pulling.current = false; return; }
      if (container!.scrollTop === 0) e.preventDefault();
      setIndicator(dy, dy >= THRESHOLD ? 'ready' : 'pulling');
    }

    async function onTouchEnd() {
      if (!pulling.current) return;
      pulling.current = false;

      const el = indicatorRef.current;
      const pull = parseFloat(el?.style.getPropertyValue('--pull') ?? '0');
      if (pull < THRESHOLD) { reset(); return; }

      refreshing.current = true;
      setIndicator(pull, 'refreshing');
      try {
        await onRefresh();
      } finally {
        refreshing.current = false;
        reset();
      }
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove',  onTouchMove,  { passive: false });
    container.addEventListener('touchend',   onTouchEnd);

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove',  onTouchMove);
      container.removeEventListener('touchend',   onTouchEnd);
    };
  }, [scrollRef, onRefresh, setIndicator, reset]);

  return indicatorRef;
}
