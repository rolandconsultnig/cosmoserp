const router = require('express').Router();
const { authenticate, requireTenantUser } = require('../middleware/auth.middleware');
const pos = require('../controllers/pos.controller');

router.use(authenticate, requireTenantUser);

router.post('/sale', pos.createSale);
router.post('/offline-sync', pos.syncOfflineSales);
router.get('/sales', pos.listSales);
router.get('/sales/:id', pos.getSale);
router.post('/sales/:id/void', pos.voidSale);
router.post('/sales/:id/create-invoice', pos.createInvoiceFromSale);
router.post('/sales/:id/send-receipt', pos.sendReceipt);
router.post('/create-quotation', pos.createQuotation);
router.get('/stats', pos.getStats);
router.get('/end-of-day', pos.endOfDay);

module.exports = router;
