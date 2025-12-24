const express = require('express');
const router = express.Router();
const dealHealthController = require('../controllers/dealHealth.controller');
const authenticate = require('../middlewares/authenticate');

// Apply authentication to all routes
router.use(authenticate);

// ============================================
// DEAL HEALTH ROUTES
// ============================================

// Health overview (before :id routes)
router.get('/distribution', dealHealthController.getHealthDistribution);
router.get('/attention', dealHealthController.getDealsNeedingAttention);
router.get('/stuck', dealHealthController.getStuckDeals);

// Individual deal health
router.get('/:id', dealHealthController.getDealHealth);
router.post('/:id/refresh', dealHealthController.refreshDealHealth);
router.post('/:id/unstuck', dealHealthController.unstuckDeal);

module.exports = router;
