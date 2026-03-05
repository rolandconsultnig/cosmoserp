const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dashboard.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

router.get('/tenant', authenticate, ctrl.getTenantDashboard);
router.get('/admin', authenticate, requireAdmin, ctrl.getAdminDashboard);

module.exports = router;
