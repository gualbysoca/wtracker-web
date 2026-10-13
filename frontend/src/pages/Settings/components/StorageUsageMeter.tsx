import { Skeleton } from '../../../components/ui/Skeleton';
import type { EvidenceStorageUsage } from '../../../services/evidenceStorage.service';
import { formatBytes } from '../../../utils/formatBytes';
import { formatDate } from '../../../utils/formatDate';

const WARNING_USAGE_RATIO = 0.75;
const DANGER_USAGE_RATIO = 0.95;

interface StorageUsageMeterProps {
  usage: EvidenceStorageUsage | null;
  isLoading: boolean;
  errorMessage: string | null;
  capBytes: number;
}

const getFillModifier = (usageRatio: number) => {
  if (usageRatio >= DANGER_USAGE_RATIO) return 'is-danger';
  if (usageRatio >= WARNING_USAGE_RATIO) return 'is-warning';
  return '';
};

export const StorageUsageMeter = ({ usage, isLoading, errorMessage, capBytes }: StorageUsageMeterProps) => {
  if (isLoading) {
    return (
      <div className="storage-usage" aria-busy="true">
        <Skeleton height="var(--space-6)" width="40%" />
        <Skeleton height="var(--space-2)" />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="storage-usage" role="alert">
        <span className="storage-usage-error">{errorMessage}</span>
      </div>
    );
  }

  if (!usage) return null;

  const usageRatio = capBytes > 0 ? Math.min(usage.usedBytes / capBytes, 1) : 0;
  const usagePercent = Math.round(usageRatio * 100);

  return (
    <div className="storage-usage">
      <div className="storage-usage-header">
        <span className="storage-usage-value">
          {formatBytes(usage.usedBytes)} <span className="form-hint">de {formatBytes(capBytes)}</span>
        </span>
        <span className="form-hint">{usagePercent}% usado</span>
      </div>
      <div
        className="storage-usage-bar"
        role="progressbar"
        aria-label="Almacenamiento de evidencias usado"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={usagePercent}
      >
        <div className={`storage-usage-bar-fill ${getFillModifier(usageRatio)}`} style={{ width: `${usagePercent}%` }} />
      </div>
      <div className="storage-usage-meta">
        {usage.activeCount === 0 ? (
          <span>Aún no hay evidencias almacenadas.</span>
        ) : (
          <span>{usage.activeCount.toLocaleString('es-BO')} evidencias almacenadas</span>
        )}
        {usage.oldestActiveAt && <span>Más antigua: {formatDate(usage.oldestActiveAt)}</span>}
        <span>{usage.purgedCount.toLocaleString('es-BO')} depuradas</span>
        {usage.lastPurgedAt && <span>Última depuración: {formatDate(usage.lastPurgedAt)}</span>}
      </div>
    </div>
  );
};
