import { useEffect, useState, useCallback } from 'react';
import { Search, Filter, X, ChevronLeft, ChevronRight, HelpCircle, ClipboardList, User as UserIcon, Calendar, FileImage, Clock, Timer, Navigation, MapPin, RefreshCw } from 'lucide-react';
import { LiveMap } from '../../components/maps/LiveMap';
import { dashboardService } from '../../services/dashboard.service';
import { taskService } from '../../services/task.service';
import { getMediaUrl } from '../../utils/media';
import type { LiveMapUser, Visit } from '../../types';
import { Skeleton } from '../../components/ui/Skeleton';
import { ImageModal } from '../../components/ui/ImageModal';
import api from '../../services/api';

const STATUS_CONFIG: Record<string, { label: string; cls: string; color: string }> = {
  en_ruta:       { label: 'En Ruta',       cls: 'badge-warning', color: '#f59e0b' },
  visitado:      { label: 'Visitado',      cls: 'badge-success', color: '#10b981' },
  fallido:       { label: 'Fallido',       cls: 'badge-danger',  color: '#ef4444' },
  sin_actividad: { label: 'Sin Actividad', cls: 'badge-neutral', color: '#6b7280' },
  Activo:        { label: 'Activo',        cls: 'badge-info',    color: '#3b82f6' },
  Libre:         { label: 'Libre',         cls: 'badge-info',    color: '#3b82f6' },
};

const formatMinutes = (mins: number) => {
  if (!mins || mins <= 0) return '0 min';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs} hrs ${remMins} min` : `${hrs} hrs`;
};

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

const calculateStats = (tasks: Visit[]) => {
  if (!tasks || tasks.length === 0) return { distance: 0, timeInRoute: 0, timeInactive: 0, total: 0 };
  
  const chronTasks = [...tasks].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const firstTask = chronTasks[0];
  const lastTask = chronTasks[chronTasks.length - 1];
  
  const timeInRouteMs = new Date(lastTask.created_at).getTime() - new Date(firstTask.created_at).getTime();
  const timeInRouteMins = Math.floor(timeInRouteMs / 60000);
  
  let totalDistanceKm = 0;
  for (let i = 1; i < chronTasks.length; i++) {
    const prev = chronTasks[i-1];
    const curr = chronTasks[i];
    if (prev.visit_lat && prev.visit_lng && curr.visit_lat && curr.visit_lng) {
      const R = 6371; // km
      const dLat = (curr.visit_lat - prev.visit_lat) * Math.PI / 180;
      const dLon = (curr.visit_lng - prev.visit_lng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(prev.visit_lat * Math.PI / 180) * Math.cos(curr.visit_lat * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      totalDistanceKm += R * c;
    }
  }

  let timeInactiveMs = 0;
  for (let i = 1; i < chronTasks.length; i++) {
    const diff = new Date(chronTasks[i].created_at).getTime() - new Date(chronTasks[i-1].created_at).getTime();
    if (diff > 30 * 60000) {
      timeInactiveMs += (diff - (30 * 60000));
    }
  }
  const timeInactiveMins = Math.floor(timeInactiveMs / 60000);

  return {
    distance: totalDistanceKm.toFixed(1),
    timeInRoute: timeInRouteMins,
    timeInactive: timeInactiveMins,
    total: tasks.length
  };
};

export const MonitoringPage = () => {
  const [liveUsers, setLiveUsers]     = useState<LiveMapUser[]>([]);
  const [selected,  setSelected]      = useState<string | null>(null);
  const [listCollapsed, setListCollapsed] = useState(false);
  const [loading, setLoading]         = useState(true);

  // Detail panel animation state
  const [selectedUser, setSelectedUser]   = useState<LiveMapUser | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [userTasks, setUserTasks]         = useState<Visit[]>([]);
  const [loadingTasks, setLoadingTasks]   = useState(false);
  const [selectedTaskModal, setSelectedTaskModal] = useState<Visit | null>(null);
  const [taskDetailTab, setTaskDetailTab] = useState<'info' | 'evidence'>('info');
  const [taskDetailVisible, setTaskDetailVisible] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [globalGeofenceRadius, setGlobalGeofenceRadius] = useState<number>(100);

  useEffect(() => {
    api.get('/settings').then(res => {
      if (res.data?.data?.geofence_radius) {
        setGlobalGeofenceRadius(Number(res.data.data.geofence_radius));
      }
    }).catch(() => {});
  }, []);

  // Filtros
  const [roleFilter, setRoleFilter] = useState<string>('todos');
  const [nameFilter, setNameFilter] = useState<string>('');

  const [refreshing, setRefreshing]   = useState(false);

  const fetchUserTasks = useCallback(async (userId: string) => {
    setLoadingTasks(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await taskService.list({
        user_id: userId,
        date_from: today.toISOString(),
        date_to: tomorrow.toISOString(),
      });
      setUserTasks(res.data || []);
    } catch (err) {
      console.error('[Monitoring] Error fetching user tasks:', err);
      setUserTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const fetchLiveData = async () => {
    setRefreshing(true);
    try {
      const data = await dashboardService.getLiveMap();
      const normalized = (data || []).map((u: any) => ({
        ...u,
        lat: typeof u.lat === 'string' ? parseFloat(u.lat) : u.lat,
        lng: typeof u.lng === 'string' ? parseFloat(u.lng) : u.lng,
      }));
      setLiveUsers(normalized);
      
      // Forzar recarga de las tareas del usuario activo si existe
      setSelected((currentSelected) => {
        if (currentSelected) {
          fetchUserTasks(currentSelected);
        }
        return currentSelected;
      });
    } catch (err) {
      console.error('[Monitoring] Error fetching live map data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
    
    const token = localStorage.getItem('wt_access_token') || '';
    const sseUrl = `${import.meta.env.VITE_API_URL || '/api/v1'}/dashboard/map/stream?token=${token}`;
    const sse = new EventSource(sseUrl);

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const normalized = (data || []).map((u: any) => ({
          ...u,
          lat: typeof u.lat === 'string' ? parseFloat(u.lat) : u.lat,
          lng: typeof u.lng === 'string' ? parseFloat(u.lng) : u.lng,
        }));
        setLiveUsers(normalized);
      } catch (err) {
        console.error('[Monitoring] Error parsing SSE data:', err);
      }
    };

    return () => {
      sse.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mantener sincronizado el selectedUser con la información en vivo (desde SSE o fetchLiveData)
  useEffect(() => {
    if (selected) {
      const updatedUser = liveUsers.find(u => u.user_id === selected);
      if (updatedUser && JSON.stringify(updatedUser) !== JSON.stringify(selectedUser)) {
        setSelectedUser(updatedUser);
      }
    }
  }, [liveUsers, selected, selectedUser]);

  const filteredUsers = liveUsers.filter(u => {
    const matchesRole = roleFilter === 'todos' || u.role.toLowerCase() === roleFilter.toLowerCase();
    const matchesName = u.full_name.toLowerCase().includes(nameFilter.toLowerCase()) ||
                        (u.client_name || '').toLowerCase().includes(nameFilter.toLowerCase());
    return matchesRole && matchesName;
  });

  // Fetch tasks inicial al cambiar la selección de usuario
  useEffect(() => {
    if (!selected) {
      setUserTasks([]);
      return;
    }
    fetchUserTasks(selected);
  }, [selected, fetchUserTasks]);

  // Animated selection logic (same pattern as TasksPage)
  const handleSelectUser = useCallback((userId: string | null) => {
    if (!userId) {
      // Deselect: fade out then remove
      setDetailVisible(false);
      setTaskDetailVisible(false);
      setTimeout(() => { 
        setSelected(null); 
        setSelectedUser(null); 
        setSelectedTaskModal(null);
      }, 450);
      return;
    }

    const user = liveUsers.find(u => u.user_id === userId) ?? null;

    if (!selectedUser) {
      // First selection: set and fade in
      setSelected(userId);
      setSelectedUser(user);
      setTimeout(() => setDetailVisible(true), 20);
    } else if (userId === selected) {
      // Same user → deselect
      setDetailVisible(false);
      setTaskDetailVisible(false);
      setTimeout(() => { 
        setSelected(null); 
        setSelectedUser(null); 
        setSelectedTaskModal(null);
      }, 450);
    } else {
      // Switch user: fade out, swap, fade in
      setDetailVisible(false);
      setTaskDetailVisible(false);
      setTimeout(() => {
        setSelected(userId);
        setSelectedUser(user);
        setSelectedTaskModal(null);
        setTimeout(() => setDetailVisible(true), 30);
      }, 280);
    }
  }, [liveUsers, selected, selectedUser]);

  const handleSelectTask = useCallback((task: Visit | null) => {
    if (!task) {
      setTaskDetailVisible(false);
      setTimeout(() => setSelectedTaskModal(null), 450);
      return;
    }

    if (!selectedTaskModal) {
      setSelectedTaskModal(task);
      setTimeout(() => setTaskDetailVisible(true), 20);
    } else if (task.id === selectedTaskModal.id) {
      setTaskDetailVisible(false);
      setTimeout(() => setSelectedTaskModal(null), 450);
    } else {
      setTaskDetailVisible(false);
      setTimeout(() => {
        setSelectedTaskModal(task);
        setTimeout(() => setTaskDetailVisible(true), 30);
      }, 280);
    }
  }, [selectedTaskModal]);

  // Compute grid columns: Personnel | [Detail] | [Task] | Map
  const gridCols = (() => {
    if (selectedUser && selectedTaskModal) {
      return listCollapsed ? '60px 250px 1.8fr 0.2fr' : '1fr 1fr 1.8fr 0.2fr';
    }
    if (selectedUser) {
      return listCollapsed ? '60px 300px 1fr' : '1fr 1fr 2fr';
    }
    return listCollapsed ? '60px 1fr' : '1fr 3fr';
  })();

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Monitoreo en Tiempo Real</h1>
          <p>Supervisión en vivo de los usuarios móviles</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={fetchLiveData}
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
            title="Actualizar datos del mapa"
          >
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            Actualizar
          </button>
          <div className="live-dot">EN VIVO</div>
        </div>
      </div>

      {/* Grid: Personal | Mapa | Detalle */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: gridCols,
          gap: '1rem',
          alignItems: 'start',
          transition: 'grid-template-columns 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >

        {/* PANEL IZQUIERDO: Personal en Campo */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
          <div style={{ 
            padding: listCollapsed ? 0 : '1.25rem 1.25rem 0.75rem', 
            borderBottom: listCollapsed ? 'none' : '1px solid var(--surface-border)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: listCollapsed ? 'center' : 'space-between',
            height: listCollapsed ? '100%' : 'auto',
            flex: listCollapsed ? 1 : 'none'
          }}>
            {!listCollapsed && (
              <div>
                <div className="card-title">Personal en Campo</div>
                <div className="card-subtitle">{filteredUsers.length} de {liveUsers.length} activos</div>
              </div>
            )}
            <button
              className={listCollapsed ? "" : "btn-icon"}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: 'var(--text-secondary)', 
                cursor: 'pointer',
                ...(listCollapsed ? { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' } : {})
              }}
              onClick={() => {
                if (!listCollapsed) {
                  handleSelectUser(null);
                }
                setListCollapsed(!listCollapsed);
              }}
            >
              {listCollapsed ? <ChevronRight size={48} /> : <ChevronLeft size={20} />}
            </button>
          </div>

          {!listCollapsed && (
            <>
              {/* Filtros */}
              <div style={{ padding: '0 1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Filter size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <select
                      className="form-select"
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                    >
                      <option value="todos">Todos los roles</option>
                      <option value="reponedor">Reponedor</option>
                      <option value="vendedor">Vendedor</option>
                      <option value="cobrador">Cobrador</option>
                    </select>
                  </div>
                  <div className="search-bar" style={{ marginBottom: '0.5rem' }}>
                    <Search size={14} className="search-bar-icon" />
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem 0.35rem 2.2rem' }}
                      placeholder="Buscar por nombre..."
                      value={nameFilter}
                      onChange={(e) => setNameFilter(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* User list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} style={{ padding: '0.85rem', display: 'flex', gap: '1rem', borderBottom: '1px solid var(--surface-border-subtle)' }}>
                      <Skeleton width="32px" height="32px" borderRadius="var(--radius-full)" />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <Skeleton width="70%" height="0.8rem" />
                        <Skeleton width="40%" height="0.6rem" />
                      </div>
                    </div>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                    <div className="empty-state-title" style={{ fontSize: '0.9rem' }}>No hay personal coincidente</div>
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isActive = u.user_id === selected;
                    const sc = STATUS_CONFIG[u.status] ?? { label: u.status, cls: 'badge-neutral' };
                    return (
                      <div
                        key={u.user_id}
                        onClick={() => handleSelectUser(u.user_id)}
                        style={{
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          marginBottom: '0.5rem',
                          background: isActive ? 'var(--surface-hover)' : 'transparent',
                          border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--surface-border)'}`,
                          transition: 'background 0.25s ease, border-color 0.25s ease',
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        {/* Card content */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flex: 1, minWidth: 0 }}>
                              <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.72rem', flexShrink: 0 }}>
                                {u.full_name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{u.full_name}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{u.role}</div>
                              </div>
                            </div>
                            <span className={`badge ${sc.cls}`} style={{ fontSize: '0.68rem', flexShrink: 0 }}>{sc.label}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '2.4rem' }}>
                            📍 {u.client_name || 'Sin ubicación reciente'}
                          </div>
                        </div>

                        {/* Arrow — vertically centered to the whole card height */}
                        <div style={{ flexShrink: 0, width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isActive && (
                            <ChevronRight
                              size={20}
                              style={{
                                color: '#fff',
                                opacity: detailVisible ? 1 : 0,
                                transition: 'opacity 0.4s ease',
                              }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* CENTRO: Detalle del usuario (entre la lista y el mapa) */}
        {selectedUser && (
          <div
            className="card"
            style={{
              height: 'calc(100vh - 140px)',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              position: 'relative',
              zIndex: 2000,
              opacity: detailVisible ? 1 : 0,
              transform: detailVisible ? 'translateX(0)' : 'translateX(-24px)',
              transition: 'opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '1rem' }}>
              <div style={{ flex: 1, marginRight: '1rem', display: 'flex', gap: '0.85rem' }}>
                <div className="avatar" style={{ width: 42, height: 42, fontSize: '0.9rem', flexShrink: 0 }}>
                  {selectedUser.full_name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{selectedUser.full_name}</span>
                    <span className={`badge ${STATUS_CONFIG[selectedUser.status]?.cls ?? 'badge-neutral'}`} style={{ padding: '0.1rem 0.4rem', fontSize: '0.65rem' }}>
                      {STATUS_CONFIG[selectedUser.status]?.label ?? selectedUser.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <span style={{ textTransform: 'capitalize' }}>{selectedUser.role}</span>
                    <span>•</span>
                    <span>📍 {selectedUser.client_name}</span>
                  </div>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => handleSelectUser(null)}
              >
                <X size={16} />
              </button>
            </div>
            
            {/* Última Actividad (Moved to header area) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--surface-border)' }}>
              <div className="form-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                Última Actividad
                <span className="tooltip-container" style={{ display: 'flex' }}>
                  <HelpCircle size={14} color="var(--text-muted)" />
                  <div className="tooltip-text">Hora de la última actualización GPS o tarea.</div>
                </span>
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                {selectedUser.last_activity ? new Date(selectedUser.last_activity).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—'}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem', overflow: 'visible', flex: 1, minHeight: 0 }}>

              {/* Estadísticas Calculadas */}
              {(() => {
                const stats = calculateStats(userTasks);
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                        <Navigation size={14} color="#3b82f6" /> Distancia
                        <span className="tooltip-container" style={{ display: 'flex', marginLeft: 'auto' }}>
                          <HelpCircle size={14} color="var(--text-muted)" />
                          <div className="tooltip-text">Distancia total estimada recorrida hoy. Se calcula sumando las separaciones en línea recta entre las ubicaciones de las tareas consecutivas registradas en el sistema</div>
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{stats.distance} km</div>
                    </div>
                    <div style={{ background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                        <Clock size={14} color="#f59e0b" /> Tiempo ruta
                        <span className="tooltip-container tooltip-right" style={{ display: 'flex', marginLeft: 'auto' }}>
                          <HelpCircle size={14} color="var(--text-muted)" />
                          <div className="tooltip-text">Tiempo total transcurrido desde el registro de la primera tarea del día hasta la más reciente</div>
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{formatMinutes(stats.timeInRoute)}</div>
                    </div>
                    <div style={{ background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                        <Timer size={14} color="#ef4444" /> Inactividad
                        <span className="tooltip-container" style={{ display: 'flex', marginLeft: 'auto' }}>
                          <HelpCircle size={14} color="var(--text-muted)" />
                          <div className="tooltip-text">Tiempo transcurrido desde el último registro de tarea hasta la hora actual (solo aplicable si el día de trabajo no ha finalizado).</div>
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{formatMinutes(stats.timeInactive)}</div>
                    </div>
                    <div style={{ background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                        <ClipboardList size={14} color="#10b981" /> Tareas hoy
                        <span className="tooltip-container tooltip-right" style={{ display: 'flex', marginLeft: 'auto' }}>
                          <HelpCircle size={14} color="var(--text-muted)" />
                          <div className="tooltip-text">Cantidad total de tareas registradas durante la jornada de hoy.</div>
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{stats.total}</div>
                    </div>
                  </div>
                );
              })()}

              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <div className="form-label" style={{ marginBottom: '0.75rem', flexShrink: 0 }}>Registro de hoy</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1, paddingRight: '4px', paddingBottom: '0.5rem' }}>
                  {loadingTasks ? (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }}>
                      Cargando registro...
                    </div>
                  ) : userTasks.length === 0 ? (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }}>
                      Aún no hay tareas registradas hoy.
                    </div>
                  ) : (
                    userTasks.map((t) => {
                      const color = STATUS_CONFIG[t.status]?.color || 'var(--text-muted)';
                      const timeString = new Date(t.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
                      const isActive = selectedTaskModal?.id === t.id;
                      
                      return (
                        <div 
                          key={t.id} 
                          onClick={() => handleSelectTask(isActive ? null : t)} 
                          style={{ 
                            padding: '0.75rem', 
                            borderRadius: 'var(--radius-md)', 
                            background: isActive ? 'var(--surface-border)' : 'var(--surface-hover)', 
                            borderLeft: `3px solid ${color}`, 
                            cursor: 'pointer', 
                            transition: 'background 0.2s',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }} 
                          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface-border)' }} 
                          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface-hover)' }}
                        >
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{timeString}</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{t.client_name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                              {STATUS_CONFIG[t.status]?.label ?? t.status}
                            </div>
                          </div>
                          {isActive && <ChevronRight size={20} style={{ color: '#fff' }} />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PANEL DETALLE TAREA (Ocupa el 45% cuando se abre) */}
        {selectedTaskModal && (
          <div 
            className="card" 
            style={{ 
              padding: 0, 
              overflow: 'hidden', 
              display: 'flex', 
              flexDirection: 'column', 
              height: 'calc(100vh - 140px)',
              position: 'relative',
              zIndex: 2000,
              opacity: taskDetailVisible ? 1 : 0,
              transform: taskDetailVisible ? 'translateX(0)' : 'translateX(-24px)',
              transition: 'opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div className="card-header" style={{ padding: '1.5rem 1.5rem 0', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="stat-icon-wrapper primary" style={{ width: 48, height: 48 }}>
                  <ClipboardList size={24} />
                </div>
                <div>
                  <div className="card-title" style={{ fontSize: '1.1rem' }}>{selectedTaskModal.client_name}</div>
                  <div className="card-subtitle">{selectedTaskModal.client_address || 'Sin dirección'}</div>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleSelectTask(null)}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: '0 1.5rem 0.5rem' }}>
              <span className={`badge ${STATUS_CONFIG[selectedTaskModal.status]?.cls || 'badge-neutral'}`}>
                {STATUS_CONFIG[selectedTaskModal.status]?.label || selectedTaskModal.status}
              </span>
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
                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{selectedTaskModal.user_name}</span>
                        {(() => {
                          const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
                            reponedor:  { label: 'Reponedor',  color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
                            vendedor:   { label: 'Vendedor',   color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
                            cobrador:   { label: 'Cobrador',   color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
                            repartidor: { label: 'Repartidor', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
                            supervisor: { label: 'Supervisor', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
                            admin:      { label: 'Admin',      color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
                          };
                          const roleInfo = ROLE_CONFIG[selectedTaskModal.user_role?.toLowerCase()] ?? {
                            label: selectedTaskModal.user_role || 'Ejecutor',
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
                      <span style={{ fontSize: '0.9rem' }}>
                        {new Date(selectedTaskModal.created_at).toLocaleString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  {selectedTaskModal.notes && (
                    <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)', marginTop: '0.5rem' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Notas</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{selectedTaskModal.notes}</div>
                    </div>
                  )}
                </div>
              )}
              {taskDetailTab === 'evidence' && (
                <div>
                  {selectedTaskModal.evidences && selectedTaskModal.evidences.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {selectedTaskModal.evidences.map((ev) => {
                        const evLat = ev.lat;
                        const evLng = ev.lng;
                        const cLat = selectedTaskModal.client_lat;
                        const cLng = selectedTaskModal.client_lng;
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

        {/* DERECHA: Mapa en Tiempo Real */}
        <div 
          className="card" 
          style={{ 
            padding: 0, 
            overflow: 'hidden', 
            cursor: (selectedUser && selectedTaskModal) ? 'pointer' : 'default', 
            transition: 'all 0.3s',
            position: 'relative'
          }}
          onClick={() => {
            if (selectedUser && selectedTaskModal) {
              handleSelectTask(null);
            }
          }}
        >
          {selectedUser && selectedTaskModal && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, width: '100%', height: '100%',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <ChevronLeft size={48} style={{ color: 'var(--text-primary)', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }} />
            </div>
          )}
          <div style={{ pointerEvents: (selectedUser && selectedTaskModal) ? 'none' : 'auto', height: '100%', opacity: (selectedUser && selectedTaskModal) ? 0.6 : 1 }}>
            <LiveMap 
              users={filteredUsers} 
              selectedUserId={selectedUser?.user_id} 
              isCompressed={!!(selectedUser && selectedTaskModal)}
              height="calc(100vh - 140px)" 
            />
          </div>
        </div>

      </div>

      {fullScreenImage && (
        <ImageModal 
          imageUrl={fullScreenImage} 
          onClose={() => setFullScreenImage(null)} 
        />
      )}

    </div>
  );
};
