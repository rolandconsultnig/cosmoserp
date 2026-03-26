const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/department.controller');
const { authenticate, requireTenantUser, requirePermission } = require('../middleware/auth.middleware');

router.use(authenticate, requireTenantUser);

router.get('/', requirePermission('departments:view'), ctrl.list);
router.post('/', requirePermission('departments:manage'), ctrl.create);
router.put('/:id', requirePermission('departments:manage'), ctrl.update);
router.delete('/:id', requirePermission('departments:manage'), ctrl.remove);

module.exports = router;
