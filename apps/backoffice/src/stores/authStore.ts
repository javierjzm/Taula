import { create } from 'zustand';
import axios from 'axios';

interface AuthState {
  isAuthenticated: boolean;
  restaurantName: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: !!localStorage.getItem('taula_token'),
  restaurantName: localStorage.getItem('taula_restaurant_name') || '',

  login: async (email, password) => {
    const res = await axios.post('/v1/restaurant/auth/login', { email, password });
    localStorage.setItem('taula_token', res.data.accessToken);
    localStorage.setItem('taula_refresh_token', res.data.refreshToken);
    const meRes = await axios.get('/v1/restaurant/me', {
      headers: { Authorization: `Bearer ${res.data.accessToken}` },
    });
    localStorage.setItem('taula_restaurant_name', meRes.data.data.name);
    set({ isAuthenticated: true, restaurantName: meRes.data.data.name });
  },

  logout: () => {
    localStorage.removeItem('taula_token');
    localStorage.removeItem('taula_refresh_token');
    localStorage.removeItem('taula_restaurant_name');
    set({ isAuthenticated: false, restaurantName: '' });
  },

  checkAuth: () => {
    set({ isAuthenticated: !!localStorage.getItem('taula_token') });
  },
}));
