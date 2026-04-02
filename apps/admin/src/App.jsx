import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

const AdminLayout = lazy(() => import('./components/layout/AdminLayout'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TenantsPage = lazy(() => import('./pages/TenantsPage'));
const TenantDetailPage = lazy(() => import('./pages/TenantDetailPage'));
const NRSMonitorPage = lazy(() => import('./pages/NRSMonitorPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const VisitorAnalyticsPage = lazy(() => import('./pages/VisitorAnalyticsPage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
const MarketplaceModerationPage = lazy(() => import('./pages/MarketplaceModerationPage'));
const MarketplaceEscrowPage = lazy(() => import('./pages/MarketplaceEscrowPage'));
const LogisticsPage = lazy(() => import('./pages/LogisticsPage'));
const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage'));
const UsersManagementPage = lazy(() => import('./pages/UsersManagementPage'));
const FinanceOverviewPage = lazy(() => import('./pages/FinanceOverviewPage'));
const HRPayrollPage = lazy(() => import('./pages/HRPayrollPage'));
const POSOverviewPage = lazy(() => import('./pages/POSOverviewPage'));
const SupportTicketsPage = lazy(() => import('./pages/SupportTicketsPage'));
const PlatformSupportPage = lazy(() => import('./pages/PlatformSupportPage'));
const SystemSettingsPage = lazy(() => import('./pages/SystemSettingsPage'));

function PrivateRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return null;
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
}

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );
}

export default function App() {
  const init = useAuthStore((s) => s.init);
  useEffect(() => { init(); }, [init]);

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
        <Route path="/" element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="tenants" element={<TenantsPage />} />
          <Route path="tenants/:id" element={<TenantDetailPage />} />
          <Route path="nrs-monitor" element={<NRSMonitorPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="visitor-analytics" element={<VisitorAnalyticsPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="marketplace" element={<MarketplaceModerationPage />} />
          <Route path="marketplace-escrow" element={<MarketplaceEscrowPage />} />
          <Route path="logistics" element={<LogisticsPage />} />
          <Route path="subscriptions" element={<SubscriptionsPage />} />
          <Route path="users" element={<UsersManagementPage />} />
          <Route path="finance" element={<FinanceOverviewPage />} />
          <Route path="hr-payroll" element={<HRPayrollPage />} />
          <Route path="pos" element={<POSOverviewPage />} />
          <Route path="support" element={<SupportTicketsPage />} />
          <Route path="platform-support" element={<PlatformSupportPage />} />
          <Route path="settings" element={<SystemSettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
