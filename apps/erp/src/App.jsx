import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

const AppLayout = lazy(() => import('./components/layout/AppLayout'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'));
const CreateInvoicePage = lazy(() => import('./pages/CreateInvoicePage'));
const InvoiceImportPage = lazy(() => import('./pages/InvoiceImportPage'));
const InvoiceOCRPage = lazy(() => import('./pages/InvoiceOCRPage'));
const RecurringInvoicesPage = lazy(() => import('./pages/RecurringInvoicesPage'));
const InvoiceNumberingPage = lazy(() => import('./pages/InvoiceNumberingPage'));
const InvoiceApprovalsPage = lazy(() => import('./pages/InvoiceApprovalsPage'));
const InvoiceDuplicatesPage = lazy(() => import('./pages/InvoiceDuplicatesPage'));
const QuotesPage = lazy(() => import('./pages/QuotesPage'));
const CreateQuotePage = lazy(() => import('./pages/CreateQuotePage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const SuppliersPage = lazy(() => import('./pages/SuppliersPage'));
const WarehousesPage = lazy(() => import('./pages/WarehousesPage'));
const PurchaseOrdersPage = lazy(() => import('./pages/PurchaseOrdersPage'));
const POGRNPage = lazy(() => import('./pages/POGRNPage'));
const POAmendmentsPage = lazy(() => import('./pages/POAmendmentsPage'));
const POMatchingPage = lazy(() => import('./pages/POMatchingPage'));
const EmployeesPage = lazy(() => import('./pages/EmployeesPage'));
const PayrollPage = lazy(() => import('./pages/PayrollPage'));
const DepartmentsPage = lazy(() => import('./pages/DepartmentsPage'));
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage'));
const StaffPortalPage = lazy(() => import('./pages/StaffPortalPage'));
const StaffPayslipPrintPage = lazy(() => import('./pages/StaffPayslipPrintPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const FinancePage = lazy(() => import('./pages/FinancePage'));
const NRSPage = lazy(() => import('./pages/NRSPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const KYCPage = lazy(() => import('./pages/KYCPage'));
const AgentLoginPage = lazy(() => import('./pages/AgentLoginPage'));
const AgentDashboardPage = lazy(() => import('./pages/AgentDashboardPage'));
const AgentLayout = lazy(() => import('./components/layout/AgentLayout'));
const FieldAgentDashboardPage = lazy(() => import('./pages/FieldAgentDashboardPage'));
const FieldAgentBusinessesPage = lazy(() => import('./pages/FieldAgentBusinessesPage'));
const FieldAgentNewBusinessPage = lazy(() => import('./pages/FieldAgentNewBusinessPage'));
const FieldAgentBusinessDetailPage = lazy(() => import('./pages/FieldAgentBusinessDetailPage'));
const FieldAgentBusinessKYCPage = lazy(() => import('./pages/FieldAgentBusinessKYCPage'));
const CrmDashboardPage = lazy(() => import('./pages/CrmDashboardPage'));
const FieldAgentLayout = lazy(() => import('./components/layout/FieldAgentLayout'));
const POSLayout = lazy(() => import('./components/layout/POSLayout'));
const MobilePOSScreen = lazy(() => import('./components/MobilePOSScreen'));
const POSLoginPage = lazy(() => import('./pages/POSLoginPage'));
const POSDashboardPage = lazy(() => import('./pages/POSDashboardPage'));
const POSSalesHistoryPage = lazy(() => import('./pages/POSSalesHistoryPage'));
const POSEndOfDayPage = lazy(() => import('./pages/POSEndOfDayPage'));
const PartnersLoginPage = lazy(() => import('./pages/PartnersLoginPage'));
const LogisticsLoginPage = lazy(() => import('./pages/LogisticsLoginPage'));
const LogisticsRegisterPage = lazy(() => import('./pages/LogisticsRegisterPage'));
const LogisticsLayout = lazy(() => import('./components/layout/LogisticsLayout'));
const LogisticsPortalHome = lazy(() => import('./pages/LogisticsPortalHome'));
const LogisticsDashboardPage = lazy(() => import('./pages/LogisticsDashboardPage'));
const LogisticsDeliveriesPage = lazy(() => import('./pages/LogisticsDeliveriesPage'));
const LogisticsProfilePage = lazy(() => import('./pages/LogisticsProfilePage'));
const LogisticsCompanyDashboardPage = lazy(() => import('./pages/LogisticsCompanyDashboardPage'));
const LogisticsCompanyDeliveriesPage = lazy(() => import('./pages/LogisticsCompanyDeliveriesPage'));
const LogisticsCompanySchedulePage = lazy(() => import('./pages/LogisticsCompanySchedulePage'));
const LogisticsCompanyReturnsPage = lazy(() => import('./pages/LogisticsCompanyReturnsPage'));
const LogisticsCompanyBillingPage = lazy(() => import('./pages/LogisticsCompanyBillingPage'));
const LogisticsCompanySupportPage = lazy(() => import('./pages/LogisticsCompanySupportPage'));
const LogisticsCompanyAnalyticsPage = lazy(() => import('./pages/LogisticsCompanyAnalyticsPage'));
const LogisticsCompanyDocumentsPage = lazy(() => import('./pages/LogisticsCompanyDocumentsPage'));
const LogisticsCompanyCarriersPage = lazy(() => import('./pages/LogisticsCompanyCarriersPage'));
const LogisticsAgentAnalyticsPage = lazy(() => import('./pages/LogisticsAgentAnalyticsPage'));
const LogisticsAgentDocumentsPage = lazy(() => import('./pages/LogisticsAgentDocumentsPage'));
const LogisticsAgentSupportPage = lazy(() => import('./pages/LogisticsAgentSupportPage'));
const ImpersonatePage = lazy(() => import('./pages/ImpersonatePage'));
const MarketplaceOrdersPage = lazy(() => import('./pages/MarketplaceOrdersPage'));
const TenantShipmentsPage = lazy(() => import('./pages/TenantShipmentsPage'));
const EmployeePortalPage = lazy(() => import('./pages/EmployeePortalPage'));
const StockPage = lazy(() => import('./pages/StockPage'));
const UtilitiesPage = lazy(() => import('./pages/UtilitiesPage'));
const AlertsCenterPage = lazy(() => import('./pages/AlertsCenterPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const LeaveManagementPage = lazy(() => import('./pages/LeaveManagementPage'));
const TerminationWorkflowPage = lazy(() => import('./pages/TerminationWorkflowPage'));
const AttendanceShiftsPage = lazy(() => import('./pages/AttendanceShiftsPage'));
const MailboxPage = lazy(() => import('./pages/MailboxPage'));
const KnowledgeBasePage = lazy(() => import('./pages/KnowledgeBasePage'));
const TransactionsHubPage = lazy(() => import('./pages/TransactionsHubPage'));
const PromotionPricingPage = lazy(() => import('./pages/PromotionPricingPage'));
const AccountsPayablePage = lazy(() => import('./pages/AccountsPayablePage'));
const APPaymentProcessingPage = lazy(() => import('./pages/APPaymentProcessingPage'));
const APPaymentApprovalsPage = lazy(() => import('./pages/APPaymentApprovalsPage'));
const APPaymentSchedulesPage = lazy(() => import('./pages/APPaymentSchedulesPage'));

const DEFAULT_TENANT_MODULES = {
  sales: true,
  inventory: true,
  operations: true,
  hrPayroll: true,
  finance: true,
  customerCare: true,
  pos: true,
};

function isTenantModuleEnabled(tenant, moduleKey) {
  if (!moduleKey) return true;
  const enabledModules = tenant?.enabledModules;
  if (!enabledModules || typeof enabledModules !== 'object' || Array.isArray(enabledModules)) {
    return true;
  }
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_TENANT_MODULES, moduleKey)) {
    return true;
  }
  return enabledModules[moduleKey] !== false;
}

function PrivateRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function ModuleRoute({ moduleKey, children, fallback = '/dashboard' }) {
  const { tenant } = useAuthStore();
  return isTenantModuleEnabled(tenant, moduleKey) ? children : <Navigate to={fallback} replace />;
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
          <Route path="invoices" element={<ModuleRoute moduleKey="sales"><InvoicesPage /></ModuleRoute>} />
          <Route path="invoices/new" element={<ModuleRoute moduleKey="sales"><CreateInvoicePage /></ModuleRoute>} />
          <Route path="invoices/import" element={<ModuleRoute moduleKey="sales"><InvoiceImportPage /></ModuleRoute>} />
          <Route path="invoices/ocr" element={<ModuleRoute moduleKey="sales"><InvoiceOCRPage /></ModuleRoute>} />
          <Route path="invoices/recurring" element={<ModuleRoute moduleKey="sales"><RecurringInvoicesPage /></ModuleRoute>} />
          <Route path="invoices/numbering" element={<ModuleRoute moduleKey="sales"><InvoiceNumberingPage /></ModuleRoute>} />
          <Route path="invoices/approvals" element={<ModuleRoute moduleKey="sales"><InvoiceApprovalsPage /></ModuleRoute>} />
          <Route path="invoices/duplicates" element={<ModuleRoute moduleKey="sales"><InvoiceDuplicatesPage /></ModuleRoute>} />
          <Route path="quotes" element={<ModuleRoute moduleKey="sales"><QuotesPage /></ModuleRoute>} />
          <Route path="quotes/new" element={<ModuleRoute moduleKey="sales"><CreateQuotePage /></ModuleRoute>} />
          <Route path="products" element={<ModuleRoute moduleKey="inventory"><ProductsPage /></ModuleRoute>} />
          <Route path="marketplace-orders" element={<MarketplaceOrdersPage />} />
          <Route path="shipments" element={<ModuleRoute moduleKey="operations"><TenantShipmentsPage /></ModuleRoute>} />
          <Route path="customers" element={<ModuleRoute moduleKey="sales"><CustomersPage /></ModuleRoute>} />
          <Route path="promotion-pricing" element={<ModuleRoute moduleKey="sales"><PromotionPricingPage /></ModuleRoute>} />
          <Route path="suppliers" element={<ModuleRoute moduleKey="inventory"><SuppliersPage /></ModuleRoute>} />
          <Route path="warehouses" element={<ModuleRoute moduleKey="inventory"><WarehousesPage /></ModuleRoute>} />
          <Route path="stock" element={<ModuleRoute moduleKey="inventory"><StockPage /></ModuleRoute>} />
          <Route path="utilities" element={<UtilitiesPage />} />
          <Route path="alerts" element={<AlertsCenterPage />} />
          <Route path="purchase-orders" element={<ModuleRoute moduleKey="inventory"><PurchaseOrdersPage /></ModuleRoute>} />
          <Route path="purchase-orders/:poId/grns" element={<ModuleRoute moduleKey="inventory"><POGRNPage /></ModuleRoute>} />
          <Route path="purchase-orders/:poId/amendments" element={<ModuleRoute moduleKey="inventory"><POAmendmentsPage /></ModuleRoute>} />
          <Route path="purchase-orders/:poId/matching" element={<ModuleRoute moduleKey="inventory"><POMatchingPage /></ModuleRoute>} />
          <Route path="employees" element={<ModuleRoute moduleKey="hrPayroll"><EmployeesPage /></ModuleRoute>} />
          <Route path="staff-portal" element={<ModuleRoute moduleKey="hrPayroll"><StaffPortalPage /></ModuleRoute>} />
          <Route path="staff-portal/payslips/:id/print" element={<ModuleRoute moduleKey="hrPayroll"><StaffPayslipPrintPage /></ModuleRoute>} />
          <Route path="payroll" element={<ModuleRoute moduleKey="hrPayroll"><PayrollPage /></ModuleRoute>} />
          <Route path="departments" element={<ModuleRoute moduleKey="hrPayroll"><DepartmentsPage /></ModuleRoute>} />
          <Route path="announcements" element={<ModuleRoute moduleKey="hrPayroll"><AnnouncementsPage /></ModuleRoute>} />
          <Route path="projects" element={<ModuleRoute moduleKey="operations"><ProjectsPage /></ModuleRoute>} />
          <Route path="tasks" element={<ModuleRoute moduleKey="operations"><TasksPage /></ModuleRoute>} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="leave-management" element={<ModuleRoute moduleKey="hrPayroll"><LeaveManagementPage /></ModuleRoute>} />
          <Route path="termination-workflow" element={<ModuleRoute moduleKey="hrPayroll"><TerminationWorkflowPage /></ModuleRoute>} />
          <Route path="attendance" element={<ModuleRoute moduleKey="hrPayroll"><AttendanceShiftsPage /></ModuleRoute>} />
          <Route path="finance" element={<ModuleRoute moduleKey="finance"><FinancePage /></ModuleRoute>} />
          <Route path="accounts-payable" element={<ModuleRoute moduleKey="finance"><AccountsPayablePage /></ModuleRoute>} />
          <Route path="ap-payment-processing" element={<ModuleRoute moduleKey="finance"><APPaymentProcessingPage /></ModuleRoute>} />
          <Route path="ap-payment-approvals" element={<ModuleRoute moduleKey="finance"><APPaymentApprovalsPage /></ModuleRoute>} />
          <Route path="ap-payment-schedules" element={<ModuleRoute moduleKey="finance"><APPaymentSchedulesPage /></ModuleRoute>} />
          <Route path="transactions-hub" element={<ModuleRoute moduleKey="finance"><TransactionsHubPage /></ModuleRoute>} />
          <Route path="nrs" element={<ModuleRoute moduleKey="finance"><NRSPage /></ModuleRoute>} />
          <Route path="reports" element={<ModuleRoute moduleKey="finance"><ReportsPage /></ModuleRoute>} />
          <Route path="kyc" element={<KYCPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="support" element={<ModuleRoute moduleKey="customerCare"><SupportPage /></ModuleRoute>} />
          <Route path="mailbox" element={<ModuleRoute moduleKey="customerCare"><MailboxPage /></ModuleRoute>} />
          <Route path="knowledge-base" element={<ModuleRoute moduleKey="customerCare"><KnowledgeBasePage /></ModuleRoute>} />
        </Route>
        <Route path="/pos" element={<PrivateRoute><ModuleRoute moduleKey="pos"><POSLayout /></ModuleRoute></PrivateRoute>}>
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
        <Route path="/field-agent" element={<PrivateRoute><FieldAgentLayout /></PrivateRoute>}>
          <Route index element={<FieldAgentDashboardPage />} />
          <Route path="businesses" element={<FieldAgentBusinessesPage />} />
          <Route path="businesses/new" element={<FieldAgentNewBusinessPage />} />
          <Route path="businesses/:id" element={<FieldAgentBusinessDetailPage />} />
          <Route path="businesses/:id/kyc" element={<FieldAgentBusinessKYCPage />} />
        </Route>
        <Route path="/crm" element={<PrivateRoute><CrmDashboardPage /></PrivateRoute>} />
        <Route path="/logistics" element={<LogisticsLayout />}>
          <Route index element={<LogisticsPortalHome />} />
          <Route path="dashboard" element={<LogisticsDashboardPage />} />
          <Route path="deliveries" element={<LogisticsDeliveriesPage />} />
          <Route path="profile" element={<LogisticsProfilePage />} />
          <Route path="analytics" element={<LogisticsAgentAnalyticsPage />} />
          <Route path="documents" element={<LogisticsAgentDocumentsPage />} />
          <Route path="support" element={<LogisticsAgentSupportPage />} />
          <Route path="company" element={<LogisticsCompanyDashboardPage />} />
          <Route path="company/deliveries" element={<LogisticsCompanyDeliveriesPage />} />
          <Route path="company/analytics" element={<LogisticsCompanyAnalyticsPage />} />
          <Route path="company/documents" element={<LogisticsCompanyDocumentsPage />} />
          <Route path="company/carriers" element={<LogisticsCompanyCarriersPage />} />
          <Route path="company/features/*" element={<Navigate to="/logistics/company" replace />} />
          <Route path="company/schedule" element={<LogisticsCompanySchedulePage />} />
          <Route path="company/returns" element={<LogisticsCompanyReturnsPage />} />
          <Route path="company/billing" element={<LogisticsCompanyBillingPage />} />
          <Route path="company/support" element={<LogisticsCompanySupportPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
