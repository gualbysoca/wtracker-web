// src/services/client.service.ts
import apiClient from './api';
import type { Client, PaginatedResponse } from '../types';

interface ClientFilters { page?: number; limit?: number; search?: string; }

export const clientService = {
  async list(filters: ClientFilters = {}): Promise<PaginatedResponse<Client>> {
    const { data } = await apiClient.get('/clients', { params: filters });
    return data as PaginatedResponse<Client>;
  },

  async getById(id: string): Promise<Client> {
    const { data } = await apiClient.get(`/clients/${id}`);
    return data.data as Client;
  },

  async create(payload: Partial<Client>): Promise<Client> {
    const { data } = await apiClient.post('/clients', payload);
    return data.data as Client;
  },

  async update(id: string, payload: Partial<Client>): Promise<Client> {
    const { data } = await apiClient.put(`/clients/${id}`, payload);
    return data.data as Client;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/clients/${id}`);
  },
};
