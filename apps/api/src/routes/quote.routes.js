const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/quote.controller');
const { authenticate, requireRole, requireTenantUser, requireEnabledModule } = require('../middleware/auth.middleware');

router.use(authenticate, requireTenantUser, requireEnabledModule('sales'));
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', requireRole('OWNER','ADMIN','ACCOUNTANT','SALES'), ctrl.create);
router.put('/:id', requireRole('OWNER','ADMIN','ACCOUNTANT','SALES'), ctrl.update);
router.post('/:id/send', requireRole('OWNER','ADMIN','ACCOUNTANT','SALES'), ctrl.sendQuote);
router.post('/:id/convert', requireRole('OWNER','ADMIN','ACCOUNTANT','SALES'), ctrl.convertToInvoice);
router.put('/:id/status', requireRole('OWNER','ADMIN','ACCOUNTANT','SALES'), ctrl.updateStatus);

module.exports = router;
