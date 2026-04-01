const express = require('express');
const router = express.Router();
const { authenticate, requireRole, requireTenantUser, requireEnabledModule } = require('../middleware/auth.middleware');
const prisma = require('../config/prisma');
const { paginate, paginatedResponse } = require('../utils/helpers');
const { createAuditLog } = require('../middleware/audit.middleware');

const ap = require('../controllers/ap.controller');
const apPayProc = require('../controllers/apPaymentProcessing.controller');

router.use(authenticate, requireTenantUser, requireEnabledModule('finance'));

router.get('/matching/po-lines', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT', 'WAREHOUSE'), ap.listPoMatchingCandidates);
router.get('/vendor-bills', ap.listVendorBills);
router.get('/vendor-bills/:id', ap.getVendorBill);
router.post('/vendor-bills', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), ap.createVendorBill);
router.post('/vendor-bills/:id/submit-approval', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), ap.submitVendorBillForApproval);
router.post('/vendor-bills/:id/review-approval', requireRole('OWNER', 'ADMIN'), ap.reviewVendorBillApproval);
router.post('/vendor-bills/:id/post', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), ap.postVendorBill);
router.get('/vendor-bills/:id/payment-schedules', ap.listBillPaymentSchedules);
router.post('/vendor-bills/:id/payment-schedules', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), ap.createBillPaymentSchedule);
router.post('/vendor-bills/:id/payments', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), ap.recordBillPayment);
router.get('/vendor-bills/:id/notes', ap.listBillNotes);
router.post('/vendor-bills/:id/notes', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), ap.createBillNote);
router.get('/payment-schedules/due-alerts', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), ap.getDuePaymentAlerts);

router.get('/aging', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), ap.getAgedPayables);

router.get('/payments', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), apPayProc.listApPayments);
router.patch('/vendor-bills/:id/early-payment', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), apPayProc.patchVendorBillEarlyPayment);

router.get('/payment-batches', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), apPayProc.listPaymentBatches);
router.post('/payment-batches', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), apPayProc.createPaymentBatch);
router.post('/payment-batches/process-due', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), apPayProc.processDueScheduledBatches);
router.get('/payment-batches/:id', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), apPayProc.getPaymentBatch);
router.post('/payment-batches/:id/submit', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), apPayProc.submitPaymentBatch);
router.post('/payment-batches/:id/approve', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), apPayProc.approvePaymentBatch);
router.post('/payment-batches/:id/reject', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), apPayProc.rejectPaymentBatch);
router.post('/payment-batches/:id/schedule', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), apPayProc.schedulePaymentBatch);
router.post('/payment-batches/:id/execute', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), apPayProc.executePaymentBatch);

module.exports = router;

