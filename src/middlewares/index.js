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
    teamManagementOnly
}