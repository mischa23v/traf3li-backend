/**
 * Rate Limit Routes
 *
 * Rate limiting administration endpoints
 *
 * SECURITY: All routes require authentication + admin authorization
 */

const express = require('express');
const { authenticate } = require('../middlewares');
const { requireAdmin } = require('../middlewares/adminAuth.middleware');
const { publicRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    getConfig,
    getOverview,
    getTierConfig,
    getEffectiveLimitEndpoint,
    getUserLimits,
    getUserStats,
    resetUserLimit,
    adjustUserLimit,
    getFirmLimits,
    getTopUsersForFirm,
    getThrottledRequestsForFirm,
    resetFirmLimit
} = require('../controllers/rateLimit.controller');

const router = express.Router();

// API rate limiter for admin endpoints
const apiRateLimiter = publicRateLimiter;

// ========================================================================
// CONFIGURATION ROUTES
// ========================================================================

router.get('/config', authenticate, requireAdmin, apiRateLimiter, getConfig);

router.get('/overview', authenticate, requireAdmin, apiRateLimiter, getOverview);

router.get('/tiers/:tier', authenticate, requireAdmin, apiRateLimiter, getTierConfig);

router.get('/effective', authenticate, requireAdmin, apiRateLimiter, getEffectiveLimitEndpoint);

// ========================================================================
// USER RATE LIMIT ROUTES
// ========================================================================

router.get('/users/:userId', authenticate, requireAdmin, apiRateLimiter, getUserLimits);

router.get('/users/:userId/stats', authenticate, requireAdmin, apiRateLimiter, getUserStats);

router.post('/users/:userId/reset', authenticate, requireAdmin, apiRateLimiter, resetUserLimit);

router.post('/users/:userId/adjust', authenticate, requireAdmin, apiRateLimiter, adjustUserLimit);

// ========================================================================
// FIRM RATE LIMIT ROUTES
// ========================================================================

router.get('/firms/:firmId', authenticate, requireAdmin, apiRateLimiter, getFirmLimits);

router.get('/firms/:firmId/top-users', authenticate, requireAdmin, apiRateLimiter, getTopUsersForFirm);

router.get('/firms/:firmId/throttled', authenticate, requireAdmin, apiRateLimiter, getThrottledRequestsForFirm);

router.post('/firms/:firmId/reset', authenticate, requireAdmin, apiRateLimiter, resetFirmLimit);

module.exports = router;
