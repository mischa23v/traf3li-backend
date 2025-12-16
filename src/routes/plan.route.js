/**
 * Plan Routes
 *
 * Routes for plan management and subscription operations.
 */

const express = require('express');
const router = express.Router();
const planController = require('../controllers/plan.controller');
const { userMiddleware } = require('../middlewares');
const { firmFilter, firmAdminOnly } = require('../middlewares/firmFilter.middleware');

// Public route - get all plans
router.get('/', planController.getPlans);

// Public route - get features comparison
router.get('/features', planController.getFeaturesComparison);

// Protected routes
router.use(userMiddleware);
router.use(firmFilter);

// Get current plan
router.get('/current', planController.getCurrentPlan);

// Get usage statistics
router.get('/usage', planController.getUsage);

// Get limits
router.get('/limits', planController.getLimits);

// Admin only routes
router.post('/start-trial', firmAdminOnly, planController.startTrial);
router.post('/upgrade', firmAdminOnly, planController.upgradePlan);
router.post('/cancel', firmAdminOnly, planController.cancelPlan);

module.exports = router;
