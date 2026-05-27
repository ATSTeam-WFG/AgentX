'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectWs, onWsEvent, disconnectWs } from '@/lib/ws';
import { useAuthStore } from '@/store/auth';
import { useWsStore } from '@/store/ws';
import { useUiStore } from '@/store/ui';
import { flushOutbox } from '@/lib/outbox';
import type { JobsDoneData } from '@/lib/ws-events';
import { useFeaturesStore } from '@/store/features';

export function useWebSocket() {
  const token = useAuthStore(s => s.token);
  const setConnected = useWsStore(s => s.setConnected);
  const setLastEvent = useWsStore(s => s.setLastEvent);
  const pushToast = useUiStore(s => s.pushToast);
  const queryClient = useQueryClient();
  const setFlag = useFeaturesStore(s => s.setFlag);

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
        case 'activity.changed':
          queryClient.invalidateQueries({ queryKey: ['activities'] });
          break;
        case 'scores.update':
          queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
          queryClient.invalidateQueries({ queryKey: ['me'] });
          break;
        case 'jobs.done': {
          const d = data as JobsDoneData;
          queryClient.invalidateQueries({ queryKey: ['activities'] });
          if (d.type === 'golden_points_scoring')
            pushToast({ message: 'Your Golden Points score is in!' });
          else if (d.type === 'avatar_generation')
            pushToast({ message: 'Your AI avatar is ready!' });
          break;
        }
        case 'features.updated': {
          const d = data as { key: string; value: boolean };
          setFlag(d.key, d.value);
          break;
        }
      }
    });

    return () => {
      unsubscribe();
      disconnectWs();
      setConnected(false);
    };
  }, [token, setConnected, setLastEvent, pushToast, queryClient]);
}
