const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/employee.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', requireRole('OWNER','ADMIN','HR'), ctrl.create);
router.put('/:id', requireRole('OWNER','ADMIN','HR'), ctrl.update);

module.exports = router;
