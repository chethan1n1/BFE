import { create } from 'zustand';
import api from '../services/api';

interface AuthState {
  token: string | null;
  user: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  user: null,
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  login: async (username, password) => {
    set({ loading: true });
    try {
      const response = await api.post('/auth/login', { username, password });
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      set({ token: access_token, isAuthenticated: true, user: username, loading: false });
      return true;
    } catch (error) {
      set({ loading: false });
      return false;
    }
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, isAuthenticated: false, user: null });
    window.location.href = '/login';
  },
  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }
    try {
      const response = await api.get('/auth/me');
      set({ user: response.data.username, isAuthenticated: true });
    } catch (error) {
      localStorage.removeItem('token');
      set({ token: null, isAuthenticated: false, user: null });
    }
  },
}));
