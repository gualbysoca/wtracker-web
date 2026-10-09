// src/pages/Clients/ClientsPage.tsx

import { useEffect, useRef, useState, useCallback } from 'react';
import { Store, Search, MapPin, Plus, Edit2, Trash2, X, Phone, Mail, ChevronRight, ClipboardList, User as UserIcon, Calendar, FileImage, Clock, Maximize, Minimize } from 'lucide-react';
import type { Client, Visit } from '../../types';
import { Skeleton } from '../../components/ui/Skeleton';
import { ImageModal } from '../../components/ui/ImageModal';
import { getMediaUrl } from '../../utils/media';
import { clientService } from '../../services/client.service';
import { taskService } from '../../services/task.service';
import { formatDate } from '../../utils/formatDate';
import { getMapTileUrl } from '../../utils/mapConfig';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import api from '../../services/api';

// Fix icon paths for leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371e3;
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dp/2) * Math.sin(dp/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const BOLIVIA_CITIES: Record<string, { lat: number, lng: number }> = {
  'Santa Cruz': { lat: -17.7833, lng: -63.1821 },
  'La Paz': { lat: -16.4897, lng: -68.1193 },
  'Cochabamba': { lat: -17.3895, lng: -66.1568 },
  'Oruro': { lat: -17.9833, lng: -67.1500 },
  'Potosí': { lat: -19.5836, lng: -65.7531 },
  'Tarija': { lat: -21.5355, lng: -64.7296 },
  'Sucre': { lat: -19.0333, lng: -65.2627 },
  'Beni': { lat: -14.8333, lng: -64.9000 },
  'Pando': { lat: -11.0333, lng: -68.7667 }
};



// Las tareas simuladas han sido removidas.

const createClientMarkerIcon = () =>
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
        border: 2px solid var(--color-primary-500, #3b82f6);
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        display: flex; align-items: center; justify-content: center;
        color: var(--color-primary-500, #3b82f6);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h2V14h8v8h2a2 2 0 0 0 2-2v-8"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/></svg>
      </div>
    `,
  });

const ModalMap = ({ lat, lng, onChange }: { lat: number, lng: number, onChange: (lat: number, lng: number) => void }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInst = useRef<L.Map | null>(null);
  const markerInst = useRef<L.Marker | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!mapInst.current) {
      mapInst.current = L.map(mapRef.current).setView([lat, lng], 14);
      L.tileLayer(getMapTileUrl('light')).addTo(mapInst.current);
      
      markerInst.current = L.marker([lat, lng], { draggable: true, icon: createClientMarkerIcon() }).addTo(mapInst.current);
      markerInst.current.on('drag', (e) => {
        const pos = e.target.getLatLng();
        onChange(pos.lat, pos.lng);
      });
      
      mapInst.current.on('click', (e) => {
        markerInst.current?.setLatLng(e.latlng);
        onChange(e.latlng.lat, e.latlng.lng);
      });
      
      setTimeout(() => {
        mapInst.current?.invalidateSize();
      }, 100);
    } else {
      mapInst.current.setView([lat, lng], mapInst.current.getZoom());
      markerInst.current?.setLatLng([lat, lng]);
    }
  }, [lat, lng]);

  useEffect(() => {
    setTimeout(() => {
      mapInst.current?.invalidateSize();
    }, 50);
    setTimeout(() => {
      mapInst.current?.invalidateSize();
    }, 200);
  }, [isFullscreen]);

  useEffect(() => {
    return () => {
      mapInst.current?.remove();
      mapInst.current = null;
    };
  }, []);

  return (
    <div style={isFullscreen ? {
      position: 'fixed', inset: 0, zIndex: 99999, background: 'var(--surface-app)', display: 'flex', flexDirection: 'column'
    } : {
      position: 'relative', height: '250px', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--surface-border)'
    }}>
      {isFullscreen && (
        <div style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-panel)' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Seleccionar Ubicación (Pantalla Completa)</h3>
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => setIsFullscreen(false)} title="Salir de pantalla completa">
            <Minimize size={20} />
          </button>
        </div>
      )}
      <div style={{ flex: 1, position: 'relative', height: isFullscreen ? 'auto' : '100%' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        {!isFullscreen && (
          <button 
            type="button" 
            className="btn btn-secondary btn-icon"
            onClick={() => setIsFullscreen(true)}
            style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 400, background: 'var(--surface-panel)', padding: '0.4rem', boxShadow: 'var(--shadow-sm)' }}
            title="Pantalla Completa"
          >
            <Maximize size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export const ClientsPage = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [detailVisible, setDetailVisible]   = useState(false);
  const [detailsTab, setDetailsTab] = useState<'datos' | 'mapa' | 'tareas'>('datos');

  const [tasks, setTasks] = useState<Visit[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskPage, setTaskPage] = useState(1);
  const [taskTotalPages, setTaskTotalPages] = useState(1);
  const [taskStatusFilter, setTaskStatusFilter] = useState('');

  const [selectedTask, setSelectedTask] = useState<Visit | null>(null);
  const [taskDetailVisible, setTaskDetailVisible] = useState(false);
  const [taskDetailTab, setTaskDetailTab] = useState<'info' | 'evidence'>('info');
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [globalGeofenceRadius, setGlobalGeofenceRadius] = useState<number>(100);

  useEffect(() => {
    api.get('/settings').then(res => {
      if (res.data?.data?.geofence_radius) {
        setGlobalGeofenceRadius(Number(res.data.data.geofence_radius));
      }
    }).catch(() => {});
  }, []);

  const handleSelectTask = useCallback((task: Visit | null) => {
    if (!task) {
      setTaskDetailVisible(false);
      setTimeout(() => setSelectedTask(null), 450);
      return;
    }
    if (!selectedTask) {
      setSelectedTask(task);
      setTimeout(() => setTaskDetailVisible(true), 20);
    } else if (selectedTask.id === task.id) {
      setTaskDetailVisible(false);
      setTimeout(() => setSelectedTask(null), 450);
    } else {
      setTaskDetailVisible(false);
      setTimeout(() => {
        setSelectedTask(task);
        setTimeout(() => setTaskDetailVisible(true), 30);
      }, 280);
    }
  }, [selectedTask]);

  const listCollapsed = !!selectedTask;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const [formData, setFormData] = useState({
    business_name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    city: 'Santa Cruz',
    lat: BOLIVIA_CITIES['Santa Cruz'].lat,
    lng: BOLIVIA_CITIES['Santa Cruz'].lng,
    geofence_radius: 50
  });

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInst = useRef<L.Map | null>(null);
  const detailMarkerInst = useRef<L.Marker | null>(null);

  // ── Cargar clientes desde la API ──────────────────────────
  const loadClients = async () => {
    setIsLoading(true);
    try {
      const response = await clientService.list({ limit: 200 });
      // La API devuelve { success, data: Client[], pagination }
      const items: Client[] = Array.isArray(response) ? response : (response as any).data ?? [];
      // Normalizar lat/lng a number (PostgreSQL devuelve numeric como string)
      const normalized = items.map((c: any) => ({
        ...c,
        lat: typeof c.lat === 'string' ? parseFloat(c.lat) : c.lat,
        lng: typeof c.lng === 'string' ? parseFloat(c.lng) : c.lng,
      }));
      setClients(normalized);
    } catch (err) {
      console.error('[wtracker] Error cargando clientes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadClients(); }, []);

  const fetchClientTasks = useCallback(async () => {
    if (!selectedClient || detailsTab !== 'tareas') return;
    setTasksLoading(true);
    try {
      const res = await taskService.list({
        client_id: selectedClient.id,
        status: taskStatusFilter || undefined,
        limit: 10,
        page: taskPage
      });
      setTasks(res.data);
      setTaskTotalPages(res.pagination?.totalPages || 1);
    } catch {
      toast.error('Error al cargar tareas del cliente');
    } finally {
      setTasksLoading(false);
    }
  }, [selectedClient, detailsTab, taskStatusFilter, taskPage]);

  useEffect(() => {
    fetchClientTasks();
  }, [fetchClientTasks]);

  useEffect(() => {
    setTaskPage(1);
  }, [taskStatusFilter, selectedClient]);

  useEffect(() => {
    if (detailsTab === 'mapa' && selectedClient && mapRef.current) {
      if (!mapInst.current) {
        mapInst.current = L.map(mapRef.current, {
          center: [selectedClient.lat, selectedClient.lng],
          zoom: 15
        });
        const tileUrl = getMapTileUrl('light');
        L.tileLayer(tileUrl, {
          ...(tileUrl.includes('{s}') ? { subdomains: 'abcd' } : {}),
          maxZoom: 19,
        }).addTo(mapInst.current);
        detailMarkerInst.current = L.marker([selectedClient.lat, selectedClient.lng], { icon: createClientMarkerIcon() }).addTo(mapInst.current).bindPopup(selectedClient.business_name);
        detailMarkerInst.current.openPopup();
        
        setTimeout(() => mapInst.current?.invalidateSize(), 100);
      } else {
        mapInst.current.flyTo([selectedClient.lat, selectedClient.lng], mapInst.current.getZoom());
        if (detailMarkerInst.current) {
          detailMarkerInst.current.setLatLng([selectedClient.lat, selectedClient.lng]);
          detailMarkerInst.current.getPopup()?.setContent(selectedClient.business_name);
        }
      }
    }
    return () => {
      if (detailsTab !== 'mapa' || !selectedClient) {
        mapInst.current?.remove();
        mapInst.current = null;
        detailMarkerInst.current = null;
      }
    };
  }, [detailsTab, selectedClient]);

  const filtered = clients.filter(c =>
    c.business_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.contact_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      business_name: '', contact_name: '', phone: '', email: '', address: '', 
      city: 'Santa Cruz', lat: BOLIVIA_CITIES['Santa Cruz'].lat, lng: BOLIVIA_CITIES['Santa Cruz'].lng, geofence_radius: 50
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    setEditingId(client.id);
    setFormData({
      business_name: client.business_name,
      contact_name: client.contact_name || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      city: client.city || 'Santa Cruz',
      lat: client.lat,
      lng: client.lng,
      geofence_radius: client.geofence_radius
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCityChange = (newCity: string) => {
    const coords = BOLIVIA_CITIES[newCity];
    setFormData(prev => ({ ...prev, city: newCity, lat: coords.lat, lng: coords.lng }));
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('¿Estás seguro de que deseas eliminar este cliente?')) return;
    try {
      await clientService.remove(id);
      setClients(prev => prev.filter(c => c.id !== id));
      if (selectedClient?.id === id) setSelectedClient(null);
      toast.success('Cliente eliminado');
    } catch (err) {
      console.error('[wtracker] Error eliminando cliente:', err);
      toast.error('Error al eliminar el cliente. Intente de nuevo.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizeClient = (c: any): Client => ({
      ...c,
      lat: typeof c.lat === 'string' ? parseFloat(c.lat) : c.lat,
      lng: typeof c.lng === 'string' ? parseFloat(c.lng) : c.lng,
    });
    try {
      if (formData.phone && !isValidPhoneNumber(formData.phone)) {
        setFormErrors({ phone: ['El número de teléfono ingresado no es válido'] });
        toast.error('Por favor, ingresa un número de teléfono válido');
        return;
      }

      if (editingId) {
        const updated = await clientService.update(editingId, formData);
        const updatedClient = normalizeClient(updated ?? { ...clients.find(c => c.id === editingId)!, ...formData });
        setClients(prev => prev.map(c => c.id === editingId ? updatedClient : c));
        if (selectedClient?.id === editingId) setSelectedClient(updatedClient);
        toast.success('Cliente actualizado');
      } else {
        const created = await clientService.create(formData);
        const newClient: Client = normalizeClient(created ?? {
          id: Math.random().toString(36).substr(2, 9),
          ...formData,
          notes: null,
          is_active: true,
          created_at: new Date().toISOString()
        });
        setClients(prev => [newClient, ...prev]);
        toast.success('Cliente creado');
      }
      // Recargar desde la API para asegurar consistencia
      await loadClients();
    } catch (err) {
      console.error('[wtracker] Error guardando cliente:', err);
      toast.error('Error al guardar el cliente. Intente de nuevo.');
    }
    setIsModalOpen(false);
  };

  const handleRowClick = useCallback((client: Client) => {
    if (selectedClient?.id === client.id) {
      if (selectedTask) {
        handleSelectTask(null);
      } else {
        setDetailVisible(false);
        setTimeout(() => setSelectedClient(null), 450);
      }
    } else if (!selectedClient) {
      setSelectedClient(client);
      setTimeout(() => setDetailVisible(true), 20);
    } else {
      setDetailVisible(false);
      handleSelectTask(null);
      setTimeout(() => {
        setSelectedClient(client);
        setTimeout(() => setDetailVisible(true), 30);
      }, 280);
    }
  }, [selectedClient, selectedTask, handleSelectTask]);


  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Directorio de Clientes</h1>
          <p>Directorio master de puntos de venta y clientes</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} />
          Nuevo Cliente
        </button>
      </div>

      {/* Main grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedTask ? '60px 1.375fr 1fr' : selectedClient ? '1fr 1fr' : '1fr',
        gap: '1.5rem',
        alignItems: 'start',
        transition: 'grid-template-columns 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        

        {/* LEFT: Search + Table */}
        <div style={{ position: 'relative', height: 'calc(100vh - 140px)', minWidth: 0 }}>
          
          {/* Expanded State Content */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%',
            opacity: listCollapsed ? 0 : 1,
            pointerEvents: listCollapsed ? 'none' : 'auto',
            transition: 'opacity 0.25s ease',
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0
          }}>
            <div className="card" style={{ padding: '1rem 1.5rem', flexShrink: 0 }}>
              <div className="search-bar">
                <Search size={16} className="search-bar-icon" />
                <input
                  id="clients-search"
                  type="text"
                  className="form-input"
                  placeholder="Buscar por nombre de mercado o contacto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div className="table-wrapper" style={{ border: 'none', flex: 1, overflowY: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    {!listCollapsed && <th>Nombre del Mercado</th>}
                    {!listCollapsed && <th>Contacto</th>}
                    {!listCollapsed && <th>Acciones</th>}
                    {selectedClient && <th style={{ width: 32 }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {!listCollapsed && (
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <Skeleton width="70%" height="1rem" />
                              <Skeleton width="40%" height="0.8rem" />
                            </div>
                          </td>
                        )}
                        {!listCollapsed && (
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <Skeleton width="50%" height="1rem" />
                              <Skeleton width="30%" height="0.8rem" />
                            </div>
                          </td>
                        )}
                        {!listCollapsed && (
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <Skeleton width="32px" height="32px" />
                              <Skeleton width="32px" height="32px" />
                            </div>
                          </td>
                        )}
                        {selectedClient && <td></td>}
                      </tr>
                    ))
                  ) : filtered.length > 0 ? filtered.map((client) => {
                    const isActive = selectedClient?.id === client.id;
                    return (
                      <tr
                        key={client.id}
                        onClick={() => handleRowClick(client)}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: isActive ? 'var(--surface-hover)' : 'transparent',
                          borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                          transition: 'background-color 0.25s ease, border-color 0.25s ease',
                        }}
                      >
                        {!listCollapsed && (
                          <td>
                            <div style={{ fontWeight: isActive ? 600 : 500 }}>
                              {client.business_name}
                            </div>
                          </td>
                        )}
                        {!listCollapsed && (
                          <td style={{ color: 'var(--text-secondary)' }}>
                            {client.contact_name || '—'}
                          </td>
                        )}
                        {!listCollapsed && (
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                className="btn btn-ghost btn-sm btn-icon"
                                title="Editar"
                                onClick={(e) => handleOpenEdit(e, client)}
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                className="btn btn-ghost btn-sm btn-icon"
                                title="Eliminar"
                                style={{ color: 'var(--color-danger)' }}
                                onClick={(e) => handleDelete(e, client.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        )}
                        {selectedClient && (
                          <td style={{ textAlign: 'center', padding: listCollapsed ? '1rem 0' : '0 0.5rem' }}>
                            {isActive && (
                              <ChevronRight
                                size={listCollapsed ? 28 : 18}
                                style={{
                                  color: '#fff',
                                  opacity: detailVisible ? 1 : 0,
                                  transition: 'opacity 0.4s ease',
                                }}
                              />
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={selectedClient ? 4 : 3}>
                        <div className="empty-state" style={{ padding: '3rem 1rem' }}>
                          <Store size={48} className="empty-state-icon" />
                          <div className="empty-state-title">No se encontraron clientes</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

          {/* Collapsed State Content */}
          <div 
            className="card" 
            style={{ 
              height: '100%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              opacity: listCollapsed ? 1 : 0,
              pointerEvents: listCollapsed ? 'auto' : 'none',
              transition: 'opacity 0.25s ease, background-color 0.25s ease',
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0
            }}
            onClick={() => handleSelectTask(null)}
          >
            <ChevronRight size={28} style={{ color: '#fff' }} />
          </div>

        </div>

        {/* RIGHT: Client detail card */}
        {selectedClient && (
          <div
            className="card"
            style={{
              padding: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              height: 'calc(100vh - 140px)',
              position: 'sticky',
              top: '1.5rem',
              opacity: detailVisible ? 1 : 0,
              transform: detailVisible ? 'translateX(0)' : 'translateX(24px)',
              transition: 'opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div className="card-header" style={{ padding: '1.5rem 1.5rem 0', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="stat-icon-wrapper primary" style={{ width: 48, height: 48 }}>
                  <Store size={24} />
                </div>
                <div>
                  <div className="card-title" style={{ fontSize: '1.1rem' }}>{selectedClient.business_name}</div>
                  <div className="card-subtitle">{selectedClient.contact_name || 'Sin contacto asignado'}</div>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => { setDetailVisible(false); setTimeout(() => setSelectedClient(null), 450); }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="tab-group" style={{ display: 'flex', borderBottom: '1px solid var(--surface-border)', marginBottom: '1rem', padding: '0 1rem' }}>
              <button type="button" className={`tab-btn ${detailsTab === 'datos' ? 'active' : ''}`} onClick={() => setDetailsTab('datos')}>Datos</button>
              <button type="button" className={`tab-btn ${detailsTab === 'mapa' ? 'active' : ''}`} onClick={() => setDetailsTab('mapa')}>Mapa</button>
              <button type="button" className={`tab-btn ${detailsTab === 'tareas' ? 'active' : ''}`} onClick={() => setDetailsTab('tareas')}>Tareas</button>
            </div>

            <div style={{ padding: '0 1.5rem 1.5rem', flex: 1, overflowY: 'auto' }}>
              {detailsTab === 'datos' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {selectedClient.address && (
                    <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={18} style={{ color: 'var(--color-primary-400)' }} />
                      <span style={{ fontSize: '0.9rem' }}>{selectedClient.address} {selectedClient.city ? `(${selectedClient.city})` : ''}</span>
                    </div>
                  )}
                  {selectedClient.phone && (
                    <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--text-secondary)' }}>
                      <Phone size={18} style={{ color: 'var(--color-primary-400)' }} />
                      <span style={{ fontSize: '0.9rem' }}>{selectedClient.phone}</span>
                    </div>
                  )}
                  {selectedClient.email && (
                    <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--text-secondary)' }}>
                      <Mail size={18} style={{ color: 'var(--color-primary-400)' }} />
                      <span style={{ fontSize: '0.9rem' }}>{selectedClient.email}</span>
                    </div>
                  )}
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-border-subtle)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Registrado el {formatDate(selectedClient.created_at)}
                  </div>
                </div>
              )}
              {detailsTab === 'mapa' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
                    <span><strong>Latitud:</strong> {selectedClient.lat}</span>
                    <span><strong>Longitud:</strong> {selectedClient.lng}</span>
                  </div>
                  <div style={{ flex: 1, minHeight: '380px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--surface-border)' }}>
                    <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
                  </div>
                </div>
              )}
              {detailsTab === 'tareas' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                    <select 
                      className="form-select form-select-sm" 
                      value={taskStatusFilter}
                      onChange={e => setTaskStatusFilter(e.target.value)}
                      style={{ maxWidth: '150px' }}
                    >
                      <option value="">Todos los estados</option>
                      <option value="visitado">Visitado</option>
                      <option value="fallido">Fallido</option>
                      <option value="en_ruta">En Ruta</option>
                    </select>
                  </div>
                  <div className="table-wrapper" style={{ border: 'none', margin: 0 }}>
                    <table className="table" style={{ fontSize: '0.8rem' }}>
                      <thead><tr>
                        <th style={{ padding: '0.75rem 1rem', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>EJECUTOR</th>
                        <th style={{ padding: '0.75rem 1rem', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>ESTADO</th>
                        <th style={{ padding: '0.75rem 1rem', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>FECHA</th>
                        {selectedTask && <th style={{ width: 32 }}></th>}
                      </tr></thead>
                      <tbody>
                        {tasksLoading ? (
                          <tr><td colSpan={selectedTask ? 4 : 3} style={{ textAlign: 'center', padding: '2rem' }}>Cargando tareas...</td></tr>
                        ) : tasks.length > 0 ? tasks.map(task => {
                          const isTaskActive = selectedTask?.id === task.id;
                          const roleInfo = {
                            reponedor:  { label: 'Reponedor',  color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
                            vendedor:   { label: 'Vendedor',   color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
                            cobrador:   { label: 'Cobrador',   color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
                            repartidor: { label: 'Repartidor', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
                            supervisor: { label: 'Supervisor', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
                            admin:      { label: 'Admin',      color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
                          }[task.user_role?.toLowerCase()] || { label: task.user_role, color: 'var(--text-muted)', bg: 'var(--surface-hover)' };
                          
                          return (
                          <tr 
                            key={task.id}
                            onClick={() => handleSelectTask(task)}
                            style={{ cursor: 'pointer', background: isTaskActive ? 'var(--surface-hover)' : undefined }}
                          >
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                                <div className="avatar" style={{ width: 40, height: 40, fontSize: '0.85rem' }}>
                                  {(task.user_name || 'U').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                  <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                                    {task.user_name}
                                  </div>
                                  <span style={{ 
                                    display: 'inline-block',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    padding: '0.15rem 0.55rem',
                                    borderRadius: 'var(--radius-full)',
                                    color: roleInfo.color,
                                    backgroundColor: roleInfo.bg,
                                    border: `1px solid ${roleInfo.color}40`,
                                    whiteSpace: 'nowrap',
                                  }}>
                                    {roleInfo.label}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                backgroundColor: task.status === 'fallido' ? 'rgba(239, 68, 68, 0.15)' : 
                                                 task.status === 'visitado' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                color: task.status === 'fallido' ? '#ef4444' : 
                                       task.status === 'visitado' ? '#10b981' : '#3b82f6'
                              }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'currentColor' }} />
                                {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{formatDate(task.created_at)}</td>
                            {selectedTask && (
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                {isTaskActive && <ChevronRight size={20} style={{ color: '#fff' }} />}
                              </td>
                            )}
                          </tr>
                          );
                        }) : (
                          <tr><td colSpan={selectedTask ? 4 : 3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay tareas registradas</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {taskTotalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
                      <button className="btn btn-secondary btn-sm" disabled={taskPage <= 1} onClick={() => setTaskPage(p => p - 1)}>Anterior</button>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Página <strong style={{color: 'var(--text-primary)'}}>{taskPage}</strong> de {taskTotalPages}</span>
                      <button className="btn btn-secondary btn-sm" disabled={taskPage >= taskTotalPages} onClick={() => setTaskPage(p => p + 1)}>Siguiente</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      {/* TERCER PANEL: Detalle de la tarea (idéntico al modal de Monitoring) */}
      {selectedTask && (
        <div 
          className="card" 
          style={{ 
            padding: 0, 
            overflow: 'hidden', 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
            position: 'sticky',
            top: '1.5rem',
            opacity: taskDetailVisible ? 1 : 0,
            transform: taskDetailVisible ? 'translateX(0)' : 'translateX(24px)',
            transition: 'opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div className="card-header" style={{ padding: '1.5rem 1.5rem 0', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="stat-icon-wrapper primary" style={{ width: 48, height: 48 }}>
                <ClipboardList size={24} />
              </div>
              <div>
                <div className="card-title" style={{ fontSize: '1.1rem' }}>{selectedTask.client_name}</div>
                <div className="card-subtitle">{selectedTask.client_address || 'Sin dirección'}</div>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleSelectTask(null)}>
              <X size={18} />
            </button>
          </div>
          
          <div style={{ padding: '0 1.5rem 0.5rem' }}>
            {selectedTask.status === 'visitado' ? <span className="badge badge-success">Visitado</span> : 
             selectedTask.status === 'fallido'  ? <span className="badge badge-danger">Fallido</span> :
             <span className="badge badge-info">En Ruta</span>}
          </div>
          
          <div className="tab-group" style={{ display: 'flex', borderBottom: '1px solid var(--surface-border)', padding: '0 1rem', marginBottom: '1rem' }}>
            <button type="button" className={`tab-btn ${taskDetailTab === 'info' ? 'active' : ''}`} onClick={() => setTaskDetailTab('info')}>
              Información
            </button>
            <button type="button" className={`tab-btn ${taskDetailTab === 'evidence' ? 'active' : ''}`} onClick={() => setTaskDetailTab('evidence')}>
              Evidencias
            </button>
          </div>
          
          <div style={{ padding: '0 1.5rem 1.5rem', flex: 1, overflowY: 'auto' }}>
            {taskDetailTab === 'info' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--text-secondary)', alignItems: 'flex-start' }}>
                  <UserIcon size={18} style={{ color: 'var(--color-primary-400)', marginTop: '0.1rem', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Ejecutada por</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{selectedTask.user_name}</span>
                      {(() => {
                        const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
                          reponedor:  { label: 'Reponedor',  color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
                          vendedor:   { label: 'Vendedor',   color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
                          cobrador:   { label: 'Cobrador',   color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
                          repartidor: { label: 'Repartidor', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
                          supervisor: { label: 'Supervisor', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
                          admin:      { label: 'Admin',      color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
                        };
                        const roleInfo = ROLE_CONFIG[selectedTask.user_role?.toLowerCase()] ?? {
                          label: selectedTask.user_role || 'Ejecutor',
                          color: 'var(--text-muted)',
                          bg: 'var(--surface-hover)',
                        };
                        return (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              padding: '0.1rem 0.45rem',
                              borderRadius: 'var(--radius-full)',
                              color: roleInfo.color,
                              backgroundColor: roleInfo.bg,
                              border: `1px solid ${roleInfo.color}40`,
                            }}
                          >
                            {roleInfo.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--text-secondary)', alignItems: 'flex-start' }}>
                  <Calendar size={18} style={{ color: 'var(--color-primary-400)', marginTop: '0.1rem', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Fecha y hora de registro</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.9rem' }}>{formatDate(selectedTask.created_at)}</div>
                  </div>
                </div>
                
                <div style={{ background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', padding: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Notas</div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    {selectedTask.notes || 'Sin notas registradas'}
                  </div>
                </div>
              </div>
            )}
            
            {taskDetailTab === 'evidence' && (
              <div>
                {selectedTask.evidences && selectedTask.evidences.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {selectedTask.evidences.map((ev) => {
                      const evLat = ev.lat;
                      const evLng = ev.lng;
                      const cLat = selectedTask.client_lat;
                      const cLng = selectedTask.client_lng;
                      const dist = (evLat !== null && evLng !== null && cLat !== null && cLng !== null) 
                        ? getDistance(evLat, evLng, cLat, cLng) 
                        : null;
                      const maxDist = globalGeofenceRadius;
                      const isValid = dist !== null && dist <= maxDist;

                      return (
                        <div key={ev.id} style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--surface-border)', position: 'relative' }}>
                          <img 
                            src={getMediaUrl(ev.file_url)} 
                            alt="Evidencia" 
                            style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block', cursor: 'pointer' }} 
                            onClick={() => setFullScreenImage(getMediaUrl(ev.file_url))}
                          />
                          
                          <div style={{ position: 'absolute', top: 8, right: 8, background: isValid ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
                            <MapPin size={12} />
                            {isValid ? `Válido (<${maxDist}m)` : (dist ? `Inválido (${dist.toFixed(0)}m)` : 'Sin GPS')}
                          </div>

                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '6px 8px', fontSize: '0.65rem', display: 'flex', flexDirection: 'column', gap: '2px', backdropFilter: 'blur(2px)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontFamily: 'monospace', letterSpacing: '-0.5px' }}>
                                {ev.lat !== null && ev.lng !== null ? `${ev.lat.toFixed(6)}, ${ev.lng.toFixed(6)}` : 'GPS no disp.'}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Clock size={10} />
                                <span>{ev.captured_at ? new Date(ev.captured_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: '3rem 1rem' }}>
                    <FileImage size={48} className="empty-state-icon" />
                    <div className="empty-state-title">Sin evidencias</div>
                    <div className="empty-state-desc">Esta tarea no tiene evidencias adjuntas registradas.</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      </div>

      {/* Modal Nuevo/Editar Cliente */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div className="card-title">{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label required">Nombre del Mercado</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    required
                  />
                </div>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Nombre del Contacto</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.contact_name}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <div className={`form-input phone-input-container ${formErrors.phone || (formData.phone && !isValidPhoneNumber(formData.phone)) ? 'error' : ''}`}>
                      <PhoneInput
                        international
                        defaultCountry="BO"
                        value={formData.phone}
                        onChange={(val) => setFormData({ ...formData, phone: val || '' })}
                        placeholder="+591 71234567"
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                    {formErrors.phone && <div style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{formErrors.phone[0]}</div>}
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label required">Ciudad</label>
                    <select
                      className="form-select"
                      value={formData.city}
                      onChange={(e) => handleCityChange(e.target.value)}
                      required
                    >
                      {Object.keys(BOLIVIA_CITIES).map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dirección (Referencial)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label required">Latitud</label>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      value={formData.lat}
                      onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Longitud</label>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      value={formData.lng}
                      onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label required">Ubicación Geográfica (Mueve el pin en el mapa)</label>
                  <ModalMap 
                    lat={formData.lat} 
                    lng={formData.lng} 
                    onChange={(lat, lng) => setFormData(prev => ({ ...prev, lat, lng }))} 
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">{editingId ? 'Guardar Cambios' : 'Crear Cliente'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Modal Visor de Imagen */}
      {fullScreenImage && (
        <ImageModal
          imageUrl={fullScreenImage}
          onClose={() => setFullScreenImage(null)}
        />
      )}

    </div>
  );
};
