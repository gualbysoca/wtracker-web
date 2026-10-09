export const getMapTileUrl = (_theme?: 'light' | 'dark') => {
  // Los base maps de Carto ahora requieren API Key y devuelven marca de agua de "API KEY REQUIRED".
  // Usamos el standard de OpenStreetMap como fallback seguro.
  const defaultBase = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

  return import.meta.env.VITE_MAP_TILE_URL || defaultBase;
};
