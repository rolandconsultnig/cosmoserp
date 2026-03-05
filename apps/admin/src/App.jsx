import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import AdminLayout from './components/layout/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TenantsPage from './pages/TenantsPage';
import TenantDetailPage from './pages/TenantDetailPage';
import NRSMonitorPage from './pages/NRSMonitorPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import MarketplaceModerationPage from './pages/MarketplaceModerationPage';
import LogisticsPage from './pages/LogisticsPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import UsersManagementPage from './pages/UsersManagementPage';
import FinanceOverviewPage from './pages/FinanceOverviewPage';
import HRPayrollPage from './pages/HRPayrollPage';
import POSOverviewPage from './pages/POSOverviewPage';
import SupportTicketsPage from './pages/SupportTicketsPage';
import SystemSettingsPage from './pages/SystemSettingsPage';

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

export default function App() {
  const init = useAuthStore((s) => s.init);
  useEffect(() => { init(); }, [init]);

  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/" element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="tenants/:id" element={<TenantDetailPage />} />
        <Route path="nrs-monitor" element={<NRSMonitorPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="marketplace" element={<MarketplaceModerationPage />} />
        <Route path="logistics" element={<LogisticsPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="users" element={<UsersManagementPage />} />
        <Route path="finance" element={<FinanceOverviewPage />} />
        <Route path="hr-payroll" element={<HRPayrollPage />} />
        <Route path="pos" element={<POSOverviewPage />} />
        <Route path="support" element={<SupportTicketsPage />} />
        <Route path="settings" element={<SystemSettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
