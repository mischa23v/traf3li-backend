/**
 * SSO Configuration Routes - Enterprise SSO Management UI API
 *
 * All routes:
 * - Require authentication (userMiddleware)
 * - Require firm membership
 * - Require firm owner or admin role
 * - Validate firm subscription includes SSO feature
 * - Apply security headers and sanitization
 */

const express = require('express');
const { userMiddleware, requireFeature, firmAdminOnly } = require('../middlewares');
const {
    getSSOConfig,
    updateSSOConfig,
    testSSOConnection,
    uploadMetadata,
    disableSSO
} = require('../controllers/ssoConfig.controller');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// SSO CONFIGURATION ROUTES
// All routes require:
// 1. Authentication (userMiddleware)
// 2. SSO feature in subscription (requireFeature('sso'))
// 3. Firm admin or owner role (firmAdminOnly)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/firms/:firmId/sso
 * Get SSO configuration for a firm
 *
 * Access: Firm owner or admin
 * Feature: Requires 'sso' feature in subscription
 */
router.get(
    '/:firmId/sso',
    userMiddleware,
    requireFeature('sso'),
    firmAdminOnly,
    getSSOConfig
);

/**
 * PUT /api/firms/:firmId/sso
 * Update SSO configuration
 *
 * Access: Firm owner or admin
 * Feature: Requires 'sso' feature in subscription
 *
 * Body:
 * - enabled: boolean (optional)
 * - provider: string (azure|okta|google|custom)
 * - entityId: string
 * - ssoUrl: string (URL)
 * - sloUrl: string (URL, optional)
 * - certificate: string (PEM format)
 * - metadataUrl: string (URL, optional)
 * - attributeMapping: object
 *   - email: string
 *   - firstName: string
 *   - lastName: string
 *   - groups: string
 * - allowedDomains: array of strings
 * - autoProvision: boolean
 * - defaultRole: string (lawyer|paralegal|secretary|accountant|partner)
 * - requireEmailVerification: boolean
 * - syncUserAttributes: boolean
 */
router.put(
    '/:firmId/sso',
    userMiddleware,
    requireFeature('sso'),
    firmAdminOnly,
    updateSSOConfig
);

/**
 * POST /api/firms/:firmId/sso/test
 * Test IdP connection and validate configuration
 *
 * Access: Firm owner or admin
 * Feature: Requires 'sso' feature in subscription
 *
 * Returns:
 * - testPassed: boolean
 * - testResults: object with validation details
 * - errors: array of error messages (if any)
 */
router.post(
    '/:firmId/sso/test',
    userMiddleware,
    requireFeature('sso'),
    firmAdminOnly,
    testSSOConnection
);

/**
 * POST /api/firms/:firmId/sso/upload-metadata
 * Upload and parse IdP metadata XML
 *
 * Access: Firm owner or admin
 * Feature: Requires 'sso' feature in subscription
 *
 * Body:
 * - metadataXml: string (XML content)
 *
 * Automatically extracts:
 * - Entity ID
 * - SSO URL
 * - SLO URL
 * - Certificate
 */
router.post(
    '/:firmId/sso/upload-metadata',
    userMiddleware,
    requireFeature('sso'),
    firmAdminOnly,
    uploadMetadata
);

/**
 * DELETE /api/firms/:firmId/sso
 * Disable SSO for the firm
 *
 * Access: Firm owner ONLY (admin cannot disable)
 * Feature: Requires 'sso' feature in subscription
 *
 * Note: This only disables SSO, it does not delete the configuration
 */
router.delete(
    '/:firmId/sso',
    userMiddleware,
    requireFeature('sso'),
    disableSSO  // Has its own owner-only check
);

module.exports = router;
