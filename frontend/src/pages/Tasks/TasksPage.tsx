// src/pages/Tasks/TasksPage.tsx

import { useEffect, useState, useCallback } from 'react';
import { ClipboardList, Search, User as UserIcon, Calendar, X, FileImage, ChevronRight, MapPin, Clock } from 'lucide-react';
import { taskService } from '../../services/task.service';
import { userService } from '../../services/user.service';
import type { Visit, User } from '../../types';
import { formatDate } from '../../utils/formatDate';
import toast from 'react-hot-toast';
import { Skeleton } from '../../components/ui/Skeleton';
import { ImageModal } from '../../components/ui/ImageModal';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { getMediaUrl } from '../../utils/media';
import api from '../../services/api';

const STATUS_LABELS: Record<string, string> = {
  en_ruta: 'En Ruta',
  visitado: 'Visitado',
  fallido: 'Fallido',
};

const STATUS_BADGE: Record<string, string> = {
  en_ruta: 'badge-info',
  visitado: 'badge-success',
  fallido: 'badge-danger',
};

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  reponedor:  { label: 'Reponedor',  color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  vendedor:   { label: 'Vendedor',   color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  cobrador:   { label: 'Cobrador',   color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  repartidor: { label: 'Repartidor', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  supervisor: { label: 'Supervisor', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
  admin:      { label: 'Admin',      color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
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

const getTodayStr = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

export const TasksPage = () => {
  const [tasks, setTasks]             = useState<Visit[]>([]);
  const [mobileUsers, setMobileUsers] = useState<User[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selectedTask, setSelectedTask] = useState<Visit | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailTab, setDetailTab]     = useState<'info' | 'evidence'>('evidence');
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [globalGeofenceRadius, setGlobalGeofenceRadius] = useState<number>(100);

  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);

  // Filters
  const [search, setSearch]     = useState('');
  const [userId, setUserId]     = useState('');
  const [status, setStatus]     = useState('');
  const [dateFrom, setDateFrom] = useState(getTodayStr());
  const [dateTo, setDateTo]     = useState(getTodayStr());

  const fetchUsers = useCallback(async () => {
    try {
      const res = await userService.list({ limit: 100, include_inactive: true });
      setMobileUsers(res.data.filter(u =>
        ['reponedor', 'vendedor', 'cobrador', 'repartidor'].includes(u.role)
      ));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    api.get('/settings').then(res => {
      if (res.data?.data?.geofence_radius) {
        setGlobalGeofenceRadius(Number(res.data.data.geofence_radius));
      }
    }).catch(() => {});
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!dateFrom || !dateTo) {
      toast.error('Debe indicar una fecha de inicio y una fecha de fin.');
      setTasks([]);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    if (new Date(dateTo) < new Date(dateFrom)) {
      toast.error('La fecha de fin no puede ser anterior a la de inicio.');
      setTasks([]);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await taskService.list({
        search:    search    || undefined,
        user_id:   userId    || undefined,
        status:    status    || undefined,
        date_from: dateFrom  ? new Date(`${dateFrom}T00:00:00`).toISOString() : undefined,
        date_to:   dateTo    ? new Date(`${dateTo}T23:59:59.999`).toISOString()   : undefined,
        limit: 20,
        page,
      });
      setTasks(res.data);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch {
      toast.error('Error al cargar tareas');
    } finally {
      setLoading(false);
    }
  }, [search, userId, status, dateFrom, dateTo, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Set loading to true immediately when filters change to show Skeletons during debounce
  // Also reset page to 1 when filters change (if not already 1)
  useEffect(() => {
    setLoading(true);
    setPage(1);
  }, [search, userId, status, dateFrom, dateTo]);

  useEffect(() => {
    const timer = setTimeout(fetchTasks, 300);
    return () => clearTimeout(timer);
  }, [fetchTasks]);

  // Animate in/out the detail panel
  const handleRowClick = (task: Visit) => {
    if (selectedTask?.id === task.id) {
      // Fade out then remove
      setDetailVisible(false);
      setTimeout(() => setSelectedTask(null), 450);
    } else {
      if (!selectedTask) {
        setSelectedTask(task);
        setTimeout(() => setDetailVisible(true), 20);
      } else {
        // Switch task: brief fade-out, then switch, then fade-in
        setDetailVisible(false);
        setTimeout(() => {
          setSelectedTask(task);
          setTimeout(() => setDetailVisible(true), 30);
        }, 280);
      }
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Page Header */}
      <div className="page-header" style={{ flexShrink: 0 }}>
        <div className="page-header-left">
          <h1>Historial de Tareas</h1>
          <p>Historial de tareas realizadas por el personal en terreno</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Mercado o contacto</label>
            <div className="search-bar">
              <Search size={15} className="search-bar-icon" />
              <input
                type="text"
                className="form-input"
                style={{ padding: '0.45rem 0.75rem 0.45rem 2.2rem', fontSize: '0.85rem' }}
                placeholder="Buscar por nombre o contacto..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group" style={{ flex: '1 1 170px', marginBottom: 0, minWidth: 180 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Ejecutada por</label>
            <SearchableSelect
              options={mobileUsers.map(u => ({ value: u.id, label: u.full_name }))}
              value={userId}
              onChange={setUserId}
              placeholder="Cualquier persona"
              searchPlaceholder="Buscar por nombre..."
            />
          </div>
          <div className="form-group" style={{ flex: '0 1 130px', marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Estado</label>
            <select className="form-select" style={{ padding: '0.45rem 0.65rem', fontSize: '0.85rem' }} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: '0 1 135px', marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Fecha inicio</label>
            <input type="date" className="form-input" style={{ padding: '0.45rem 0.65rem', fontSize: '0.85rem' }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: '0 1 135px', marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Fecha fin</label>
            <input type="date" className="form-input" style={{ padding: '0.45rem 0.65rem', fontSize: '0.85rem' }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Main layout: table 60% | detail 40% */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedTask ? 'minmax(0, 1.35fr) minmax(360px, 1fr)' : '1fr',
        gap: '1rem',
        alignItems: 'stretch',
        flex: 1,
        minHeight: 0,
        transition: 'grid-template-columns 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>

        {/* TABLE (left / full width) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0, height: '100%', minHeight: 0 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div className="table-wrapper" style={{ border: 'none', flex: 1, overflow: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Mercado</th>
                    {!selectedTask && <th>Contacto</th>}
                    <th>Ejecutor</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                    {/* Arrow column header, only when detail is open */}
                    {selectedTask && <th style={{ width: 28 }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Skeleton width="30px" height="30px" borderRadius="var(--radius-full)" />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <Skeleton width="80%" height="0.85rem" />
                              <Skeleton width="50%" height="0.7rem" />
                            </div>
                          </div>
                        </td>
                        {!selectedTask && (
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Skeleton width="28px" height="28px" borderRadius="var(--radius-md)" />
                              <Skeleton width="70%" height="0.85rem" />
                            </div>
                          </td>
                        )}
                        <td><Skeleton width="80px" height="1.25rem" borderRadius="var(--radius-full)" /></td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <Skeleton width="60%" height="0.85rem" />
                            <Skeleton width="40%" height="0.7rem" />
                          </div>
                        </td>
                        <td><Skeleton width="60px" height="0.85rem" /></td>
                        {selectedTask && <td></td>}
                      </tr>
                    ))
                  ) : tasks.length === 0 ? (
                    <tr>
                      <td colSpan={selectedTask ? 5 : 5}>
                        <div className="empty-state" style={{ padding: '3rem 1rem' }}>
                          <ClipboardList size={48} className="empty-state-icon" />
                          <div className="empty-state-title">No se encontraron tareas</div>
                          <div className="empty-state-desc">Ajusta los filtros para ver más resultados.</div>
                        </div>
                      </td>
                    </tr>
                  ) : tasks.map(task => {
                    const isActive = selectedTask?.id === task.id;
                    return (
                      <tr
                        key={task.id}
                        onClick={() => handleRowClick(task)}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: isActive ? 'var(--surface-hover)' : 'transparent',
                          borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                          transition: 'background-color 0.25s ease, border-color 0.25s ease',
                        }}
                      >
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          <div style={{ fontWeight: isActive ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: selectedTask ? '160px' : '260px' }}>{task.client_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: selectedTask ? '160px' : '260px' }}>{task.client_address}</div>
                        </td>
                        {!selectedTask && <td style={{ color: 'var(--text-secondary)', padding: '0.65rem 0.85rem' }}>{task.client_contact || '-'}</td>}
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          {(() => {
                            const roleInfo = ROLE_CONFIG[task.user_role?.toLowerCase()] ?? {
                              label: task.user_role || 'Ejecutor',
                              color: 'var(--text-muted)',
                              bg: 'var(--surface-hover)',
                            };
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.75rem', flexShrink: 0 }}>
                                  {task.user_name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                                </div>
                                <div style={{ minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                  <div style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: selectedTask ? '110px' : '180px' }}>{task.user_name}</div>
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      fontSize: '0.68rem',
                                      fontWeight: 600,
                                      padding: '0.08rem 0.4rem',
                                      borderRadius: 'var(--radius-full)',
                                      color: roleInfo.color,
                                      backgroundColor: roleInfo.bg,
                                      border: `1px solid ${roleInfo.color}40`,
                                      marginTop: '2px',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {roleInfo.label}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          <span className={`badge ${STATUS_BADGE[task.status]}`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                            {STATUS_LABELS[task.status]}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{formatDate(task.created_at)}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {new Date(task.created_at).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        {/* Arrow indicator on selected row */}
                        {selectedTask && (
                          <td style={{ textAlign: 'center', padding: '0 0.35rem' }}>
                            {isActive && (
                              <ChevronRight
                                size={18}
                                style={{
                                  color: 'var(--color-primary)',
                                  opacity: detailVisible ? 1 : 0,
                                  transition: 'opacity 0.4s ease',
                                }}
                              />
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '1.5rem', borderTop: '1px solid var(--surface-border-subtle)' }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  disabled={page <= 1} 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Anterior
                </button>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Página <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{page}</span> de {totalPages}
                </div>
                <button 
                  className="btn btn-secondary btn-sm" 
                  disabled={page >= totalPages} 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </div>

        {/* DETAIL PANEL (right, 40%) */}
        {selectedTask && (
          <div
            className="card"
            style={{
              padding: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              minHeight: 0,
              position: 'relative',
              opacity: detailVisible ? 1 : 0,
              transform: detailVisible ? 'translateX(0)' : 'translateX(24px)',
              transition: 'opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* Header */}
            <div className="card-header" style={{ padding: '0.85rem 1.25rem 0', marginBottom: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div className="stat-icon-wrapper primary" style={{ width: 40, height: 40 }}>
                  <ClipboardList size={20} />
                </div>
                <div>
                  <div className="card-title" style={{ fontSize: '1rem' }}>{selectedTask.client_name}</div>
                  <div className="card-subtitle">{selectedTask.client_address || 'Sin dirección'}</div>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => {
                  setDetailVisible(false);
                  setTimeout(() => setSelectedTask(null), 450);
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Status badge */}
            <div style={{ padding: '0 1.25rem 0.4rem' }}>
              <span className={`badge ${STATUS_BADGE[selectedTask.status]}`} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                {STATUS_LABELS[selectedTask.status]}
              </span>
            </div>

            {/* Tabs */}
            <div className="tab-group" style={{ display: 'flex', borderBottom: '1px solid var(--surface-border)', padding: '0 0.75rem', marginBottom: '0.75rem' }}>
              <button type="button" className={`tab-btn ${detailTab === 'info' ? 'active' : ''}`} onClick={() => setDetailTab('info')}>
                Información
              </button>
              <button type="button" className={`tab-btn ${detailTab === 'evidence' ? 'active' : ''}`} onClick={() => setDetailTab('evidence')}>
                Evidencias
              </button>
            </div>

            {/* Tab content */}
            <div style={{ padding: '0 1.25rem 1.25rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {detailTab === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--text-secondary)', alignItems: 'flex-start' }}>
                    <UserIcon size={18} style={{ color: 'var(--color-primary-400)', marginTop: '0.1rem', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Ejecutada por</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{selectedTask.user_name}</span>
                        {(() => {
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
                      <span style={{ fontSize: '0.9rem' }}>
                        {new Date(selectedTask.created_at).toLocaleString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  {selectedTask.notes && (
                    <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)', marginTop: '0.5rem' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Notas</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{selectedTask.notes}</div>
                    </div>
                  )}
                </div>
              )}
              {detailTab === 'evidence' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  {selectedTask.evidences && selectedTask.evidences.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, minHeight: 0 }}>
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
                          <div 
                            key={ev.id} 
                            style={{ 
                              borderRadius: 'var(--radius-md)', 
                              overflow: 'hidden', 
                              border: '1px solid var(--surface-border)', 
                              position: 'relative',
                              width: '100%',
                              flex: selectedTask.evidences!.length === 1 ? 1 : 'none',
                              minHeight: '280px',
                              height: selectedTask.evidences!.length === 1 ? '100%' : '320px',
                              display: 'flex',
                              flexDirection: 'column',
                              backgroundColor: 'var(--surface-ground)'
                            }}
                          >
                            <img 
                              src={getMediaUrl(ev.file_url)} 
                              alt="Evidencia" 
                              style={{ width: '100%', height: '100%', flex: 1, objectFit: 'cover', display: 'block', cursor: 'pointer' }} 
                              onClick={() => setFullScreenImage(getMediaUrl(ev.file_url))}
                            />
                            
                            <div style={{ position: 'absolute', top: 10, right: 10, background: isValid ? 'rgba(16, 185, 129, 0.92)' : 'rgba(239, 68, 68, 0.92)', color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 2px 6px rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
                              <MapPin size={13} />
                              {isValid ? `Válido (<${maxDist}m)` : (dist ? `Inválido (${dist.toFixed(0)}m)` : 'Sin GPS')}
                            </div>

                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)', color: '#fff', padding: '8px 12px', fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: '2px', backdropFilter: 'blur(2px)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                                <span style={{ fontFamily: 'monospace', letterSpacing: '-0.3px', fontWeight: 500 }}>
                                  {ev.lat !== null && ev.lng !== null ? `${ev.lat.toFixed(6)}, ${ev.lng.toFixed(6)}` : 'GPS no disp.'}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Clock size={11} />
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

      {fullScreenImage && (
        <ImageModal 
          imageUrl={fullScreenImage} 
          onClose={() => setFullScreenImage(null)} 
        />
      )}

      </div>
    </div>
  );
};
