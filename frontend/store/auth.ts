import { create } from 'zustand';
import type { User } from '@/lib/api/auth';
import { saveToken, clearToken } from '@/lib/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  setAuth: (user, token) => {
    saveToken(token);
    set({ user, token });
  },
  clearAuth: () => {
    clearToken();
    set({ user: null, token: null });
  },
}));
