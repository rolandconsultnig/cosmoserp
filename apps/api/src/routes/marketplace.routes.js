const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/marketplace.controller');
const customerCtrl = require('../controllers/marketplaceCustomer.controller');
const platformSupport = require('../controllers/platformSupport.controller');
const { authenticateMarketplace } = require('../middleware/auth.middleware');

router.post('/auth/register', customerCtrl.register);
router.post('/auth/login', customerCtrl.login);
router.get('/auth/verify-email', customerCtrl.verifyEmail);
router.post('/auth/verify-email', customerCtrl.verifyEmail);
router.post('/auth/resend-verification', customerCtrl.resendVerificationEmail);
router.get('/customer/me', authenticateMarketplace, customerCtrl.getMe);
router.patch('/customer/me', authenticateMarketplace, customerCtrl.updateProfile);
router.get('/customer/orders', authenticateMarketplace, customerCtrl.listMyOrders);
router.get('/customer/orders/:id', authenticateMarketplace, customerCtrl.getMyOrder);

// Live support / ticketing (customer)
router.post('/support/tickets', authenticateMarketplace, platformSupport.createTicket);
router.get('/support/tickets', authenticateMarketplace, platformSupport.listMyTickets);
router.get('/support/tickets/:id', authenticateMarketplace, platformSupport.getMyTicket);
router.post('/support/tickets/:id/messages', authenticateMarketplace, platformSupport.addMessage);

// Customer wallet (with escrow support — deposit/checkout flow can use wallet later)
const walletCtrl = require('../controllers/wallet.controller');
router.get('/customer/wallet', authenticateMarketplace, walletCtrl.getMyWallet);
router.post('/customer/wallet/deposit', authenticateMarketplace, walletCtrl.initiateDeposit);

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
