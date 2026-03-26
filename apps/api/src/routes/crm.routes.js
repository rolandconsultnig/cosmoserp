const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/crm.controller');

// All routes are already protected & role-checked in app.js

router.get('/dashboard', ctrl.getDashboard);
router.get('/agents', ctrl.listAgents);
router.get('/businesses', ctrl.listBusinesses);
router.patch('/businesses/:tenantId/kyc', ctrl.updateBusinessKYC);
router.get('/leads', ctrl.listLeads);
router.post('/leads', ctrl.createLead);
router.patch('/leads/:id', ctrl.updateLead);
router.post('/leads/:id/convert', ctrl.convertLead);

module.exports = router;

