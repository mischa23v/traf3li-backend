/**
 * Admin Users Controller
 *
 * Comprehensive user management endpoints for admin panels.
 *
 * Features:
 * - List users with advanced filtering and pagination
 * - Get detailed user information with activity history
 * - Update user status (enable/disable/suspend)
 * - Revoke user tokens for security
 * - Admin password reset for users
 * - Export users data (CSV/JSON)
 */

const { User, Case, Invoice, Payment, AuditLog, RevokedToken } = require('../models');
const RefreshToken = require('../models/refreshToken.model');
const Session = require('../models/session.model');
const logger = require('../utils/logger');
const {
    sanitizeForLog,
    sanitizePagination,
    sanitizeString,
    sanitizeObjectId,
    pickAllowedFields
} = require('../utils/securityUtils');
const auditLogService = require('../services/auditLog.service');
const tokenRevocationService = require('../services/tokenRevocation.service');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

/**
 * Escape special regex characters to prevent ReDoS attacks
 * @param {string} str - The string to escape
 * @returns {string} - Escaped string safe for use in RegExp
 */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * List users with filtering and pagination
 * GET /api/admin/users
 */
const listUsers = async (req, res) => {
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
        const firmFilter = adminUser.firmId ? { firmId: adminUser.firmId } : {};

        // Pagination
        const paginationParams = sanitizePagination(req.query, {
            maxLimit: 100,
            defaultLimit: 20,
            defaultPage: 1
        });

        // Advanced filters
        const filters = { ...firmFilter };

        // Filter by role
        if (req.query.role && ['admin', 'lawyer', 'client', 'staff'].includes(req.query.role)) {
            filters.role = req.query.role;
        }

        // Filter by status
        if (req.query.status && ['active', 'suspended', 'banned', 'deleted'].includes(req.query.status)) {
            filters.status = req.query.status;
        }

        // Filter by verification status
        if (req.query.verified !== undefined) {
            filters.isVerified = req.query.verified === 'true';
        }

        // Search by name or email
        if (req.query.search) {
            const searchTerm = sanitizeString(req.query.search);
            const escapedSearchTerm = escapeRegex(searchTerm);
            filters.$or = [
                { firstName: new RegExp(escapedSearchTerm, 'i') },
                { lastName: new RegExp(escapedSearchTerm, 'i') },
                { email: new RegExp(escapedSearchTerm, 'i') }
            ];
        }

        // Filter by date range
        if (req.query.createdFrom || req.query.createdTo) {
            filters.createdAt = {};
            if (req.query.createdFrom) {
                filters.createdAt.$gte = new Date(req.query.createdFrom);
            }
            if (req.query.createdTo) {
                filters.createdAt.$lte = new Date(req.query.createdTo);
            }
        }

        // Sort options
        let sortOption = { createdAt: -1 }; // Default: newest first
        if (req.query.sortBy) {
            const sortField = req.query.sortBy;
            const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

            const allowedSortFields = ['createdAt', 'lastLogin', 'firstName', 'email'];
            if (allowedSortFields.includes(sortField)) {
                sortOption = { [sortField]: sortOrder };
            }
        }

        // Execute query
        const [users, total] = await Promise.all([
            User.find(filters)
                .select('firstName lastName email role status isVerified createdAt lastLogin firmId phone')
                .populate('firmId', 'name')
                .sort(sortOption)
                .limit(paginationParams.limit)
                .skip(paginationParams.skip)
                .lean(),
            User.countDocuments(filters)
        ]);

        // Log admin action
        await auditLogService.log(
            'admin_list_users',
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
                    resultCount: users.length
                }
            }
        );

        return res.json({
            error: false,
            data: users,
            pagination: {
                total,
                limit: paginationParams.limit,
                skip: paginationParams.skip,
                page: Math.floor(paginationParams.skip / paginationParams.limit) + 1,
                pages: Math.ceil(total / paginationParams.limit)
            }
        });

    } catch (error) {
        logger.error('Admin listUsers error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch users',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

/**
 * Get detailed user information with activity
 * GET /api/admin/users/:id
 */
const getUserDetails = async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId || req.userID).select('role firmId email').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // Validate user ID
        const targetUserId = sanitizeObjectId(req.params.id);
        if (!targetUserId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid user ID',
                code: 'INVALID_INPUT'
            });
        }

        // Get user details
        const user = await User.findById(targetUserId)
            .populate('firmId', 'name email phone status')
            .lean();

        if (!user) {
            return res.status(404).json({
                error: true,
                message: 'User not found',
                code: 'NOT_FOUND'
            });
        }

        // Check firm access for multi-tenancy
        if (adminUser.firmId && user.firmId &&
            adminUser.firmId.toString() !== user.firmId._id.toString()) {
            return res.status(403).json({
                error: true,
                message: 'Cannot access user from different firm',
                code: 'FIRM_ACCESS_DENIED'
            });
        }

        // Super admin bypasses firm isolation for cross-firm stats
        const isSuperAdmin = !adminUser.firmId;

        // Get user activity statistics
        const [casesCount, invoicesCount, paymentsTotal, recentActivity] = await Promise.all([
            // Cases
            Case.countDocuments({ userId: targetUserId }).setOptions({ bypassFirmFilter: isSuperAdmin }),

            // Invoices
            Invoice.countDocuments({ userId: targetUserId }).setOptions({ bypassFirmFilter: isSuperAdmin }),

            // Total payments
            Payment.aggregate([
                { $match: { userId: targetUserId } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]).option({ bypassFirmFilter: isSuperAdmin }).then(result => result[0]?.total || 0),

            // Recent activity from audit logs
            AuditLog.find({ userId: targetUserId })
                .sort({ createdAt: -1 })
                .limit(10)
                .select('action resourceType status createdAt')
                .setOptions({ bypassFirmFilter: isSuperAdmin })
                .lean()
        ]);

        // Remove sensitive fields
        delete user.password;
        delete user.mustChangePassword;
        delete user.__v;

        // Compile user details with activity
        const userDetails = {
            ...user,
            activity: {
                cases: casesCount,
                invoices: invoicesCount,
                totalPayments: paymentsTotal,
                recentActions: recentActivity
            }
        };

        // Log admin action
        await auditLogService.log(
            'admin_view_user_details',
            'user',
            targetUserId,
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
                    targetUserId,
                    targetUserEmail: user.email
                }
            }
        );

        return res.json({
            error: false,
            data: userDetails
        });

    } catch (error) {
        logger.error('Admin getUserDetails error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch user details',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

/**
 * Update user status (enable/disable/suspend)
 * PATCH /api/admin/users/:id/status
 */
const updateUserStatus = async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId || req.userID).select('role firmId email').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // Validate user ID
        const targetUserId = sanitizeObjectId(req.params.id);
        if (!targetUserId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid user ID',
                code: 'INVALID_INPUT'
            });
        }

        // Validate status
        const { status, reason } = req.body;
        const validStatuses = ['active', 'suspended', 'banned', 'deleted'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                error: true,
                message: 'Invalid status. Must be one of: ' + validStatuses.join(', '),
                code: 'INVALID_STATUS'
            });
        }

        // Get target user
        const targetUser = await User.findById(targetUserId);

        if (!targetUser) {
            return res.status(404).json({
                error: true,
                message: 'User not found',
                code: 'NOT_FOUND'
            });
        }

        // Check firm access
        if (adminUser.firmId && targetUser.firmId &&
            adminUser.firmId.toString() !== targetUser.firmId.toString()) {
            return res.status(403).json({
                error: true,
                message: 'Cannot modify user from different firm',
                code: 'FIRM_ACCESS_DENIED'
            });
        }

        // Prevent admin from disabling themselves
        if (targetUserId === (adminUser._id || req.userId || req.userID).toString()) {
            return res.status(400).json({
                error: true,
                message: 'Cannot change your own status',
                code: 'CANNOT_MODIFY_SELF'
            });
        }

        const oldStatus = targetUser.status;

        // Update status
        targetUser.status = status;
        await targetUser.save();

        // If suspending, banning, or deleting, revoke all tokens and terminate sessions
        if (status === 'suspended' || status === 'banned' || status === 'deleted') {
            await tokenRevocationService.revokeAllUserTokens(
                targetUserId,
                `account_${status}`,
                {
                    userEmail: targetUser.email,
                    firmId: targetUser.firmId,
                    revokedBy: adminUser._id || req.userId || req.userID,
                    ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                    metadata: {
                        adminEmail: adminUser.email,
                        reason: sanitizeString(reason || `Account ${status}`),
                        oldStatus,
                        newStatus: status
                    }
                }
            );

            // Also delete refresh tokens and terminate sessions
            await RefreshToken.deleteMany({ userId: targetUserId });
            await Session.updateMany(
                { userId: targetUserId },
                {
                    $set: {
                        isTerminated: true,
                        terminatedAt: new Date(),
                        terminationReason: `account_${status}`
                    }
                }
            );
        }

        // Log admin action
        await auditLogService.log(
            'admin_update_user_status',
            'user',
            targetUserId,
            'SUCCESS',
            {
                userId: adminUser._id || req.userId || req.userID,
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
                    oldStatus,
                    newStatus: status,
                    reason: sanitizeForLog(reason || 'Not provided')
                }
            }
        );

        return res.json({
            error: false,
            message: `User status updated to ${status}`,
            data: {
                userId: targetUserId,
                email: targetUser.email,
                oldStatus,
                newStatus: status
            }
        });

    } catch (error) {
        logger.error('Admin updateUserStatus error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to update user status',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

/**
 * Revoke all user tokens (security action)
 * POST /api/admin/users/:id/revoke-tokens
 */
const revokeUserTokens = async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId || req.userID).select('role firmId email').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // Validate user ID
        const targetUserId = sanitizeObjectId(req.params.id);
        if (!targetUserId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid user ID',
                code: 'INVALID_INPUT'
            });
        }

        const { reason, notes } = req.body;

        // Get target user
        const targetUser = await User.findById(targetUserId).select('email firmId firstName lastName').lean();

        if (!targetUser) {
            return res.status(404).json({
                error: true,
                message: 'User not found',
                code: 'NOT_FOUND'
            });
        }

        // Check firm access
        if (adminUser.firmId && targetUser.firmId &&
            adminUser.firmId.toString() !== targetUser.firmId.toString()) {
            return res.status(403).json({
                error: true,
                message: 'Cannot revoke tokens for user from different firm',
                code: 'FIRM_ACCESS_DENIED'
            });
        }

        // Revoke tokens
        const validReasons = ['admin_revoke', 'security_incident', 'account_suspended', 'account_deleted'];
        const revocationReason = validReasons.includes(reason) ? reason : 'admin_revoke';

        const result = await tokenRevocationService.revokeAllUserTokens(
            targetUserId,
            revocationReason,
            {
                userEmail: targetUser.email,
                firmId: targetUser.firmId,
                revokedBy: adminUser._id || req.userId || req.userID,
                ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                userAgent: req.headers['user-agent'] || 'unknown',
                metadata: {
                    adminEmail: adminUser.email,
                    notes: sanitizeString(notes || 'Admin token revocation'),
                    targetUserName: `${targetUser.firstName} ${targetUser.lastName}`
                }
            }
        );

        // Log admin action
        await auditLogService.log(
            'admin_revoke_user_tokens',
            'user',
            targetUserId,
            'SUCCESS',
            {
                userId: adminUser._id || req.userId || req.userID,
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
                    notes: sanitizeForLog(notes || 'Not provided')
                }
            }
        );

        return res.json({
            error: false,
            message: 'All tokens revoked successfully',
            data: {
                userId: targetUserId,
                email: targetUser.email,
                reason: revocationReason,
                revokedAt: result.revokedAt || new Date()
            }
        });

    } catch (error) {
        logger.error('Admin revokeUserTokens error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to revoke tokens',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

/**
 * Reset user password (admin action)
 * POST /api/admin/users/:id/reset-password
 */
const resetUserPassword = async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId || req.userID).select('role firmId email').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // Validate user ID
        const targetUserId = sanitizeObjectId(req.params.id);
        if (!targetUserId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid user ID',
                code: 'INVALID_INPUT'
            });
        }

        const { newPassword, sendEmail } = req.body;

        // Get target user
        const targetUser = await User.findById(targetUserId);

        if (!targetUser) {
            return res.status(404).json({
                error: true,
                message: 'User not found',
                code: 'NOT_FOUND'
            });
        }

        // Check firm access
        if (adminUser.firmId && targetUser.firmId &&
            adminUser.firmId.toString() !== targetUser.firmId.toString()) {
            return res.status(403).json({
                error: true,
                message: 'Cannot reset password for user from different firm',
                code: 'FIRM_ACCESS_DENIED'
            });
        }

        // Generate new password if not provided
        const password = newPassword || crypto.randomBytes(16).toString('hex');

        // Validate password strength if provided
        if (newPassword && newPassword.length < 8) {
            return res.status(400).json({
                error: true,
                message: 'Password must be at least 8 characters',
                code: 'WEAK_PASSWORD'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Update user password
        targetUser.password = hashedPassword;
        targetUser.mustChangePassword = true;
        targetUser.passwordChangedAt = new Date();
        await targetUser.save();

        // Revoke all existing tokens
        await tokenRevocationService.revokeAllUserTokens(
            targetUserId,
            'password_reset',
            {
                userEmail: targetUser.email,
                firmId: targetUser.firmId,
                revokedBy: adminUser._id || req.userId || req.userID,
                metadata: {
                    adminEmail: adminUser.email,
                    reason: 'Admin password reset'
                }
            }
        );

        // Log admin action
        await auditLogService.log(
            'admin_reset_user_password',
            'user',
            targetUserId,
            'SUCCESS',
            {
                userId: adminUser._id || req.userId || req.userID,
                userEmail: adminUser.email,
                userRole: 'admin',
                firmId: targetUser.firmId,
                ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                userAgent: req.headers['user-agent'] || 'unknown',
                method: req.method,
                endpoint: req.originalUrl,
                severity: 'critical',
                details: {
                    targetUserId,
                    targetUserEmail: targetUser.email,
                    passwordGenerated: !newPassword
                }
            }
        );

        // TODO: Send email with new password if sendEmail is true
        // This should be implemented in an email service

        return res.json({
            error: false,
            message: 'Password reset successfully',
            data: {
                userId: targetUserId,
                email: targetUser.email,
                temporaryPassword: newPassword ? undefined : password, // Only show if generated
                mustChangePassword: true
            }
        });

    } catch (error) {
        logger.error('Admin resetUserPassword error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to reset password',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

/**
 * Export users data (CSV/JSON)
 * GET /api/admin/users/export
 */
const exportUsers = async (req, res) => {
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
        const firmFilter = adminUser.firmId ? { firmId: adminUser.firmId } : {};

        // Get format (csv or json)
        const format = req.query.format || 'json';

        // Get all users (limited to prevent memory issues)
        const users = await User.find(firmFilter)
            .select('firstName lastName email role status isVerified createdAt lastLogin phone')
            .populate('firmId', 'name')
            .limit(10000) // Safety limit
            .lean();

        // Log export action
        await auditLogService.log(
            'admin_export_users',
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
                    format,
                    userCount: users.length
                }
            }
        );

        if (format === 'csv') {
            // SECURITY: Import sanitization function to prevent CSV injection
            const { sanitizeForCSV } = require('../utils/securityUtils');

            // Convert to CSV
            const csvRows = [];

            // Header
            csvRows.push('First Name,Last Name,Email,Role,Status,Verified,Created At,Last Login,Phone,Firm');

            // Data
            users.forEach(user => {
                csvRows.push([
                    sanitizeForCSV(user.firstName || ''),
                    sanitizeForCSV(user.lastName || ''),
                    sanitizeForCSV(user.email || ''),
                    sanitizeForCSV(user.role || ''),
                    sanitizeForCSV(user.status || ''),
                    sanitizeForCSV(user.isVerified ? 'Yes' : 'No'),
                    sanitizeForCSV(user.createdAt ? new Date(user.createdAt).toISOString() : ''),
                    sanitizeForCSV(user.lastLogin ? new Date(user.lastLogin).toISOString() : ''),
                    sanitizeForCSV(user.phone || ''),
                    sanitizeForCSV(user.firmId?.name || '')
                ].map(field => `"${field}"`).join(','));
            });

            const csv = csvRows.join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=users-export-${Date.now()}.csv`);
            return res.send(csv);
        } else {
            // JSON format
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename=users-export-${Date.now()}.json`);
            return res.json({
                error: false,
                exportedAt: new Date().toISOString(),
                count: users.length,
                data: users
            });
        }

    } catch (error) {
        logger.error('Admin exportUsers error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to export users',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

module.exports = {
    listUsers,
    getUserDetails,
    updateUserStatus,
    revokeUserTokens,
    resetUserPassword,
    exportUsers
};
