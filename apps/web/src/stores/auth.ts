import { create } from 'zustand';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('vesta_token');
    if (token) {
      api.setToken(token);
      set({ token, isLoading: true });
      get().loadUser();
    } else {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const { accessToken } = await api.login(email, password);
    localStorage.setItem('vesta_token', accessToken);
    api.setToken(accessToken);
    set({ token: accessToken });
    await get().loadUser();
  },

  register: async (name, email, password) => {
    const { accessToken } = await api.register(name, email, password);
    localStorage.setItem('vesta_token', accessToken);
    api.setToken(accessToken);
    set({ token: accessToken });
    await get().loadUser();
  },

  logout: () => {
    localStorage.removeItem('vesta_token');
    api.setToken(null);
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  loadUser: async () => {
    try {
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('vesta_token');
      api.setToken(null);
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
