const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dashboard.controller');
const { authenticate, requireAdmin, requireTenantUser } = require('../middleware/auth.middleware');

router.get('/tenant', authenticate, requireTenantUser, ctrl.getTenantDashboard);
router.get('/admin', authenticate, requireAdmin, ctrl.getAdminDashboard);

module.exports = router;
