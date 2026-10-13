// Valores por defecto y límites de configuración. Deben mantenerse alineados con
// backend/src/configs/storage.js (EVIDENCE_SETTING_DEFAULTS / EVIDENCE_SETTING_LIMITS).

export type SettingsValues = Record<string, string>;

export const EVIDENCE_SETTING_DEFAULTS = Object.freeze({
  evidence_compression_enabled: 'true',
  evidence_max_dimension_px: '1280',
  evidence_image_quality: '60',
  evidence_retention_enabled: 'true',
  evidence_storage_cap_mb: '9216',
  evidence_retention_max_days: '90',
});

export const DEFAULT_SETTINGS: SettingsValues = Object.freeze({
  geofence_radius: '100',
  gamification_sniper: '10',
  gamification_on_fire: '20',
  gamification_black_cloud: '5',
  gamification_turtle: '60',
  gamification_enabled: 'true',
  ...EVIDENCE_SETTING_DEFAULTS,
});

export const EVIDENCE_SETTING_LIMITS = Object.freeze({
  maxDimensionPx: { min: 480, max: 4096, step: 160 },
  imageQuality: { min: 30, max: 95, step: 5 },
  storageCapMb: { min: 100, max: 102400, step: 512 },
  retentionMaxDays: { min: 1, max: 3650, step: 1 },
});

// Las migraciones siembran valores JSONB tipados (true, 1280) mientras que el panel guarda strings
// ("true", "1280"); se normaliza todo a string para que el formulario compare de forma uniforme.
const normalizeSettingValue = (value: unknown): string | undefined =>
  value === null || value === undefined ? undefined : String(value);

export const mergeWithDefaultSettings = (remoteSettings: Record<string, unknown> | null | undefined): SettingsValues => {
  const safeRemoteSettings = remoteSettings ?? {};
  return Object.keys({ ...DEFAULT_SETTINGS, ...safeRemoteSettings }).reduce<SettingsValues>((merged, key) => ({
    ...merged,
    [key]: normalizeSettingValue(safeRemoteSettings[key]) ?? DEFAULT_SETTINGS[key],
  }), {});
};
