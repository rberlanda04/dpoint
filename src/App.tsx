import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { I18nProvider, useI18n } from './i18n';
import { Loader2 } from 'lucide-react';

// Layout
import AppShell from './components/layouts/AppShell';
import PortalLayout from './components/layouts/PortalLayout';

// Auth
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LandingPage from './pages/LandingPage';

// Dashboard
import DashboardOverview from './pages/DashboardOverview';
import FuncionariosPage from './pages/FuncionariosPage';
import ObrasPage from './pages/ObrasPage';
import RegistrosPage from './pages/RegistrosPage';
import ConfigPage from './pages/ConfigPage';
import AutoCheckinPage from './pages/AutoCheckinPage';

// Check-in (public)
import CheckInPage from './pages/CheckInPage';
import B2bPage from './pages/B2bPage';

// Worker Portal (B2C)
import WorkerPortalPage from './pages/WorkerPortalPage';

// Invite (public)
import InvitePage from './pages/InvitePage';

// Portal
import CompaniesPage from './pages/portal/CompaniesPage';
import AccessKeysPage from './pages/portal/AccessKeysPage';
import EmpresaAdminsPage from './pages/portal/EmpresaAdminsPage';
import InvitationsPage from './pages/portal/InvitationsPage';

function LoadingScreen() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
        <p className="text-sm text-slate-500">{t('common.loading')}</p>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading, isSuperAdmin } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login?portal=1" replace />;
  if (!isSuperAdmin) return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/invite/:token" element={<InvitePage />} />
            <Route path="/checkin" element={<CheckInPage />} />
            <Route path="/checkin/:localId" element={<CheckInPage />} />

            {/* Worker Portal (B2C) */}
            <Route path="/worker" element={<WorkerPortalPage />} />

            {/* Dashboard Routes (empresa_admin + super_admin) */}
            <Route
              path="/app/dashboard"
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              <Route index element={<DashboardOverview />} />
              <Route path="funcionarios" element={<FuncionariosPage />} />
              <Route path="obras" element={<ObrasPage />} />
              <Route path="registros" element={<RegistrosPage />} />
              <Route path="auto-checkin" element={<AutoCheckinPage />} />
              <Route path="config" element={<ConfigPage />} />
              <Route path="b2b" element={<B2bPage />} />
            </Route>

            {/* Portal Routes (super_admin only) */}
            <Route
              path="/portal"
              element={
                <RequireSuperAdmin>
                  <PortalLayout />
                </RequireSuperAdmin>
              }
            >
              <Route index element={<Navigate to="/portal/empresas" replace />} />
              <Route path="empresas" element={<CompaniesPage />} />
              <Route path="admins" element={<EmpresaAdminsPage />} />
              <Route path="convites" element={<InvitationsPage />} />
              <Route path="chaves" element={<AccessKeysPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  );
}