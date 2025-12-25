/**
 * Apps Routes
 *
 * Unified API for managing all third-party app integrations.
 * Provides a consistent interface for connecting, disconnecting, and syncing apps.
 *
 * Base route: /api/apps
 */

const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const { checkPermission } = require('../middlewares/authorize.middleware');
const { createRateLimiter } = require('../middlewares/rateLimiter.middleware');

// Import controllers
const {
    listApps,
    getApp,
    connectApp,
    disconnectApp,
    getAppSettings,
    updateAppSettings,
    syncApp,
    testApp,
    getCategories,
    getStats
} = require('../controllers/apps.controller');

const router = express.Router();

// ============================================================================
// RATE LIMITERS
// ============================================================================

// Standard rate limiter for read operations
const readRateLimiter = createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: {
        success: false,
        error: 'طلبات كثيرة جداً - حاول مرة أخرى بعد دقيقة',
        error_en: 'Too many requests - Try again after 1 minute',
        code: 'RATE_LIMIT_EXCEEDED',
    },
});

// Rate limiter for write operations (connect, disconnect, update)
const writeRateLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 requests per 5 minutes
    message: {
        success: false,
        error: 'طلبات كثيرة جداً - حاول مرة أخرى بعد 5 دقائق',
        error_en: 'Too many requests - Try again after 5 minutes',
        code: 'RATE_LIMIT_EXCEEDED',
    },
});

// Rate limiter for sync operations (more restrictive)
const syncRateLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 sync operations per 5 minutes
    message: {
        success: false,
        error: 'عمليات مزامنة كثيرة جداً - حاول مرة أخرى بعد 5 دقائق',
        error_en: 'Too many sync operations - Try again after 5 minutes',
        code: 'SYNC_RATE_LIMIT_EXCEEDED',
    },
});

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

/**
 * @openapi
 * /api/apps/categories:
 *   get:
 *     summary: Get app categories
 *     description: Returns all available app categories (communication, productivity, etc.)
 *     tags:
 *       - Apps
 *     responses:
 *       200:
 *         description: App categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: communication
 *                       apps:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             icon:
 *                               type: string
 */
router.get('/categories', readRateLimiter, getCategories);

// ============================================================================
// AUTHENTICATED ROUTES
// ============================================================================

// Apply authentication and firm filter to all routes below
router.use(userMiddleware);
router.use(firmFilter);

/**
 * @openapi
 * /api/apps:
 *   get:
 *     summary: List all available apps
 *     description: Returns all available apps with their connection status for the current firm
 *     tags:
 *       - Apps
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Apps list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     apps:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: slack
 *                           name:
 *                             type: string
 *                             example: Slack
 *                           description:
 *                             type: string
 *                           icon:
 *                             type: string
 *                           category:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [connected, disconnected, error, pending]
 *                           isConnected:
 *                             type: boolean
 *                           connectedAt:
 *                             type: string
 *                             format: date-time
 *                           lastSyncAt:
 *                             type: string
 *                             format: date-time
 *                     total:
 *                       type: number
 *                     connected:
 *                       type: number
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get(
    '/',
    readRateLimiter,
    checkPermission('view:integrations'),
    listApps
);

/**
 * @openapi
 * /api/apps/stats:
 *   get:
 *     summary: Get firm integration statistics
 *     description: Returns statistics about app integrations for the current firm
 *     tags:
 *       - Apps
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     connected:
 *                       type: number
 *                     disconnected:
 *                       type: number
 *                     error:
 *                       type: number
 *                     pending:
 *                       type: number
 *                     totalSyncs:
 *                       type: number
 *                     successfulSyncs:
 *                       type: number
 *                     failedSyncs:
 *                       type: number
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get(
    '/stats',
    readRateLimiter,
    checkPermission('view:integrations'),
    getStats
);

/**
 * @openapi
 * /api/apps/{appId}:
 *   get:
 *     summary: Get app details and status
 *     description: Returns detailed information about a specific app including connection status
 *     tags:
 *       - Apps
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *         description: App identifier (e.g., slack, discord, github)
 *     responses:
 *       200:
 *         description: App details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     icon:
 *                       type: string
 *                     category:
 *                       type: string
 *                     status:
 *                       type: string
 *                     isConnected:
 *                       type: boolean
 *                     connectedAt:
 *                       type: string
 *                       format: date-time
 *                     lastSyncAt:
 *                       type: string
 *                       format: date-time
 *                     settings:
 *                       type: object
 *                     metadata:
 *                       type: object
 *                     stats:
 *                       type: object
 *       404:
 *         description: App not found
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get(
    '/:appId',
    readRateLimiter,
    checkPermission('view:integrations'),
    getApp
);

/**
 * @openapi
 * /api/apps/{appId}/connect:
 *   post:
 *     summary: Start app connection flow
 *     description: Initiates OAuth flow for connecting an app (returns auth URL)
 *     tags:
 *       - Apps
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Auth URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     authUrl:
 *                       type: string
 *                       description: URL to redirect user for OAuth
 *                     appId:
 *                       type: string
 *                     appName:
 *                       type: string
 *                     message:
 *                       type: string
 *       404:
 *         description: App not found
 *       400:
 *         description: App does not support OAuth
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post(
    '/:appId/connect',
    writeRateLimiter,
    checkPermission('manage:integrations'),
    connectApp
);

/**
 * @openapi
 * /api/apps/{appId}/disconnect:
 *   post:
 *     summary: Disconnect an app
 *     description: Disconnects an app and revokes access
 *     tags:
 *       - Apps
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for disconnecting
 *     responses:
 *       200:
 *         description: App disconnected successfully
 *       404:
 *         description: App connection not found
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post(
    '/:appId/disconnect',
    writeRateLimiter,
    checkPermission('manage:integrations'),
    disconnectApp
);

/**
 * @openapi
 * /api/apps/{appId}/settings:
 *   get:
 *     summary: Get app settings
 *     description: Returns current settings for a connected app
 *     tags:
 *       - Apps
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
 *       404:
 *         description: App not found
 *       400:
 *         description: App not connected
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get(
    '/:appId/settings',
    readRateLimiter,
    checkPermission('view:integrations'),
    getAppSettings
);

/**
 * @openapi
 * /api/apps/{appId}/settings:
 *   put:
 *     summary: Update app settings
 *     description: Updates settings for a connected app
 *     tags:
 *       - Apps
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               settings:
 *                 type: object
 *                 description: App-specific settings object
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       404:
 *         description: App connection not found
 *       400:
 *         description: Invalid settings
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.put(
    '/:appId/settings',
    writeRateLimiter,
    checkPermission('manage:integrations'),
    updateAppSettings
);

/**
 * @openapi
 * /api/apps/{appId}/sync:
 *   post:
 *     summary: Trigger manual sync
 *     description: Manually triggers data synchronization for an app
 *     tags:
 *       - Apps
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sync triggered successfully
 *       404:
 *         description: App connection not found
 *       400:
 *         description: App not connected
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       429:
 *         description: Too many sync requests
 */
router.post(
    '/:appId/sync',
    syncRateLimiter,
    checkPermission('manage:integrations'),
    syncApp
);

/**
 * @openapi
 * /api/apps/{appId}/test:
 *   post:
 *     summary: Test app connection
 *     description: Tests the connection to verify the app is working correctly
 *     tags:
 *       - Apps
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Connection test completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     test:
 *                       type: object
 *                       properties:
 *                         success:
 *                           type: boolean
 *                         message:
 *                           type: string
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *       404:
 *         description: App connection not found
 *       400:
 *         description: App not connected
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
    '/:appId/test',
    writeRateLimiter,
    checkPermission('manage:integrations'),
    testApp
);

module.exports = router;
