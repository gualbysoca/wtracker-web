// src/components/layout/AppLayout.tsx
// Shell principal que envuelve todas las páginas autenticadas

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => setCollapsed((prev) => !prev);

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`} id="app-shell">
      <Sidebar collapsed={collapsed} onToggleSidebar={toggleSidebar} />

      <div className="main-content">
        <main className="page-wrapper" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
