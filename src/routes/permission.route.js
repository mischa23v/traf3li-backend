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
const { auditAction } = require('../middlewares/auditLog.middleware');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
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
    getCacheStats,

    // UI Access Control
    getVisibleSidebar,
    checkPageAccess,
    getUIAccessConfig,
    updateUIAccessConfig,
    getAccessMatrix,
    updateSidebarVisibility,
    updatePageAccessForRole,
    bulkUpdateRoleAccess,
    addUserOverride,
    removeUserOverride,
    getAllSidebarItems,
    getAllPageAccess
} = require('../controllers/permission.controller');

const router = express.Router();

// Apply rate limiting to all routes
router.use(apiRateLimiter);

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
router.put('/config', auditAction('update_permission_config', 'permission', { severity: 'critical', captureChanges: true }), updatePermissionConfig);

// POST /api/permissions/policies - Add a new policy
router.post('/policies', auditAction('add_permission_policy', 'permission', { severity: 'critical' }), addPolicy);

// PUT /api/permissions/policies/:policyId - Update a policy
router.put('/policies/:policyId', auditAction('update_permission_policy', 'permission', { severity: 'critical', captureChanges: true }), updatePolicy);

// DELETE /api/permissions/policies/:policyId - Delete a policy
router.delete('/policies/:policyId', auditAction('delete_permission_policy', 'permission', { severity: 'critical', captureChanges: true }), deletePolicy);

// ═══════════════════════════════════════════════════════════════
// RELATION TUPLE MANAGEMENT (Keto-style)
// ═══════════════════════════════════════════════════════════════

// GET /api/permissions/relations/stats - Get relation statistics
router.get('/relations/stats', getRelationStats);

// POST /api/permissions/relations - Grant a relation
router.post('/relations', auditAction('grant_relation', 'permission', { severity: 'high' }), grantRelation);

// DELETE /api/permissions/relations - Revoke a relation
router.delete('/relations', auditAction('revoke_relation', 'permission', { severity: 'high' }), revokeRelation);

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

// ═══════════════════════════════════════════════════════════════
// UI ACCESS CONTROL (Sidebar & Page Visibility)
// ═══════════════════════════════════════════════════════════════

// GET /api/permissions/ui/sidebar - Get visible sidebar items for current user
router.get('/ui/sidebar', getVisibleSidebar);

// GET /api/permissions/ui/sidebar/all - Get all sidebar items (admin)
router.get('/ui/sidebar/all', getAllSidebarItems);

// PUT /api/permissions/ui/sidebar/:itemId/visibility - Update sidebar visibility for role
router.put('/ui/sidebar/:itemId/visibility', updateSidebarVisibility);

// POST /api/permissions/ui/check-page - Check page access for current user
router.post('/ui/check-page', checkPageAccess);

// GET /api/permissions/ui/pages/all - Get all page access rules (admin)
router.get('/ui/pages/all', getAllPageAccess);

// PUT /api/permissions/ui/pages/:pageId/access - Update page access for role
router.put('/ui/pages/:pageId/access', updatePageAccessForRole);

// GET /api/permissions/ui/config - Get UI access configuration (admin)
router.get('/ui/config', getUIAccessConfig);

// PUT /api/permissions/ui/config - Update UI access settings
router.put('/ui/config', updateUIAccessConfig);

// GET /api/permissions/ui/matrix - Get access matrix for all roles
router.get('/ui/matrix', getAccessMatrix);

// PUT /api/permissions/ui/roles/:role/bulk - Bulk update role access
router.put('/ui/roles/:role/bulk', bulkUpdateRoleAccess);

// POST /api/permissions/ui/overrides - Add user-specific override
router.post('/ui/overrides', addUserOverride);

// DELETE /api/permissions/ui/overrides/:userId - Remove user-specific override
router.delete('/ui/overrides/:userId', removeUserOverride);

module.exports = router;
