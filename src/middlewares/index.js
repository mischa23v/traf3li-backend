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
const {
    originCheck,
    noCache,
    validateContentType,
    setCsrfToken,
    validateCsrfToken,
    securityHeaders,
    sanitizeRequest
} = require('./security.middleware');
const {
    sanitizeBody,
    sanitizeQuery,
    sanitizeParams,
    sanitizeAll,
    sanitizeString,
    sanitizeObject
} = require('./sanitize.middleware');
const {
    getEffectivePlan,
    requireFeature,
    requirePlan,
    checkResourceLimit,
    requireApiAccess,
    attachPlanInfo,
    requireAnyFeature,
    requireAllFeatures,
    checkStorageLimit
} = require('./planCheck.middleware');
const {
    apiKeyAuth,
    requireScope,
    requireAnyScope,
    apiKeyRateLimit,
    flexibleAuth
} = require('./apiKeyAuth.middleware');
const {
    checkSessionTimeout,
    recordActivity,
    clearSessionActivity,
    getSessionInfo,
    SESSION_POLICY
} = require('./sessionTimeout.middleware');
const {
    ipRestrictionMiddleware,
    ipRestrictionWithOptions,
    bypassIPRestriction,
    hasIPRestrictionBypass
} = require('./ipRestriction.middleware');
const {
    checkLockDate,
    checkInvoiceLockDate,
    checkPaymentLockDate,
    checkExpenseLockDate,
    checkBankLockDate,
    checkJournalLockDate,
    requireUnlockedPeriod,
    extractTransactionDate,
    extractFirmId
} = require('./lockDate.middleware');

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
    logAccess,
    // Security middleware
    originCheck,
    noCache,
    validateContentType,
    setCsrfToken,
    validateCsrfToken,
    securityHeaders,
    sanitizeRequest,
    // Input sanitization middleware (XSS and injection prevention)
    sanitizeBody,
    sanitizeQuery,
    sanitizeParams,
    sanitizeAll,
    sanitizeString,
    sanitizeObject,
    // Plan check middleware (tier system)
    getEffectivePlan,
    requireFeature,
    requirePlan,
    checkResourceLimit,
    requireApiAccess,
    attachPlanInfo,
    requireAnyFeature,
    requireAllFeatures,
    checkStorageLimit,
    // API key authentication middleware
    apiKeyAuth,
    requireScope,
    requireAnyScope,
    apiKeyRateLimit,
    flexibleAuth,
    // Session timeout middleware
    checkSessionTimeout,
    recordActivity,
    clearSessionActivity,
    getSessionInfo,
    SESSION_POLICY,
    // IP restriction middleware
    ipRestrictionMiddleware,
    ipRestrictionWithOptions,
    bypassIPRestriction,
    hasIPRestrictionBypass,
    // Lock date middleware (fiscal period controls)
    checkLockDate,
    checkInvoiceLockDate,
    checkPaymentLockDate,
    checkExpenseLockDate,
    checkBankLockDate,
    checkJournalLockDate,
    requireUnlockedPeriod,
    extractTransactionDate,
    extractFirmId
}