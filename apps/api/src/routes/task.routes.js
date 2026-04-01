const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/task.controller');
const { authenticate, requireTenantUser, requirePermission, requireEnabledModule } = require('../middleware/auth.middleware');

router.use(authenticate, requireTenantUser, requireEnabledModule('operations'));

router.get('/', requirePermission('tasks:view'), ctrl.list);
router.post('/', requirePermission('tasks:manage'), ctrl.create);
router.put('/:id', requirePermission('tasks:manage'), ctrl.update);
router.delete('/:id', requirePermission('tasks:manage'), ctrl.remove);

module.exports = router;
