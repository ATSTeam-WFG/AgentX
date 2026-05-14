'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectWs, onWsEvent, disconnectWs } from '@/lib/ws';
import { useAuthStore } from '@/store/auth';
import { useWsStore } from '@/store/ws';
import { useUiStore } from '@/store/ui';
import { flushOutbox } from '@/lib/outbox';

export function useWebSocket() {
  const token = useAuthStore(s => s.token);
  const setConnected = useWsStore(s => s.setConnected);
  const setLastEvent = useWsStore(s => s.setLastEvent);
  const pushToast = useUiStore(s => s.pushToast);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) return;

    connectWs(token);

    const unsubscribe = onWsEvent((event, data) => {
      setLastEvent(event, data);

      switch (event) {
        case '__connected':
          setConnected(true);
          flushOutbox();
          queryClient.invalidateQueries({ queryKey: ['agenda'] });
          break;
        case '__disconnected':
          setConnected(false);
          break;
        case 'leaderboard.update':
          queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
          break;
        case 'announcements.new':
          pushToast({ message: (data as { title: string }).title });
          queryClient.invalidateQueries({ queryKey: ['announcements'] });
          break;
        case 'agenda.changed':
          queryClient.invalidateQueries({ queryKey: ['agenda'] });
          break;
      }
    });

    return () => {
      unsubscribe();
      disconnectWs();
      setConnected(false);
    };
  }, [token, setConnected, setLastEvent, pushToast, queryClient]);
}
