const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
const BYTES_PER_UNIT = 1024;

export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(BYTES_PER_UNIT)), BYTE_UNITS.length - 1);
  const value = bytes / BYTES_PER_UNIT ** unitIndex;
  return `${value.toLocaleString('es-BO', { maximumFractionDigits: unitIndex >= 3 ? 2 : 0 })} ${BYTE_UNITS[unitIndex]}`;
};

export const megabytesToBytes = (megabytes: number): number => megabytes * BYTES_PER_UNIT * BYTES_PER_UNIT;
