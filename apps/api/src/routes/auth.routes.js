const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/login', authController.login);
router.post('/admin/login', authController.adminLogin);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/change-password', authenticate, authController.changePassword);

module.exports = router;
