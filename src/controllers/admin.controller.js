/**
 * Admin Controller - Token Revocation Management
 *
 * Administrative endpoints for managing token revocations and security.
 * Restricted to admin users only.
 */

const tokenRevocationService = require('../services/tokenRevocation.service');
const auditLogService = require('../services/auditLog.service');
const { User } = require('../models');
const { CustomException } = require('../utils');

/**
 * Revoke all tokens for a specific user (admin action)
 * POST /api/admin/users/:id/revoke-tokens
 */
const revokeUserTokens = async (req, res) => {
    try {
        const { id: targetUserId } = req.params;
        const { reason, notes } = req.body;

        // Validate admin user
        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('email role').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Forbidden: Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // Get target user details
        const targetUser = await User.findById(targetUserId).select('email firmId firstName lastName').lean();

        if (!targetUser) {
            return res.status(404).json({
                error: true,
                message: 'User not found'
            });
        }

        // Validate reason
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
                notes: notes || 'Admin revocation',
                targetUserName: `${targetUser.firstName} ${targetUser.lastName}`
            }
        });

        // Log admin action
        await auditLogService.log(
            'admin_revoke_tokens',
            'user',
            targetUserId,
            null,
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
                    notes: notes || 'Admin revocation'
                }
            }
        );

        return res.json({
            error: false,
            message: 'All tokens revoked successfully for user',
            messageEn: `All tokens revoked for ${targetUser.email}`,
            data: {
                userId: targetUserId,
                userEmail: targetUser.email,
                reason: revocationReason,
                revokedAt: result.revokedAt
            }
        });
    } catch (error) {
        console.error('Admin revokeUserTokens error:', error.message);
        return res.status(500).json({
            error: true,
            message: 'Failed to revoke tokens',
            messageEn: error.message
        });
    }
};

/**
 * Get recent token revocations (admin view)
 * GET /api/admin/revoked-tokens
 */
const getRecentRevocations = async (req, res) => {
    try {
        // Validate admin user
        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('role firmId').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Forbidden: Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // Parse query parameters
        const {
            limit = 100,
            skip = 0,
            reason,
            userId,
            startDate,
            endDate
        } = req.query;

        const filters = {
            limit: parseInt(limit),
            skip: parseInt(skip),
            reason,
            userId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            // Multi-tenancy: Only show revocations for admin's firm (unless super admin)
            firmId: adminUser.firmId || undefined
        };

        // Get revocations
        const revocations = await tokenRevocationService.getRecentRevocations(filters);

        // Get statistics
        const stats = await tokenRevocationService.getStats(filters);

        return res.json({
            error: false,
            data: revocations,
            stats,
            pagination: {
                limit: filters.limit,
                skip: filters.skip,
                total: stats.total
            }
        });
    } catch (error) {
        console.error('Admin getRecentRevocations error:', error.message);
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch revocations',
            messageEn: error.message
        });
    }
};

/**
 * Get token revocation statistics
 * GET /api/admin/revoked-tokens/stats
 */
const getRevocationStats = async (req, res) => {
    try {
        // Validate admin user
        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('role firmId').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Forbidden: Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // Parse query parameters
        const { startDate, endDate } = req.query;

        const filters = {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            firmId: adminUser.firmId || undefined
        };

        // Get statistics
        const stats = await tokenRevocationService.getStats(filters);

        return res.json({
            error: false,
            data: stats
        });
    } catch (error) {
        console.error('Admin getRevocationStats error:', error.message);
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch statistics',
            messageEn: error.message
        });
    }
};

/**
 * Get revocation history for a specific user (admin view)
 * GET /api/admin/users/:id/revocations
 */
const getUserRevocationHistory = async (req, res) => {
    try {
        const { id: targetUserId } = req.params;

        // Validate admin user
        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('role firmId').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Forbidden: Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // Get target user to check firm (multi-tenancy)
        const targetUser = await User.findById(targetUserId).select('firmId email').lean();

        if (!targetUser) {
            return res.status(404).json({
                error: true,
                message: 'User not found'
            });
        }

        // Check if admin can access this user (same firm or super admin)
        if (adminUser.firmId && targetUser.firmId &&
            adminUser.firmId.toString() !== targetUser.firmId.toString()) {
            return res.status(403).json({
                error: true,
                message: 'Forbidden: Cannot access user from different firm',
                code: 'FIRM_ACCESS_DENIED'
            });
        }

        // Parse query parameters
        const { limit = 50, skip = 0, reason } = req.query;

        const options = {
            limit: parseInt(limit),
            skip: parseInt(skip),
            reason
        };

        // Get revocation history
        const history = await tokenRevocationService.getUserRevocations(targetUserId, options);

        return res.json({
            error: false,
            data: history,
            user: {
                id: targetUserId,
                email: targetUser.email
            }
        });
    } catch (error) {
        console.error('Admin getUserRevocationHistory error:', error.message);
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch revocation history',
            messageEn: error.message
        });
    }
};

/**
 * Manual cleanup of expired revoked tokens
 * POST /api/admin/revoked-tokens/cleanup
 */
const cleanupExpiredTokens = async (req, res) => {
    try {
        // Validate admin user
        const adminUserId = req.userId || req.userID;
        const adminUser = await User.findById(adminUserId).select('role email').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Forbidden: Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // Run cleanup
        const deletedCount = await tokenRevocationService.cleanupExpiredTokens();

        // Log admin action
        await auditLogService.log(
            'cleanup_expired_tokens',
            'system',
            null,
            null,
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
                    deletedCount
                }
            }
        );

        return res.json({
            error: false,
            message: `Cleaned up ${deletedCount} expired revoked tokens`,
            data: {
                deletedCount
            }
        });
    } catch (error) {
        console.error('Admin cleanupExpiredTokens error:', error.message);
        return res.status(500).json({
            error: true,
            message: 'Failed to cleanup expired tokens',
            messageEn: error.message
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
