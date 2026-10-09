// src/store/authStore.ts
// Zustand store para estado de autenticación global

import { create } from 'zustand';
import { authService } from '../services/auth.service';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initializeFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: authService.getStoredUser(),
  isAuthenticated: !!(authService.getStoredUser() && localStorage.getItem('wt_access_token')),
  isLoading: false,

  initializeFromStorage: () => {
    const storedUser = authService.getStoredUser();
    const token = localStorage.getItem('wt_access_token');
    if (storedUser && token) {
      set({ user: storedUser, isAuthenticated: true });
    } else {
      set({ user: null, isAuthenticated: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const tokens = await authService.login(email, password);
      authService.saveTokens(tokens);
      set({ user: tokens.user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('wt_refresh_token');
    try {
      if (refreshToken) await authService.logout(refreshToken);
    } finally {
      authService.clearTokens();
      set({ user: null, isAuthenticated: false });
    }
  },
}));
