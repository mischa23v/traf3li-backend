const express = require('express');
const {
    getEnabledProviders,
    authorize,
    callback,
    linkAccount,
    unlinkAccount,
    getLinkedAccounts
} = require('../controllers/oauth.controller');
const {
    detectProvider,
    getDomainConfig,
    generateVerificationToken,
    verifyDomain,
    manualVerifyDomain,
    invalidateDomainCache
} = require('../controllers/ssoRouting.controller');
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

// ═══════════════════════════════════════════════════════════════
// DOMAIN-BASED SSO ROUTING
// ═══════════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/auth/sso/detect:
 *   post:
 *     summary: Detect SSO provider from email address
 *     description: |
 *       Auto-detects which Identity Provider (IdP) to use based on the user's email domain.
 *       Returns provider information and authorization URL if a matching provider is found.
 *     tags:
 *       - SSO Routing
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@biglaw.com
 *                 description: User's email address
 *               firmId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *                 description: Optional firm ID for firm-specific providers
 *               returnUrl:
 *                 type: string
 *                 example: /dashboard
 *                 description: URL to return to after successful authentication
 *     responses:
 *       200:
 *         description: Provider detection result (detected or not)
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     error:
 *                       type: boolean
 *                       example: false
 *                     detected:
 *                       type: boolean
 *                       example: true
 *                     provider:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: 507f1f77bcf86cd799439011
 *                         name:
 *                           type: string
 *                           example: BigLaw Okta
 *                         type:
 *                           type: string
 *                           enum: [saml, oidc]
 *                           example: saml
 *                         providerType:
 *                           type: string
 *                           example: okta
 *                         autoRedirect:
 *                           type: boolean
 *                           example: true
 *                           description: Whether to auto-redirect user (only if domain verified)
 *                         domainVerified:
 *                           type: boolean
 *                           example: true
 *                         priority:
 *                           type: number
 *                           example: 10
 *                     authUrl:
 *                       type: string
 *                       example: https://biglaw.okta.com/oauth2/v1/authorize?...
 *                     message:
 *                       type: string
 *                       example: Sign in with your BigLaw account
 *                     domain:
 *                       type: string
 *                       example: biglaw.com
 *                 - type: object
 *                   properties:
 *                     error:
 *                       type: boolean
 *                       example: false
 *                     detected:
 *                       type: boolean
 *                       example: false
 *                     message:
 *                       type: string
 *                       example: No SSO provider configured for this email domain
 *                     domain:
 *                       type: string
 *                       example: example.com
 *       400:
 *         description: Invalid email format or parameters
 *       500:
 *         description: Server error
 */
app.post('/detect', publicRateLimiter, detectProvider);

/**
 * @openapi
 * /api/auth/sso/domain/{domain}:
 *   get:
 *     summary: Get SSO configuration for a domain (admin use)
 *     description: |
 *       Returns all SSO providers configured for a specific email domain.
 *       Useful for admin dashboards to show domain configuration.
 *     tags:
 *       - SSO Routing
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: domain
 *         required: true
 *         schema:
 *           type: string
 *           example: biglaw.com
 *         description: Email domain to lookup
 *       - in: query
 *         name: firmId
 *         schema:
 *           type: string
 *           example: 507f1f77bcf86cd799439011
 *         description: Optional firm ID for firm-specific providers
 *     responses:
 *       200:
 *         description: Domain configuration retrieved successfully
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
 *                 domain:
 *                   type: string
 *                   example: biglaw.com
 *                 providers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       providerType:
 *                         type: string
 *                       priority:
 *                         type: number
 *                       autoRedirect:
 *                         type: boolean
 *                       domainVerified:
 *                         type: boolean
 *                       verificationMethod:
 *                         type: string
 *                         enum: [dns, email, manual, null]
 *                       verifiedAt:
 *                         type: string
 *                         format: date-time
 *                 primaryProvider:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     providerType:
 *                       type: string
 *       400:
 *         description: Invalid domain format
 *       401:
 *         description: Authentication required
 *       404:
 *         description: No providers configured for domain
 */
app.get('/domain/:domain', authenticate, authRateLimiter, getDomainConfig);

/**
 * @openapi
 * /api/auth/sso/domain/{domain}/verify/generate:
 *   post:
 *     summary: Generate domain verification token
 *     description: |
 *       Generates a DNS TXT record for domain ownership verification.
 *       Returns instructions for adding the TXT record to the domain's DNS.
 *     tags:
 *       - SSO Routing
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: domain
 *         required: true
 *         schema:
 *           type: string
 *           example: biglaw.com
 *         description: Domain to verify
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - providerId
 *             properties:
 *               providerId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *                 description: SSO Provider ID
 *     responses:
 *       200:
 *         description: Verification token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 domain:
 *                   type: string
 *                   example: biglaw.com
 *                 verificationMethod:
 *                   type: string
 *                   example: dns
 *                 txtRecord:
 *                   type: object
 *                   properties:
 *                     host:
 *                       type: string
 *                       example: _traf3li.biglaw.com
 *                     type:
 *                       type: string
 *                       example: TXT
 *                     value:
 *                       type: string
 *                       example: traf3li-verify=abc123def456...
 *                     ttl:
 *                       type: number
 *                       example: 3600
 *                 instructions:
 *                   type: array
 *                   items:
 *                     type: string
 *                 token:
 *                   type: string
 *       400:
 *         description: Invalid domain or provider ID
 *       401:
 *         description: Authentication required
 */
app.post('/domain/:domain/verify/generate', authenticate, authRateLimiter, generateVerificationToken);

/**
 * @openapi
 * /api/auth/sso/domain/{domain}/verify:
 *   post:
 *     summary: Verify domain ownership via DNS
 *     description: |
 *       Checks for the presence of the verification TXT record in the domain's DNS.
 *       If found, marks the domain as verified and enables auto-redirect.
 *     tags:
 *       - SSO Routing
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: domain
 *         required: true
 *         schema:
 *           type: string
 *           example: biglaw.com
 *         description: Domain to verify
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - providerId
 *             properties:
 *               providerId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *                 description: SSO Provider ID
 *     responses:
 *       200:
 *         description: Domain verification successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 verified:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Domain verified successfully
 *                 verifiedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Verification failed or invalid parameters
 *       401:
 *         description: Authentication required
 */
app.post('/domain/:domain/verify', authenticate, authRateLimiter, verifyDomain);

/**
 * @openapi
 * /api/auth/sso/domain/{domain}/verify/manual:
 *   post:
 *     summary: Manually verify domain (admin override)
 *     description: |
 *       Allows administrators to manually verify domain ownership without DNS verification.
 *       Use this for domains that cannot use DNS TXT records or for testing.
 *     tags:
 *       - SSO Routing
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: domain
 *         required: true
 *         schema:
 *           type: string
 *           example: biglaw.com
 *         description: Domain to verify
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - providerId
 *             properties:
 *               providerId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *                 description: SSO Provider ID
 *     responses:
 *       200:
 *         description: Domain verified manually
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 verified:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Domain verified manually by administrator
 *                 verificationMethod:
 *                   type: string
 *                   example: manual
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Authentication required
 */
app.post('/domain/:domain/verify/manual', authenticate, authRateLimiter, manualVerifyDomain);

/**
 * @openapi
 * /api/auth/sso/domain/{domain}/cache/invalidate:
 *   post:
 *     summary: Invalidate domain cache
 *     description: |
 *       Clears the cached SSO provider information for a domain.
 *       Useful after updating provider configuration or domain settings.
 *     tags:
 *       - SSO Routing
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: domain
 *         required: true
 *         schema:
 *           type: string
 *           example: biglaw.com
 *         description: Domain to invalidate cache for
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firmId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *                 description: Optional firm ID
 *     responses:
 *       200:
 *         description: Cache invalidated successfully
 *       400:
 *         description: Invalid domain format
 *       401:
 *         description: Authentication required
 */
app.post('/domain/:domain/cache/invalidate', authenticate, authRateLimiter, invalidateDomainCache);

module.exports = app;
