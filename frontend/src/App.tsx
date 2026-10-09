// src/App.tsx
// Configuración de rutas y guard de autenticación

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { useAuthStore } from './store/authStore';
import { AppLayout }    from './components/layout/AppLayout';

import { LoginPage }      from './pages/Login/LoginPage';
import { DashboardPage }  from './pages/Dashboard/DashboardPage';
import { UsersPage }      from './pages/Users/UsersPage';
import { ClientsPage }    from './pages/Clients/ClientsPage';
import { MonitoringPage } from './pages/Monitoring/MonitoringPage';
import { CrossDataPage }  from './pages/CrossData/CrossDataPage';
import { EvidencePage }   from './pages/Evidence/EvidencePage';
import { TasksPage }      from './pages/Tasks/TasksPage';
import { PerformancePage } from './pages/Performance/PerformancePage';
import { SettingsPage }    from './pages/Settings/SettingsPage';

// ── Auth Guard ─────────────────────────────────────────
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

export default function App() {
  const { initializeFromStorage } = useAuthStore();

  useEffect(() => {
    // Restaurar sesión desde localStorage al cargar la app
    initializeFromStorage();
  }, [initializeFromStorage]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: 'var(--surface-panel)',
            color:      'var(--text-primary)',
            border:     '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-md)',
            fontFamily:   'var(--font-sans)',
            fontSize:     '0.875rem',
          },
        }}
      />

      <Routes>
        {/* Ruta pública */}
        <Route path="/login" element={
          <PublicRoute><LoginPage /></PublicRoute>
        } />

        {/* Rutas privadas con layout */}
        <Route path="/" element={
          <PrivateRoute><AppLayout /></PrivateRoute>
        }>
          <Route index            element={<DashboardPage />}  />
          <Route path="users"     element={<UsersPage />}      />
          <Route path="clients"   element={<ClientsPage />}    />
          <Route path="tasks"     element={<TasksPage />}      />
          <Route path="performance" element={<PerformancePage />} />
          <Route path="monitoring" element={<MonitoringPage />} />
          <Route path="cross-data" element={<CrossDataPage />} />
          <Route path="evidence"  element={<EvidencePage />}   />
          <Route path="settings"  element={<SettingsPage />}   />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
