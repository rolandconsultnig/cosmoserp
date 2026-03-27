import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Home, LayoutDashboard, Settings, Users, ShoppingCart, Package, BarChart, FileText, CreditCard, Factory, ClipboardList, LifeBuoy, LogOut, Menu, X, Bell, UserCircle, Search, ChevronDown, Plus, Lock, AlertCircle, Eye, EyeOff, Loader2, Mail, Shield, Zap, Building2, TrendingUp, Award, Globe, Briefcase, Fingerprint, Chrome, Star, ArrowRight } from 'lucide-react';
import useAuthStore from './store/authStore';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
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
import DepartmentsPage from './pages/DepartmentsPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import StaffPortalPage from './pages/StaffPortalPage';
import StaffPayslipPrintPage from './pages/StaffPayslipPrintPage';
import ProjectsPage from './pages/ProjectsPage';
import TasksPage from './pages/TasksPage';
import FinancePage from './pages/FinancePage';
import NRSPage from './pages/NRSPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import SupportPage from './pages/SupportPage';
import KYCPage from './pages/KYCPage';
import AgentLoginPage from './pages/AgentLoginPage';
import AgentDashboardPage from './pages/AgentDashboardPage';
import AgentLayout from './components/layout/AgentLayout';
import FieldAgentDashboardPage from './pages/FieldAgentDashboardPage';
import FieldAgentBusinessesPage from './pages/FieldAgentBusinessesPage';
import FieldAgentNewBusinessPage from './pages/FieldAgentNewBusinessPage';
import FieldAgentBusinessDetailPage from './pages/FieldAgentBusinessDetailPage';
import FieldAgentBusinessKYCPage from './pages/FieldAgentBusinessKYCPage';
import CrmDashboardPage from './pages/CrmDashboardPage';
import FieldAgentLayout from './components/layout/FieldAgentLayout';
import POSLayout from './components/layout/POSLayout';
import POSPage from './pages/POSPage';
import MobilePOSScreen from './components/MobilePOSScreen';
import POSLoginPage from './pages/POSLoginPage';
import POSDashboardPage from './pages/POSDashboardPage';
import POSSalesHistoryPage from './pages/POSSalesHistoryPage';
import POSEndOfDayPage from './pages/POSEndOfDayPage';
import PartnersLoginPage from './pages/PartnersLoginPage';
import LogisticsLoginPage from './pages/LogisticsLoginPage';
import LogisticsRegisterPage from './pages/LogisticsRegisterPage';
import LogisticsLayout from './components/layout/LogisticsLayout';
import LogisticsDashboardPage from './pages/LogisticsDashboardPage';
import LogisticsDeliveriesPage from './pages/LogisticsDeliveriesPage';
import LogisticsProfilePage from './pages/LogisticsProfilePage';
import ImpersonatePage from './pages/ImpersonatePage';
import MarketplaceOrdersPage from './pages/MarketplaceOrdersPage';
import TenantShipmentsPage from './pages/TenantShipmentsPage';
import EmployeePortalPage from './pages/EmployeePortalPage';
import StockPage from './pages/StockPage';
import UtilitiesPage from './pages/UtilitiesPage';
import AlertsCenterPage from './pages/AlertsCenterPage';
import CalendarPage from './pages/CalendarPage';
import LeaveManagementPage from './pages/LeaveManagementPage';
import TerminationWorkflowPage from './pages/TerminationWorkflowPage';
import AttendanceShiftsPage from './pages/AttendanceShiftsPage';
import MailboxPage from './pages/MailboxPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import TransactionsHubPage from './pages/TransactionsHubPage';
import PromotionPricingPage from './pages/PromotionPricingPage';

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
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
      <Route path="/partners-login" element={<PartnersLoginPage />} />
      <Route path="/agent-login" element={<PublicRoute><AgentLoginPage /></PublicRoute>} />
      <Route path="/pos-login" element={<PublicRoute><POSLoginPage /></PublicRoute>} />
      <Route path="/logistics-login" element={<LogisticsLoginPage />} />
      <Route path="/logistics-register" element={<LogisticsRegisterPage />} />
      <Route path="/impersonate" element={<ImpersonatePage />} />
      <Route path="/employee-portal" element={<EmployeePortalPage />} />
      <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/new" element={<CreateInvoicePage />} />
        <Route path="quotes" element={<QuotesPage />} />
        <Route path="quotes/new" element={<CreateQuotePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="marketplace-orders" element={<MarketplaceOrdersPage />} />
        <Route path="shipments" element={<TenantShipmentsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="promotion-pricing" element={<PromotionPricingPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="warehouses" element={<WarehousesPage />} />
        <Route path="stock" element={<StockPage />} />
        <Route path="utilities" element={<UtilitiesPage />} />
        <Route path="alerts" element={<AlertsCenterPage />} />
        <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="staff-portal" element={<StaffPortalPage />} />
        <Route path="staff-portal/payslips/:id/print" element={<StaffPayslipPrintPage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="leave-management" element={<LeaveManagementPage />} />
        <Route path="termination-workflow" element={<TerminationWorkflowPage />} />
        <Route path="attendance" element={<AttendanceShiftsPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="transactions-hub" element={<TransactionsHubPage />} />
        <Route path="nrs" element={<NRSPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="kyc" element={<KYCPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="mailbox" element={<MailboxPage />} />
        <Route path="knowledge-base" element={<KnowledgeBasePage />} />
      </Route>
      <Route path="/pos" element={<PrivateRoute><POSLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/pos/dashboard" replace />} />
        <Route path="dashboard" element={<POSDashboardPage />} />
        <Route path="terminal" element={<MobilePOSScreen />} />
        <Route path="history" element={<POSSalesHistoryPage />} />
        <Route path="end-of-day" element={<POSEndOfDayPage />} />
      </Route>
      <Route path="/agent" element={<PrivateRoute><AgentLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/agent/dashboard" replace />} />
        <Route path="dashboard" element={<AgentDashboardPage />} />
        <Route path="tickets" element={<SupportPage defaultTab="tickets" />} />
        <Route path="calls" element={<SupportPage defaultTab="calls" />} />
      </Route>
      {/* Field Agent portal */}
      <Route path="/field-agent" element={<PrivateRoute><FieldAgentLayout /></PrivateRoute>}>
        <Route index element={<FieldAgentDashboardPage />} />
        <Route path="businesses" element={<FieldAgentBusinessesPage />} />
        <Route path="businesses/new" element={<FieldAgentNewBusinessPage />} />
        <Route path="businesses/:id" element={<FieldAgentBusinessDetailPage />} />
        <Route path="businesses/:id/kyc" element={<FieldAgentBusinessKYCPage />} />
      </Route>
      <Route path="/crm" element={<PrivateRoute><CrmDashboardPage /></PrivateRoute>} />
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
