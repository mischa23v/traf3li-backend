/**
 * Admin Tools Controller - System Management Endpoints
 *
 * Administrative endpoints for system maintenance, data management, and diagnostics.
 * All endpoints require admin authentication and include comprehensive audit logging.
 *
 * SECURITY:
 * - All endpoints enforce admin role verification
 * - All actions are logged via audit logging
 * - Input validation on all parameters
 * - Sensitive data filtering from responses
 */

const adminToolsService = require('../services/adminTools.service');
const auditLogService = require('../services/auditLog.service');
const { User } = require('../models');
const logger = require('../utils/logger');
const {
    sanitizeObjectId,
    sanitizeString,
    sanitizeForLog
} = require('../utils/securityUtils');

// ═══════════════════════════════════════════════════════════════
// DATA MANAGEMENT ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get user data for export/review
 * GET /api/admin/tools/users/:id/data
 */
const getUserData = async (req, res) => {
    try {
        const { id: userIdRaw } = req.params;
        const userId = sanitizeObjectId(userIdRaw);

        if (!userId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid user ID format'
            });
        }

        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('email role').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            await auditLogService.log('unauthorized_admin_access', 'user', userId, null, {
                userId: adminUserId,
                userEmail: adminUser?.email || 'unknown',
                userRole: adminUser?.role || 'none',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                severity: 'critical',
                details: { action: 'getUserData' }
            });

            return res.status(403).json({
                error: true,
                message: 'Admin access required'
            });
        }

        const options = {
            adminId: adminUserId,
            format: req.query.format || 'json',
            includeRelated: req.query.includeRelated !== 'false'
        };

        const userData = await adminToolsService.getUserData(userId, options);

        await auditLogService.log('admin_export_user_data', 'user', userId, null, {
            userId: adminUserId,
            userEmail: adminUser.email,
            userRole: 'admin',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            severity: 'high',
            details: { targetUserId: userId, format: options.format }
        });

        return res.json({
            error: false,
            data: userData
        });
    } catch (error) {
        logger.error('AdminTools.getUserData error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to retrieve user data'
        });
    }
};

/**
 * Delete user data (GDPR)
 * DELETE /api/admin/tools/users/:id/data
 */
const deleteUserData = async (req, res) => {
    try {
        const { id: userIdRaw } = req.params;
        const userId = sanitizeObjectId(userIdRaw);

        if (!userId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid user ID format'
            });
        }

        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('email role').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required'
            });
        }

        const options = {
            adminId: adminUserId,
            anonymize: req.body.anonymize !== false,
            cascade: req.body.cascade === true
        };

        const deletionReport = await adminToolsService.deleteUserData(userId, options);

        await auditLogService.log('admin_delete_user_data', 'user', userId, null, {
            userId: adminUserId,
            userEmail: adminUser.email,
            userRole: 'admin',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            severity: 'critical',
            details: {
                targetUserId: userId,
                method: options.anonymize ? 'anonymize' : 'hard_delete',
                cascade: options.cascade,
                affectedRecords: deletionReport.affectedRecords
            }
        });

        return res.json({
            error: false,
            message: 'User data deleted successfully',
            data: deletionReport
        });
    } catch (error) {
        logger.error('AdminTools.deleteUserData error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to delete user data'
        });
    }
};

/**
 * Export firm data
 * GET /api/admin/tools/firms/:id/export
 */
const exportFirmData = async (req, res) => {
    try {
        const { id: firmIdRaw } = req.params;
        const firmId = sanitizeObjectId(firmIdRaw);

        if (!firmId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid firm ID format'
            });
        }

        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('email role').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required'
            });
        }

        const format = req.query.format || 'json';
        const exportData = await adminToolsService.exportFirmData(firmId, format);

        await auditLogService.log('admin_export_firm_data', 'firm', firmId, null, {
            userId: adminUserId,
            userEmail: adminUser.email,
            userRole: 'admin',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            severity: 'high',
            details: { firmId, format }
        });

        return res.json({
            error: false,
            data: exportData
        });
    } catch (error) {
        logger.error('AdminTools.exportFirmData error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to export firm data'
        });
    }
};

/**
 * Import firm data
 * POST /api/admin/tools/firms/:id/import
 */
const importFirmData = async (req, res) => {
    try {
        const { id: firmIdRaw } = req.params;
        const firmId = sanitizeObjectId(firmIdRaw);

        if (!firmId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid firm ID format'
            });
        }

        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('email role').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required'
            });
        }

        const importReport = await adminToolsService.importFirmData(firmId, req.body);

        await auditLogService.log('admin_import_firm_data', 'firm', firmId, null, {
            userId: adminUserId,
            userEmail: adminUser.email,
            userRole: 'admin',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            severity: 'high',
            details: { firmId, imported: importReport.imported }
        });

        return res.json({
            error: false,
            message: 'Firm data imported successfully',
            data: importReport
        });
    } catch (error) {
        logger.error('AdminTools.importFirmData error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to import firm data'
        });
    }
};

/**
 * Merge duplicate users
 * POST /api/admin/tools/users/merge
 */
const mergeUsers = async (req, res) => {
    try {
        const { sourceUserId: sourceUserIdRaw, targetUserId: targetUserIdRaw } = req.body;
        const sourceUserId = sanitizeObjectId(sourceUserIdRaw);
        const targetUserId = sanitizeObjectId(targetUserIdRaw);

        if (!sourceUserId || !targetUserId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid user IDs'
            });
        }

        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('email role').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required'
            });
        }

        const mergeReport = await adminToolsService.mergeUsers(sourceUserId, targetUserId);

        await auditLogService.log('admin_merge_users', 'user', targetUserId, null, {
            userId: adminUserId,
            userEmail: adminUser.email,
            userRole: 'admin',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            severity: 'critical',
            details: {
                sourceUserId,
                targetUserId,
                mergedRecords: mergeReport.mergedRecords
            }
        });

        return res.json({
            error: false,
            message: 'Users merged successfully',
            data: mergeReport
        });
    } catch (error) {
        logger.error('AdminTools.mergeUsers error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: error.message || 'Failed to merge users'
        });
    }
};

/**
 * Merge duplicate clients
 * POST /api/admin/tools/clients/merge
 */
const mergeClients = async (req, res) => {
    try {
        const { sourceClientId: sourceClientIdRaw, targetClientId: targetClientIdRaw } = req.body;
        const sourceClientId = sanitizeObjectId(sourceClientIdRaw);
        const targetClientId = sanitizeObjectId(targetClientIdRaw);

        if (!sourceClientId || !targetClientId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid client IDs'
            });
        }

        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('email role').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required'
            });
        }

        const mergeReport = await adminToolsService.mergeClients(sourceClientId, targetClientId);

        await auditLogService.log('admin_merge_clients', 'client', targetClientId, null, {
            userId: adminUserId,
            userEmail: adminUser.email,
            userRole: 'admin',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            severity: 'high',
            details: {
                sourceClientId,
                targetClientId,
                mergedRecords: mergeReport.mergedRecords
            }
        });

        return res.json({
            error: false,
            message: 'Clients merged successfully',
            data: mergeReport
        });
    } catch (error) {
        logger.error('AdminTools.mergeClients error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: error.message || 'Failed to merge clients'
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// DATA FIXES ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Recalculate invoice totals
 * POST /api/admin/tools/firms/:id/recalculate-invoices
 */
const recalculateInvoiceTotals = async (req, res) => {
    try {
        const { id: firmIdRaw } = req.params;
        const firmId = sanitizeObjectId(firmIdRaw);

        if (!firmId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid firm ID format'
            });
        }

        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('email role').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required'
            });
        }

        const fixReport = await adminToolsService.recalculateInvoiceTotals(firmId);

        await auditLogService.log('admin_recalculate_invoices', 'firm', firmId, null, {
            userId: adminUserId,
            userEmail: adminUser.email,
            userRole: 'admin',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            severity: 'medium',
            details: { firmId, fixedCount: fixReport.fixedCount }
        });

        return res.json({
            error: false,
            message: 'Invoice totals recalculated',
            data: fixReport
        });
    } catch (error) {
        logger.error('AdminTools.recalculateInvoiceTotals error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to recalculate invoices'
        });
    }
};

/**
 * Reindex search data
 * POST /api/admin/tools/firms/:id/reindex
 */
const reindexSearchData = async (req, res) => {
    try {
        const { id: firmIdRaw } = req.params;
        const firmId = sanitizeObjectId(firmIdRaw);

        if (!firmId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid firm ID format'
            });
        }

        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('email role').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required'
            });
        }

        const reindexReport = await adminToolsService.reindexSearchData(firmId);

        await auditLogService.log('admin_reindex_search', 'firm', firmId, null, {
            userId: adminUserId,
            userEmail: adminUser.email,
            userRole: 'admin',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            severity: 'medium',
            details: { firmId, results: reindexReport.results }
        });

        return res.json({
            error: false,
            message: 'Search data reindexed',
            data: reindexReport
        });
    } catch (error) {
        logger.error('AdminTools.reindexSearchData error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to reindex search data'
        });
    }
};

/**
 * Cleanup orphaned records
 * POST /api/admin/tools/firms/:id/cleanup-orphaned
 */
const cleanupOrphanedRecords = async (req, res) => {
    try {
        const { id: firmIdRaw } = req.params;
        const firmId = sanitizeObjectId(firmIdRaw);

        if (!firmId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid firm ID format'
            });
        }

        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('email role').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required'
            });
        }

        const cleanupReport = await adminToolsService.cleanupOrphanedRecords(firmId);

        await auditLogService.log('admin_cleanup_orphaned', 'firm', firmId, null, {
            userId: adminUserId,
            userEmail: adminUser.email,
            userRole: 'admin',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            severity: 'medium',
            details: { firmId, orphaned: cleanupReport.orphaned }
        });

        return res.json({
            error: false,
            message: 'Orphaned records cleaned up',
            data: cleanupReport
        });
    } catch (error) {
        logger.error('AdminTools.cleanupOrphanedRecords error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to cleanup orphaned records'
        });
    }
};

/**
 * Validate data integrity
 * GET /api/admin/tools/firms/:id/validate
 */
const validateDataIntegrity = async (req, res) => {
    try {
        const { id: firmIdRaw } = req.params;
        const firmId = sanitizeObjectId(firmIdRaw);

        if (!firmId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid firm ID format'
            });
        }

        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('email role').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required'
            });
        }

        const validationReport = await adminToolsService.validateDataIntegrity(firmId);

        await auditLogService.log('admin_validate_integrity', 'firm', firmId, null, {
            userId: adminUserId,
            userEmail: adminUser.email,
            userRole: 'admin',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            severity: 'low',
            details: { firmId, issueCount: validationReport.issueCount }
        });

        return res.json({
            error: false,
            data: validationReport
        });
    } catch (error) {
        logger.error('AdminTools.validateDataIntegrity error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to validate data integrity'
        });
    }
};

/**
 * Fix currency conversions
 * POST /api/admin/tools/firms/:id/fix-currency
 */
const fixCurrencyConversions = async (req, res) => {
    try {
        const { id: firmIdRaw } = req.params;
        const firmId = sanitizeObjectId(firmIdRaw);

        if (!firmId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid firm ID format'
            });
        }

        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('email role').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required'
            });
        }

        const fixReport = await adminToolsService.fixCurrencyConversions(firmId);

        await auditLogService.log('admin_fix_currency', 'firm', firmId, null, {
            userId: adminUserId,
            userEmail: adminUser.email,
            userRole: 'admin',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            severity: 'medium',
            details: { firmId }
        });

        return res.json({
            error: false,
            data: fixReport
        });
    } catch (error) {
        logger.error('AdminTools.fixCurrencyConversions error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to fix currency conversions'
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// SYSTEM TOOLS ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get system statistics
 * GET /api/admin/tools/stats
 */
const getSystemStats = async (req, res) => {
    try {
        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('email role').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required'
            });
        }

        const stats = await adminToolsService.getSystemStats();

        return res.json({
            error: false,
            data: stats
        });
    } catch (error) {
        logger.error('AdminTools.getSystemStats error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to retrieve system stats'
        });
    }
};

/**
 * Get user activity report
 * GET /api/admin/tools/activity-report
 */
const getUserActivityReport = async (req, res) => {
    try {
        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('email role').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required'
            });
        }

        const dateRange = {
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        const activityReport = await adminToolsService.getUserActivityReport(dateRange);

        return res.json({
            error: false,
            data: activityReport
        });
    } catch (error) {
        logger.error('AdminTools.getUserActivityReport error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to retrieve activity report'
        });
    }
};

/**
 * Get storage usage
 * GET /api/admin/tools/storage-usage
 */
const getStorageUsage = async (req, res) => {
    try {
        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('email role').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required'
            });
        }

        const firmId = req.query.firmId ? sanitizeObjectId(req.query.firmId) : null;
        const storageReport = await adminToolsService.getStorageUsage(firmId);

        return res.json({
            error: false,
            data: storageReport
        });
    } catch (error) {
        logger.error('AdminTools.getStorageUsage error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to retrieve storage usage'
        });
    }
};

/**
 * Clear cache
 * POST /api/admin/tools/clear-cache
 */
const clearCache = async (req, res) => {
    try {
        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('email role').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required'
            });
        }

        const pattern = sanitizeString(req.body.pattern || '*');
        const clearReport = await adminToolsService.clearCache(pattern);

        await auditLogService.log('admin_clear_cache', 'system', null, null, {
            userId: adminUserId,
            userEmail: adminUser.email,
            userRole: 'admin',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            severity: 'medium',
            details: { pattern, deletedCount: clearReport.deletedCount }
        });

        return res.json({
            error: false,
            message: 'Cache cleared successfully',
            data: clearReport
        });
    } catch (error) {
        logger.error('AdminTools.clearCache error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to clear cache'
        });
    }
};

/**
 * Run diagnostics
 * GET /api/admin/tools/diagnostics
 */
const runDiagnostics = async (req, res) => {
    try {
        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('email role').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required'
            });
        }

        const diagnostics = await adminToolsService.runDiagnostics();

        return res.json({
            error: false,
            data: diagnostics
        });
    } catch (error) {
        logger.error('AdminTools.runDiagnostics error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to run diagnostics'
        });
    }
};

/**
 * Get slow queries
 * GET /api/admin/tools/slow-queries
 */
const getSlowQueries = async (req, res) => {
    try {
        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('email role').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required'
            });
        }

        const dateRange = {
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        const slowQueries = await adminToolsService.getSlowQueries(dateRange);

        return res.json({
            error: false,
            data: slowQueries
        });
    } catch (error) {
        logger.error('AdminTools.getSlowQueries error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to retrieve slow queries'
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// USER MANAGEMENT ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Reset user password
 * POST /api/admin/tools/users/:id/reset-password
 */
const resetUserPassword = async (req, res) => {
    try {
        const { id: userIdRaw } = req.params;
        const userId = sanitizeObjectId(userIdRaw);

        if (!userId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid user ID format'
            });
        }

        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('email role').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required'
            });
        }

        const resetResult = await adminToolsService.resetUserPassword(userId);

        await auditLogService.log('admin_reset_password', 'user', userId, null, {
            userId: adminUserId,
            userEmail: adminUser.email,
            userRole: 'admin',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            severity: 'high',
            details: { targetUserId: userId }
        });

        return res.json({
            error: false,
            message: 'Password reset successfully',
            data: {
                userId: resetResult.userId,
                temporaryPassword: resetResult.temporaryPassword,
                resetAt: resetResult.resetAt
            }
        });
    } catch (error) {
        logger.error('AdminTools.resetUserPassword error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to reset password'
        });
    }
};

/**
 * Impersonate user
 * POST /api/admin/tools/users/:id/impersonate
 */
const impersonateUser = async (req, res) => {
    try {
        const { id: userIdRaw } = req.params;
        const userId = sanitizeObjectId(userIdRaw);

        if (!userId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid user ID format'
            });
        }

        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('email role').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required'
            });
        }

        const impersonationSession = await adminToolsService.impersonateUser(adminUserId, userId);

        await auditLogService.log('admin_impersonate_user', 'user', userId, null, {
            userId: adminUserId,
            userEmail: adminUser.email,
            userRole: 'admin',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            severity: 'critical',
            details: {
                targetUserId: userId,
                sessionId: impersonationSession.sessionId
            }
        });

        return res.json({
            error: false,
            message: 'Impersonation session created',
            data: impersonationSession
        });
    } catch (error) {
        logger.error('AdminTools.impersonateUser error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: error.message || 'Failed to create impersonation session'
        });
    }
};

/**
 * End impersonation
 * POST /api/admin/tools/impersonation/:sessionId/end
 */
const endImpersonation = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({
                error: true,
                message: 'Session ID required'
            });
        }

        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('email role').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required'
            });
        }

        const result = await adminToolsService.endImpersonation(sessionId);

        await auditLogService.log('admin_end_impersonation', 'system', null, null, {
            userId: adminUserId,
            userEmail: adminUser.email,
            userRole: 'admin',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            severity: 'high',
            details: { sessionId }
        });

        return res.json({
            error: false,
            message: 'Impersonation ended',
            data: result
        });
    } catch (error) {
        logger.error('AdminTools.endImpersonation error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to end impersonation'
        });
    }
};

/**
 * Lock user account
 * POST /api/admin/tools/users/:id/lock
 */
const lockUser = async (req, res) => {
    try {
        const { id: userIdRaw } = req.params;
        const userId = sanitizeObjectId(userIdRaw);

        if (!userId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid user ID format'
            });
        }

        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('email role').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required'
            });
        }

        const reason = sanitizeString(req.body.reason || 'administrative_action');
        const lockResult = await adminToolsService.lockUser(userId, reason);

        await auditLogService.log('admin_lock_user', 'user', userId, null, {
            userId: adminUserId,
            userEmail: adminUser.email,
            userRole: 'admin',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            severity: 'critical',
            details: { targetUserId: userId, reason }
        });

        return res.json({
            error: false,
            message: 'User account locked',
            data: lockResult
        });
    } catch (error) {
        logger.error('AdminTools.lockUser error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to lock user account'
        });
    }
};

/**
 * Unlock user account
 * POST /api/admin/tools/users/:id/unlock
 */
const unlockUser = async (req, res) => {
    try {
        const { id: userIdRaw } = req.params;
        const userId = sanitizeObjectId(userIdRaw);

        if (!userId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid user ID format'
            });
        }

        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('email role').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required'
            });
        }

        const unlockResult = await adminToolsService.unlockUser(userId);

        await auditLogService.log('admin_unlock_user', 'user', userId, null, {
            userId: adminUserId,
            userEmail: adminUser.email,
            userRole: 'admin',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            severity: 'high',
            details: { targetUserId: userId }
        });

        return res.json({
            error: false,
            message: 'User account unlocked',
            data: unlockResult
        });
    } catch (error) {
        logger.error('AdminTools.unlockUser error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to unlock user account'
        });
    }
};

/**
 * Get login history
 * GET /api/admin/tools/users/:id/login-history
 */
const getLoginHistory = async (req, res) => {
    try {
        const { id: userIdRaw } = req.params;
        const userId = sanitizeObjectId(userIdRaw);

        if (!userId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid user ID format'
            });
        }

        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('email role').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required'
            });
        }

        const limit = parseInt(req.query.limit) || 50;
        const loginHistory = await adminToolsService.getLoginHistory(userId, limit);

        return res.json({
            error: false,
            data: loginHistory
        });
    } catch (error) {
        logger.error('AdminTools.getLoginHistory error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to retrieve login history'
        });
    }
};

module.exports = {
    // Data Management
    getUserData,
    deleteUserData,
    exportFirmData,
    importFirmData,
    mergeUsers,
    mergeClients,

    // Data Fixes
    recalculateInvoiceTotals,
    reindexSearchData,
    cleanupOrphanedRecords,
    validateDataIntegrity,
    fixCurrencyConversions,

    // System Tools
    getSystemStats,
    getUserActivityReport,
    getStorageUsage,
    clearCache,
    runDiagnostics,
    getSlowQueries,

    // User Management
    resetUserPassword,
    impersonateUser,
    endImpersonation,
    lockUser,
    unlockUser,
    getLoginHistory
};
