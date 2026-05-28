import { create } from 'zustand';

interface FeaturesState {
  flags: Record<string, boolean>;
  setFlags: (flags: Record<string, boolean>) => void;
  setFlag: (key: string, value: boolean) => void;
  isEnabled: (key: string, fallback?: boolean) => boolean;
}

export const useFeaturesStore = create<FeaturesState>((set, get) => ({
  flags: {},
  setFlags: (flags) => set({ flags }),
  setFlag: (key, value) => set((s) => ({ flags: { ...s.flags, [key]: value } })),
  isEnabled: (key, fallback = false) => {
    const flags = get().flags;
    return key in flags ? flags[key] : fallback;
  },
}));
