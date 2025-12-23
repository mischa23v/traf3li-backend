const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referral.controller');
const { userMiddleware } = require('../middlewares');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');

// Apply authentication to all routes
router.use(userMiddleware);
router.use(apiRateLimiter);

// ============================================
// REFERRAL ROUTES
// ============================================

// Statistics (before :id routes)
router.get('/stats', referralController.getStats);
router.get('/top', referralController.getTopReferrers);

// CRUD
router.post('/', referralController.createReferral);
router.get('/', referralController.getReferrals);
router.get('/:id', referralController.getReferral);
router.put('/:id', referralController.updateReferral);
router.delete('/:id', referralController.deleteReferral);

// Referral operations
router.post('/:id/leads', referralController.addLeadReferral);
router.post('/:id/leads/:leadId/convert', referralController.markConverted);
router.post('/:id/payments', referralController.recordPayment);
router.get('/:id/calculate-fee', referralController.calculateFee);

module.exports = router;
