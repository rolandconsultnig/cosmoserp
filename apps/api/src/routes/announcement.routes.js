const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/announcement.controller');
const { authenticate, requireTenantUser, requirePermission, requireEnabledModule } = require('../middleware/auth.middleware');

router.use(authenticate, requireTenantUser, requireEnabledModule('hrPayroll'));

router.get('/', requirePermission('announcements:view'), ctrl.list);
router.post('/', requirePermission('announcements:manage'), ctrl.create);
router.put('/:id', requirePermission('announcements:manage'), ctrl.update);
router.delete('/:id', requirePermission('announcements:manage'), ctrl.remove);
router.post('/:id/ack', ctrl.ack);

module.exports = router;
