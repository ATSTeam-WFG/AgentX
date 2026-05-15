import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  points?: number;
  duration?: number;
}

interface UiState {
  toastQueue: Toast[];
  sheetOpen: boolean;
  pushToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  openSheet: () => void;
  closeSheet: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  toastQueue: [],
  sheetOpen: false,
  pushToast: (toast) =>
    set((s) => ({
      toastQueue: [
        ...s.toastQueue,
        { ...toast, id: crypto.randomUUID() },
      ],
    })),
  dismissToast: (id) =>
    set((s) => ({ toastQueue: s.toastQueue.filter(t => t.id !== id) })),
  openSheet: () => set({ sheetOpen: true }),
  closeSheet: () => set({ sheetOpen: false }),
}));
