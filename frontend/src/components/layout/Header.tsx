// src/components/layout/Header.tsx

import { Menu, Bell } from 'lucide-react';

interface HeaderProps {
  title: string;
  onToggleSidebar: () => void;
}

export const Header = ({ title, onToggleSidebar }: HeaderProps) => {
  return (
    <header className="header">
      <div className="header-left">
        <button
          className="collapse-btn"
          onClick={onToggleSidebar}
          aria-label="Alternar menú lateral"
          id="sidebar-toggle-btn"
        >
          <Menu size={20} />
        </button>
        <span className="page-title">{title}</span>
      </div>

      <div className="header-right">
        <button className="icon-btn" aria-label="Notificaciones" id="notifications-btn">
          <Bell size={18} />
          <span className="header-badge" aria-label="3 notificaciones pendientes">3</span>
        </button>
      </div>
    </header>
  );
};
