/**
 * Permission Routes - Enterprise Authorization API
 *
 * Provides endpoints for:
 * - Permission checks (Casbin-style RBAC/ABAC)
 * - Relation management (Keto-style ReBAC)
 * - Policy management (Keycloak-style)
 * - Decision audit logs (OPA-style)
 *
 * All routes require authentication and firm membership.
 */

const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const {
    // Permission checks
    checkPermission,
    checkPermissionBatch,
    getMyPermissions,

    // Expand
    expandPermissions,
    getUserResources,

    // Policy management
    getPermissionConfig,
    updatePermissionConfig,
    addPolicy,
    updatePolicy,
    deletePolicy,

    // Relation management
    grantRelation,
    revokeRelation,
    getResourceRelations,
    getRelationStats,

    // Decision logs
    getDecisionLogs,
    getDecisionStats,
    getDeniedAttempts,
    getComplianceReport,

    // Cache
    clearCache,
    getCacheStats
} = require('../controllers/permission.controller');

const router = express.Router();

// Apply authentication and firm filter to all routes
router.use(userMiddleware, firmFilter);

// ═══════════════════════════════════════════════════════════════
// PERMISSION CHECK ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// POST /api/permissions/check - Check if current user has permission
router.post('/check', checkPermission);

// POST /api/permissions/check-batch - Batch check permissions
router.post('/check-batch', checkPermissionBatch);

// GET /api/permissions/my-permissions - Get my effective permissions
router.get('/my-permissions', getMyPermissions);

// ═══════════════════════════════════════════════════════════════
// EXPAND ENDPOINTS (Keto-style)
// ═══════════════════════════════════════════════════════════════

// GET /api/permissions/expand/:namespace/:resourceId/:relation - Expand permissions
router.get('/expand/:namespace/:resourceId/:relation', expandPermissions);

// GET /api/permissions/user-resources/:userId - Get user's accessible resources
router.get('/user-resources/:userId', getUserResources);

// ═══════════════════════════════════════════════════════════════
// POLICY MANAGEMENT (Keycloak-style)
// ═══════════════════════════════════════════════════════════════

// GET /api/permissions/config - Get permission configuration
router.get('/config', getPermissionConfig);

// PUT /api/permissions/config - Update permission configuration
router.put('/config', updatePermissionConfig);

// POST /api/permissions/policies - Add a new policy
router.post('/policies', addPolicy);

// PUT /api/permissions/policies/:policyId - Update a policy
router.put('/policies/:policyId', updatePolicy);

// DELETE /api/permissions/policies/:policyId - Delete a policy
router.delete('/policies/:policyId', deletePolicy);

// ═══════════════════════════════════════════════════════════════
// RELATION TUPLE MANAGEMENT (Keto-style)
// ═══════════════════════════════════════════════════════════════

// GET /api/permissions/relations/stats - Get relation statistics
router.get('/relations/stats', getRelationStats);

// POST /api/permissions/relations - Grant a relation
router.post('/relations', grantRelation);

// DELETE /api/permissions/relations - Revoke a relation
router.delete('/relations', revokeRelation);

// GET /api/permissions/relations/:namespace/:object - Get relations for a resource
router.get('/relations/:namespace/:object', getResourceRelations);

// ═══════════════════════════════════════════════════════════════
// DECISION LOGS (OPA-style)
// ═══════════════════════════════════════════════════════════════

// GET /api/permissions/decisions - Get decision logs
router.get('/decisions', getDecisionLogs);

// GET /api/permissions/decisions/stats - Get decision statistics
router.get('/decisions/stats', getDecisionStats);

// GET /api/permissions/decisions/denied - Get denied access attempts
router.get('/decisions/denied', getDeniedAttempts);

// GET /api/permissions/decisions/compliance-report - Get compliance report
router.get('/decisions/compliance-report', getComplianceReport);

// ═══════════════════════════════════════════════════════════════
// CACHE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// GET /api/permissions/cache/stats - Get cache statistics
router.get('/cache/stats', getCacheStats);

// POST /api/permissions/cache/clear - Clear permission cache
router.post('/cache/clear', clearCache);

module.exports = router;
