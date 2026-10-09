// src/services/user.service.ts
import apiClient from './api';
import type { User, UserPerformance, PaginatedResponse } from '../types';

interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  include_inactive?: boolean;
}

export const userService = {
  async list(filters: UserFilters = {}): Promise<PaginatedResponse<User>> {
    const { data } = await apiClient.get('/users', { params: filters });
    return data as PaginatedResponse<User>;
  },

  async getById(id: string): Promise<User> {
    const { data } = await apiClient.get(`/users/${id}`);
    return data.data as User;
  },

  async getPerformance(id: string, dateFrom?: string, dateTo?: string): Promise<UserPerformance> {
    const { data } = await apiClient.get(`/users/${id}/performance`, {
      params: { date_from: dateFrom, date_to: dateTo },
    });
    return data.data as UserPerformance;
  },

  async create(payload: Partial<User> & { password: string }): Promise<User> {
    const { data } = await apiClient.post('/users', payload);
    return data.data as User;
  },

  async update(id: string, payload: Partial<User>): Promise<User> {
    const { data } = await apiClient.put(`/users/${id}`, payload);
    return data.data as User;
  },

  async deactivate(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  },
};
