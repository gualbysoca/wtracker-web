// src/components/layout/Sidebar.tsx

import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Store, Activity,
  LogOut, Menu, ClipboardList, TrendingUp, Settings
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { LogoIcon } from '../ui/LogoIcon';

interface SidebarProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
}

const navItems = [
  { to: '/',           label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/monitoring', label: 'Monitoreo',    icon: Activity },
  { to: '/tasks',      label: 'Tareas',       icon: ClipboardList },
  { to: '/performance',label: 'Desempeño',    icon: TrendingUp },
  { to: '/clients',    label: 'Clientes',     icon: Store },
  { to: '/users',      label: 'Usuarios',     icon: Users },
];

export const Sidebar = ({ collapsed, onToggleSidebar }: SidebarProps) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      toast.success('Sesión cerrada correctamente');
    } catch {
      navigate('/login');
    }
  };

  const initials = user?.full_name
    ?.split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('') ?? 'U';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div 
        className="sidebar-logo" 
        onClick={onToggleSidebar}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? 'var(--space-4) 0' : 'var(--space-5)',
          flexDirection: collapsed ? 'column' : 'row',
          gap: collapsed ? '1rem' : '0',
          cursor: 'pointer'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="sidebar-logo-icon">
            <LogoIcon size={20} color="white" strokeWidth={2.5} />
          </div>
          {!collapsed && <span className="sidebar-logo-text">WTracker</span>}
        </div>
        {!collapsed && (
          <button 
            className="btn-icon" 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
            aria-label="Toggle Sidebar"
          >
            <Menu size={20} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" aria-label="Menú principal">
        <span className="nav-section-label">General</span>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={collapsed ? label : undefined}
          >
            <Icon size={20} className="nav-item-icon" />
            <span className="nav-item-label">{label}</span>
          </NavLink>
        ))}
        {user?.role === 'admin' && (
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={collapsed ? 'Configuraciones' : undefined}
          >
            <Settings size={20} className="nav-item-icon" />
            <span className="nav-item-label">Configuraciones</span>
          </NavLink>
        )}
      </nav>

      {/* Footer — User + Logout */}
      <div className="sidebar-footer">
        <div className="user-profile-mini" onClick={handleLogout} title="Cerrar sesión">
          <div className="avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.full_name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
          <LogOut size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        </div>
      </div>
    </aside>
  );
};
