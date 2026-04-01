const express = require('express');
const router = express.Router();
const { authenticate, requireRole, requireTenantUser, requireEnabledModule } = require('../middleware/auth.middleware');
const ar = require('../controllers/ar.controller');

router.use(authenticate, requireTenantUser, requireEnabledModule('finance'));

router.get('/collections', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT', 'SALES'), ar.listCollections);
router.post('/collections/send-reminders', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT', 'SALES'), ar.sendOverdueReminders);
router.get('/credit-overview', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT', 'SALES'), ar.getCustomerCreditOverview);

module.exports = router;
