import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  points?: number;
  duration?: number;
}

interface UiState {
  toastQueue: Toast[];
  pushToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  toastQueue: [],
  pushToast: (toast) =>
    set((s) => ({
      toastQueue: [
        ...s.toastQueue,
        { ...toast, id: crypto.randomUUID() },
      ],
    })),
  dismissToast: (id) =>
    set((s) => ({ toastQueue: s.toastQueue.filter(t => t.id !== id) })),
}));
