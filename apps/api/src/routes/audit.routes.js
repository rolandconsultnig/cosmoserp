const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/audit.controller');
const { authenticate, requireTenantUser, requireRole } = require('../middleware/auth.middleware');

router.use(authenticate, requireTenantUser);
router.get('/', requireRole('OWNER', 'ADMIN'), ctrl.listTenant);

module.exports = router;
