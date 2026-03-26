const router = require('express').Router();
const ctrl = require('../controllers/pricing.controller');
const { authenticate, requireTenantUser, requireRole } = require('../middleware/auth.middleware');

router.use(authenticate, requireTenantUser);

router.get('/', ctrl.list);
router.post('/rules', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT', 'SALES'), ctrl.createRule);
router.post('/codes', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT', 'SALES'), ctrl.createCode);
router.post('/evaluate', ctrl.evaluate);

module.exports = router;
