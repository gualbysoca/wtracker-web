import api from './api';

export interface EvidenceStorageUsage {
  activeCount: number;
  usedBytes: number;
  capBytes: number;
  purgedCount: number;
  lastPurgedAt: string | null;
  oldestActiveAt: string | null;
}

export const fetchEvidenceStorageUsage = async (): Promise<EvidenceStorageUsage> => {
  const response = await api.get('/settings/evidence-storage');
  return response.data.data;
};
