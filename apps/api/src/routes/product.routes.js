const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/product.controller');
const { authenticate, requireRole, requireTenantUser, requireEnabledModule } = require('../middleware/auth.middleware');

router.use(authenticate, requireTenantUser, requireEnabledModule('inventory'));
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', requireRole('OWNER','ADMIN','WAREHOUSE'), ctrl.create);
router.put('/:id', requireRole('OWNER','ADMIN','WAREHOUSE'), ctrl.update);
router.post('/:id/stock-adjust', requireRole('OWNER','ADMIN','WAREHOUSE'), ctrl.adjustStock);
router.post('/:id/marketplace', requireRole('OWNER', 'ADMIN', 'WAREHOUSE'), ctrl.toggleMarketplace);
router.post('/:id/landed-cost', requireRole('OWNER','ADMIN','ACCOUNTANT','WAREHOUSE'), ctrl.addLandedCost);

module.exports = router;
