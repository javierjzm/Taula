import { create } from 'zustand';
import { api, setTokens, clearTokens } from '../services/api';
import { storage } from '../services/storage';

interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  phone: string | null;
  preferredLang: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; preferredLang: string }) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithApple: (identityToken: string, user?: any) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const tokens = await api<{ accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await setTokens(tokens.accessToken, tokens.refreshToken);
    const { data: user } = await api<{ data: User }>('/me');
    set({ user, isAuthenticated: true });
  },

  register: async (data) => {
    const tokens = await api<{ accessToken: string; refreshToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await setTokens(tokens.accessToken, tokens.refreshToken);
    const { data: user } = await api<{ data: User }>('/me');
    set({ user, isAuthenticated: true });
  },

  loginWithGoogle: async (idToken) => {
    const tokens = await api<{ accessToken: string; refreshToken: string }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
    await setTokens(tokens.accessToken, tokens.refreshToken);
    const { data: user } = await api<{ data: User }>('/me');
    set({ user, isAuthenticated: true });
  },

  loginWithApple: async (identityToken, user) => {
    const tokens = await api<{ accessToken: string; refreshToken: string }>('/auth/apple', {
      method: 'POST',
      body: JSON.stringify({ identityToken, user }),
    });
    await setTokens(tokens.accessToken, tokens.refreshToken);
    const { data: userData } = await api<{ data: User }>('/me');
    set({ user: userData, isAuthenticated: true });
  },

  logout: async () => {
    await clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  loadSession: async () => {
    try {
      const token = await storage.getItem('accessToken');
      if (!token) {
        set({ isLoading: false });
        return;
      }
      const { data: user } = await api<{ data: User }>('/me');
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      await clearTokens();
      set({ isLoading: false });
    }
  },
}));
