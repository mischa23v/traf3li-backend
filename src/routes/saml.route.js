const express = require('express');
const {
    getSPMetadata,
    initiateLogin,
    assertionConsumerService,
    initiateSingleLogout,
    singleLogoutService,
    getSAMLConfig,
    updateSAMLConfig,
    testSAMLConfig
} = require('../controllers/saml.controller');
const { authenticate } = require('../middlewares');
const { publicRateLimiter, authRateLimiter } = require('../middlewares/rateLimiter.middleware');

const app = express.Router();

/**
 * SAML/SSO Routes for Enterprise Integration
 *
 * Public SAML endpoints (no authentication required):
 * - Metadata, Login, ACS, SLO, SLS
 *
 * Admin endpoints (authentication required):
 * - Config management
 */

// ═══════════════════════════════════════════════════════════════
// PUBLIC SAML ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/auth/saml/metadata/{firmId}:
 *   get:
 *     summary: Get Service Provider metadata
 *     description: Returns SAML SP metadata XML for IdP configuration
 *     tags:
 *       - SAML/SSO
 *     parameters:
 *       - in: path
 *         name: firmId
 *         required: true
 *         schema:
 *           type: string
 *         description: Firm ID
 *     responses:
 *       200:
 *         description: SP metadata XML
 *         content:
 *           application/xml:
 *             schema:
 *               type: string
 *       404:
 *         description: Firm not found
 *       500:
 *         description: Server error
 */
app.get('/metadata/:firmId', publicRateLimiter, getSPMetadata);

/**
 * @openapi
 * /api/auth/saml/login/{firmId}:
 *   get:
 *     summary: Initiate SSO login
 *     description: Redirects to IdP for SAML authentication
 *     tags:
 *       - SAML/SSO
 *     parameters:
 *       - in: path
 *         name: firmId
 *         required: true
 *         schema:
 *           type: string
 *         description: Firm ID
 *       - in: query
 *         name: RelayState
 *         schema:
 *           type: string
 *         description: Optional relay state (redirect path after login)
 *     responses:
 *       302:
 *         description: Redirect to IdP
 *       400:
 *         description: SSO not enabled
 *       404:
 *         description: Firm not found
 */
app.get('/login/:firmId', authRateLimiter, initiateLogin);

/**
 * @openapi
 * /api/auth/saml/acs/{firmId}:
 *   post:
 *     summary: Assertion Consumer Service
 *     description: Receives and processes SAML assertion from IdP
 *     tags:
 *       - SAML/SSO
 *     parameters:
 *       - in: path
 *         name: firmId
 *         required: true
 *         schema:
 *           type: string
 *         description: Firm ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               SAMLResponse:
 *                 type: string
 *                 description: Base64-encoded SAML assertion
 *               RelayState:
 *                 type: string
 *                 description: Relay state
 *     responses:
 *       302:
 *         description: Redirect to application after successful authentication
 *       400:
 *         description: Invalid SAML response
 *       404:
 *         description: Firm not found
 */
app.post('/acs/:firmId', assertionConsumerService);

/**
 * @openapi
 * /api/auth/saml/logout/{firmId}:
 *   get:
 *     summary: Initiate Single Logout
 *     description: Initiates SAML Single Logout (SLO) flow
 *     tags:
 *       - SAML/SSO
 *     parameters:
 *       - in: path
 *         name: firmId
 *         required: true
 *         schema:
 *           type: string
 *         description: Firm ID
 *     responses:
 *       302:
 *         description: Redirect to IdP logout
 *       404:
 *         description: Firm not found
 */
app.get('/logout/:firmId', initiateSingleLogout);

/**
 * @openapi
 * /api/auth/saml/sls/{firmId}:
 *   post:
 *     summary: Single Logout Service
 *     description: Receives logout response from IdP
 *     tags:
 *       - SAML/SSO
 *     parameters:
 *       - in: path
 *         name: firmId
 *         required: true
 *         schema:
 *           type: string
 *         description: Firm ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               SAMLResponse:
 *                 type: string
 *                 description: Base64-encoded SAML logout response
 *     responses:
 *       302:
 *         description: Redirect to login page after logout
 *       404:
 *         description: Firm not found
 */
app.post('/sls/:firmId', singleLogoutService);

// ═══════════════════════════════════════════════════════════════
// ADMIN CONFIGURATION ENDPOINTS (Authentication Required)
// ═══════════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/auth/saml/config:
 *   get:
 *     summary: Get SAML configuration
 *     description: Get current SAML/SSO configuration for firm (Admin only)
 *     tags:
 *       - SAML/SSO
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SAML configuration retrieved
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
 *                   example: Success
 *                 config:
 *                   type: object
 *                   properties:
 *                     ssoEnabled:
 *                       type: boolean
 *                     ssoProvider:
 *                       type: string
 *                       enum: [azure, okta, google, custom]
 *                     ssoEntityId:
 *                       type: string
 *                     ssoSsoUrl:
 *                       type: string
 *                     ssoMetadataUrl:
 *                       type: string
 *                     hasCertificate:
 *                       type: boolean
 *                     spEntityId:
 *                       type: string
 *                     spAcsUrl:
 *                       type: string
 *                     spSloUrl:
 *                       type: string
 *                     spMetadataUrl:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
app.get('/config', authenticate, getSAMLConfig);

/**
 * @openapi
 * /api/auth/saml/config:
 *   put:
 *     summary: Update SAML configuration
 *     description: Update SAML/SSO configuration for firm (Admin only)
 *     tags:
 *       - SAML/SSO
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ssoProvider
 *               - ssoEntityId
 *               - ssoSsoUrl
 *               - ssoCertificate
 *             properties:
 *               ssoEnabled:
 *                 type: boolean
 *                 description: Enable or disable SSO
 *               ssoProvider:
 *                 type: string
 *                 enum: [azure, okta, google, custom]
 *                 description: SSO provider type
 *               ssoEntityId:
 *                 type: string
 *                 description: IdP Entity ID
 *               ssoSsoUrl:
 *                 type: string
 *                 description: IdP SSO URL
 *               ssoCertificate:
 *                 type: string
 *                 description: IdP X.509 certificate (PEM format)
 *               ssoMetadataUrl:
 *                 type: string
 *                 description: IdP metadata URL (optional)
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *       400:
 *         description: Invalid configuration
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
app.put('/config', authenticate, updateSAMLConfig);

/**
 * @openapi
 * /api/auth/saml/config/test:
 *   post:
 *     summary: Test SAML configuration
 *     description: Validate SAML configuration (Admin only)
 *     tags:
 *       - SAML/SSO
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuration is valid
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
 *                   example: SAML configuration is valid
 *                 valid:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Configuration is invalid
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
app.post('/config/test', authenticate, testSAMLConfig);

module.exports = app;
