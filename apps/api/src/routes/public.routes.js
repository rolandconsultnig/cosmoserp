const express = require('express');
const router = express.Router();
const siteVisit = require('../controllers/siteVisit.controller');

router.post('/visits', siteVisit.collectVisit);

module.exports = router;
