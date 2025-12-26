/**
 * Admin Audit Controller
 *
 * Comprehensive audit and compliance endpoints for admin panels.
 *
 * Features:
 * - Get audit logs with advanced filtering
 * - View security-specific events
 * - Generate compliance reports
 * - Export audit logs for compliance
 * - Track user login history
 */

const { User, AuditLog, SecurityIncident } = require('../models');
const logger = require('../utils/logger');
const {
    sanitizeForLog,
    sanitizePagination,
    sanitizeString,
    sanitizeObjectId
} = require('../utils/securityUtils');
const auditLogService = require('../services/auditLog.service');

/**
 * Get audit logs with filtering
 * GET /api/admin/audit/logs
 */
const getAuditLogs = async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId || req.userID).select('role firmId email').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // Build filter for multi-tenancy
        // NOTE: Super admins (no firmId) can query across all firms with bypass
        const firmFilter = adminUser.firmId ? { firmId: adminUser.firmId } : {};
        const isSuperAdmin = !adminUser.firmId;

        // Pagination
        const paginationParams = sanitizePagination(req.query, {
            maxLimit: 1000,
            defaultLimit: 100,
            defaultPage: 1
        });

        // Build filters
        const filters = { ...firmFilter };

        // Filter by action
        if (req.query.action) {
            filters.action = sanitizeString(req.query.action);
        }

        // Filter by resource type
        if (req.query.resourceType) {
            filters.resourceType = sanitizeString(req.query.resourceType);
        }

        // Filter by status
        if (req.query.status && ['SUCCESS', 'FAILED'].includes(req.query.status)) {
            filters.status = req.query.status;
        }

        // Filter by severity
        if (req.query.severity && ['low', 'medium', 'high', 'critical'].includes(req.query.severity)) {
            filters['details.severity'] = req.query.severity;
        }

        // Filter by user
        if (req.query.userId) {
            const userId = sanitizeObjectId(req.query.userId);
            if (userId) {
                filters.userId = userId;
            }
        }

        // Filter by user email
        if (req.query.userEmail) {
            filters.userEmail = new RegExp(sanitizeString(req.query.userEmail), 'i');
        }

        // Filter by IP address
        if (req.query.ipAddress) {
            filters['details.ipAddress'] = sanitizeString(req.query.ipAddress);
        }

        // Date range filters
        if (req.query.startDate || req.query.endDate) {
            filters.createdAt = {};
            if (req.query.startDate) {
                const startDate = new Date(req.query.startDate);
                if (!isNaN(startDate.getTime())) {
                    filters.createdAt.$gte = startDate;
                }
            }
            if (req.query.endDate) {
                const endDate = new Date(req.query.endDate);
                if (!isNaN(endDate.getTime())) {
                    filters.createdAt.$lte = endDate;
                }
            }
        }

        // Sort options
        let sortOption = { createdAt: -1 }; // Default: newest first
        if (req.query.sortBy) {
            const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
            sortOption = { [req.query.sortBy]: sortOrder };
        }

        // Execute query
        const [logs, total] = await Promise.all([
            AuditLog.find(filters)
                .sort(sortOption)
                .limit(paginationParams.limit)
                .skip(paginationParams.skip)
                .setOptions({ bypassFirmFilter: isSuperAdmin })
                .lean(),
            AuditLog.countDocuments(filters).setOptions({ bypassFirmFilter: isSuperAdmin })
        ]);

        // Log this admin action (meta!)
        await auditLogService.log(
            'admin_view_audit_logs',
            'system',
            null,
            'SUCCESS',
            {
                userId: adminUser._id || req.userId || req.userID,
                userEmail: adminUser.email,
                userRole: 'admin',
                ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                userAgent: req.headers['user-agent'] || 'unknown',
                method: req.method,
                endpoint: req.originalUrl,
                severity: 'low',
                details: {
                    filters: sanitizeForLog(req.query),
                    resultCount: logs.length
                }
            }
        );

        return res.json({
            error: false,
            data: logs,
            pagination: {
                total,
                limit: paginationParams.limit,
                skip: paginationParams.skip,
                page: Math.floor(paginationParams.skip / paginationParams.limit) + 1,
                pages: Math.ceil(total / paginationParams.limit)
            }
        });

    } catch (error) {
        logger.error('Admin getAuditLogs error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch audit logs',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

/**
 * Get security-specific events
 * GET /api/admin/audit/security-events
 */
const getSecurityEvents = async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId || req.userID).select('role firmId email').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // Build filter for multi-tenancy
        // NOTE: Super admins (no firmId) can query across all firms with bypass
        const firmFilter = adminUser.firmId ? { firmId: adminUser.firmId } : {};
        const isSuperAdmin = !adminUser.firmId;

        // Pagination
        const paginationParams = sanitizePagination(req.query, {
            maxLimit: 500,
            defaultLimit: 50,
            defaultPage: 1
        });

        // Security-related actions
        const securityActions = [
            'unauthorized_admin_access',
            'unauthorized_cross_firm_access',
            'admin_revoke_tokens',
            'admin_update_user_status',
            'admin_reset_user_password',
            'failed_login',
            'password_reset',
            'token_revoked',
            'security_incident',
            'suspicious_activity'
        ];

        // Build filters
        const filters = {
            ...firmFilter,
            $or: [
                { action: { $in: securityActions } },
                { 'details.severity': { $in: ['high', 'critical'] } },
                { status: 'FAILED' }
            ]
        };

        // Date range
        if (req.query.startDate || req.query.endDate) {
            filters.createdAt = {};
            if (req.query.startDate) {
                const startDate = new Date(req.query.startDate);
                if (!isNaN(startDate.getTime())) {
                    filters.createdAt.$gte = startDate;
                }
            }
            if (req.query.endDate) {
                const endDate = new Date(req.query.endDate);
                if (!isNaN(endDate.getTime())) {
                    filters.createdAt.$lte = endDate;
                }
            }
        }

        // Get security events
        const [events, total] = await Promise.all([
            AuditLog.find(filters)
                .sort({ createdAt: -1 })
                .limit(paginationParams.limit)
                .skip(paginationParams.skip)
                .setOptions({ bypassFirmFilter: isSuperAdmin })
                .lean(),
            AuditLog.countDocuments(filters).setOptions({ bypassFirmFilter: isSuperAdmin })
        ]);

        // Get security incidents
        const incidents = await SecurityIncident.find(firmFilter)
            .sort({ createdAt: -1 })
            .limit(10)
            .setOptions({ bypassFirmFilter: isSuperAdmin })
            .lean();

        // Log admin action
        await auditLogService.log(
            'admin_view_security_events',
            'system',
            null,
            'SUCCESS',
            {
                userId: adminUser._id || req.userId || req.userID,
                userEmail: adminUser.email,
                userRole: 'admin',
                ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                userAgent: req.headers['user-agent'] || 'unknown',
                method: req.method,
                endpoint: req.originalUrl,
                severity: 'medium',
                details: {
                    eventCount: events.length,
                    incidentCount: incidents.length
                }
            }
        );

        return res.json({
            error: false,
            data: {
                events,
                incidents
            },
            pagination: {
                total,
                limit: paginationParams.limit,
                skip: paginationParams.skip,
                page: Math.floor(paginationParams.skip / paginationParams.limit) + 1,
                pages: Math.ceil(total / paginationParams.limit)
            }
        });

    } catch (error) {
        logger.error('Admin getSecurityEvents error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch security events',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

/**
 * Get compliance report
 * GET /api/admin/audit/compliance-report
 */
const getComplianceReport = async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId || req.userID).select('role firmId email').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // Build filter for multi-tenancy
        // NOTE: Super admins (no firmId) can query across all firms with bypass
        const firmFilter = adminUser.firmId ? { firmId: adminUser.firmId } : {};
        const isSuperAdmin = !adminUser.firmId;

        // Date range (default to last 30 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        // Override with query params if provided
        if (req.query.startDate) {
            const customStart = new Date(req.query.startDate);
            if (!isNaN(customStart.getTime())) {
                startDate.setTime(customStart.getTime());
            }
        }
        if (req.query.endDate) {
            const customEnd = new Date(req.query.endDate);
            if (!isNaN(customEnd.getTime())) {
                endDate.setTime(customEnd.getTime());
            }
        }

        const dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };

        // Parallel queries for compliance metrics
        const [
            totalActions,
            failedActions,
            securityIncidents,
            adminActions,
            dataExports,
            userModifications,
            passwordResets,
            loginAttempts,
            actionsByType,
            actionsBySeverity
        ] = await Promise.all([
            // Total audit log entries
            AuditLog.countDocuments({ ...firmFilter, ...dateFilter }).setOptions({ bypassFirmFilter: isSuperAdmin }),

            // Failed actions
            AuditLog.countDocuments({ ...firmFilter, ...dateFilter, status: 'FAILED' }).setOptions({ bypassFirmFilter: isSuperAdmin }),

            // Security incidents
            SecurityIncident.countDocuments({ ...firmFilter, ...dateFilter }).setOptions({ bypassFirmFilter: isSuperAdmin }),

            // Admin actions
            AuditLog.countDocuments({
                ...firmFilter,
                ...dateFilter,
                userRole: 'admin'
            }).setOptions({ bypassFirmFilter: isSuperAdmin }),

            // Data exports
            AuditLog.countDocuments({
                ...firmFilter,
                ...dateFilter,
                action: { $regex: /export/i }
            }).setOptions({ bypassFirmFilter: isSuperAdmin }),

            // User modifications
            AuditLog.countDocuments({
                ...firmFilter,
                ...dateFilter,
                action: { $in: ['admin_update_user_status', 'admin_reset_user_password'] }
            }).setOptions({ bypassFirmFilter: isSuperAdmin }),

            // Password resets
            AuditLog.countDocuments({
                ...firmFilter,
                ...dateFilter,
                action: { $regex: /password.*reset/i }
            }).setOptions({ bypassFirmFilter: isSuperAdmin }),

            // Login attempts
            AuditLog.countDocuments({
                ...firmFilter,
                ...dateFilter,
                action: { $regex: /login/i }
            }).setOptions({ bypassFirmFilter: isSuperAdmin }),

            // Actions by type
            AuditLog.aggregate([
                { $match: { ...firmFilter, ...dateFilter } },
                {
                    $group: {
                        _id: '$action',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 20 }
            ]).option({ bypassFirmFilter: isSuperAdmin }),

            // Actions by severity
            AuditLog.aggregate([
                { $match: { ...firmFilter, ...dateFilter } },
                {
                    $group: {
                        _id: '$details.severity',
                        count: { $sum: 1 }
                    }
                }
            ]).option({ bypassFirmFilter: isSuperAdmin })
        ]);

        // Top users by activity
        const topUsers = await AuditLog.aggregate([
            { $match: { ...firmFilter, ...dateFilter } },
            {
                $group: {
                    _id: '$userId',
                    userEmail: { $first: '$userEmail' },
                    actionCount: { $sum: 1 }
                }
            },
            { $sort: { actionCount: -1 } },
            { $limit: 10 }
        ]).option({ bypassFirmFilter: isSuperAdmin });

        const report = {
            period: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
            },
            summary: {
                totalActions,
                failedActions,
                successRate: totalActions > 0
                    ? ((totalActions - failedActions) / totalActions * 100).toFixed(2)
                    : 100,
                securityIncidents,
                adminActions,
                dataExports,
                userModifications,
                passwordResets,
                loginAttempts
            },
            breakdown: {
                byAction: actionsByType,
                bySeverity: actionsBySeverity,
                topUsers
            },
            generatedAt: new Date().toISOString(),
            generatedBy: {
                userId: adminUser._id || req.userId || req.userID,
                email: adminUser.email
            }
        };

        // Log report generation
        await auditLogService.log(
            'admin_generate_compliance_report',
            'system',
            null,
            'SUCCESS',
            {
                userId: adminUser._id || req.userId || req.userID,
                userEmail: adminUser.email,
                userRole: 'admin',
                ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                userAgent: req.headers['user-agent'] || 'unknown',
                method: req.method,
                endpoint: req.originalUrl,
                severity: 'medium',
                details: {
                    reportPeriod: `${startDate.toISOString()} to ${endDate.toISOString()}`,
                    totalActions
                }
            }
        );

        return res.json({
            error: false,
            data: report
        });

    } catch (error) {
        logger.error('Admin getComplianceReport error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to generate compliance report',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

/**
 * Export audit logs
 * GET /api/admin/audit/export
 */
const exportAuditLogs = async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId || req.userID).select('role firmId email').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // Build filter for multi-tenancy
        // NOTE: Super admins (no firmId) can query across all firms with bypass
        const firmFilter = adminUser.firmId ? { firmId: adminUser.firmId } : {};
        const isSuperAdmin = !adminUser.firmId;

        // Date range (required for exports)
        if (!req.query.startDate || !req.query.endDate) {
            return res.status(400).json({
                error: true,
                message: 'Start date and end date are required for export',
                code: 'MISSING_DATE_RANGE'
            });
        }

        const startDate = new Date(req.query.startDate);
        const endDate = new Date(req.query.endDate);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json({
                error: true,
                message: 'Invalid date format',
                code: 'INVALID_DATE'
            });
        }

        // Limit export to 90 days max
        const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
        if (daysDiff > 90) {
            return res.status(400).json({
                error: true,
                message: 'Export period cannot exceed 90 days',
                code: 'PERIOD_TOO_LONG'
            });
        }

        const filters = {
            ...firmFilter,
            createdAt: { $gte: startDate, $lte: endDate }
        };

        // Get format
        const format = req.query.format || 'json';

        // Get logs (limited to prevent memory issues)
        const logs = await AuditLog.find(filters)
            .sort({ createdAt: -1 })
            .limit(50000) // Safety limit
            .setOptions({ bypassFirmFilter: isSuperAdmin })
            .lean();

        // Log export action
        await auditLogService.log(
            'admin_export_audit_logs',
            'system',
            null,
            'SUCCESS',
            {
                userId: adminUser._id || req.userId || req.userID,
                userEmail: adminUser.email,
                userRole: 'admin',
                ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                userAgent: req.headers['user-agent'] || 'unknown',
                method: req.method,
                endpoint: req.originalUrl,
                severity: 'high',
                details: {
                    format,
                    period: `${startDate.toISOString()} to ${endDate.toISOString()}`,
                    recordCount: logs.length
                }
            }
        );

        if (format === 'csv') {
            // Convert to CSV
            const csvRows = [];

            // Header
            csvRows.push('Timestamp,Action,Resource Type,Resource ID,Status,User Email,User Role,IP Address,Severity');

            // Data
            logs.forEach(log => {
                csvRows.push([
                    new Date(log.createdAt).toISOString(),
                    log.action || '',
                    log.resourceType || '',
                    log.resourceId || '',
                    log.status || '',
                    log.userEmail || '',
                    log.details?.userRole || '',
                    log.details?.ipAddress || '',
                    log.details?.severity || ''
                ].map(field => `"${field}"`).join(','));
            });

            const csv = csvRows.join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
            return res.send(csv);
        } else {
            // JSON format
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.json`);
            return res.json({
                error: false,
                exportedAt: new Date().toISOString(),
                period: {
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString()
                },
                count: logs.length,
                data: logs
            });
        }

    } catch (error) {
        logger.error('Admin exportAuditLogs error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to export audit logs',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

/**
 * Get user login history
 * GET /api/admin/audit/login-history
 */
const getLoginHistory = async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId || req.userID).select('role firmId email').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // Build filter for multi-tenancy
        // NOTE: Super admins (no firmId) can query across all firms with bypass
        const firmFilter = adminUser.firmId ? { firmId: adminUser.firmId } : {};
        const isSuperAdmin = !adminUser.firmId;

        // Pagination
        const paginationParams = sanitizePagination(req.query, {
            maxLimit: 500,
            defaultLimit: 100,
            defaultPage: 1
        });

        // Build filters
        const filters = {
            ...firmFilter,
            action: { $in: ['login', 'login_success', 'login_failed', 'logout'] }
        };

        // Filter by user if specified
        if (req.query.userId) {
            const userId = sanitizeObjectId(req.query.userId);
            if (userId) {
                filters.userId = userId;
            }
        }

        // Date range
        if (req.query.startDate || req.query.endDate) {
            filters.createdAt = {};
            if (req.query.startDate) {
                const startDate = new Date(req.query.startDate);
                if (!isNaN(startDate.getTime())) {
                    filters.createdAt.$gte = startDate;
                }
            }
            if (req.query.endDate) {
                const endDate = new Date(req.query.endDate);
                if (!isNaN(endDate.getTime())) {
                    filters.createdAt.$lte = endDate;
                }
            }
        }

        // Get login history
        const [loginHistory, total] = await Promise.all([
            AuditLog.find(filters)
                .sort({ createdAt: -1 })
                .limit(paginationParams.limit)
                .skip(paginationParams.skip)
                .select('action userId userEmail status createdAt details.ipAddress details.userAgent details.location')
                .setOptions({ bypassFirmFilter: isSuperAdmin })
                .lean(),
            AuditLog.countDocuments(filters).setOptions({ bypassFirmFilter: isSuperAdmin })
        ]);

        // Get login statistics
        const loginStats = await AuditLog.aggregate([
            { $match: filters },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]).option({ bypassFirmFilter: isSuperAdmin });

        return res.json({
            error: false,
            data: {
                history: loginHistory,
                stats: loginStats
            },
            pagination: {
                total,
                limit: paginationParams.limit,
                skip: paginationParams.skip,
                page: Math.floor(paginationParams.skip / paginationParams.limit) + 1,
                pages: Math.ceil(total / paginationParams.limit)
            }
        });

    } catch (error) {
        logger.error('Admin getLoginHistory error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch login history',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

module.exports = {
    getAuditLogs,
    getSecurityEvents,
    getComplianceReport,
    exportAuditLogs,
    getLoginHistory
};
