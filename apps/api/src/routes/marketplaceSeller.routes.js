const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/marketplaceSeller.controller');
const { authenticate, requireRole, requireTenantUser } = require('../middleware/auth.middleware');

router.use(authenticate, requireTenantUser);

router.get('/orders', requireRole('OWNER', 'ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTANT'), ctrl.listOrders);
router.get('/orders/:id', requireRole('OWNER', 'ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTANT'), ctrl.getOrder);
router.patch('/orders/:id/status', requireRole('OWNER', 'ADMIN', 'WAREHOUSE'), ctrl.updateOrderStatus);
router.post('/orders/:id/release-escrow', requireRole('OWNER', 'ADMIN'), ctrl.releaseEscrow);
router.post('/orders/:id/dispute', requireRole('OWNER', 'ADMIN'), ctrl.openDispute);

module.exports = router;
