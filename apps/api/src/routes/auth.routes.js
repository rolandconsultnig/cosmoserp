const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

router.post('/login', authController.login);
router.post('/webauthn/register/options', authenticate, authController.webAuthnRegistrationOptions);
router.post('/webauthn/register/verify', authenticate, authController.webAuthnRegistrationVerify);
router.post('/webauthn/authenticate/options', authController.webAuthnAuthenticationOptions);
router.post('/webauthn/authenticate/verify', authController.webAuthnAuthenticationVerify);
router.post('/admin/login', authController.adminLogin);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
// admin-specific profile check (ensure token is admin)
router.get('/admin/me', authenticate, requireAdmin, authController.adminMe);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/admin/forgot-password', authController.adminForgotPassword);
router.post('/admin/reset-password', authController.adminResetPassword);
router.post('/change-password', authenticate, authController.changePassword);

module.exports = router;
