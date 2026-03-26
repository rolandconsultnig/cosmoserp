const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/leaveRequest.controller');
const { authenticate, requireTenantUser, requireRole } = require('../middleware/auth.middleware');

router.use(authenticate, requireTenantUser);
router.get('/', requireRole('OWNER', 'ADMIN', 'HR'), ctrl.list);
router.patch('/:id', requireRole('OWNER', 'ADMIN', 'HR'), ctrl.decide);

module.exports = router;
