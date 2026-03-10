const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/marketplace.controller');
const customerCtrl = require('../controllers/marketplaceCustomer.controller');
const { authenticateMarketplace } = require('../middleware/auth.middleware');

router.post('/auth/register', customerCtrl.register);
router.post('/auth/login', customerCtrl.login);
router.get('/customer/me', authenticateMarketplace, customerCtrl.getMe);
router.patch('/customer/me', authenticateMarketplace, customerCtrl.updateProfile);
router.get('/customer/orders', authenticateMarketplace, customerCtrl.listMyOrders);
router.get('/customer/orders/:id', authenticateMarketplace, customerCtrl.getMyOrder);

router.get('/categories', ctrl.listCategories);
router.get('/listings', ctrl.listListings);
router.get('/listings/:idOrSlug', ctrl.getListing);
router.get('/stores/:tenantId', ctrl.getSellerStore);
router.post('/listings/:id/reviews', ctrl.addReview);
router.post('/orders', ctrl.createOrder);
router.post('/orders/:id/pay', ctrl.initiatePayment);
router.get('/orders/verify', ctrl.verifyPayment);
router.get('/orders/:id', ctrl.getOrder);
router.get('/shipping-rates', ctrl.getShippingRates);

module.exports = router;
