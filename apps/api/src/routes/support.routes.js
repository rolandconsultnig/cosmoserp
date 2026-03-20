const express = require('express');
const router = express.Router();
const support = require('../controllers/support.controller');
const { authenticate, requireTenantUser } = require('../middleware/auth.middleware');

router.use(authenticate, requireTenantUser);

router.get('/stats', support.getStats);

router.get('/tickets', support.listTickets);
router.post('/tickets', support.createTicket);
router.get('/tickets/:id', support.getTicket);
router.patch('/tickets/:id', support.updateTicket);
router.post('/tickets/:id/comments', support.addComment);

router.get('/calls', support.listCallLogs);
router.post('/calls', support.createCallLog);

module.exports = router;
