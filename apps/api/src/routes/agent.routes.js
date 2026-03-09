const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/agent.controller');

// All routes are already protected & role-checked in app.js

router.get('/me', ctrl.getMe);
router.get('/businesses', ctrl.listBusinesses);
router.post('/businesses', ctrl.createBusiness);

module.exports = router;

