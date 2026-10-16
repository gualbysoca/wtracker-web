import { useState, useEffect, useRef } from 'react';
import { Save, MapPin, Trophy } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getMapTileUrl } from '../../utils/mapConfig';
import { ToggleSwitch } from '../../components/ui/ToggleSwitch';
import { EvidenceStorageSettingsCard } from './components/EvidenceStorageSettingsCard';
import { useEvidenceStorageUsage } from './hooks/useEvidenceStorageUsage';
import { DEFAULT_SETTINGS, mergeWithDefaultSettings, type SettingsValues } from './settings.constants';

const SAVE_ERROR_FALLBACK_MESSAGE = 'Error al guardar configuraciones';

const extractSaveErrorMessage = (error: unknown): string => {
  const responseData = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })
    ?.response?.data;
  const firstFieldError = Object.values(responseData?.errors ?? {}).flat()[0];
  return firstFieldError || responseData?.message || SAVE_ERROR_FALLBACK_MESSAGE;
};

// Fix leaflet icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export const SettingsPage = () => {
  const [settings, setSettings] = useState<SettingsValues>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const evidenceStorageUsage = useEvidenceStorageUsage();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings');
        // Claves ausentes en BD (p.ej. gamification_enabled o evidence_*) toman su valor por defecto.
        setSettings(mergeWithDefaultSettings(res.data.data));
      } catch (err) {
        console.error('[Settings] Error al cargar configuraciones:', err);
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
    const { name, type, checked, value: rawValue } = e.target;
    const value = type === 'checkbox' ? (checked ? 'true' : 'false') : rawValue;
    setSettings((previousSettings) => ({ ...previousSettings, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await api.put('/settings', settings);
      toast.success('Configuraciones guardadas exitosamente');
      evidenceStorageUsage.refreshUsage();
    } catch (err) {
      console.error('[Settings] Error al guardar configuraciones:', err);
      toast.error(extractSaveErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };



  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div className="page-header" style={{ marginBottom: '1.25rem', flexShrink: 0 }}>
        <div className="page-header-left">
          <h1>Configuraciones</h1>
          <p>Ajusta los parámetros del sistema y la app móvil</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={loading}
        >
          <Save size={18} />
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {/* Contenedor estándar con scroll interno, como en las otras secciones */}
      <div className="card settings-container" style={{ padding: 0, border: 'none' }}>
        <div className="settings-scroll-body">
          <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* GEOFENCE */}
            <div className="card settings-card">
              <div className="settings-card-header">
                <MapPin size={20} aria-hidden="true" />
                <div>
                  <h2 className="settings-card-title">Geofence y Tolerancia</h2>
                  <p className="form-hint">Ajusta el radio de cobertura geográfica para la validación automática de tareas en campo.</p>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Radio de tolerancia: <strong style={{ color: 'var(--color-primary-400)' }}>{settings.geofence_radius} metros</strong>
                </label>
                <input
                  type="range"
                  name="geofence_radius"
                  min="10"
                  max="1000"
                  step="10"
                  value={settings.geofence_radius || 100}
                  onChange={handleChange}
                  style={{ width: '100%', marginBottom: '1rem', cursor: 'pointer', accentColor: 'var(--color-primary-500)' }}
                />
                <small className="form-hint" style={{ display: 'block', marginBottom: '1rem' }}>
                  Desliza para ajustar la distancia máxima permitida para registrar una tarea como válida. El círculo azul representa esta área de tolerancia.
                </small>
                
                <div style={{ height: '300px', width: '100%', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--surface-border)' }}>
                  <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
                </div>
              </div>
            </div>

            {/* GAMIFICATION */}
            <div className="card settings-card">
              <div className="settings-card-header" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                  <Trophy size={20} aria-hidden="true" />
                  <div>
                    <h2 className="settings-card-title">Gamificación</h2>
                    <p className="form-hint">Incentivos y métricas de desempeño para el personal en terreno.</p>
                  </div>
                </div>
                <ToggleSwitch
                  id="gamification-enabled-toggle"
                  name="gamification_enabled"
                  checked={settings.gamification_enabled === 'true'}
                  onChange={handleChange}
                />
              </div>

              <div style={{ opacity: settings.gamification_enabled === 'true' ? 1 : 0.5, pointerEvents: settings.gamification_enabled === 'true' ? 'auto' : 'none', transition: 'opacity 0.25s ease' }}>
                <div className="settings-field-grid">
                  <div className="form-group settings-field">
                    <label className="form-label">Francotirador (100% de éxito)</label>
                    <input
                      type="number"
                      name="gamification_sniper"
                      className="form-input"
                      value={settings.gamification_sniper || ''}
                      onChange={handleChange}
                      placeholder="Ej. 10"
                    />
                    <small className="form-hint">Mínimo de tareas sin fallos para recibir la medalla.</small>
                  </div>

                  <div className="form-group settings-field">
                    <label className="form-label">Empleado en Llamas</label>
                    <input
                      type="number"
                      name="gamification_on_fire"
                      className="form-input"
                      value={settings.gamification_on_fire || ''}
                      onChange={handleChange}
                      placeholder="Ej. 5"
                    />
                    <small className="form-hint">Tareas exitosas consecutivas requeridas para este premio.</small>
                  </div>

                  <div className="form-group settings-field">
                    <label className="form-label">Nube Negra</label>
                    <input
                      type="number"
                      name="gamification_black_cloud"
                      className="form-input"
                      value={settings.gamification_black_cloud || ''}
                      onChange={handleChange}
                      placeholder="Ej. 3"
                    />
                    <small className="form-hint">Cantidad de tareas fallidas acumuladas para la medalla.</small>
                  </div>

                  <div className="form-group settings-field">
                    <label className="form-label">Premio a la Tortuga</label>
                    <input
                      type="number"
                      name="gamification_turtle"
                      className="form-input"
                      value={settings.gamification_turtle || ''}
                      onChange={handleChange}
                      placeholder="Ej. 30"
                    />
                    <small className="form-hint">Minutos de inactividad acumulada para recibir el premio.</small>
                  </div>
                </div>
              </div>
            </div>

            <EvidenceStorageSettingsCard
              settings={settings}
              onChange={handleChange}
              usage={evidenceStorageUsage.usage}
              isUsageLoading={evidenceStorageUsage.isLoading}
              usageErrorMessage={evidenceStorageUsage.errorMessage}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '1rem' }}>
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
        </div>
      </div>
    </div>
  );
};
