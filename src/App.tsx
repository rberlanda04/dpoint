import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { I18nProvider, useI18n } from './i18n';
import { ToastProvider } from './components/ui/Toast';
import { Loader2 } from 'lucide-react';

// Layout (keep static — small and always needed)
import AppShell from './components/layouts/AppShell';
import PortalLayout from './components/layouts/PortalLayout';

// Auth (keep static — entry points)
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LandingPage from './pages/LandingPage';

// Code-split all dashboard/portal/worker pages with React.lazy
const DashboardOverview = React.lazy(() => import('./pages/DashboardOverview'));
const FuncionariosPage = React.lazy(() => import('./pages/FuncionariosPage'));
const ObrasPage = React.lazy(() => import('./pages/ObrasPage'));
const RegistrosPage = React.lazy(() => import('./pages/RegistrosPage'));
const ConfigPage = React.lazy(() => import('./pages/ConfigPage'));
const AutoCheckinPage = React.lazy(() => import('./pages/AutoCheckinPage'));
const CheckInPage = React.lazy(() => import('./pages/CheckInPage'));
const FuncionarioDashboard = React.lazy(() => import('./pages/FuncionarioDashboard'));
const B2bPage = React.lazy(() => import('./pages/B2bPage'));
const WorkerPortalPage = React.lazy(() => import('./pages/WorkerPortalPage'));
const InvitePage = React.lazy(() => import('./pages/InvitePage'));
const CompaniesPage = React.lazy(() => import('./pages/portal/CompaniesPage'));
const AccessKeysPage = React.lazy(() => import('./pages/portal/AccessKeysPage'));
const EmpresaAdminsPage = React.lazy(() => import('./pages/portal/EmpresaAdminsPage'));
const InvitationsPage = React.lazy(() => import('./pages/portal/InvitationsPage'));

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

/** Lazy page wrapper — shows loading spinner while chunk downloads */
function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, userRole } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  // Block funcionario, trabalhador_avulso, and none from dashboard routes
  if (userRole === 'funcionario') {
    return <Navigate to="/checkin" replace />;
  }
  if (userRole === 'trabalhador_avulso') {
    return <Navigate to="/worker" replace />;
  }
  if (userRole === 'none') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function RequireEmpresaAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading, userRole, isSuperAdmin } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  // Only super_admin and empresa_admin can access dashboard
  if (!isSuperAdmin && userRole !== 'empresa_admin') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading, isSuperAdmin } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login?portal=1" replace />;
  if (!isSuperAdmin) return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
}

function RequireFuncionario({ children }: { children: React.ReactNode }) {
  const { user, loading, userRole } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (userRole !== 'funcionario') return <Navigate to="/checkin" replace />;
  return <>{children}</>;
}

/** Worker portal route — allows guests to try the tracker, or authenticated workers */
function WorkerRoute({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return <>{children}</>;
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/invite/:token" element={<LazyPage><InvitePage /></LazyPage>} />
              <Route path="/checkin" element={<LazyPage><CheckInPage /></LazyPage>} />

              {/* Worker Portal (B2C) — supports Guest Mode for instant trial */}
              <Route path="/worker" element={
                <WorkerRoute>
                  <LazyPage><WorkerPortalPage /></LazyPage>
                </WorkerRoute>
              } />

              {/* Funcionario Dashboard (B2B Employee) */}
              <Route path="/funcionario" element={
                <RequireFuncionario>
                  <LazyPage><FuncionarioDashboard /></LazyPage>
                </RequireFuncionario>
              } />

              {/* Dashboard Routes (empresa_admin + super_admin only) */}
              <Route
                path="/app/dashboard"
                element={
                  <RequireEmpresaAdmin>
                    <AppShell />
                  </RequireEmpresaAdmin>
                }
              >
                <Route index element={<LazyPage><DashboardOverview /></LazyPage>} />
                <Route path="funcionarios" element={<LazyPage><FuncionariosPage /></LazyPage>} />
                <Route path="obras" element={<LazyPage><ObrasPage /></LazyPage>} />
                <Route path="registros" element={<LazyPage><RegistrosPage /></LazyPage>} />
                <Route path="auto-checkin" element={<LazyPage><AutoCheckinPage /></LazyPage>} />
                <Route path="config" element={<LazyPage><ConfigPage /></LazyPage>} />
                <Route path="b2b" element={<LazyPage><B2bPage /></LazyPage>} />
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
                <Route path="empresas" element={<LazyPage><CompaniesPage /></LazyPage>} />
                <Route path="admins" element={<LazyPage><EmpresaAdminsPage /></LazyPage>} />
                <Route path="convites" element={<LazyPage><InvitationsPage /></LazyPage>} />
                <Route path="chaves" element={<LazyPage><AccessKeysPage /></LazyPage>} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </I18nProvider>
  );
}