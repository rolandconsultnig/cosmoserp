const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/payroll.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', ctrl.listRuns);
router.get('/:id', ctrl.getRun);
router.post('/process', requireRole('OWNER','ADMIN','HR'), ctrl.processRun);
router.post('/:id/approve', requireRole('OWNER','ADMIN'), ctrl.approveRun);
router.get('/:id/nibss', requireRole('OWNER','ADMIN','HR'), ctrl.downloadNIBSS);
router.get('/:id/payslips/:payslipId', ctrl.getPayslip);

module.exports = router;
