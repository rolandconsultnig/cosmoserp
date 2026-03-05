const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/invoice.controller');
const { authenticate, requireRole, requireKYC } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', requireRole('OWNER','ADMIN','ACCOUNTANT','SALES'), requireKYC, ctrl.create);
router.put('/:id', requireRole('OWNER','ADMIN','ACCOUNTANT'), ctrl.update);
router.post('/:id/send', requireRole('OWNER','ADMIN','ACCOUNTANT','SALES'), ctrl.sendInvoice);
router.post('/:id/whatsapp', requireRole('OWNER','ADMIN','ACCOUNTANT','SALES'), ctrl.sendWhatsApp);
router.post('/:id/payment', requireRole('OWNER','ADMIN','ACCOUNTANT'), ctrl.recordPayment);
router.post('/:id/nrs-submit', requireRole('OWNER','ADMIN','ACCOUNTANT'), requireKYC, ctrl.submitToNRS);
router.get('/:id/pdf', ctrl.downloadPDF);

module.exports = router;
