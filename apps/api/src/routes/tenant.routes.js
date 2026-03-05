const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tenant.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

router.post('/register', ctrl.register);
router.get('/me', authenticate, ctrl.getMyTenant);
router.put('/me', authenticate, ctrl.updateMyTenant);
router.post('/me/kyc', authenticate, ctrl.submitKYC);

router.get('/', authenticate, requireAdmin, ctrl.list);
router.get('/:id', authenticate, requireAdmin, ctrl.getOne);
router.put('/:id/kyc', authenticate, requireAdmin, ctrl.updateKYCStatus);
router.put('/:id/subscription', authenticate, requireAdmin, ctrl.updateSubscription);
router.put('/:id/toggle', authenticate, requireAdmin, ctrl.toggleActive);

module.exports = router;
