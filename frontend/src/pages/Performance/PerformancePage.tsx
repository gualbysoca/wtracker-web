// src/pages/Performance/PerformancePage.tsx

import { useEffect, useState, useCallback } from 'react';
import { 
  Search, Smartphone, X, TrendingUp, CheckCircle, XCircle, 
  Clock, Navigation, ChevronRight, Calendar, HelpCircle, 
  ClipboardList, Timer, User as UserIcon, FileImage, MapPin, Coffee
} from 'lucide-react';
import { userService } from '../../services/user.service';
import { taskService } from '../../services/task.service';
import type { User, UserRole, UserPerformance, Visit } from '../../types';
import toast from 'react-hot-toast';
import { Skeleton } from '../../components/ui/Skeleton';
import { ImageModal } from '../../components/ui/ImageModal';
import { getMediaUrl } from '../../utils/media';
import api from '../../services/api';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador', supervisor: 'Supervisor',
  reponedor: 'Reponedor', vendedor: 'Vendedor', cobrador: 'Cobrador', repartidor: 'Repartidor'
};

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  reponedor:  { label: 'Reponedor',  color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  vendedor:   { label: 'Vendedor',   color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  cobrador:   { label: 'Cobrador',   color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  repartidor: { label: 'Repartidor', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  supervisor: { label: 'Supervisor', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
  admin:      { label: 'Admin',      color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
};

const STATUS_CONFIG: Record<string, { label: string; cls: string; color: string }> = {
  en_ruta:  { label: 'En Ruta',  cls: 'badge-warning', color: '#f59e0b' },
  visitado: { label: 'Visitado', cls: 'badge-success', color: '#10b981' },
  fallido:  { label: 'Fallido',  cls: 'badge-danger',  color: '#ef4444' },
};

const MOBILE_ROLES = ['reponedor', 'vendedor', 'cobrador', 'repartidor'];

const getTodayStr = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const formatMinutes = (mins: number | null | undefined) => {
  if (mins === null || mins === undefined) return '—';
  if (mins <= 0) return '0 min';
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
  if (!tasks || tasks.length === 0) return { distance: '0.0', timeInRoute: 0, timeInactive: 0, total: 0 };
  
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

export const PerformancePage = () => {
  const [users, setTasks] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [performanceData, setPerformanceData] = useState<UserPerformance | null>(null);
  const [loadingPerf, setLoadingPerf] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);

  // Tabs y Filtro Histórico
  const [activeTab, setActiveTab]       = useState<'kpis' | 'historico'>('kpis');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [userTasks, setUserTasks]       = useState<Visit[]>([]);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(false);

  // Tarea Seleccionada y Evidencias
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

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userService.list({ limit: 100, include_inactive: true });
      const mobileOnly = res.data.filter(u => MOBILE_ROLES.includes(u.role));
      setTasks(mobileOnly);
    } catch {
      toast.error('Error al cargar personal móvil');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const filteredUsers = users.filter(user => {
    return user.full_name.toLowerCase().includes(search.toLowerCase()) || user.email.toLowerCase().includes(search.toLowerCase());
  });

  const fetchUserTasksForDate = useCallback(async (userId: string, dateStr: string) => {
    setLoadingTasks(true);
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const from = new Date(year, month - 1, day, 0, 0, 0, 0);
      const to   = new Date(year, month - 1, day, 23, 59, 59, 999);
      const res  = await taskService.list({
        user_id: userId,
        date_from: from.toISOString(),
        date_to: to.toISOString(),
      });
      setUserTasks(res.data || []);
    } catch (err) {
      console.error('Error al cargar tareas históricas:', err);
      setUserTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    if (selectedUser && activeTab === 'historico') {
      fetchUserTasksForDate(selectedUser.id, selectedDate);
    }
  }, [selectedUser, selectedDate, activeTab, fetchUserTasksForDate]);

  const handleRowClick = async (user: User) => {
    if (selectedUser?.id === user.id) {
      setDetailVisible(false);
      setTaskDetailVisible(false);
      setTimeout(() => {
        setSelectedUser(null);
        setSelectedTaskModal(null);
      }, 450);
      return;
    }

    if (!selectedUser) {
      setSelectedUser(user);
      setSelectedTaskModal(null);
      setTaskDetailVisible(false);
      setTimeout(() => setDetailVisible(true), 20);
    } else {
      setDetailVisible(false);
      setTaskDetailVisible(false);
      setTimeout(() => {
        setSelectedUser(user);
        setSelectedTaskModal(null);
        setTimeout(() => setDetailVisible(true), 30);
      }, 280);
    }

    setLoadingPerf(true);
    setPerformanceData(null);
    try {
      const perf = await userService.getPerformance(user.id);
      setPerformanceData(perf);
    } catch {
      toast.error('Error al cargar desempeño del usuario');
    } finally {
      setLoadingPerf(false);
    }
  };

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

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Desempeño</h1>
          <p>Métricas y KPIs del personal móvil en terreno</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
            <Search size={16} className="search-bar-icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Buscar personal por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Grid Layout (smoothly contracts left table) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: (selectedUser && selectedTaskModal)
            ? '22fr 38fr 40fr'
            : selectedUser
            ? '4fr 6fr'
            : '1fr',
          gap: '1rem',
          alignItems: 'start',
          transition: 'grid-template-columns 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* TABLE (left panel, smoothly contracts) */}
        <div
          style={{
            minWidth: 0,
            height: 'calc(100vh - 240px)',
          }}
        >
          <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="table-wrapper" style={{ border: 'none', flex: 1, overflowY: 'auto' }}>
              <table className="table" style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    {(!selectedTaskModal || !selectedUser) && <th>Estado</th>}
                    {selectedUser && <th style={{ width: 32 }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <Skeleton width="60%" height="1rem" />
                            <Skeleton width="40%" height="0.8rem" />
                          </div>
                        </td>
                        {(!selectedTaskModal || !selectedUser) && <td><Skeleton width="60px" /></td>}
                        {selectedUser && <td></td>}
                      </tr>
                    ))
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={selectedUser ? (selectedTaskModal ? 2 : 3) : 2}>
                        <div className="empty-state">
                          <Smartphone size={48} className="empty-state-icon" />
                          <div className="empty-state-title">No hay personal móvil</div>
                          <div className="empty-state-desc">No se encontraron usuarios en esta sección</div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.map((user) => {
                    const isActive = selectedUser?.id === user.id;
                    const roleInfo = ROLE_CONFIG[user.role?.toLowerCase()] ?? {
                      label: ROLE_LABELS[user.role] || user.role,
                      color: 'var(--text-muted)',
                      bg: 'var(--surface-hover)',
                    };
                    return (
                      <tr
                        key={user.id}
                        onClick={() => handleRowClick(user)}
                        style={{ cursor: 'pointer', background: isActive ? 'var(--surface-hover)' : undefined }}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div className="avatar" style={{ width: 40, height: 40, fontSize: '0.85rem' }}>
                              {user.full_name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                            </div>
                            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              <div style={{ fontWeight: isActive ? 600 : 500, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name}</div>
                              <div>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    fontSize: '0.73rem',
                                    fontWeight: 500,
                                    padding: '0.1rem 0.6rem',
                                    borderRadius: 'var(--radius-full)',
                                    color: roleInfo.color,
                                    backgroundColor: roleInfo.bg,
                                    border: `1px solid ${roleInfo.color}40`,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {roleInfo.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        {(!selectedTaskModal || !selectedUser) && (
                          <td>
                            <span className={`badge ${user.is_active ? 'badge-success' : 'badge-neutral'}`}>
                              {user.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                        )}
                        {selectedUser && (
                          <td>
                            {isActive && <ChevronRight size={20} style={{ color: '#fff' }} />}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* DETAIL PANEL (middle panel) */}
        {selectedUser && (
          <div
            className="card"
            style={{
              padding: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              height: 'calc(100vh - 240px)',
              position: 'sticky',
              top: '1.5rem',
              opacity: detailVisible ? 1 : 0,
              transform: detailVisible ? 'translateX(0)' : 'translateX(24px)',
              transition: 'flex 0.45s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* Header */}
            <div className="card-header" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--surface-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="avatar" style={{ width: 44, height: 44, fontSize: '1.1rem', background: 'var(--color-primary-400)', color: '#000' }}>
                  {selectedUser.full_name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="card-title" style={{ fontSize: '1.1rem' }}>{selectedUser.full_name}</div>
                  <div className="card-subtitle">{ROLE_LABELS[selectedUser.role]} • {selectedUser.phone || 'Sin teléfono'}</div>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => {
                  setDetailVisible(false);
                  setTaskDetailVisible(false);
                  setTimeout(() => {
                    setSelectedUser(null);
                    setSelectedTaskModal(null);
                  }, 450);
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="tab-group" style={{ display: 'flex', borderBottom: '1px solid var(--surface-border)', padding: '0 1.5rem' }}>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'kpis' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('kpis');
                  handleSelectTask(null);
                }}
                style={{ fontSize: '0.85rem', padding: '0.65rem 1rem' }}
              >
                KPIs General
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'historico' ? 'active' : ''}`}
                onClick={() => setActiveTab('historico')}
                style={{ fontSize: '0.85rem', padding: '0.65rem 1rem' }}
              >
                Histórico Diario
              </button>
            </div>

            {/* Tab Body */}
            <div style={{ padding: '1.25rem 1.5rem', flex: 1, overflowY: 'auto' }}>
              {activeTab === 'kpis' ? (
                loadingPerf ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <Skeleton width="100%" height="80px" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <Skeleton height="100px" />
                      <Skeleton height="100px" />
                      <Skeleton height="100px" />
                      <Skeleton height="100px" />
                    </div>
                  </div>
                ) : performanceData ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Success Rate */}
                    <div style={{ background: 'var(--surface-hover)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Tasa de Éxito Acumulada</div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {performanceData.success_rate !== null ? `${performanceData.success_rate}%` : 'N/A'}
                          {performanceData.success_rate !== null && (
                            <TrendingUp size={24} style={{ color: Number(performanceData.success_rate) >= 80 ? 'var(--color-success)' : 'var(--color-warning)' }} />
                          )}
                        </div>
                      </div>
                      <div style={{ padding: '1rem', background: 'var(--surface-dark)', borderRadius: '50%' }}>
                        <TrendingUp size={32} style={{ color: 'var(--color-primary-400)' }} />
                      </div>
                    </div>

                    {/* Grid KPIs */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                          <CheckCircle size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.85rem' }}>Promedio de tareas exitosas / día</span>
                          <span className="tooltip-container" style={{ display: 'flex', marginLeft: 'auto' }}>
                            <HelpCircle size={14} color="var(--text-muted)" />
                            <div className="tooltip-text">Promedio diario de tareas marcadas como visitadas exitosamente.</div>
                          </span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{performanceData.avg_visited_per_day ?? 0}</div>
                      </div>
                      
                      <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                          <XCircle size={16} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.85rem' }}>Promedio de tareas fallidas / día</span>
                          <span className="tooltip-container tooltip-right" style={{ display: 'flex', marginLeft: 'auto' }}>
                            <HelpCircle size={14} color="var(--text-muted)" />
                            <div className="tooltip-text">Promedio diario de tareas marcadas como fallidas o no concretadas.</div>
                          </span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{performanceData.avg_failed_per_day ?? 0}</div>
                      </div>

                      <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                          <Navigation size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.85rem' }}>Promedio de distancia recorrida / día</span>
                          <span className="tooltip-container" style={{ display: 'flex', marginLeft: 'auto' }}>
                            <HelpCircle size={14} color="var(--text-muted)" />
                            <div className="tooltip-text">Promedio de los kilómetros recorridos diariamente por este usuario.</div>
                          </span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{performanceData.avg_distance_per_day ?? 0} km</div>
                      </div>

                      <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                          <ClipboardList size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.85rem' }}>Promedio de tareas realizadas / día</span>
                          <span className="tooltip-container tooltip-right" style={{ display: 'flex', marginLeft: 'auto' }}>
                            <HelpCircle size={14} color="var(--text-muted)" />
                            <div className="tooltip-text">Cantidad promedio de tareas ejecutadas (tanto exitosas como fallidas) por día laborado.</div>
                          </span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{performanceData.avg_tasks_per_day ?? 0}</div>
                      </div>

                      <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                          <Clock size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.85rem' }}>T. Medio por Tarea</span>
                          <span className="tooltip-container" style={{ display: 'flex', marginLeft: 'auto' }}>
                            <HelpCircle size={14} color="var(--text-muted)" />
                            <div className="tooltip-text">Tiempo promedio de duración por cada tarea registrada.</div>
                          </span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                          {formatMinutes(performanceData.avg_visit_duration_minutes)}
                        </div>
                      </div>

                      <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                          <Coffee size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.85rem' }}>Promedio de inactividad / día</span>
                          <span className="tooltip-container tooltip-right" style={{ display: 'flex', marginLeft: 'auto' }}>
                            <HelpCircle size={14} color="var(--text-muted)" />
                            <div className="tooltip-text">Promedio de tiempo acumulado sin actividad registrada por día laborado.</div>
                          </span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                          {formatMinutes(performanceData.avg_downtime_minutes)}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No se pudo cargar la información.
                  </div>
                )
              ) : (
                /* TAB HISTÓRICO DIARIO */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Selector de fecha */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-hover)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <Calendar size={16} style={{ color: 'var(--color-primary-400)' }} />
                      <span style={{ fontWeight: 500 }}>Fecha Cierre:</span>
                    </div>
                    <input
                      type="date"
                      className="form-input"
                      style={{ width: 'auto', fontSize: '0.85rem', padding: '0.3rem 0.6rem' }}
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        handleSelectTask(null);
                      }}
                    />
                  </div>

                  {loadingTasks ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <Skeleton width="100%" height="40px" />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <Skeleton height="80px" />
                        <Skeleton height="80px" />
                        <Skeleton height="80px" />
                        <Skeleton height="80px" />
                      </div>
                      <Skeleton height="150px" />
                    </div>
                  ) : (
                    <>
                      {/* Última Actividad del día */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--surface-border)' }}>
                        <div className="form-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                          Última Actividad
                          <span className="tooltip-container" style={{ display: 'flex' }}>
                            <HelpCircle size={14} color="var(--text-muted)" />
                            <div className="tooltip-text">Hora del último registro o tarea efectuada en la fecha seleccionada.</div>
                          </span>
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                          {userTasks.length > 0
                            ? new Date([...userTasks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </div>
                      </div>

                      {/* Grid KPIs del día seleccionado */}
                      {(() => {
                        const stats = calculateStats(userTasks);
                        return (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div style={{ background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-border-subtle)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                <Navigation size={14} color="#3b82f6" /> Distancia
                                <span className="tooltip-container" style={{ display: 'flex', marginLeft: 'auto' }}>
                                  <HelpCircle size={14} color="var(--text-muted)" />
                                  <div className="tooltip-text">Distancia estimada recorrida en esta fecha.</div>
                                </span>
                              </div>
                              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{stats.distance} km</div>
                            </div>
                            
                            <div style={{ background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-border-subtle)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                <Clock size={14} color="#f59e0b" /> Tiempo ruta
                                <span className="tooltip-container tooltip-right" style={{ display: 'flex', marginLeft: 'auto' }}>
                                  <HelpCircle size={14} color="var(--text-muted)" />
                                  <div className="tooltip-text">Tiempo total en ruta durante esta fecha.</div>
                                </span>
                              </div>
                              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{formatMinutes(stats.timeInRoute)}</div>
                            </div>

                            <div style={{ background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-border-subtle)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                <Timer size={14} color="#ef4444" /> Inactividad
                                <span className="tooltip-container" style={{ display: 'flex', marginLeft: 'auto' }}>
                                  <HelpCircle size={14} color="var(--text-muted)" />
                                  <div className="tooltip-text">Tiempo acumulado de inactividad durante esta fecha.</div>
                                </span>
                              </div>
                              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{formatMinutes(stats.timeInactive)}</div>
                            </div>

                            <div style={{ background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-border-subtle)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                <ClipboardList size={14} color="#10b981" /> Tareas hoy
                                <span className="tooltip-container tooltip-right" style={{ display: 'flex', marginLeft: 'auto' }}>
                                  <HelpCircle size={14} color="var(--text-muted)" />
                                  <div className="tooltip-text">Total de tareas registradas en esta fecha.</div>
                                </span>
                              </div>
                              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{stats.total}</div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Registro de la fecha */}
                      <div style={{ marginTop: '0.5rem' }}>
                        <div className="form-label" style={{ marginBottom: '0.75rem' }}>
                          {selectedDate === getTodayStr() ? 'Registro de hoy' : `Registro del ${selectedDate.split('-').reverse().join('/')}`}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                          {userTasks.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              No se registraron tareas en esta fecha.
                            </div>
                          ) : (
                            userTasks.map((t) => {
                              const sc = STATUS_CONFIG[t.status] ?? { label: t.status, cls: 'badge-neutral', color: 'var(--surface-border)' };
                              const timeString = new Date(t.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
                              const isTaskActive = selectedTaskModal?.id === t.id;
                              return (
                                <div
                                  key={t.id}
                                  onClick={() => handleSelectTask(isTaskActive ? null : t)}
                                  style={{
                                    padding: '0.75rem 1rem',
                                    borderRadius: 'var(--radius-md)',
                                    background: isTaskActive ? 'var(--surface-border)' : 'var(--surface-hover)',
                                    borderLeft: `3px solid ${sc.color}`,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'background 0.2s ease',
                                  }}
                                  onMouseEnter={e => { if (!isTaskActive) e.currentTarget.style.background = 'var(--surface-border)'; }}
                                  onMouseLeave={e => { if (!isTaskActive) e.currentTarget.style.background = 'var(--surface-hover)'; }}
                                >
                                  <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{timeString}</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{t.client_name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                      {sc.label}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span className={`badge ${sc.cls}`} style={{ fontSize: '0.7rem' }}>{sc.label}</span>
                                    {isTaskActive && <ChevronRight size={20} style={{ color: '#fff' }} />}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TASK DETAIL PANEL (rightmost panel) */}
        {selectedTaskModal && (
          <div
            className="card"
            style={{
              padding: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              height: 'calc(100vh - 240px)',
              position: 'sticky',
              top: '1.5rem',
              opacity: taskDetailVisible ? 1 : 0,
              transform: taskDetailVisible ? 'translateX(0)' : 'translateX(24px)',
              transition: 'opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* Header */}
            <div className="card-header" style={{ padding: '1.25rem 1.5rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="stat-icon-wrapper primary" style={{ width: 44, height: 44 }}>
                  <ClipboardList size={22} />
                </div>
                <div>
                  <div className="card-title" style={{ fontSize: '1.05rem' }}>{selectedTaskModal.client_name}</div>
                  <div className="card-subtitle">{selectedTaskModal.client_address || 'Sin dirección'}</div>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleSelectTask(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '0 1.5rem 0.75rem' }}>
              <span className={`badge ${STATUS_CONFIG[selectedTaskModal.status]?.cls || 'badge-neutral'}`}>
                {STATUS_CONFIG[selectedTaskModal.status]?.label || selectedTaskModal.status}
              </span>
            </div>

            {/* Tabs */}
            <div className="tab-group" style={{ display: 'flex', borderBottom: '1px solid var(--surface-border)', padding: '0 1.5rem' }}>
              <button
                type="button"
                className={`tab-btn ${taskDetailTab === 'info' ? 'active' : ''}`}
                onClick={() => setTaskDetailTab('info')}
                style={{ fontSize: '0.85rem', padding: '0.65rem 1rem' }}
              >
                Información
              </button>
              <button
                type="button"
                className={`tab-btn ${taskDetailTab === 'evidence' ? 'active' : ''}`}
                onClick={() => setTaskDetailTab('evidence')}
                style={{ fontSize: '0.85rem', padding: '0.65rem 1rem' }}
              >
                Evidencias
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.25rem 1.5rem', flex: 1, overflowY: 'auto' }}>
              {taskDetailTab === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--text-secondary)', alignItems: 'flex-start' }}>
                    <UserIcon size={18} style={{ color: 'var(--color-primary-400)', marginTop: '0.1rem', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Ejecutada por</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{selectedTaskModal.user_name}</span>
                        {(() => {
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
                    <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)', marginTop: '0.25rem' }}>
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
                              style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block', cursor: 'pointer' }} 
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

      {fullScreenImage && (
        <ImageModal 
          imageUrl={fullScreenImage} 
          onClose={() => setFullScreenImage(null)} 
        />
      )}
    </div>
  );
};
