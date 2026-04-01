const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/attendance.controller');
const { authenticate, requireTenantUser, requireRole, requireEnabledModule } = require('../middleware/auth.middleware');

router.use(authenticate, requireTenantUser, requireEnabledModule('hrPayroll'));

router.get('/shifts', requireRole('OWNER', 'ADMIN', 'HR'), ctrl.listShifts);
router.post('/shifts', requireRole('OWNER', 'ADMIN', 'HR'), ctrl.createShift);
router.put('/shifts/:id', requireRole('OWNER', 'ADMIN', 'HR'), ctrl.updateShift);

router.get('/entries', requireRole('OWNER', 'ADMIN', 'HR'), ctrl.listEntries);

router.get('/me', ctrl.meAttendance);
router.post('/clock-in', ctrl.clockIn);
router.post('/:id/clock-out', ctrl.clockOut);

module.exports = router;
