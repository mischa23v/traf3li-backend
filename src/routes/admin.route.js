/**
 * Admin Routes - Token Revocation Management
 *
 * Administrative endpoints for managing token revocations and security.
 * All routes require authentication and admin role.
 */

const express = require('express');
const {
    revokeUserTokens,
    getRecentRevocations,
    getRevocationStats,
    getUserRevocationHistory,
    cleanupExpiredTokens
} = require('../controllers/admin.controller');
const {
    expireUserPassword,
    expireAllFirmPasswords,
    getFirmPasswordStats
} = require('../controllers/adminPasswordManagement.controller');
const { authenticate } = require('../middlewares');
const { sensitiveRateLimiter, publicRateLimiter } = require('../middlewares/rateLimiter.middleware');

const app = express.Router();

// All admin routes require authentication
// Additional admin role check is performed in each controller

/**
 * @openapi
 * /api/admin/users/{id}/revoke-tokens:
 *   post:
 *     summary: Revoke all tokens for a user (Admin)
 *     description: Administratively revokes all active tokens for a specific user
 *     tags:
 *       - Admin - Token Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 enum: [admin_revoke, security_incident, account_suspended, account_deleted]
 *                 default: admin_revoke
 *               notes:
 *                 type: string
 *                 description: Additional notes about the revocation
 *     responses:
 *       200:
 *         description: All tokens revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     userEmail:
 *                       type: string
 *                     reason:
 *                       type: string
 *                     revokedAt:
 *                       type: string
 *                       format: date-time
 *       403:
 *         description: Admin access required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
app.post('/users/:id/revoke-tokens', authenticate, sensitiveRateLimiter, revokeUserTokens);

/**
 * @openapi
 * /api/admin/revoked-tokens:
 *   get:
 *     summary: Get recent token revocations (Admin)
 *     description: Retrieves a list of recent token revocations with filtering options
 *     tags:
 *       - Admin - Token Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of results to return
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of results to skip (pagination)
 *       - in: query
 *         name: reason
 *         schema:
 *           type: string
 *           enum: [logout, logout_all, password_change, security_incident, admin_revoke, account_suspended, account_deleted]
 *         description: Filter by revocation reason
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter revocations after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter revocations before this date
 *     responses:
 *       200:
 *         description: Revocations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: string
 *                       userEmail:
 *                         type: string
 *                       reason:
 *                         type: string
 *                       revokedAt:
 *                         type: string
 *                         format: date-time
 *                       revokedBy:
 *                         type: object
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     byReason:
 *                       type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: number
 *                     skip:
 *                       type: number
 *                     total:
 *                       type: number
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
app.get('/revoked-tokens', authenticate, publicRateLimiter, getRecentRevocations);

/**
 * @openapi
 * /api/admin/revoked-tokens/stats:
 *   get:
 *     summary: Get token revocation statistics (Admin)
 *     description: Retrieves statistics about token revocations
 *     tags:
 *       - Admin - Token Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter revocations after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter revocations before this date
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     byReason:
 *                       type: object
 *                       additionalProperties:
 *                         type: number
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
app.get('/revoked-tokens/stats', authenticate, publicRateLimiter, getRevocationStats);

/**
 * @openapi
 * /api/admin/users/{id}/revocations:
 *   get:
 *     summary: Get revocation history for a user (Admin)
 *     description: Retrieves token revocation history for a specific user
 *     tags:
 *       - Admin - Token Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of results to return
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of results to skip (pagination)
 *       - in: query
 *         name: reason
 *         schema:
 *           type: string
 *         description: Filter by revocation reason
 *     responses:
 *       200:
 *         description: Revocation history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *       403:
 *         description: Admin access required or firm access denied
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
app.get('/users/:id/revocations', authenticate, publicRateLimiter, getUserRevocationHistory);

/**
 * @openapi
 * /api/admin/revoked-tokens/cleanup:
 *   post:
 *     summary: Cleanup expired revoked tokens (Admin)
 *     description: Manually triggers cleanup of expired revoked tokens from database
 *     tags:
 *       - Admin - Token Management
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedCount:
 *                       type: number
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
app.post('/revoked-tokens/cleanup', authenticate, sensitiveRateLimiter, cleanupExpiredTokens);

// ========== Password Management (Admin) ==========
/**
 * @openapi
 * /api/admin/users/{id}/expire-password:
 *   post:
 *     summary: Force user to change password (Admin)
 *     description: Administratively forces a specific user to change their password on next login
 *     tags:
 *       - Admin - Password Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for forcing password change
 *               notifyUser:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to send email notification to user
 *     responses:
 *       200:
 *         description: User password expired successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       403:
 *         description: Admin access required
 *       404:
 *         description: User not found
 */
app.post('/users/:id/expire-password', authenticate, sensitiveRateLimiter, expireUserPassword);

/**
 * @openapi
 * /api/admin/firm/expire-all-passwords:
 *   post:
 *     summary: Force all firm users to change passwords (Admin)
 *     description: Forces all users in the firm to change their passwords on next login
 *     tags:
 *       - Admin - Password Management
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for forcing password changes
 *               notifyUsers:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to send email notifications to all users
 *               excludeSelf:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to exclude the admin from password change requirement
 *     responses:
 *       200:
 *         description: All firm users required to change password
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     firmId:
 *                       type: string
 *                     affectedCount:
 *                       type: number
 *       403:
 *         description: Firm owner/admin access required
 */
app.post('/firm/expire-all-passwords', authenticate, sensitiveRateLimiter, expireAllFirmPasswords);

/**
 * @openapi
 * /api/admin/firm/password-stats:
 *   get:
 *     summary: Get firm password policy statistics (Admin)
 *     description: Returns statistics about password expiration status for all firm users
 *     tags:
 *       - Admin - Password Management
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Password statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: number
 *                         mustChangePassword:
 *                           type: number
 *                         expired:
 *                           type: number
 *                         expiringSoon:
 *                           type: number
 *                         neverChanged:
 *                           type: number
 *                         healthy:
 *                           type: number
 *                     policy:
 *                       type: object
 *                     users:
 *                       type: object
 *       403:
 *         description: Admin access required
 */
app.get('/firm/password-stats', authenticate, publicRateLimiter, getFirmPasswordStats);

module.exports = app;
