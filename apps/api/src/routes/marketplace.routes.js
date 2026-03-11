const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/marketplace.controller');
const customerCtrl = require('../controllers/marketplaceCustomer.controller');
const platformSupport = require('../controllers/platformSupport.controller');
const transportationCtrl = require('../controllers/transportation.controller');
const budgetCtrl = require('../controllers/budget.controller');
const { authenticateMarketplace } = require('../middleware/auth.middleware');
const { singleAvatarUpload } = require('../middleware/upload.middleware');

router.post('/auth/register', customerCtrl.register);
router.post('/auth/login', customerCtrl.login);
router.post('/auth/forgot-password', customerCtrl.forgotPassword);
router.post('/auth/reset-password', customerCtrl.resetPassword);
router.get('/auth/verify-email', customerCtrl.verifyEmail);
router.post('/auth/verify-email', customerCtrl.verifyEmail);
router.post('/auth/resend-verification', customerCtrl.resendVerificationEmail);
router.get('/customer/me', authenticateMarketplace, customerCtrl.getMe);
router.patch('/customer/me', authenticateMarketplace, customerCtrl.updateProfile);
router.post('/customer/change-password', authenticateMarketplace, customerCtrl.changePassword);
router.post('/customer/avatar', authenticateMarketplace, (req, res, next) => {
  singleAvatarUpload(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
    next();
  });
}, customerCtrl.uploadAvatar);
router.get('/customer/orders', authenticateMarketplace, customerCtrl.listMyOrders);
router.get('/customer/orders/:id', authenticateMarketplace, customerCtrl.getMyOrder);
router.get('/customer/addresses', authenticateMarketplace, customerCtrl.listAddresses);
router.post('/customer/addresses', authenticateMarketplace, customerCtrl.upsertAddress);
router.put('/customer/addresses/:id', authenticateMarketplace, customerCtrl.upsertAddress);
router.delete('/customer/addresses/:id', authenticateMarketplace, customerCtrl.deleteAddress);

// Live support / ticketing (customer)
router.post('/support/tickets', authenticateMarketplace, platformSupport.createTicket);
router.get('/support/tickets', authenticateMarketplace, platformSupport.listMyTickets);
router.get('/support/tickets/:id', authenticateMarketplace, platformSupport.getMyTicket);
router.post('/support/tickets/:id/messages', authenticateMarketplace, platformSupport.addMessage);

// Customer wallet (with escrow support — deposit/checkout flow can use wallet later)
const walletCtrl = require('../controllers/wallet.controller');
router.get('/customer/wallet', authenticateMarketplace, walletCtrl.getMyWallet);
router.post('/customer/wallet/deposit', authenticateMarketplace, walletCtrl.initiateDeposit);
router.post('/customer/wallet/request-loan', authenticateMarketplace, walletCtrl.requestLoan);
router.post('/customer/wallet/pay-electricity', authenticateMarketplace, walletCtrl.payElectricity);
router.post('/customer/wallet/buy-airtime', authenticateMarketplace, walletCtrl.buyAirtime);
router.post('/customer/wallet/buy-data', authenticateMarketplace, walletCtrl.buyData);
router.post('/customer/wallet/transfer-cosmos', authenticateMarketplace, walletCtrl.transferToCosmos);
router.post('/customer/wallet/transfer-bank', authenticateMarketplace, walletCtrl.transferToBank);

// Transportation bookings
router.get('/transport/bookings', authenticateMarketplace, transportationCtrl.listMyBookings);
router.post('/transport/bookings', authenticateMarketplace, transportationCtrl.createBooking);

// Budget plans
router.get('/customer/budget', authenticateMarketplace, budgetCtrl.getMyBudget);
router.post('/customer/budget', authenticateMarketplace, budgetCtrl.saveMyBudget);

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
