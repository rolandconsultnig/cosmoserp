const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/employee.controller');
const { authenticate, requireRole, requireTenantUser } = require('../middleware/auth.middleware');

router.use(authenticate, requireTenantUser);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', requireRole('OWNER','ADMIN','HR'), ctrl.create);
router.put('/:id', requireRole('OWNER','ADMIN','HR'), ctrl.update);
router.post('/:id/portal-access', requireRole('OWNER', 'ADMIN', 'HR'), ctrl.issuePortalAccess);

module.exports = router;
