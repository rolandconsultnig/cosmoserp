const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/admin.controller');
const marketplaceAdmin = require('../controllers/marketplaceAdmin.controller');
const logistics = require('../controllers/logistics.controller');
const platformSupport = require('../controllers/platformSupport.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

router.use(authenticate, requireAdmin);
router.get('/nrs-logs', ctrl.getNRSLogs);
router.get('/nrs-stats', ctrl.getNRSStats);
router.post('/nrs-logs/:id/retry', ctrl.retryNRSSubmission);
router.get('/analytics', ctrl.getPlatformAnalytics);
router.get('/audit-logs', ctrl.getAuditLogs);
router.put('/listings/:id/moderate', ctrl.moderateListing);

// Marketplace escrow & Paystack payouts (multi-seller)
router.get('/marketplace/escrow-orders', marketplaceAdmin.listEscrowOrders);
router.post('/marketplace/orders/:id/release-escrow', marketplaceAdmin.releaseEscrowAdmin);
router.post('/marketplace/orders/:id/payout-paystack', marketplaceAdmin.executePaystackPayouts);
router.post('/users', ctrl.createAdminUser);

// Subscriptions & Billing
router.get('/subscriptions/stats', ctrl.getSubscriptionStats);
router.get('/subscriptions', ctrl.listSubscriptions);
router.patch('/tenants/:tenantId/subscription', ctrl.updateTenantSubscription);

// Tenant management
router.get('/tenants', ctrl.listTenants);
router.get('/tenants/:tenantId', ctrl.getTenantDetail);
router.patch('/tenants/:tenantId/kyc', ctrl.adminUpdateKYC);
router.post('/tenants/:tenantId/notes', ctrl.adminAddTenantNote);
router.post('/tenants/:tenantId/toggle-active', ctrl.adminToggleTenantActive);
router.post('/tenants/:tenantId/impersonate', ctrl.impersonateTenant);
router.get('/tenants/:tenantId/audit-logs', ctrl.adminGetTenantAuditLogs);
router.post('/tenants/:tenantId/users/:userId/toggle', ctrl.adminToggleTenantUserStatus);
router.post('/tenants/:tenantId/suspend', ctrl.suspendTenant);
router.post('/tenants/:tenantId/activate', ctrl.activateTenant);
router.post('/tenants/:tenantId/extend-trial', ctrl.extendTrial);

// Finance Overview & Actions
router.get('/finance/overview', ctrl.getFinanceOverview);
router.get('/finance/invoices', ctrl.listAllInvoices);
router.patch('/finance/invoices/:invoiceId/flag', ctrl.flagInvoice);
router.patch('/finance/invoices/:invoiceId/status', ctrl.updateInvoiceStatus);

// HR & Payroll
router.get('/hr/overview', ctrl.getHROverview);
router.get('/hr/payroll-runs', ctrl.listAllPayrollRuns);
router.patch('/hr/payroll-runs/:payrollId/status', ctrl.updatePayrollStatus);

// POS
router.get('/pos/overview', ctrl.getPOSOverview);
router.get('/pos/sales', ctrl.listPOSSales);
router.post('/pos/sales/:saleId/void', ctrl.adminVoidSale);

// Support Tickets (tenant-scoped)
router.get('/support/stats', ctrl.getSupportStats);
router.get('/support/tickets', ctrl.listAllTickets);
router.get('/support/tickets/:ticketId', ctrl.getTicketDetail);
router.patch('/support/tickets/:ticketId', ctrl.updateTicketStatus);
router.post('/support/tickets/:ticketId/comment', ctrl.addTicketComment);
router.post('/support/tickets/:ticketId/escalate', ctrl.escalateTicket);

// Platform Support (Back Office — all customers)
router.get('/support/platform-tickets/stats', platformSupport.adminGetStats);
router.get('/support/platform-tickets', platformSupport.adminListTickets);
router.get('/support/platform-tickets/:id', platformSupport.adminGetTicket);
router.patch('/support/platform-tickets/:id', platformSupport.adminUpdateTicket);
router.post('/support/platform-tickets/:id/reply', platformSupport.adminAddReply);

// Users Management
router.get('/admin-users', ctrl.listAdminUsers);
router.patch('/admin-users/:adminId', ctrl.updateAdminUser);
router.get('/tenant-users', ctrl.getTenantUsers);
router.patch('/tenant-users/:userId/toggle', ctrl.toggleUserStatus);

// System Settings
router.get('/settings', ctrl.getPlatformSettings);
router.patch('/settings', ctrl.updatePlatformSettings);
router.patch('/settings/feature-flags', ctrl.updateFeatureFlags);
router.patch('/settings/maintenance', ctrl.updateMaintenanceMode);

// Logistics management
router.get('/logistics/stats', logistics.adminGetStats);
router.get('/logistics/agents', logistics.adminListAgents);
router.patch('/logistics/agents/:agentId/status', logistics.adminUpdateAgentStatus);
router.get('/logistics/deliveries', logistics.adminListDeliveries);
router.patch('/logistics/deliveries/:deliveryId/assign', logistics.adminAssignAgent);
router.get('/logistics/companies', logistics.adminListCompanies);
router.patch('/logistics/companies/:companyId/status', logistics.adminUpdateCompanyStatus);

module.exports = router;
