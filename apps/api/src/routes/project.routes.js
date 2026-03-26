const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/project.controller');
const { authenticate, requireTenantUser, requirePermission } = require('../middleware/auth.middleware');

router.use(authenticate, requireTenantUser);

router.get('/', requirePermission('projects:view'), ctrl.list);
router.post('/', requirePermission('projects:manage'), ctrl.create);
router.put('/:id', requirePermission('projects:manage'), ctrl.update);
router.delete('/:id', requirePermission('projects:manage'), ctrl.remove);

module.exports = router;
