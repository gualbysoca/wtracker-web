// src/pages/Dashboard/DashboardPage.tsx

import { useEffect, useState } from 'react';
import {
  Users, CheckCircle2, XCircle, Navigation, HelpCircle, ClipboardList
} from 'lucide-react';
import { dashboardService } from '../../services/dashboard.service';
import type { DashboardStats, LiveMapUser } from '../../types';
import { LiveMap } from '../../components/maps/LiveMap';
import { formatDate } from '../../utils/formatDate';
import toast from 'react-hot-toast';
import { Skeleton } from '../../components/ui/Skeleton';

const StatCard = ({
  icon: Icon,
  value,
  label,
  variant,
  tooltip,
}: {
  icon: React.ElementType;
  value: React.ReactNode;
  label: string;
  variant: 'primary' | 'success' | 'warning' | 'danger';
  tooltip?: string;
}) => (
  <div className={`stat-card ${variant}`}>
    <div style={{ flex: 1 }}>
      <div className="stat-value">{value}</div>
      <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        {label}
        {tooltip && (
          <span className="tooltip-container" style={{ display: 'flex' }}>
            <HelpCircle size={14} color="var(--text-muted)" />
            <div className="tooltip-text">{tooltip}</div>
          </span>
        )}
      </div>
    </div>
    <div className={`stat-icon-wrapper ${variant}`}>
      <Icon size={28} />
    </div>
  </div>
);

const ActivityRow = ({ user }: { user: LiveMapUser }) => {
  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
    en_ruta:  { label: 'En Ruta',  color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
    visitado: { label: 'Visitado', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
    fallido:  { label: 'Fallido',  color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)'  },
  };
  const s = statusMap[user.status] ?? { label: user.status, color: 'var(--text-muted)', bg: 'var(--surface-hover)' };
  const timeAgo = new Date(user.last_activity).toLocaleTimeString('es-CL', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <tr>
      <td style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div className="avatar" style={{ width: 44, height: 44, fontSize: '1rem', flexShrink: 0 }}>
            {user.full_name.split(' ').slice(0, 2).map((n) => n[0]).join('')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontWeight: 500, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{user.full_name}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user.role}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              📍 {user.client_name || 'Sin cliente asignado'}
            </div>
          </div>
        </div>
      </td>
      <td style={{ verticalAlign: 'middle', padding: '1rem' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: 600,
          backgroundColor: s.bg,
          color: s.color
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'currentColor' }} />
          {s.label.charAt(0).toUpperCase() + s.label.slice(1)}
        </span>
      </td>
      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)', verticalAlign: 'middle', padding: '1rem' }}>{timeAgo}</td>
    </tr>
  );
};

export const DashboardPage = () => {
  const [stats,     setStats]     = useState<DashboardStats | null>(null);
  const [liveUsers, setLiveUsers] = useState<LiveMapUser[]>([]);
  const [loading, setLoading]     = useState(true);

  const fetchData = async () => {
    try {
      const [statsData, liveData] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getLiveMap(),
      ]);
      setStats(statsData);
      setLiveUsers(liveData);
    } catch {
      toast.error('Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Polling cada 30 segundos para datos "en tiempo real"
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-page" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Dashboard</h1>
          <p>Resumen de actividad del día · {formatDate(new Date(), 'long')}</p>
        </div>
        <div className="live-dot">EN VIVO</div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <StatCard icon={ClipboardList}     value={loading ? <Skeleton width="60px" height="2rem" /> : stats?.visits_today || 0}       label="Tareas Hoy"          variant="primary" tooltip="Total de tareas registradas el día de hoy" />
        <StatCard icon={CheckCircle2} value={loading ? <Skeleton width="60px" height="2rem" /> : stats?.visited_today || 0}       label="Completadas"          variant="success" tooltip="Tareas finalizadas exitosamente hoy" />
        <StatCard icon={XCircle}      value={loading ? <Skeleton width="60px" height="2rem" /> : stats?.failed_today || 0}        label="Fallidas"             variant="danger"  tooltip="Tareas que no pudieron concretarse hoy" />
        <StatCard icon={Navigation}   value={loading ? <Skeleton width="60px" height="2rem" /> : stats?.currently_in_route || 0}  label="En Ruta Ahora"        variant="warning" tooltip="Cantidad de tareas en ejecución en este momento" />
        <StatCard icon={Users}        value={loading ? <Skeleton width="60px" height="2rem" /> : stats?.active_users_today || 0}   label="Usuarios Activos Hoy" variant="primary" tooltip="Personal de campo activo (que ha iniciado su jornada)" />
      </div>

      {/* Main Grid: Map + Activity Table */}
      <div className="dashboard-grid" style={{ flex: 1, minHeight: 0 }}>
        {/* Live Map */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ padding: '1.25rem 1.5rem 0' }}>
            <div>
              <div className="card-title">Monitoreo en Tiempo Real</div>
              <div className="card-subtitle">{liveUsers.length} usuarios activos en campo</div>
            </div>
            <div className="live-dot">LIVE</div>
          </div>
          <div style={{ flex: 1, minHeight: 0, marginTop: '1rem' }}>
            <LiveMap users={liveUsers} height="100%" />
          </div>
        </div>

        {/* Activity Feed */}
        <div className="card" style={{ padding: 0, overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ padding: '1.25rem 1.5rem 0' }}>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              Actividad Reciente
              <span className="tooltip-container" style={{ display: 'flex' }}>
                <HelpCircle size={14} color="var(--text-muted)" />
                <div className="tooltip-text">Últimas 5 tareas registradas</div>
              </span>
            </div>
          </div>
          <div className="table-wrapper" style={{ border: 'none', flex: 1, overflowY: 'auto', borderBottomLeftRadius: 'inherit', borderBottomRightRadius: 'inherit' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ padding: '0.75rem 1rem', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>PERSONAL</th>
                  <th style={{ padding: '0.75rem 1rem', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>ESTADO</th>
                  <th style={{ padding: '0.75rem 1rem', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>HORA</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                          <Skeleton width="44px" height="44px" borderRadius="var(--radius-full)" />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                            <Skeleton width="120px" height="0.9rem" />
                            <Skeleton width="80px" height="0.75rem" />
                            <Skeleton width="150px" height="0.75rem" />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}><Skeleton width="80px" height="1.5rem" borderRadius="20px" /></td>
                      <td style={{ padding: '1rem' }}><Skeleton width="50px" height="0.85rem" /></td>
                    </tr>
                  ))
                ) : (() => {
                  const recentActivityUsers = liveUsers
                    .filter(u => (u.status as string) !== 'sin_actividad' && (u.status as string) !== 'offline')
                    .sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime())
                    .slice(0, 5);

                  if (recentActivityUsers.length > 0) {
                    return recentActivityUsers.map((u) => <ActivityRow key={u.user_id} user={u} />);
                  }
                  
                  return (
                    <tr>
                      <td colSpan={3}>
                        <div className="empty-state" style={{ padding: '2rem' }}>
                          <div className="empty-state-title">Sin actividad reciente</div>
                        </div>
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
