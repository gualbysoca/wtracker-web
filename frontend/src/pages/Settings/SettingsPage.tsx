import { useState, useEffect, useRef } from 'react';
import { Save } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getMapTileUrl } from '../../utils/mapConfig';

// Fix leaflet icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export const SettingsPage = () => {
  const [settings, setSettings] = useState({
    geofence_radius: '100',
    gamification_sniper: '10',
    gamification_on_fire: '20',
    gamification_black_cloud: '5',
    gamification_turtle: '60',
    gamification_enabled: 'true',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings');
        // Asegurar que exista gamification_enabled
        setSettings({
          ...res.data.data,
          gamification_enabled: res.data.data.gamification_enabled ?? 'true'
        });
      } catch (err) {
        toast.error('Error al cargar configuraciones');
      }
    };
    fetchSettings();
  }, []);

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  const demoLocation: [number, number] = [-16.5000, -68.1193]; // La Paz, Bolivia

  useEffect(() => {
    if (!mapRef.current) return;
    
    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current, { zoomControl: false }).setView(demoLocation, 15);
      L.tileLayer(getMapTileUrl('dark'), {
        attribution: '&copy; OpenStreetMap'
      }).addTo(leafletMap.current);
      
      L.marker(demoLocation).addTo(leafletMap.current);
      
      circleRef.current = L.circle(demoLocation, {
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.2,
        weight: 2,
        radius: Number(settings.geofence_radius) || 100
      }).addTo(leafletMap.current);
    } else {
      if (circleRef.current) {
        circleRef.current.setRadius(Number(settings.geofence_radius) || 100);
      }
    }
  }, [settings.geofence_radius]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target.checked ? 'true' : 'false') : e.target.value;
    setSettings({ ...settings, [e.target.name]: value });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await api.put('/settings', settings);
      toast.success('Configuraciones guardadas exitosamente');
    } catch (err) {
      toast.error('Error al guardar configuraciones');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="page-container" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', overflowY: 'auto' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'white' }}>Configuraciones</h1>
        <p style={{ color: 'var(--text-muted)' }}>Ajusta los parámetros del sistema y la app móvil</p>
      </div>

      {/* GEOFENCE */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'white' }}>Geofence y Tolerancia</h2>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
            Radio de tolerancia: <strong>{settings.geofence_radius} metros</strong>
          </label>
          <input
            type="range"
            name="geofence_radius"
            min="10"
            max="1000"
            step="10"
            value={settings.geofence_radius || 100}
            onChange={handleChange}
            style={{ width: '100%', marginBottom: '1rem', cursor: 'pointer' }}
          />
          <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '1rem' }}>
            Desliza para ajustar la distancia máxima permitida para registrar una tarea como válida. El círculo azul representa esta área de tolerancia.
          </small>
          
          <div style={{ height: '300px', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      {/* GAMIFICATION */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'white' }}>Gamificación</h2>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <span style={{ color: settings.gamification_enabled === 'true' ? 'var(--primary-color)' : 'var(--text-muted)', fontWeight: 600 }}>
              {settings.gamification_enabled === 'true' ? 'Activada' : 'Desactivada'}
            </span>
            <div style={{
              position: 'relative', width: '44px', height: '24px',
              background: settings.gamification_enabled === 'true' ? 'var(--primary-color)' : 'var(--surface-border)',
              borderRadius: '12px', transition: '0.3s'
            }}>
              <input
                type="checkbox"
                name="gamification_enabled"
                checked={settings.gamification_enabled === 'true'}
                onChange={handleChange}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <div style={{
                position: 'absolute', top: '2px', left: settings.gamification_enabled === 'true' ? '22px' : '2px',
                width: '20px', height: '20px', background: 'white', borderRadius: '50%', transition: '0.3s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }} />
            </div>
          </label>
        </div>

        <div style={{ opacity: settings.gamification_enabled === 'true' ? 1 : 0.5, pointerEvents: settings.gamification_enabled === 'true' ? 'auto' : 'none', transition: '0.3s' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Francotirador (100% de éxito)</label>
            <input
              type="number"
              name="gamification_sniper"
              value={settings.gamification_sniper || ''}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'white' }}
            />
            <small style={{ color: 'var(--text-muted)' }}>Número mínimo de tareas sin fallos para recibir la medalla Francotirador.</small>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Empleado en Llamas</label>
            <input
              type="number"
              name="gamification_on_fire"
              value={settings.gamification_on_fire || ''}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'white' }}
            />
            <small style={{ color: 'var(--text-muted)' }}>Número de tareas exitosas consecutivas (racha) requeridas para este premio.</small>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nube Negra</label>
            <input
              type="number"
              name="gamification_black_cloud"
              value={settings.gamification_black_cloud || ''}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'white' }}
            />
            <small style={{ color: 'var(--text-muted)' }}>Cantidad de tareas fallidas acumuladas para otorgar la medalla Nube Negra.</small>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Premio a la Tortuga</label>
            <input
              type="number"
              name="gamification_turtle"
              value={settings.gamification_turtle || ''}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'white' }}
            />
            <small style={{ color: 'var(--text-muted)' }}>Minutos de inactividad acumulada para recibir el premio a la lentitud.</small>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '2rem' }}>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={loading}
        >
          <Save size={18} />
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  );
};
