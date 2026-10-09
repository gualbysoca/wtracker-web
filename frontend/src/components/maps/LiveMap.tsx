// src/components/maps/LiveMap.tsx
// Mapa Leaflet con marcadores de usuarios en campo

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LiveMapUser } from '../../types';
import { getMapTileUrl } from '../../utils/mapConfig';

// Fix Leaflet default icon issue with Vite/Webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STATUS_COLORS: Record<string, string> = {
  en_ruta:  '#f59e0b',
  visitado: '#10b981',
  fallido:  '#ef4444',
};

const DISTINCT_COLORS = [
  '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#eab308', '#a855f7', '#06b6d4', '#f43f5e', '#d946ef',
  '#22c55e', '#38bdf8', '#fb923c', '#4ade80', '#c084fc'
];

const colorMap = new Map<string, string>();
let colorIndex = 0;

const getColorForUser = (userId: string) => {
  if (!colorMap.has(userId)) {
    const color = DISTINCT_COLORS[colorIndex % DISTINCT_COLORS.length];
    colorMap.set(userId, color);
    colorIndex++;
  }
  return colorMap.get(userId)!;
};

const createUserMarkerIcon = (status: string, initials: string, color: string) =>
  L.divIcon({
    className: 'leaflet-animated-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
    html: `
      <div style="
        width: 36px; height: 36px;
        border-radius: 50%;
        background: ${color};
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        display: flex; align-items: center; justify-content: center;
        color: white; font-weight: 700; font-size: 11px;
        font-family: Inter, sans-serif;
        position: relative;
      ">
        ${initials}
        <div style="
          position: absolute; bottom: -2px; right: -2px;
          width: 12px; height: 12px; border-radius: 50%;
          background: ${STATUS_COLORS[status] ?? '#6b7280'};
          border: 2px solid white;
        "></div>
      </div>
    `,
  });

const createClientMarkerIcon = (color: string) =>
  L.divIcon({
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
    html: `
      <div style="
        width: 36px; height: 36px;
        border-radius: 8px;
        background: var(--surface-card, #1e293b);
        border: 2px solid ${color};
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        display: flex; align-items: center; justify-content: center;
        color: ${color};
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h2V14h8v8h2a2 2 0 0 0 2-2v-8"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/></svg>
      </div>
    `,
  });



interface LiveMapProps {
  users?: LiveMapUser[];
  height?: number | string;
  selectedUserId?: string | null;
  isCompressed?: boolean;
}

export const LiveMap = ({ users, height = 420, selectedUserId, isCompressed = false }: LiveMapProps) => {
  const mapRef  = useRef<HTMLDivElement>(null);
  const mapInst = useRef<L.Map | null>(null);

  const displayUsers = users || [];

  useEffect(() => {
    if (!mapRef.current || mapInst.current) return;

    // Calcular centro inicial en base a los usuarios, o usar Santa Cruz por defecto
    const initialCenter: [number, number] = displayUsers.length > 0 && displayUsers[0].lat && displayUsers[0].lng
      ? [displayUsers[0].lat, displayUsers[0].lng]
      : [-17.7833, -63.1821];

    mapInst.current = L.map(mapRef.current, {
      center: initialCenter,
      zoom: 13,
      zoomControl: true,
    });

    // Tile layer
    const tileUrl = getMapTileUrl('dark');
    L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      ...(tileUrl.includes('{s}') ? { subdomains: 'abcd' } : {}),
      maxZoom: 19,
    }).addTo(mapInst.current);

    // Watch for container resize to update map size
    const resizeObserver = new ResizeObserver(() => {
      if (mapInst.current) {
        mapInst.current.invalidateSize();
      }
    });
    resizeObserver.observe(mapRef.current);

    return () => {
      resizeObserver.disconnect();
      mapInst.current?.remove();
      mapInst.current = null;
    };
  }, []);

    const markersRef = useRef<Record<string, L.Marker>>({});
    const clientMarkersRef = useRef<Record<string, L.Marker>>({});
    const routeLinesRef = useRef<Record<string, L.Polyline>>({});
    const hasCentered = useRef(false);

    // Actualizar marcadores de manera reactiva y fluida
    useEffect(() => {
      const map = mapInst.current;
      if (!map) return;

      const currentUsers = new Set(displayUsers.map(u => u.user_id));
      const bounds = L.latLngBounds([]);

      // Remover marcadores de usuarios que ya no están
      Object.keys(markersRef.current).forEach(id => {
        if (!currentUsers.has(id)) {
          map.removeLayer(markersRef.current[id]);
          delete markersRef.current[id];
        }
      });

      // Remover marcadores de clientes que ya no están
      Object.keys(clientMarkersRef.current).forEach(id => {
        if (!currentUsers.has(id)) {
          map.removeLayer(clientMarkersRef.current[id]);
          delete clientMarkersRef.current[id];
        }
      });

      // Remover lineas de ruta de usuarios que ya no están o cambiaron de estado
      Object.keys(routeLinesRef.current).forEach(id => {
        const user = displayUsers.find(u => u.user_id === id);
        if (!currentUsers.has(id) || user?.status !== 'en_ruta') {
          map.removeLayer(routeLinesRef.current[id]);
          delete routeLinesRef.current[id];
        }
      });

      displayUsers.forEach((user) => {
        if (!user.lat || !user.lng) return;

        const initials = user.full_name
          .split(' ')
          .slice(0, 2)
          .map((n) => n[0])
          .join('');
        
        const newLatLng: [number, number] = [user.lat, user.lng];
        const userColor = getColorForUser(user.user_id);
        const newIcon = createUserMarkerIcon(user.status, initials, userColor);
        const statusLabel = { en_ruta: 'En Ruta', visitado: 'Visitado', fallido: 'Fallido' }[user.status] ?? user.status;
        
        const popupHtml = `
          <div style="font-family: Inter, sans-serif; min-width: 180px;">
            <strong style="font-size: 0.9rem;">${user.full_name}</strong>
            <div style="color: #6b7280; font-size: 0.8rem; text-transform: capitalize; margin-top: 2px;">${user.role}</div>
            <hr style="border-color: #e5e7eb; margin: 8px 0;">
            <div style="font-size: 0.8rem;">📍 ${user.client_name}</div>
            <div style="margin-top: 4px;">
              <span style="
                background: ${STATUS_COLORS[user.status]}22;
                color: ${STATUS_COLORS[user.status]};
                padding: 2px 8px; border-radius: 999px; font-size: 0.75rem; font-weight: 600;
              ">${statusLabel}</span>
            </div>
          </div>
        `;

        if (markersRef.current[user.user_id]) {
          // Actualizar marcador existente de forma fluida
          const marker = markersRef.current[user.user_id];
          marker.setLatLng(newLatLng);
          marker.setIcon(newIcon);
          marker.setZIndexOffset(1000); // Ensure user is above client
          
          // Actualizar popup sin cerrarlo
          if (marker.getPopup()) {
             marker.getPopup()?.setContent(popupHtml);
          }
        } else {
          // Crear nuevo marcador
          const marker = L.marker(newLatLng, { icon: newIcon, zIndexOffset: 1000 });
          marker.bindPopup(popupHtml);
          marker.addTo(map);
          markersRef.current[user.user_id] = marker;
        }

        // Plot client marker if coordinates exist
        if (user.client_lat && user.client_lng) {
          const clientLatLng: [number, number] = [user.client_lat, user.client_lng];
          const clientPopupHtml = `
            <div style="font-family: Inter, sans-serif; min-width: 150px;">
              <strong style="font-size: 0.9rem;">${user.client_name}</strong>
              <div style="color: #6b7280; font-size: 0.8rem; margin-top: 2px;">Cliente de ${user.full_name}</div>
            </div>
          `;
          
          if (clientMarkersRef.current[user.user_id]) {
            const clientMarker = clientMarkersRef.current[user.user_id];
            clientMarker.setLatLng(clientLatLng);
            clientMarker.setIcon(createClientMarkerIcon(userColor));
            clientMarker.setZIndexOffset(500); // Ensure client is below user
            if (clientMarker.getPopup()) {
              clientMarker.getPopup()?.setContent(clientPopupHtml);
            }
          } else {
            const clientIcon = createClientMarkerIcon(userColor);
            const clientMarker = L.marker(clientLatLng, { icon: clientIcon, zIndexOffset: 500 });
            clientMarker.bindPopup(clientPopupHtml);
            clientMarker.addTo(map);
            clientMarkersRef.current[user.user_id] = clientMarker;
          }
          bounds.extend(clientLatLng);

          // Dibujar linea si está en ruta
          if (user.status === 'en_ruta') {
            if (routeLinesRef.current[user.user_id]) {
              routeLinesRef.current[user.user_id].setLatLngs([newLatLng, clientLatLng]);
              routeLinesRef.current[user.user_id].setStyle({ color: userColor });
            } else {
              const polyline = L.polyline([newLatLng, clientLatLng], {
                color: userColor,
                weight: 3,
                dashArray: '5, 8',
                opacity: 0.8
              });
              polyline.addTo(map);
              routeLinesRef.current[user.user_id] = polyline;
            }
          }
        } else if (clientMarkersRef.current[user.user_id]) {
          // Client coords removed but marker exists
          map.removeLayer(clientMarkersRef.current[user.user_id]);
          delete clientMarkersRef.current[user.user_id];
          
          if (routeLinesRef.current[user.user_id]) {
            map.removeLayer(routeLinesRef.current[user.user_id]);
            delete routeLinesRef.current[user.user_id];
          }
        }

        bounds.extend(newLatLng);
      });

      // Solo forzamos el centrado de la cámara la primera vez que recibimos datos válidos
      if (!hasCentered.current && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        hasCentered.current = true;
      }
    }, [displayUsers]);

    // Centrar cámara en el usuario seleccionado
    useEffect(() => {
      const map = mapInst.current;
      if (!map || !selectedUserId || isCompressed) return;
      
      const user = displayUsers.find(u => u.user_id === selectedUserId);
      if (user && user.lat && user.lng) {
        // Invalidate size in case the container just changed size before flying
        map.invalidateSize();
        
        // Timeout to allow DOM/CSS transitions to settle before flying and opening popup
        setTimeout(() => {
          map.flyTo([user.lat, user.lng], 16, { duration: 1.2 });
          const marker = markersRef.current[user.user_id];
          if (marker) {
            // Add a small delay to let the map finish moving before opening the popup, to avoid autoPan conflicts
            setTimeout(() => {
              marker.openPopup();
            }, 1200);
          }
        }, 300); // 300ms matches the layout transition duration
      }
    }, [selectedUserId, displayUsers]);

  return (
    <div
      ref={mapRef}
      style={{ height, width: '100%' }}
      id="live-map"
      aria-label="Mapa de monitoreo en tiempo real"
    />
  );
};
