/**
 * Rate Limit Routes (Admin)
 *
 * Administrative endpoints for managing and monitoring rate limits.
 * All routes require authentication and admin role.
 */

const express = require('express');
const {
  getConfig,
  getTierConfig,
  getEffectiveLimitEndpoint,
  getUserLimits,
  getFirmLimits,
  getUserStats,
  getTopUsersForFirm,
  getThrottledRequestsForFirm,
  resetUserLimit,
  resetFirmLimit,
  adjustUserLimit,
  getOverview
} = require('../controllers/rateLimit.controller');
const { authenticate } = require('../middlewares');
const { requireAdmin: adminAuth } = require('../middlewares/adminAuth.middleware');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');

const app = express.Router();

// All admin routes require authentication and admin role
// Admin check is performed in adminAuth middleware

/**
 * @openapi
 * /api/admin/rate-limits/config:
 *   get:
 *     summary: Get rate limit configuration
 *     description: Retrieves complete rate limit configuration including tiers and endpoints
 *     tags:
 *       - Admin - Rate Limits
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rate limit configuration retrieved successfully
 */
app.get('/config', authenticate, adminAuth, apiRateLimiter, getConfig);

/**
 * @openapi
 * /api/admin/rate-limits/overview:
 *   get:
 *     summary: Get rate limit overview
 *     description: Retrieves high-level overview of rate limiting across the system
 *     tags:
 *       - Admin - Rate Limits
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overview retrieved successfully
 */
app.get('/overview', authenticate, adminAuth, apiRateLimiter, getOverview);

/**
 * @openapi
 * /api/admin/rate-limits/tiers/{tier}:
 *   get:
 *     summary: Get tier configuration
 *     description: Retrieves rate limit configuration for a specific tier
 *     tags:
 *       - Admin - Rate Limits
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tier
 *         required: true
 *         schema:
 *           type: string
 *           enum: [free, starter, professional, enterprise]
 *         description: Subscription tier
 *     responses:
 *       200:
 *         description: Tier configuration retrieved successfully
 *       404:
 *         description: Tier not found
 */
app.get('/tiers/:tier', authenticate, adminAuth, apiRateLimiter, getTierConfig);

/**
 * @openapi
 * /api/admin/rate-limits/effective:
 *   get:
 *     summary: Get effective limit
 *     description: Calculate effective limit for a tier and endpoint combination
 *     tags:
 *       - Admin - Rate Limits
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tier
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription tier
 *       - in: query
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Endpoint category
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Endpoint type (optional)
 *     responses:
 *       200:
 *         description: Effective limit calculated successfully
 *       400:
 *         description: Invalid input
 */
app.get('/effective', authenticate, adminAuth, apiRateLimiter, getEffectiveLimitEndpoint);

/**
 * @openapi
 * /api/admin/rate-limits/users/{userId}:
 *   get:
 *     summary: Get user's current limits
 *     description: Retrieves rate limits and usage for a specific user
 *     tags:
 *       - Admin - Rate Limits
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User limits retrieved successfully
 *       404:
 *         description: User not found
 */
app.get('/users/:userId', authenticate, adminAuth, apiRateLimiter, getUserLimits);

/**
 * @openapi
 * /api/admin/rate-limits/users/{userId}/stats:
 *   get:
 *     summary: Get user statistics
 *     description: Retrieves usage statistics for a specific user
 *     tags:
 *       - Admin - Rate Limits
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month]
 *           default: day
 *         description: Time period
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 *       404:
 *         description: User not found
 */
app.get('/users/:userId/stats', authenticate, adminAuth, apiRateLimiter, getUserStats);

/**
 * @openapi
 * /api/admin/rate-limits/users/{userId}/reset:
 *   post:
 *     summary: Reset user's rate limit
 *     description: Resets rate limit counter for a specific user
 *     tags:
 *       - Admin - Rate Limits
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Rate limit reset successfully
 *       404:
 *         description: User not found
 */
app.post('/users/:userId/reset', authenticate, adminAuth, apiRateLimiter, resetUserLimit);

/**
 * @openapi
 * /api/admin/rate-limits/users/{userId}/adjust:
 *   post:
 *     summary: Adjust user's adaptive limit
 *     description: Manually adjust rate limit for a specific user
 *     tags:
 *       - Admin - Rate Limits
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - factor
 *             properties:
 *               factor:
 *                 type: number
 *                 description: Adjustment factor (e.g., 1.5 for 50% increase, 0.7 for 30% decrease)
 *                 minimum: 0.1
 *                 maximum: 10
 *               duration:
 *                 type: number
 *                 description: Duration in seconds (default 86400 - 24 hours)
 *                 minimum: 60
 *     responses:
 *       200:
 *         description: Rate limit adjusted successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: User not found
 */
app.post('/users/:userId/adjust', authenticate, adminAuth, apiRateLimiter, adjustUserLimit);

/**
 * @openapi
 * /api/admin/rate-limits/firms/{firmId}:
 *   get:
 *     summary: Get firm's current limits
 *     description: Retrieves rate limits and usage for a specific firm
 *     tags:
 *       - Admin - Rate Limits
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: firmId
 *         required: true
 *         schema:
 *           type: string
 *         description: Firm ID
 *     responses:
 *       200:
 *         description: Firm limits retrieved successfully
 *       404:
 *         description: Firm not found
 */
app.get('/firms/:firmId', authenticate, adminAuth, apiRateLimiter, getFirmLimits);

/**
 * @openapi
 * /api/admin/rate-limits/firms/{firmId}/top-users:
 *   get:
 *     summary: Get top API users for a firm
 *     description: Retrieves users with highest API usage for a specific firm
 *     tags:
 *       - Admin - Rate Limits
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: firmId
 *         required: true
 *         schema:
 *           type: string
 *         description: Firm ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month]
 *           default: day
 *         description: Time period
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *         description: Number of users to return
 *     responses:
 *       200:
 *         description: Top users retrieved successfully
 *       404:
 *         description: Firm not found
 */
app.get('/firms/:firmId/top-users', authenticate, adminAuth, apiRateLimiter, getTopUsersForFirm);

/**
 * @openapi
 * /api/admin/rate-limits/firms/{firmId}/throttled:
 *   get:
 *     summary: Get throttled requests for a firm
 *     description: Retrieves statistics on throttled requests for a specific firm
 *     tags:
 *       - Admin - Rate Limits
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: firmId
 *         required: true
 *         schema:
 *           type: string
 *         description: Firm ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month]
 *           default: day
 *         description: Time period
 *     responses:
 *       200:
 *         description: Throttled requests retrieved successfully
 *       404:
 *         description: Firm not found
 */
app.get('/firms/:firmId/throttled', authenticate, adminAuth, apiRateLimiter, getThrottledRequestsForFirm);

/**
 * @openapi
 * /api/admin/rate-limits/firms/{firmId}/reset:
 *   post:
 *     summary: Reset firm's rate limit
 *     description: Resets rate limit counter for a specific firm
 *     tags:
 *       - Admin - Rate Limits
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: firmId
 *         required: true
 *         schema:
 *           type: string
 *         description: Firm ID
 *     responses:
 *       200:
 *         description: Rate limit reset successfully
 *       404:
 *         description: Firm not found
 */
app.post('/firms/:firmId/reset', authenticate, adminAuth, apiRateLimiter, resetFirmLimit);

module.exports = app;
