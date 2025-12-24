const express = require('express');
const router = express.Router();
const dealHealthController = require('../controllers/dealHealth.controller');
const { userMiddleware, firmFilter } = require('../middlewares');

// Apply authentication and firm filtering to all routes
router.use(userMiddleware);
router.use(firmFilter);

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
