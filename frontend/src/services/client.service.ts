// src/services/client.service.ts
import apiClient from './api';
import type { Client, PaginatedResponse } from '../types';

interface ClientFilters { page?: number; limit?: number; search?: string; }

export type BulkClientAction = 'create' | 'update' | 'delete';

export interface BulkClientRow {
  line: number;
  action: BulkClientAction;
  id?: string;
  data?: Record<string, string | number>;
}

export interface BulkClientsSummary {
  created: number;
  updated: number;
  deleted: number;
  errors: { line: number; message: string }[];
}

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

  async bulk(rows: BulkClientRow[]): Promise<BulkClientsSummary> {
    const { data } = await apiClient.post('/clients/bulk', { rows });
    return data.data as BulkClientsSummary;
  },

  async listAll(): Promise<Client[]> {
    const pageSize = 500;
    const collected: Client[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const response = await this.list({ page, limit: pageSize });
      collected.push(...response.data);
      totalPages = response.pagination?.totalPages ?? 1;
      page += 1;
    } while (page <= totalPages);
    return collected;
  },
};
