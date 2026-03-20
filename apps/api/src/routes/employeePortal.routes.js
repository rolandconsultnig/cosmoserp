const router = require('express').Router();
const { authenticateEmployeePortal } = require('../middleware/employeePortal.middleware');
const ctrl = require('../controllers/employeePortal.controller');

router.get('/me', authenticateEmployeePortal, ctrl.me);
router.get('/payslips', authenticateEmployeePortal, ctrl.payslips);

module.exports = router;
