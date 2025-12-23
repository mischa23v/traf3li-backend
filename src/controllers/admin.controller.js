/**
 * Admin Controller - Token Revocation Management
 *
 * Administrative endpoints for managing token revocations and security.
 * Restricted to admin users only.
 *
 * SECURITY:
 * - All endpoints enforce admin role verification
 * - All actions are logged via audit logging
 * - Input validation on all parameters
 * - Sensitive fields filtered from responses
 * - Rate limiting recommendations applied to routes
 */

const tokenRevocationService = require('../services/tokenRevocation.service');
const auditLogService = require('../services/auditLog.service');
const { User } = require('../models');
const { CustomException } = require('../utils');
const {
    pickAllowedFields,
    sanitizeObjectId,
    sanitizeString,
    sanitizePagination,
    sanitizeForLog
} = require('../utils/securityUtils');

/**
 * Revoke all tokens for a specific user (admin action)
 * POST /api/admin/users/:id/revoke-tokens
 *
 * RATE LIMITING: Use sensitiveRateLimiter (3 attempts per hour)
 * This is a sensitive operation that affects user accounts.
 */
const revokeUserTokens = async (req, res) => {
    try {
        // ===== INPUT VALIDATION =====
        // Validate target user ID format
        const { id: targetUserIdRaw } = req.params;
        const targetUserId = sanitizeObjectId(targetUserIdRaw);

        if (!targetUserId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid user ID format',
                code: 'INVALID_INPUT'
            });
        }

        // Validate and sanitize request body
        const { reason, notes } = req.body;

        // Validate notes parameter if provided
        const sanitizedNotes = notes ? sanitizeString(notes).substring(0, 500) : 'Admin revocation';
        if (notes && notes.length > 500) {
            return res.status(400).json({
                error: true,
                message: 'Notes field exceeds maximum length of 500 characters',
                code: 'INVALID_INPUT'
            });
        }

        // ===== ADMIN AUTHORIZATION =====
        const adminUserId = req.userId || req.userID;
        if (!adminUserId) {
            return res.status(401).json({
                error: true,
                message: 'Authentication required',
                code: 'UNAUTHORIZED'
            });
        }

        const adminUser = await User.findById(adminUserId).select('email role firmId').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            // Log unauthorized admin access attempt
            await auditLogService.log(
                'unauthorized_admin_access',
                'user',
                targetUserId,
                'FAILED',
                {
                    userId: adminUserId,
                    userEmail: adminUser?.email || 'unknown',
                    userRole: adminUser?.role || 'none',
                    ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                    userAgent: req.headers['user-agent'] || 'unknown',
                    method: req.method,
                    endpoint: req.originalUrl,
                    severity: 'critical',
                    details: {
                        action: 'revokeUserTokens',
                        reason: 'Insufficient permissions'
                    }
                }
            );

            return res.status(403).json({
                error: true,
                message: 'Forbidden: Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // ===== BUSINESS LOGIC =====
        // Get target user details
        const targetUser = await User.findById(targetUserId).select('email firmId firstName lastName').lean();

        if (!targetUser) {
            // Log audit trail for non-existent user access attempt
            await auditLogService.log(
                'admin_revoke_tokens_not_found',
                'user',
                targetUserId,
                'FAILED',
                {
                    userId: adminUserId,
                    userEmail: adminUser.email,
                    userRole: 'admin',
                    ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                    userAgent: req.headers['user-agent'] || 'unknown',
                    method: req.method,
                    endpoint: req.originalUrl,
                    severity: 'medium',
                    details: {
                        targetUserId,
                        reason: 'User not found'
                    }
                }
            );

            return res.status(404).json({
                error: true,
                message: 'User not found',
                code: 'NOT_FOUND'
            });
        }

        // Validate reason against allowed list
        const validReasons = ['admin_revoke', 'security_incident', 'account_suspended', 'account_deleted'];
        const revocationReason = validReasons.includes(reason) ? reason : 'admin_revoke';

        // Revoke all tokens for the user
        const result = await tokenRevocationService.revokeAllUserTokens(targetUserId, revocationReason, {
            userEmail: targetUser.email,
            firmId: targetUser.firmId,
            revokedBy: adminUserId,
            ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            metadata: {
                adminEmail: adminUser.email,
                notes: sanitizedNotes,
                targetUserName: `${targetUser.firstName} ${targetUser.lastName}`
            }
        });

        // ===== AUDIT LOGGING =====
        // Log successful admin action with high severity
        await auditLogService.log(
            'admin_revoke_tokens',
            'user',
            targetUserId,
            'SUCCESS',
            {
                userId: adminUserId,
                userEmail: adminUser.email,
                userRole: 'admin',
                firmId: targetUser.firmId,
                ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                userAgent: req.headers['user-agent'] || 'unknown',
                method: req.method,
                endpoint: req.originalUrl,
                severity: 'high',
                details: {
                    targetUserId,
                    targetUserEmail: targetUser.email,
                    reason: revocationReason,
                    notes: sanitizeForLog(sanitizedNotes),
                    tokensRevoked: result?.tokensRevoked || true,
                    revokedAt: result?.revokedAt
                }
            }
        );

        // ===== RESPONSE =====
        // Filter sensitive fields using pickAllowedFields
        const safeResponseData = pickAllowedFields(
            {
                userId: targetUserId,
                userEmail: targetUser.email,
                reason: revocationReason,
                revokedAt: result.revokedAt,
                tokenCount: result.count || 0
            },
            ['userId', 'userEmail', 'reason', 'revokedAt', 'tokenCount']
        );

        return res.json({
            error: false,
            message: 'All tokens revoked successfully for user',
            messageEn: `All tokens revoked for ${targetUser.email}`,
            data: safeResponseData
        });
    } catch (error) {
        console.error('Admin revokeUserTokens error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to revoke tokens',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

/**
 * Get recent token revocations (admin view)
 * GET /api/admin/revoked-tokens
 *
 * RATE LIMITING: Use apiRateLimiter (100 requests per 15 minutes)
 * Read-only operation, moderate rate limit is appropriate.
 */
const getRecentRevocations = async (req, res) => {
    try {
        // ===== ADMIN AUTHORIZATION =====
        const adminUserId = req.userId || req.userID;
        if (!adminUserId) {
            return res.status(401).json({
                error: true,
                message: 'Authentication required',
                code: 'UNAUTHORIZED'
            });
        }

        const adminUser = await User.findById(adminUserId).select('role firmId email').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            // Log unauthorized access attempt
            await auditLogService.log(
                'unauthorized_admin_access',
                'system',
                null,
                'FAILED',
                {
                    userId: adminUserId,
                    userEmail: adminUser?.email || 'unknown',
                    userRole: adminUser?.role || 'none',
                    ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                    userAgent: req.headers['user-agent'] || 'unknown',
                    method: req.method,
                    endpoint: req.originalUrl,
                    severity: 'critical',
                    details: {
                        action: 'getRecentRevocations',
                        reason: 'Insufficient permissions'
                    }
                }
            );

            return res.status(403).json({
                error: true,
                message: 'Forbidden: Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // ===== INPUT VALIDATION =====
        // Validate and sanitize pagination parameters
        const paginationParams = sanitizePagination(
            req.query,
            { maxLimit: 100, defaultLimit: 50, defaultPage: 1 }
        );

        // Validate reason parameter if provided
        const validReasons = ['admin_revoke', 'security_incident', 'account_suspended', 'account_deleted', undefined];
        const reason = req.query.reason && validReasons.includes(req.query.reason) ? req.query.reason : undefined;

        // Validate userId parameter if provided
        let userId = undefined;
        if (req.query.userId) {
            userId = sanitizeObjectId(req.query.userId);
            if (!userId) {
                return res.status(400).json({
                    error: true,
                    message: 'Invalid userId format',
                    code: 'INVALID_INPUT'
                });
            }
        }

        // Validate date parameters
        let startDate = undefined;
        let endDate = undefined;

        if (req.query.startDate) {
            const parsedStart = new Date(req.query.startDate);
            if (isNaN(parsedStart.getTime())) {
                return res.status(400).json({
                    error: true,
                    message: 'Invalid startDate format. Use ISO 8601 format (YYYY-MM-DD)',
                    code: 'INVALID_INPUT'
                });
            }
            startDate = parsedStart;
        }

        if (req.query.endDate) {
            const parsedEnd = new Date(req.query.endDate);
            if (isNaN(parsedEnd.getTime())) {
                return res.status(400).json({
                    error: true,
                    message: 'Invalid endDate format. Use ISO 8601 format (YYYY-MM-DD)',
                    code: 'INVALID_INPUT'
                });
            }
            endDate = parsedEnd;
        }

        // ===== BUSINESS LOGIC =====
        const filters = {
            limit: paginationParams.limit,
            skip: paginationParams.skip,
            reason,
            userId,
            startDate,
            endDate,
            // Multi-tenancy: Only show revocations for admin's firm (unless super admin)
            firmId: adminUser.firmId || undefined
        };

        // Get revocations
        const revocations = await tokenRevocationService.getRecentRevocations(filters);

        // Get statistics
        const stats = await tokenRevocationService.getStats(filters);

        // ===== AUDIT LOGGING =====
        // Log successful admin data access
        await auditLogService.log(
            'admin_view_revocations',
            'system',
            null,
            'SUCCESS',
            {
                userId: adminUserId,
                userEmail: adminUser.email,
                userRole: 'admin',
                ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                userAgent: req.headers['user-agent'] || 'unknown',
                method: req.method,
                endpoint: req.originalUrl,
                severity: 'low',
                details: {
                    action: 'view_revocations',
                    filtersApplied: {
                        reason: reason || 'none',
                        userId: userId || 'none',
                        dateRange: startDate && endDate ? `${startDate.toISOString()} to ${endDate.toISOString()}` : 'none'
                    },
                    recordsReturned: revocations?.length || 0
                }
            }
        );

        // ===== RESPONSE =====
        // Filter sensitive fields from response
        const safeRevocations = revocations?.map(rev =>
            pickAllowedFields(rev, ['_id', 'userId', 'userEmail', 'reason', 'revokedAt', 'revokedBy'])
        ) || [];

        return res.json({
            error: false,
            data: safeRevocations,
            stats: pickAllowedFields(stats, ['total', 'byReason', 'lastRevocation']),
            pagination: {
                limit: paginationParams.limit,
                skip: paginationParams.skip,
                total: stats?.total || 0
            }
        });
    } catch (error) {
        console.error('Admin getRecentRevocations error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch revocations',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

/**
 * Get token revocation statistics
 * GET /api/admin/revoked-tokens/stats
 *
 * RATE LIMITING: Use apiRateLimiter (100 requests per 15 minutes)
 * Read-only operation, moderate rate limit is appropriate.
 */
const getRevocationStats = async (req, res) => {
    try {
        // ===== ADMIN AUTHORIZATION =====
        const adminUserId = req.userId || req.userID;
        if (!adminUserId) {
            return res.status(401).json({
                error: true,
                message: 'Authentication required',
                code: 'UNAUTHORIZED'
            });
        }

        const adminUser = await User.findById(adminUserId).select('role firmId email').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            // Log unauthorized access attempt
            await auditLogService.log(
                'unauthorized_admin_access',
                'system',
                null,
                'FAILED',
                {
                    userId: adminUserId,
                    userEmail: adminUser?.email || 'unknown',
                    userRole: adminUser?.role || 'none',
                    ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                    userAgent: req.headers['user-agent'] || 'unknown',
                    method: req.method,
                    endpoint: req.originalUrl,
                    severity: 'critical',
                    details: {
                        action: 'getRevocationStats',
                        reason: 'Insufficient permissions'
                    }
                }
            );

            return res.status(403).json({
                error: true,
                message: 'Forbidden: Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // ===== INPUT VALIDATION =====
        // Validate date parameters
        let startDate = undefined;
        let endDate = undefined;

        if (req.query.startDate) {
            const parsedStart = new Date(req.query.startDate);
            if (isNaN(parsedStart.getTime())) {
                return res.status(400).json({
                    error: true,
                    message: 'Invalid startDate format. Use ISO 8601 format (YYYY-MM-DD)',
                    code: 'INVALID_INPUT'
                });
            }
            startDate = parsedStart;
        }

        if (req.query.endDate) {
            const parsedEnd = new Date(req.query.endDate);
            if (isNaN(parsedEnd.getTime())) {
                return res.status(400).json({
                    error: true,
                    message: 'Invalid endDate format. Use ISO 8601 format (YYYY-MM-DD)',
                    code: 'INVALID_INPUT'
                });
            }
            endDate = parsedEnd;
        }

        // ===== BUSINESS LOGIC =====
        const filters = {
            startDate,
            endDate,
            firmId: adminUser.firmId || undefined
        };

        // Get statistics
        const stats = await tokenRevocationService.getStats(filters);

        // ===== AUDIT LOGGING =====
        // Log successful admin statistics access
        await auditLogService.log(
            'admin_view_statistics',
            'system',
            null,
            'SUCCESS',
            {
                userId: adminUserId,
                userEmail: adminUser.email,
                userRole: 'admin',
                ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                userAgent: req.headers['user-agent'] || 'unknown',
                method: req.method,
                endpoint: req.originalUrl,
                severity: 'low',
                details: {
                    action: 'view_statistics',
                    dateRange: startDate && endDate ? `${startDate.toISOString()} to ${endDate.toISOString()}` : 'all_time'
                }
            }
        );

        // ===== RESPONSE =====
        // Filter sensitive fields from statistics
        const safeStats = pickAllowedFields(
            stats,
            ['total', 'byReason', 'byUser', 'lastRevocation', 'averagePerDay', 'topReasons']
        );

        return res.json({
            error: false,
            data: safeStats
        });
    } catch (error) {
        console.error('Admin getRevocationStats error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch statistics',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

/**
 * Get revocation history for a specific user (admin view)
 * GET /api/admin/users/:id/revocations
 *
 * RATE LIMITING: Use apiRateLimiter (100 requests per 15 minutes)
 * Read-only operation, moderate rate limit is appropriate.
 */
const getUserRevocationHistory = async (req, res) => {
    try {
        // ===== INPUT VALIDATION =====
        // Validate target user ID format
        const { id: targetUserIdRaw } = req.params;
        const targetUserId = sanitizeObjectId(targetUserIdRaw);

        if (!targetUserId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid user ID format',
                code: 'INVALID_INPUT'
            });
        }

        // ===== ADMIN AUTHORIZATION =====
        const adminUserId = req.userId || req.userID;
        if (!adminUserId) {
            return res.status(401).json({
                error: true,
                message: 'Authentication required',
                code: 'UNAUTHORIZED'
            });
        }

        const adminUser = await User.findById(adminUserId).select('role firmId email').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            // Log unauthorized access attempt
            await auditLogService.log(
                'unauthorized_admin_access',
                'user',
                targetUserId,
                'FAILED',
                {
                    userId: adminUserId,
                    userEmail: adminUser?.email || 'unknown',
                    userRole: adminUser?.role || 'none',
                    ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                    userAgent: req.headers['user-agent'] || 'unknown',
                    method: req.method,
                    endpoint: req.originalUrl,
                    severity: 'critical',
                    details: {
                        action: 'getUserRevocationHistory',
                        reason: 'Insufficient permissions',
                        targetUserId
                    }
                }
            );

            return res.status(403).json({
                error: true,
                message: 'Forbidden: Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // Get target user to check firm (multi-tenancy)
        const targetUser = await User.findById(targetUserId).select('firmId email').lean();

        if (!targetUser) {
            // Log audit trail for non-existent user access attempt
            await auditLogService.log(
                'admin_access_nonexistent_user',
                'user',
                targetUserId,
                'FAILED',
                {
                    userId: adminUserId,
                    userEmail: adminUser.email,
                    userRole: 'admin',
                    ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                    userAgent: req.headers['user-agent'] || 'unknown',
                    method: req.method,
                    endpoint: req.originalUrl,
                    severity: 'medium',
                    details: {
                        targetUserId,
                        reason: 'User not found'
                    }
                }
            );

            return res.status(404).json({
                error: true,
                message: 'User not found',
                code: 'NOT_FOUND'
            });
        }

        // Check if admin can access this user (same firm or super admin)
        if (adminUser.firmId && targetUser.firmId &&
            adminUser.firmId.toString() !== targetUser.firmId.toString()) {
            // Log unauthorized cross-firm access attempt
            await auditLogService.log(
                'unauthorized_cross_firm_access',
                'user',
                targetUserId,
                'FAILED',
                {
                    userId: adminUserId,
                    userEmail: adminUser.email,
                    userRole: 'admin',
                    adminFirmId: adminUser.firmId,
                    ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                    userAgent: req.headers['user-agent'] || 'unknown',
                    method: req.method,
                    endpoint: req.originalUrl,
                    severity: 'high',
                    details: {
                        targetUserId,
                        targetUserFirmId: targetUser.firmId,
                        reason: 'Cross-firm access denied'
                    }
                }
            );

            return res.status(403).json({
                error: true,
                message: 'Forbidden: Cannot access user from different firm',
                code: 'FIRM_ACCESS_DENIED'
            });
        }

        // ===== INPUT VALIDATION =====
        // Validate and sanitize pagination parameters
        const paginationParams = sanitizePagination(
            req.query,
            { maxLimit: 100, defaultLimit: 50, defaultPage: 1 }
        );

        // Validate reason parameter if provided
        const validReasons = ['admin_revoke', 'security_incident', 'account_suspended', 'account_deleted', undefined];
        const reason = req.query.reason && validReasons.includes(req.query.reason) ? req.query.reason : undefined;

        // ===== BUSINESS LOGIC =====
        const options = {
            limit: paginationParams.limit,
            skip: paginationParams.skip,
            reason
        };

        // Get revocation history
        const history = await tokenRevocationService.getUserRevocations(targetUserId, options);

        // ===== AUDIT LOGGING =====
        // Log successful admin access to user revocation history
        await auditLogService.log(
            'admin_view_user_revocation_history',
            'user',
            targetUserId,
            'SUCCESS',
            {
                userId: adminUserId,
                userEmail: adminUser.email,
                userRole: 'admin',
                firmId: targetUser.firmId,
                ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                userAgent: req.headers['user-agent'] || 'unknown',
                method: req.method,
                endpoint: req.originalUrl,
                severity: 'low',
                details: {
                    action: 'view_user_revocation_history',
                    targetUserId,
                    targetUserEmail: targetUser.email,
                    reasonFilter: reason || 'none',
                    recordsReturned: history?.length || 0
                }
            }
        );

        // ===== RESPONSE =====
        // Filter sensitive fields from history
        const safeHistory = history?.map(record =>
            pickAllowedFields(record, ['_id', 'reason', 'revokedAt', 'revokedBy', 'details'])
        ) || [];

        return res.json({
            error: false,
            data: safeHistory,
            user: pickAllowedFields(
                { id: targetUserId, email: targetUser.email },
                ['id', 'email']
            ),
            pagination: {
                limit: paginationParams.limit,
                skip: paginationParams.skip
            }
        });
    } catch (error) {
        console.error('Admin getUserRevocationHistory error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch revocation history',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

/**
 * Manual cleanup of expired revoked tokens
 * POST /api/admin/revoked-tokens/cleanup
 *
 * RATE LIMITING: Use sensitiveRateLimiter (3 attempts per hour)
 * This is a sensitive operation that modifies system data.
 * Consider implementing additional protections like requiring confirmation.
 */
const cleanupExpiredTokens = async (req, res) => {
    try {
        // ===== ADMIN AUTHORIZATION =====
        const adminUserId = req.userId || req.userID;
        if (!adminUserId) {
            return res.status(401).json({
                error: true,
                message: 'Authentication required',
                code: 'UNAUTHORIZED'
            });
        }

        const adminUser = await User.findById(adminUserId).select('role email firmId').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            // Log unauthorized admin access attempt
            await auditLogService.log(
                'unauthorized_admin_access',
                'system',
                null,
                'FAILED',
                {
                    userId: adminUserId,
                    userEmail: adminUser?.email || 'unknown',
                    userRole: adminUser?.role || 'none',
                    ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                    userAgent: req.headers['user-agent'] || 'unknown',
                    method: req.method,
                    endpoint: req.originalUrl,
                    severity: 'critical',
                    details: {
                        action: 'cleanupExpiredTokens',
                        reason: 'Insufficient permissions'
                    }
                }
            );

            return res.status(403).json({
                error: true,
                message: 'Forbidden: Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // ===== INPUT VALIDATION =====
        // Optional: Validate confirmation token if implemented for additional security
        const confirmationToken = req.body?.confirmationToken;
        if (confirmationToken) {
            // Validate that confirmation token is a string
            if (typeof confirmationToken !== 'string' || confirmationToken.length > 500) {
                return res.status(400).json({
                    error: true,
                    message: 'Invalid confirmation token format',
                    code: 'INVALID_INPUT'
                });
            }
        }

        // ===== BUSINESS LOGIC =====
        // Run cleanup operation
        const cleanupStartTime = new Date();
        const deletedCount = await tokenRevocationService.cleanupExpiredTokens();
        const cleanupEndTime = new Date();

        // ===== AUDIT LOGGING =====
        // Log successful admin maintenance action with high severity
        await auditLogService.log(
            'cleanup_expired_tokens',
            'system',
            null,
            'SUCCESS',
            {
                userId: adminUserId,
                userEmail: adminUser.email,
                userRole: 'admin',
                firmId: adminUser.firmId,
                ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                userAgent: req.headers['user-agent'] || 'unknown',
                method: req.method,
                endpoint: req.originalUrl,
                severity: 'medium',
                details: {
                    action: 'cleanup_expired_tokens',
                    deletedCount,
                    executionTime: `${cleanupEndTime.getTime() - cleanupStartTime.getTime()}ms`,
                    startTime: cleanupStartTime.toISOString(),
                    endTime: cleanupEndTime.toISOString()
                }
            }
        );

        // ===== RESPONSE =====
        // Filter sensitive fields from response
        const safeResponseData = pickAllowedFields(
            {
                deletedCount,
                executionTime: `${cleanupEndTime.getTime() - cleanupStartTime.getTime()}ms`,
                completedAt: cleanupEndTime.toISOString()
            },
            ['deletedCount', 'executionTime', 'completedAt']
        );

        return res.json({
            error: false,
            message: `Cleaned up ${deletedCount} expired revoked tokens`,
            data: safeResponseData
        });
    } catch (error) {
        // Log cleanup operation failure
        console.error('Admin cleanupExpiredTokens error:', sanitizeForLog(error.message));

        // Log failed cleanup to audit trail
        try {
            const adminUserId = req.userId || req.userID;
            if (adminUserId) {
                const adminUser = await User.findById(adminUserId).select('email').lean();
                await auditLogService.log(
                    'cleanup_expired_tokens',
                    'system',
                    null,
                    'FAILED',
                    {
                        userId: adminUserId,
                        userEmail: adminUser?.email || 'unknown',
                        userRole: 'admin',
                        ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                        userAgent: req.headers['user-agent'] || 'unknown',
                        method: req.method,
                        endpoint: req.originalUrl,
                        severity: 'high',
                        details: {
                            action: 'cleanup_expired_tokens_failed',
                            error: sanitizeForLog(error.message)
                        }
                    }
                );
            }
        } catch (auditError) {
            console.error('Failed to log cleanup error to audit trail:', auditError.message);
        }

        return res.status(500).json({
            error: true,
            message: 'Failed to cleanup expired tokens',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

module.exports = {
    revokeUserTokens,
    getRecentRevocations,
    getRevocationStats,
    getUserRevocationHistory,
    cleanupExpiredTokens
};
