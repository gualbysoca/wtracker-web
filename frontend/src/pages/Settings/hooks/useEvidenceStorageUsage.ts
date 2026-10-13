import { useCallback, useEffect, useState } from 'react';
import { fetchEvidenceStorageUsage, type EvidenceStorageUsage } from '../../../services/evidenceStorage.service';

const USAGE_LOAD_ERROR_MESSAGE = 'No se pudo obtener el uso de almacenamiento.';

export const useEvidenceStorageUsage = () => {
  const [usage, setUsage] = useState<EvidenceStorageUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshUsage = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setUsage(await fetchEvidenceStorageUsage());
    } catch (error) {
      console.error('[Settings] Error al obtener uso de almacenamiento de evidencias:', error);
      setErrorMessage(USAGE_LOAD_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  return { usage, isLoading, errorMessage, refreshUsage };
};
