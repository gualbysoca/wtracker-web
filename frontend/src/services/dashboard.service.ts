// src/services/dashboard.service.ts
import apiClient from './api';
import type { DashboardStats, LiveMapUser, CrossDataRow } from '../types';

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const { data } = await apiClient.get('/dashboard/stats');
    return data.data as DashboardStats;
  },

  async getLiveMap(): Promise<LiveMapUser[]> {
    const { data } = await apiClient.get('/dashboard/map');
    return data.data as LiveMapUser[];
  },

  async getCrossData(dateFrom?: string, dateTo?: string): Promise<CrossDataRow[]> {
    const { data } = await apiClient.get('/dashboard/cross-data', {
      params: { date_from: dateFrom, date_to: dateTo },
    });
    return data.data as CrossDataRow[];
  },
};
