/**
 * WebAuthn Routes
 *
 * Routes for WebAuthn/FIDO2 hardware security key and biometric authentication
 *
 * Public endpoints (no authentication required):
 * - POST /api/auth/webauthn/authenticate/start - Start authentication
 * - POST /api/auth/webauthn/authenticate/finish - Complete authentication
 *
 * Protected endpoints (authentication required):
 * - POST /api/auth/webauthn/register/start - Start registration
 * - POST /api/auth/webauthn/register/finish - Complete registration
 * - GET /api/auth/webauthn/credentials - List credentials
 * - PATCH /api/auth/webauthn/credentials/:id - Update credential name
 * - DELETE /api/auth/webauthn/credentials/:id - Delete credential
 */

const express = require('express');
const {
    startRegistration,
    finishRegistration,
    startAuthentication,
    finishAuthentication,
    getCredentials,
    deleteCredential,
    updateCredentialName
} = require('../controllers/webauthn.controller');
const { authenticate } = require('../middlewares');
const { authRateLimiter, sensitiveRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    validateStartAuthentication,
    validateFinishAuthentication,
    validateFinishRegistration,
    validateUpdateCredentialName,
    validateCredentialIdParam
} = require('../validators/webauthn.validator');

const router = express.Router();

// ========================================
// REGISTRATION ENDPOINTS (Protected)
// ========================================

/**
 * @openapi
 * /api/auth/webauthn/register/start:
 *   post:
 *     summary: Start WebAuthn credential registration
 *     description: Generates registration options for adding a new hardware security key or biometric credential
 *     tags:
 *       - WebAuthn
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Registration options generated successfully
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
 *                   description: WebAuthn registration options
 *       401:
 *         description: Unauthorized - Authentication required
 *       429:
 *         description: Too many requests
 */
router.post('/register/start', authenticate, sensitiveRateLimiter, startRegistration);

/**
 * @openapi
 * /api/auth/webauthn/register/finish:
 *   post:
 *     summary: Complete WebAuthn credential registration
 *     description: Verifies and stores the newly registered credential
 *     tags:
 *       - WebAuthn
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - credential
 *             properties:
 *               credential:
 *                 type: object
 *                 description: WebAuthn credential response from client
 *               credentialName:
 *                 type: string
 *                 description: User-friendly name for the credential
 *                 example: "YubiKey 5 NFC"
 *     responses:
 *       201:
 *         description: Credential registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Security key registered successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Credential database ID
 *                     credentialId:
 *                       type: string
 *                       description: WebAuthn credential ID
 *                     name:
 *                       type: string
 *                       example: "YubiKey 5 NFC"
 *                     deviceType:
 *                       type: string
 *                       enum: [platform, cross-platform]
 *                       example: "cross-platform"
 *                     transports:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["usb", "nfc"]
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request - Invalid credential data
 *       401:
 *         description: Unauthorized - Authentication required
 *       409:
 *         description: Conflict - Credential already registered
 */
router.post('/register/finish', authenticate, sensitiveRateLimiter, validateFinishRegistration, finishRegistration);

// ========================================
// AUTHENTICATION ENDPOINTS (Public)
// ========================================

/**
 * @openapi
 * /api/auth/webauthn/authenticate/start:
 *   post:
 *     summary: Start WebAuthn authentication
 *     description: Generates authentication challenge for login with security key or biometric
 *     tags:
 *       - WebAuthn
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               username:
 *                 type: string
 *                 example: "johndoe"
 *             oneOf:
 *               - required: [email]
 *               - required: [username]
 *     responses:
 *       200:
 *         description: Authentication options generated successfully
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
 *                     options:
 *                       type: object
 *                       description: WebAuthn authentication options
 *                     userId:
 *                       type: string
 *                       description: User ID needed for completion
 *       400:
 *         description: Bad request - Email or username required
 *       401:
 *         description: Invalid credentials
 *       404:
 *         description: No credentials registered for this user
 *       429:
 *         description: Too many requests
 */
router.post('/authenticate/start', authRateLimiter, validateStartAuthentication, startAuthentication);

/**
 * @openapi
 * /api/auth/webauthn/authenticate/finish:
 *   post:
 *     summary: Complete WebAuthn authentication
 *     description: Verifies the authentication response and logs the user in
 *     tags:
 *       - WebAuthn
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - credential
 *               - userId
 *             properties:
 *               credential:
 *                 type: object
 *                 description: WebAuthn authentication response from client
 *               userId:
 *                 type: string
 *                 description: User ID from start authentication response
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Authentication successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT authentication token
 *                     user:
 *                       type: object
 *                       description: User profile information
 *                     credential:
 *                       type: object
 *                       description: Credential used for authentication
 *       400:
 *         description: Bad request - Missing required fields
 *       401:
 *         description: Authentication failed
 *       403:
 *         description: Account suspended or anonymized
 *       404:
 *         description: User or credential not found
 */
router.post('/authenticate/finish', authRateLimiter, validateFinishAuthentication, finishAuthentication);

// ========================================
// CREDENTIAL MANAGEMENT ENDPOINTS (Protected)
// ========================================

/**
 * @openapi
 * /api/auth/webauthn/credentials:
 *   get:
 *     summary: List user's registered credentials
 *     description: Returns all active WebAuthn credentials for the authenticated user
 *     tags:
 *       - WebAuthn
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Credentials retrieved successfully
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
 *                       id:
 *                         type: string
 *                       credentialId:
 *                         type: string
 *                       name:
 *                         type: string
 *                         example: "YubiKey 5 NFC"
 *                       deviceType:
 *                         type: string
 *                         enum: [platform, cross-platform]
 *                       transports:
 *                         type: array
 *                         items:
 *                           type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       lastUsedAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       backedUp:
 *                         type: boolean
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.get('/credentials', authenticate, getCredentials);

/**
 * @openapi
 * /api/auth/webauthn/credentials/{id}:
 *   patch:
 *     summary: Update credential name
 *     description: Updates the user-friendly name of a registered credential
 *     tags:
 *       - WebAuthn
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Credential ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: New name for the credential
 *                 example: "My Primary YubiKey"
 *     responses:
 *       200:
 *         description: Credential name updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Credential name updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *       400:
 *         description: Bad request - Invalid name
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Credential belongs to another user
 *       404:
 *         description: Credential not found
 *   delete:
 *     summary: Delete a credential
 *     description: Revokes and removes a registered credential (requires at least one other active credential)
 *     tags:
 *       - WebAuthn
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Credential ID
 *     responses:
 *       200:
 *         description: Credential deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Credential deleted successfully"
 *       400:
 *         description: Cannot delete last credential
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Credential belongs to another user
 *       404:
 *         description: Credential not found
 */
router.patch('/credentials/:id', authenticate, sensitiveRateLimiter, validateCredentialIdParam, validateUpdateCredentialName, updateCredentialName);
router.delete('/credentials/:id', authenticate, sensitiveRateLimiter, validateCredentialIdParam, deleteCredential);

module.exports = router;
