const express = require('express');
const {
    getEnabledProviders,
    authorize,
    callback,
    linkAccount,
    unlinkAccount,
    getLinkedAccounts
} = require('../controllers/oauth.controller');
const { authenticate } = require('../middlewares');
const { authRateLimiter, publicRateLimiter } = require('../middlewares/rateLimiter.middleware');

const app = express.Router();

/**
 * @openapi
 * /api/auth/sso/providers:
 *   get:
 *     summary: Get enabled OAuth SSO providers
 *     description: Returns a list of enabled OAuth providers (Google, Microsoft, etc.) available for authentication
 *     tags:
 *       - OAuth SSO
 *     parameters:
 *       - in: query
 *         name: firmId
 *         schema:
 *           type: string
 *         description: Optional firm ID to get firm-specific providers
 *     responses:
 *       200:
 *         description: Providers retrieved successfully
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
 *                 providers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                         example: Google Workspace
 *                       providerType:
 *                         type: string
 *                         enum: [google, microsoft, okta, auth0, custom]
 *                       isEnabled:
 *                         type: boolean
 */
app.get('/providers', publicRateLimiter, getEnabledProviders);

/**
 * @openapi
 * /api/auth/sso/{providerType}/authorize:
 *   get:
 *     summary: Start OAuth authorization flow
 *     description: Generates an authorization URL and redirects user to OAuth provider for authentication
 *     tags:
 *       - OAuth SSO
 *     parameters:
 *       - in: path
 *         name: providerType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, microsoft, okta, auth0]
 *         description: OAuth provider type
 *       - in: query
 *         name: returnUrl
 *         schema:
 *           type: string
 *           default: /
 *         description: URL to return to after successful authentication
 *       - in: query
 *         name: firmId
 *         schema:
 *           type: string
 *         description: Optional firm ID for firm-specific providers
 *     responses:
 *       200:
 *         description: Authorization URL generated successfully
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
 *                 authUrl:
 *                   type: string
 *                   example: https://accounts.google.com/o/oauth2/v2/auth?client_id=...
 *       400:
 *         description: Invalid provider or configuration
 *       404:
 *         description: Provider not found or not enabled
 */
app.get('/:providerType/authorize', publicRateLimiter, authorize);

/**
 * @openapi
 * /api/auth/sso/{providerType}/callback:
 *   get:
 *     summary: OAuth callback endpoint
 *     description: Handles the OAuth callback from the provider, exchanges code for tokens, and authenticates the user
 *     tags:
 *       - OAuth SSO
 *     parameters:
 *       - in: path
 *         name: providerType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, microsoft, okta, auth0]
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Authorization code from OAuth provider
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *         description: State token for CSRF protection
 *       - in: query
 *         name: error
 *         schema:
 *           type: string
 *         description: Error code if authorization failed
 *       - in: query
 *         name: error_description
 *         schema:
 *           type: string
 *         description: Error description if authorization failed
 *     responses:
 *       302:
 *         description: Redirects to frontend with authentication result
 *       400:
 *         description: Invalid callback parameters
 */
app.get('/:providerType/callback', callback);

/**
 * @openapi
 * /api/auth/sso/link:
 *   post:
 *     summary: Link OAuth account to existing user
 *     description: Connects an OAuth provider account to the authenticated user's account for future SSO login
 *     tags:
 *       - OAuth SSO
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - providerType
 *               - code
 *               - redirectUri
 *             properties:
 *               providerType:
 *                 type: string
 *                 enum: [google, microsoft, okta, auth0]
 *                 description: OAuth provider type
 *               code:
 *                 type: string
 *                 description: Authorization code from OAuth flow
 *               redirectUri:
 *                 type: string
 *                 description: Redirect URI used in authorization request
 *     responses:
 *       200:
 *         description: Account linked successfully
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
 *                   example: OAuth account linked successfully
 *                 messageAr:
 *                   type: string
 *                   example: تم ربط حساب OAuth بنجاح
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid request or email mismatch
 *       401:
 *         description: Authentication required
 *       409:
 *         description: Account already linked
 */
app.post('/link', authenticate, authRateLimiter, linkAccount);

/**
 * @openapi
 * /api/auth/sso/unlink/{providerType}:
 *   delete:
 *     summary: Unlink OAuth account from user
 *     description: Removes the connection between the user's account and an OAuth provider
 *     tags:
 *       - OAuth SSO
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: providerType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, microsoft, okta, auth0]
 *         description: OAuth provider type to unlink
 *     responses:
 *       200:
 *         description: Account unlinked successfully
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
 *                   example: OAuth account unlinked successfully
 *                 messageAr:
 *                   type: string
 *                   example: تم إلغاء ربط حساب OAuth بنجاح
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Cannot unlink (e.g., no password set)
 *       401:
 *         description: Authentication required
 *       404:
 *         description: SSO link not found
 */
app.delete('/unlink/:providerType', authenticate, authRateLimiter, unlinkAccount);

/**
 * @openapi
 * /api/auth/sso/linked:
 *   get:
 *     summary: Get user's linked OAuth accounts
 *     description: Returns all OAuth providers linked to the authenticated user's account
 *     tags:
 *       - OAuth SSO
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Linked accounts retrieved successfully
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
 *                 links:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       providerType:
 *                         type: string
 *                       externalEmail:
 *                         type: string
 *                       lastLoginAt:
 *                         type: string
 *                         format: date-time
 *                       isActive:
 *                         type: boolean
 *       401:
 *         description: Authentication required
 */
app.get('/linked', authenticate, publicRateLimiter, getLinkedAccounts);

module.exports = app;
