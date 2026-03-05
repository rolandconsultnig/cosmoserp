import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import InvoicesPage from './pages/InvoicesPage';
import CreateInvoicePage from './pages/CreateInvoicePage';
import QuotesPage from './pages/QuotesPage';
import CreateQuotePage from './pages/CreateQuotePage';
import ProductsPage from './pages/ProductsPage';
import CustomersPage from './pages/CustomersPage';
import SuppliersPage from './pages/SuppliersPage';
import WarehousesPage from './pages/WarehousesPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import EmployeesPage from './pages/EmployeesPage';
import PayrollPage from './pages/PayrollPage';
import FinancePage from './pages/FinancePage';
import NRSPage from './pages/NRSPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import SupportPage from './pages/SupportPage';
import AgentLoginPage from './pages/AgentLoginPage';
import AgentDashboardPage from './pages/AgentDashboardPage';
import AgentLayout from './components/layout/AgentLayout';
import POSLayout from './components/layout/POSLayout';
import POSPage from './pages/POSPage';
import POSLoginPage from './pages/POSLoginPage';
import POSDashboardPage from './pages/POSDashboardPage';
import POSSalesHistoryPage from './pages/POSSalesHistoryPage';
import POSEndOfDayPage from './pages/POSEndOfDayPage';
import LogisticsLoginPage from './pages/LogisticsLoginPage';
import LogisticsRegisterPage from './pages/LogisticsRegisterPage';
import LogisticsLayout from './components/layout/LogisticsLayout';
import LogisticsDashboardPage from './pages/LogisticsDashboardPage';
import LogisticsDeliveriesPage from './pages/LogisticsDeliveriesPage';
import LogisticsProfilePage from './pages/LogisticsProfilePage';

function PrivateRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
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
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/agent-login" element={<PublicRoute><AgentLoginPage /></PublicRoute>} />
      <Route path="/pos-login" element={<PublicRoute><POSLoginPage /></PublicRoute>} />
      <Route path="/logistics-login" element={<LogisticsLoginPage />} />
      <Route path="/logistics-register" element={<LogisticsRegisterPage />} />
      <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/new" element={<CreateInvoicePage />} />
        <Route path="quotes" element={<QuotesPage />} />
        <Route path="quotes/new" element={<CreateQuotePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="warehouses" element={<WarehousesPage />} />
        <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="nrs" element={<NRSPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="support" element={<SupportPage />} />
      </Route>
      <Route path="/pos" element={<PrivateRoute><POSLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/pos/dashboard" replace />} />
        <Route path="dashboard" element={<POSDashboardPage />} />
        <Route path="terminal" element={<POSPage />} />
        <Route path="history" element={<POSSalesHistoryPage />} />
        <Route path="end-of-day" element={<POSEndOfDayPage />} />
      </Route>
      <Route path="/agent" element={<PrivateRoute><AgentLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/agent/dashboard" replace />} />
        <Route path="dashboard" element={<AgentDashboardPage />} />
        <Route path="tickets" element={<SupportPage defaultTab="tickets" />} />
        <Route path="calls" element={<SupportPage defaultTab="calls" />} />
      </Route>
      <Route path="/logistics" element={<LogisticsLayout />}>
        <Route index element={<Navigate to="/logistics/dashboard" replace />} />
        <Route path="dashboard" element={<LogisticsDashboardPage />} />
        <Route path="deliveries" element={<LogisticsDeliveriesPage />} />
        <Route path="profile" element={<LogisticsProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
