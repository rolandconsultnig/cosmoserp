const express = require('express');
const router = express.Router();
const { authenticate, requireRole, requireTenantUser, requireEnabledModule } = require('../middleware/auth.middleware');
const prisma = require('../config/prisma');
const { paginate, paginatedResponse } = require('../utils/helpers');
const { createAuditLog } = require('../middleware/audit.middleware');

const ap = require('../controllers/ap.controller');

router.use(authenticate, requireTenantUser, requireEnabledModule('finance'));

router.get('/vendor-bills', ap.listVendorBills);
router.get('/vendor-bills/:id', ap.getVendorBill);
router.post('/vendor-bills', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), ap.createVendorBill);
router.post('/vendor-bills/:id/submit-approval', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), ap.submitVendorBillForApproval);
router.post('/vendor-bills/:id/review-approval', requireRole('OWNER', 'ADMIN'), ap.reviewVendorBillApproval);
router.post('/vendor-bills/:id/post', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), ap.postVendorBill);
router.get('/vendor-bills/:id/payment-schedules', ap.listBillPaymentSchedules);
router.post('/vendor-bills/:id/payment-schedules', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), ap.createBillPaymentSchedule);
router.get('/vendor-bills/:id/payments', ap.listBillPayments);
router.post('/vendor-bills/:id/payments', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), ap.recordBillPayment);
router.post('/vendor-bills/payments/:paymentId/approve', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT', 'MANAGER'), ap.approveBillPayment);
router.post('/vendor-bills/payments/:paymentId/reject', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT', 'MANAGER'), ap.rejectBillPayment);
router.get('/payment-schedules/due-alerts', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), ap.getDuePaymentAlerts);
router.get('/payment-schedules/:scheduleId/early-discount-quote', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), ap.getEarlyPaymentDiscountQuote);
router.get('/pending-payments', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), ap.getPendingPayments);
router.get('/payment-stats', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), ap.getPaymentStats);
router.get('/payments-awaiting-approval', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT', 'MANAGER'), ap.getPaymentsAwaitingApproval);
router.get('/vendor-bills/schedules', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), ap.listPaymentSchedules);
router.post('/payment-runs/execute', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), ap.executeBatchPaymentRun);
router.post('/payment-runs/auto-execute', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), ap.executeAutomaticPaymentRun);

router.get('/aging', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), ap.getAgedPayables);
router.get('/vendors/:supplierId/statement', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), ap.getVendorStatement);
router.get('/reports/wht-remittance', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), ap.getWhtRemittanceReport);

module.exports = router;

