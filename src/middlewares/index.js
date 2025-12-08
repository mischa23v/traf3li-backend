const userMiddleware = require('./userMiddleware');
const errorMiddleware = require('./errorMiddleware');
const authenticate = require('./authenticate');
const { caseAuditMiddleware, loadExistingForAudit } = require('./caseAudit.middleware');
const {
    firmFilter,
    requireFirm,
    checkFirmPermission,
    checkSpecialPermission,
    blockDeparted,
    firmOwnerOnly,
    firmAdminOnly,
    financeAccessOnly,
    teamManagementOnly
} = require('./firmFilter.middleware');
const {
    requirePermission,
    requireRelation,
    requireAnyPermission,
    requireAllPermissions,
    grantOnCreate,
    revokeOnDelete,
    requireRole,
    requireAdmin,
    requireOwner,
    logAccess
} = require('./permission.middleware');

module.exports = {
    userMiddleware,
    errorMiddleware,
    authenticate,
    caseAuditMiddleware,
    loadExistingForAudit,
    // Firm multi-tenancy middleware
    firmFilter,
    requireFirm,
    checkFirmPermission,
    checkSpecialPermission,
    blockDeparted,
    firmOwnerOnly,
    firmAdminOnly,
    financeAccessOnly,
    teamManagementOnly,
    // Enhanced permission middleware (Casbin/Keto/Keycloak/OPA inspired)
    requirePermission,
    requireRelation,
    requireAnyPermission,
    requireAllPermissions,
    grantOnCreate,
    revokeOnDelete,
    requireRole,
    requireAdmin,
    requireOwner,
    logAccess
}