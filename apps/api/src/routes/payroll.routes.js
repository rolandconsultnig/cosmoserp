const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/payroll.controller');
const { authenticate, requireRole, requireTenantUser } = require('../middleware/auth.middleware');

router.use(authenticate, requireTenantUser);
router.get('/summary', ctrl.getSummary);
router.get('/', ctrl.listRuns);
router.post('/process', requireRole('OWNER','ADMIN','HR'), ctrl.processRun);
/** Payslip routes before generic /:id */
router.get(
  '/:id/payslips/:payslipId/print',
  requireRole('OWNER', 'ADMIN', 'HR', 'ACCOUNTANT'),
  ctrl.exportPayslipHtml,
);
router.get(
  '/:id/payslips/:payslipId',
  requireRole('OWNER', 'ADMIN', 'HR', 'ACCOUNTANT'),
  ctrl.getPayslip,
);
router.get('/:id/nibss', requireRole('OWNER','ADMIN','HR'), ctrl.downloadNIBSS);
router.get('/:id/export', requireRole('OWNER','ADMIN','HR'), ctrl.exportRunCSV);
router.post('/:id/approve', requireRole('OWNER','ADMIN'), ctrl.approveRun);
router.post('/:id/mark-paid', requireRole('OWNER','ADMIN'), ctrl.markRunPaid);
router.post('/:id/cancel', requireRole('OWNER','ADMIN'), ctrl.cancelRun);
router.get('/:id', ctrl.getRun);

module.exports = router;
