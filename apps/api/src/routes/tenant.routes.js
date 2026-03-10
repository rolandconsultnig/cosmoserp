const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tenant.controller');
const kycCtrl = require('../controllers/kyc.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { singleKycUpload } = require('../middleware/upload.middleware');

router.post('/register', ctrl.register);
router.get('/me', authenticate, ctrl.getMyTenant);
router.put('/me', authenticate, ctrl.updateMyTenant);
router.get('/me/kyc', authenticate, kycCtrl.getKyc);
router.put('/me/kyc', authenticate, kycCtrl.updateKycForm);
router.post('/me/kyc/documents', authenticate, (req, res, next) => { req.kycTenantId = req.tenantId; next(); }, (req, res, next) => { singleKycUpload(req, res, (err) => { if (err) return res.status(400).json({ error: err.message || 'Upload failed' }); next(); }); }, kycCtrl.uploadDocument);
router.delete('/me/kyc/documents/:docId', authenticate, kycCtrl.deleteDocument);
router.post('/me/kyc/submit', authenticate, kycCtrl.submitKyc);
router.post('/me/kyc', authenticate, ctrl.submitKYC);

router.get('/', authenticate, requireAdmin, ctrl.list);
router.get('/:id', authenticate, requireAdmin, ctrl.getOne);
router.put('/:id/kyc', authenticate, requireAdmin, ctrl.updateKYCStatus);
router.put('/:id/subscription', authenticate, requireAdmin, ctrl.updateSubscription);
router.put('/:id/toggle', authenticate, requireAdmin, ctrl.toggleActive);

module.exports = router;
