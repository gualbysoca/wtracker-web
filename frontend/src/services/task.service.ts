// frontend/src/services/task.service.ts
import apiClient from './api';
import type { Visit, PaginatedResponse } from '../types';

export interface TaskFilters {
  page?: number;
  limit?: number;
  search?: string;
  user_id?: string;
  client_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}

export const taskService = {
  async list(filters: TaskFilters = {}): Promise<PaginatedResponse<Visit>> {
    const { data } = await apiClient.get('/visits', { params: filters });
    return data as PaginatedResponse<Visit>;
  }
};
