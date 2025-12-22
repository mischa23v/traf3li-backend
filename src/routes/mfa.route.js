const express = require('express');
const {
    setupMFA,
    verifySetup,
    verifyMFA,
    disableMFA,
    generateBackupCodes,
    verifyBackupCode,
    regenerateBackupCodes,
    getBackupCodesCount,
    getMFAStatus
} = require('../controllers/mfa.controller');
const { authenticate } = require('../middlewares');
const { authRateLimiter, sensitiveRateLimiter } = require('../middlewares/rateLimiter.middleware');

const router = express.Router();

// ========================================================================
// TOTP Setup & Verification Routes
// ========================================================================

/**
 * @openapi
 * /api/auth/mfa/setup:
 *   post:
 *     summary: Start MFA setup
 *     description: Generate TOTP secret and QR code for authenticator app setup
 *     tags:
 *       - MFA
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: QR code and setup key generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 qrCode:
 *                   type: string
 *                   description: QR code data URL for authenticator app
 *                 setupKey:
 *                   type: string
 *                   description: Manual entry key for authenticator app
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/setup', authenticate, sensitiveRateLimiter, setupMFA);

/**
 * @openapi
 * /api/auth/mfa/verify-setup:
 *   post:
 *     summary: Verify setup and enable MFA
 *     description: Verify TOTP token from authenticator app and enable MFA
 *     tags:
 *       - MFA
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: 6-digit TOTP code from authenticator app
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: MFA enabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 enabled:
 *                   type: boolean
 *                   example: true
 *                 backupCodes:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Backup codes for recovery
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/verify-setup', authenticate, authRateLimiter, verifySetup);

/**
 * @openapi
 * /api/auth/mfa/verify:
 *   post:
 *     summary: Verify TOTP code during login
 *     description: Verify TOTP token for MFA-protected login
 *     tags:
 *       - MFA
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - token
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID
 *               token:
 *                 type: string
 *                 description: 6-digit TOTP code or backup code
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Verification successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 valid:
 *                   type: boolean
 *                   example: true
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/verify', authRateLimiter, verifyMFA);

/**
 * @openapi
 * /api/auth/mfa/disable:
 *   post:
 *     summary: Disable MFA
 *     description: Disable MFA for the authenticated user (requires password confirmation)
 *     tags:
 *       - MFA
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 description: User password for verification
 *     responses:
 *       200:
 *         description: MFA disabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 disabled:
 *                   type: boolean
 *                   example: true
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/disable', authenticate, sensitiveRateLimiter, disableMFA);

/**
 * @openapi
 * /api/auth/mfa/status:
 *   get:
 *     summary: Get MFA status
 *     description: Get MFA status for the authenticated user
 *     tags:
 *       - MFA
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: MFA status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 mfaEnabled:
 *                   type: boolean
 *                 hasTOTP:
 *                   type: boolean
 *                 hasBackupCodes:
 *                   type: boolean
 *                 remainingCodes:
 *                   type: number
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/status', authenticate, getMFAStatus);

// ========================================================================
// Backup Codes Routes
// ========================================================================

/**
 * @openapi
 * /api/auth/mfa/backup-codes/generate:
 *   post:
 *     summary: Generate backup codes
 *     description: Generate new backup codes for MFA recovery
 *     tags:
 *       - MFA
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup codes generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 codes:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/backup-codes/generate', authenticate, sensitiveRateLimiter, generateBackupCodes);

/**
 * @openapi
 * /api/auth/mfa/backup-codes/verify:
 *   post:
 *     summary: Verify backup code
 *     description: Verify a backup code during login (alternative to TOTP)
 *     tags:
 *       - MFA
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - code
 *             properties:
 *               userId:
 *                 type: string
 *               code:
 *                 type: string
 *                 example: "ABCD-1234"
 *     responses:
 *       200:
 *         description: Backup code verified successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/backup-codes/verify', authRateLimiter, verifyBackupCode);

/**
 * @openapi
 * /api/auth/mfa/backup-codes/regenerate:
 *   post:
 *     summary: Regenerate backup codes
 *     description: Regenerate backup codes (invalidates all old codes)
 *     tags:
 *       - MFA
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup codes regenerated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/backup-codes/regenerate', authenticate, sensitiveRateLimiter, regenerateBackupCodes);

/**
 * @openapi
 * /api/auth/mfa/backup-codes/count:
 *   get:
 *     summary: Get remaining backup codes count
 *     description: Get the number of unused backup codes
 *     tags:
 *       - MFA
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup codes count retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/backup-codes/count', authenticate, getBackupCodesCount);

module.exports = router;
