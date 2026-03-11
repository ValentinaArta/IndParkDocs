import { create } from 'zustand';
import { api, setTokens, clearTokens, isAuthenticated } from '../api/client';

interface User {
  id: number;
  username: string;
  role: string;
  display_name: string;
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  totpRequired: boolean;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string, totp?: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: isAuthenticated(),
  totpRequired: false,
  loading: false,
  error: null,

  login: async (username: string, password: string, totp?: string) => {
    set({ loading: true, error: null, totpRequired: false });
    try {
      const body: Record<string, string> = { username, password };
      if (totp) body.totp = totp;

      const data = await api<{
        accessToken: string;
        refreshToken: string;
        user: User;
        totpRequired?: boolean;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
        skipAuth: true,
      });

      if (data.totpRequired) {
        set({ loading: false, totpRequired: true });
        return;
      }

      setTokens(data.accessToken, data.refreshToken);
      set({ user: data.user, isLoggedIn: true, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Ошибка входа',
      });
    }
  },

  logout: () => {
    clearTokens();
    set({ user: null, isLoggedIn: false, totpRequired: false });
  },

  checkAuth: () => {
    set({ isLoggedIn: isAuthenticated() });
  },
}));
