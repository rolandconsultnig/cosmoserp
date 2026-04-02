const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/invoice.controller');
const { authenticate, requireRole, requireKYC, requireTenantUser, requireEnabledModule } = require('../middleware/auth.middleware');

router.use(authenticate, requireTenantUser, requireEnabledModule('sales'));
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', requireRole('OWNER','ADMIN','ACCOUNTANT','SALES'), requireKYC, ctrl.create);
router.put('/:id', requireRole('OWNER','ADMIN','ACCOUNTANT'), ctrl.update);
router.post('/:id/send', requireRole('OWNER','ADMIN','ACCOUNTANT','SALES'), ctrl.sendInvoice);
router.post('/:id/whatsapp', requireRole('OWNER','ADMIN','ACCOUNTANT','SALES'), ctrl.sendWhatsApp);
router.post('/:id/payment', requireRole('OWNER','ADMIN','ACCOUNTANT'), ctrl.recordPayment);
router.post('/:id/nrs-submit', requireRole('OWNER','ADMIN','ACCOUNTANT'), requireKYC, ctrl.submitToNRS);
router.get('/:id/pdf', ctrl.downloadPDF);

// ═════════════════════════════════════════════════════════════════
// NEW INVOICE MANAGEMENT FEATURES
// ═════════════════════════════════════════════════════════════════

// 1. BULK UPLOAD & IMPORT
router.post('/import/bulk-upload', requireRole('OWNER','ADMIN','ACCOUNTANT'), ctrl.bulkUploadInvoices);
router.get('/import/status/:importId', ctrl.getImportStatus);
router.get('/import/list', ctrl.listImports);
router.post('/import/:importId/retry', requireRole('OWNER','ADMIN','ACCOUNTANT'), ctrl.retryFailedImports);

// 2. INVOICE SCANNING & OCR
router.post('/ocr/upload', requireRole('OWNER','ADMIN','ACCOUNTANT','SALES'), ctrl.uploadForOCR);
router.get('/ocr/status/:ocrId', ctrl.getOCRStatus);
router.put('/ocr/:ocrId/validate', requireRole('OWNER','ADMIN','ACCOUNTANT'), ctrl.validateOCRData);
router.post('/ocr/:ocrId/create-invoice', requireRole('OWNER','ADMIN','ACCOUNTANT', 'SALES'), ctrl.createInvoiceFromOCR);
router.get('/ocr/list', ctrl.listOCRData);

// 3. RECURRING INVOICES
router.post('/recurring/create', requireRole('OWNER','ADMIN','ACCOUNTANT','SALES'), ctrl.createRecurringInvoice);
router.get('/recurring/list', ctrl.listRecurringInvoices);
router.get('/recurring/:id', ctrl.getRecurringInvoice);
router.put('/recurring/:id', requireRole('OWNER','ADMIN','ACCOUNTANT'), ctrl.updateRecurringInvoice);
router.delete('/recurring/:id', requireRole('OWNER','ADMIN','ACCOUNTANT'), ctrl.deleteRecurringInvoice);
router.post('/recurring/:id/generate', requireRole('OWNER','ADMIN','ACCOUNTANT','SALES'), ctrl.generateRecurringInvoice);

// 4. INVOICE NUMBERING & REFERENCE
router.get('/numbering/config', ctrl.getNumberingConfig);
router.put('/numbering/config', requireRole('OWNER','ADMIN'), ctrl.updateNumberingConfig);
router.post('/numbering/validate', ctrl.validateInvoiceNumber);

// 5. MULTI-CURRENCY (already supported, add query endpoint)
router.get('/currencies/rates', ctrl.getCurrencyRates);
router.get('/currencies/supported', ctrl.getSupportedCurrencies);

// 6. APPROVAL WORKFLOWS
router.post('/:id/approval/submit', requireRole('OWNER','ADMIN','ACCOUNTANT','SALES'), ctrl.submitForApproval);
router.get('/:id/approval/status', ctrl.getApprovalStatus);
router.post('/:id/approval/approve', requireRole('OWNER','ADMIN','ACCOUNTANT','MANAGER'), ctrl.approveInvoice);
router.post('/:id/approval/reject', requireRole('OWNER','ADMIN','ACCOUNTANT','MANAGER'), ctrl.rejectInvoice);
router.get('/approvals/pending', ctrl.getPendingApprovals);
router.get('/approvals/history/:invoiceId', ctrl.getApprovalHistory);

// 7. DUPLICATE DETECTION
router.post('/duplicate/check', requireRole('OWNER','ADMIN','ACCOUNTANT'), ctrl.checkDuplicateInvoice);
router.get('/duplicate/list', ctrl.listDuplicateChecks);
router.post('/duplicate/:checkId/approve', requireRole('OWNER','ADMIN','ACCOUNTANT'), ctrl.approveDuplicateCheck);
router.post('/duplicate/:checkId/reject', requireRole('OWNER','ADMIN','ACCOUNTANT'), ctrl.rejectDuplicateCheck);

module.exports = router;
