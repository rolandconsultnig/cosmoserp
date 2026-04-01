const express = require('express');
const router = express.Router();
const { authenticate, requireRole, requireTenantUser, requireEnabledModule } = require('../middleware/auth.middleware');
const budgets = require('../controllers/budgets.controller');

router.use(authenticate, requireTenantUser, requireEnabledModule('finance'));

router.get('/', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), budgets.listBudgets);
router.get('/:id', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), budgets.getBudget);
router.post('/', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), budgets.createBudget);
router.patch('/:id/status', requireRole('OWNER', 'ADMIN'), budgets.updateBudgetStatus);
router.post('/:id/lines/upsert', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), budgets.upsertBudgetLines);
router.post('/:id/allocate', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), budgets.allocateBudget);
router.post('/:id/reallocate', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), budgets.reallocateBudget);
router.get('/:id/variance', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), budgets.getBudgetVariance);
router.get('/:id/control-summary', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), budgets.getBudgetControlSummary);

module.exports = router;
