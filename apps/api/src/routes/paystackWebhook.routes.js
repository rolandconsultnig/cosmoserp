const router = require('express').Router();
const { handleWebhook } = require('../controllers/paystackWebhook.controller');

router.post('/', handleWebhook);

module.exports = router;
