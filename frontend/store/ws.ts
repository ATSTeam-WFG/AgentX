import { create } from 'zustand';

interface WsState {
  connected: boolean;
  lastEvent: { event: string; data: unknown } | null;
  setConnected: (connected: boolean) => void;
  setLastEvent: (event: string, data: unknown) => void;
}

export const useWsStore = create<WsState>((set) => ({
  connected: false,
  lastEvent: null,
  setConnected: (connected) => set({ connected }),
  setLastEvent: (event, data) => set({ lastEvent: { event, data } }),
}));
