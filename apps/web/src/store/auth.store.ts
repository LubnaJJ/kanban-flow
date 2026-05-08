import { create } from 'zustand';
import { AuthUser } from '@kanban/types';
import api from '@/lib/api';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: 'PM' | 'ENGINEER') => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,

  loadFromStorage: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('kanban_token');
    const userStr = localStorage.getItem('kanban_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ token, user });
      } catch {}
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/api/auth/login', { email, password });
      const { token, user } = res.data.data;
      localStorage.setItem('kanban_token', token);
      localStorage.setItem('kanban_user', JSON.stringify(user));
      set({ token, user, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (email, password, name, role) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/api/auth/register', { email, password, name, role });
      const { token, user } = res.data.data;
      localStorage.setItem('kanban_token', token);
      localStorage.setItem('kanban_user', JSON.stringify(user));
      set({ token, user, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('kanban_token');
    localStorage.removeItem('kanban_user');
    set({ user: null, token: null });
  },
}));
