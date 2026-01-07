/**
 * Rate Limit Routes
 *
 * Rate limiting administration endpoints
 *
 * SECURITY: All routes require authentication + admin authorization
 */

const express = require('express');
const { authenticate } = require('../middlewares');
const { adminAuth } = require('../middlewares/adminAuth.middleware');
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

router.get('/config', authenticate, adminAuth, apiRateLimiter, getConfig);

router.get('/overview', authenticate, adminAuth, apiRateLimiter, getOverview);

router.get('/tiers/:tier', authenticate, adminAuth, apiRateLimiter, getTierConfig);

router.get('/effective', authenticate, adminAuth, apiRateLimiter, getEffectiveLimitEndpoint);

// ========================================================================
// USER RATE LIMIT ROUTES
// ========================================================================

router.get('/users/:userId', authenticate, adminAuth, apiRateLimiter, getUserLimits);

router.get('/users/:userId/stats', authenticate, adminAuth, apiRateLimiter, getUserStats);

router.post('/users/:userId/reset', authenticate, adminAuth, apiRateLimiter, resetUserLimit);

router.post('/users/:userId/adjust', authenticate, adminAuth, apiRateLimiter, adjustUserLimit);

// ========================================================================
// FIRM RATE LIMIT ROUTES
// ========================================================================

router.get('/firms/:firmId', authenticate, adminAuth, apiRateLimiter, getFirmLimits);

router.get('/firms/:firmId/top-users', authenticate, adminAuth, apiRateLimiter, getTopUsersForFirm);

router.get('/firms/:firmId/throttled', authenticate, adminAuth, apiRateLimiter, getThrottledRequestsForFirm);

router.post('/firms/:firmId/reset', authenticate, adminAuth, apiRateLimiter, resetFirmLimit);

module.exports = router;
