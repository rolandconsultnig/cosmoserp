const router = require('express').Router();
const ctrl = require('../controllers/mailbox.controller');
const { authenticate, requireTenantUser } = require('../middleware/auth.middleware');

router.use(authenticate, requireTenantUser);

router.get('/users', ctrl.listUsers);
router.get('/inbox', ctrl.inbox);
router.get('/sent', ctrl.sent);
router.post('/', ctrl.send);
router.post('/:id/read', ctrl.markRead);

module.exports = router;
