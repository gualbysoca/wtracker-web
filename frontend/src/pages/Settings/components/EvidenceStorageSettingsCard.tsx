import type { ChangeEvent } from 'react';
import { HardDrive } from 'lucide-react';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import type { EvidenceStorageUsage } from '../../../services/evidenceStorage.service';
import { formatBytes, megabytesToBytes } from '../../../utils/formatBytes';
import { EVIDENCE_SETTING_LIMITS, type SettingsValues } from '../settings.constants';
import { SettingNumberField } from './SettingNumberField';
import { StorageUsageMeter } from './StorageUsageMeter';

interface EvidenceStorageSettingsCardProps {
  settings: SettingsValues;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  usage: EvidenceStorageUsage | null;
  isUsageLoading: boolean;
  usageErrorMessage: string | null;
}

export const EvidenceStorageSettingsCard = ({
  settings,
  onChange,
  usage,
  isUsageLoading,
  usageErrorMessage,
}: EvidenceStorageSettingsCardProps) => {
  const isCompressionEnabled = settings.evidence_compression_enabled === 'true';
  const isRetentionEnabled = settings.evidence_retention_enabled === 'true';
  const storageCapBytes = megabytesToBytes(Number(settings.evidence_storage_cap_mb) || 0);

  return (
    <section className="card settings-card" aria-labelledby="evidence-storage-title">
      <div className="settings-card-header">
        <HardDrive size={20} aria-hidden="true" />
        <div>
          <h2 id="evidence-storage-title" className="settings-card-title">Evidencias y almacenamiento</h2>
          <p className="form-hint">Controla el tamaño de las fotos y firmas para no superar el límite gratuito de almacenamiento.</p>
        </div>
      </div>

      <StorageUsageMeter
        usage={usage}
        isLoading={isUsageLoading}
        errorMessage={usageErrorMessage}
        capBytes={storageCapBytes}
      />

      <div className="settings-section">
        <div className="settings-section-header">
          <h3 className="settings-section-title">Compresión de imágenes</h3>
          <ToggleSwitch
            id="evidence-compression-toggle"
            name="evidence_compression_enabled"
            checked={isCompressionEnabled}
            onChange={onChange}
          />
        </div>
        <div className={`settings-section-body settings-field-grid ${isCompressionEnabled ? '' : 'is-disabled'}`}>
          <SettingNumberField
            id="evidence-max-dimension-input"
            name="evidence_max_dimension_px"
            label="Dimensión máxima"
            hint="Lado más largo de la imagen tras redimensionar"
            unit="px"
            value={settings.evidence_max_dimension_px}
            onChange={onChange}
            {...EVIDENCE_SETTING_LIMITS.maxDimensionPx}
          />
          <SettingNumberField
            id="evidence-image-quality-input"
            name="evidence_image_quality"
            label="Calidad WebP"
            hint="Menor calidad = archivos más livianos"
            unit="%"
            value={settings.evidence_image_quality}
            onChange={onChange}
            {...EVIDENCE_SETTING_LIMITS.imageQuality}
          />
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <h3 className="settings-section-title">Depuración automática</h3>
          <ToggleSwitch
            id="evidence-retention-toggle"
            name="evidence_retention_enabled"
            checked={isRetentionEnabled}
            onChange={onChange}
          />
        </div>
        <p className="form-hint">
          Se eliminan los archivos más antiguos al superar el tope o la antigüedad máxima (lo que ocurra primero).
          El registro de la evidencia (fecha, ubicación y tipo) se conserva.
        </p>
        <div className={`settings-section-body settings-field-grid ${isRetentionEnabled ? '' : 'is-disabled'}`}>
          <SettingNumberField
            id="evidence-storage-cap-input"
            name="evidence_storage_cap_mb"
            label={`Tope de almacenamiento (≈ ${formatBytes(storageCapBytes)})`}
            hint="Espacio máximo para archivos de evidencia"
            unit="MB"
            value={settings.evidence_storage_cap_mb}
            onChange={onChange}
            {...EVIDENCE_SETTING_LIMITS.storageCapMb}
          />
          <SettingNumberField
            id="evidence-retention-days-input"
            name="evidence_retention_max_days"
            label="Antigüedad máxima"
            hint="Días que se conserva cada archivo"
            unit="días"
            value={settings.evidence_retention_max_days}
            onChange={onChange}
            {...EVIDENCE_SETTING_LIMITS.retentionMaxDays}
          />
        </div>
      </div>
    </section>
  );
};
