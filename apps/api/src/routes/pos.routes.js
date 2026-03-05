const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const pos = require('../controllers/pos.controller');

router.use(authenticate);

router.post('/sale', pos.createSale);
router.get('/sales', pos.listSales);
router.get('/sales/:id', pos.getSale);
router.post('/sales/:id/void', pos.voidSale);
router.get('/stats', pos.getStats);
router.get('/end-of-day', pos.endOfDay);

module.exports = router;
