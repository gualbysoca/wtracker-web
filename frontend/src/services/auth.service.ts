// src/services/auth.service.ts
import apiClient from './api';
import type { AuthTokens, User } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<AuthTokens> {
    const { data } = await apiClient.post('/auth/login', { email, password });
    return data.data as AuthTokens;
  },

  async logout(refreshToken: string): Promise<void> {
    await apiClient.post('/auth/logout', { refreshToken });
  },

  async getProfile(): Promise<User> {
    const { data } = await apiClient.get('/auth/me');
    return data.data as User;
  },

  saveTokens(tokens: AuthTokens): void {
    localStorage.setItem('wt_access_token', tokens.accessToken);
    localStorage.setItem('wt_refresh_token', tokens.refreshToken);
    localStorage.setItem('wt_user', JSON.stringify(tokens.user));
  },

  clearTokens(): void {
    localStorage.removeItem('wt_access_token');
    localStorage.removeItem('wt_refresh_token');
    localStorage.removeItem('wt_user');
  },

  getStoredUser(): User | null {
    const raw = localStorage.getItem('wt_user');
    if (!raw) return null;
    try { return JSON.parse(raw) as User; } catch { return null; }
  },
};
