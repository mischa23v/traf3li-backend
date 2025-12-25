/**
 * Admin Custom Claims Controller
 *
 * Administrative endpoints for managing custom JWT claims.
 * Allows admins to set, update, view, and delete custom claims for users.
 *
 * Features:
 * - Set custom claims for a user
 * - Get custom claims for a user
 * - Update custom claims (merge or replace)
 * - Delete custom claims (all or specific keys)
 * - Preview claims that will be in next token
 */

const { User, AuditLog } = require('../models');
const logger = require('../utils/logger');
const {
    sanitizeForLog,
    sanitizeString,
    sanitizeObjectId,
} = require('../utils/securityUtils');
const auditLogService = require('../services/auditLog.service');
const customClaimsService = require('../services/customClaims.service');

/**
 * Get custom claims for a user
 * GET /api/admin/users/:id/claims
 */
const getUserClaims = async (req, res) => {
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

        // Get target user
        const targetUser = await User.findById(targetUserId)
            .select('email firmId customClaims customClaimsUpdatedAt customClaimsUpdatedBy')
            .populate('customClaimsUpdatedBy', 'email firstName lastName')
            .lean();

        if (!targetUser) {
            return res.status(404).json({
                error: true,
                message: 'User not found',
                code: 'NOT_FOUND'
            });
        }

        // Check firm access for multi-tenancy
        if (adminUser.firmId && targetUser.firmId &&
            adminUser.firmId.toString() !== targetUser.firmId.toString()) {
            return res.status(403).json({
                error: true,
                message: 'Cannot access user from different firm',
                code: 'FIRM_ACCESS_DENIED'
            });
        }

        // Get preview of all claims that will be in the token
        const fullClaims = await customClaimsService.getCustomClaims(targetUserId);

        // Log admin action
        await auditLogService.log(
            'admin_view_user_claims',
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
                    targetUserEmail: targetUser.email
                }
            }
        );

        return res.json({
            error: false,
            data: {
                userId: targetUserId,
                userEmail: targetUser.email,
                // User-specific custom claims (stored in DB)
                customClaims: targetUser.customClaims || {},
                // Preview of all claims that will be in the token
                tokenClaimsPreview: fullClaims,
                metadata: {
                    updatedAt: targetUser.customClaimsUpdatedAt,
                    updatedBy: targetUser.customClaimsUpdatedBy
                }
            }
        });

    } catch (error) {
        logger.error('Admin getUserClaims error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch user claims',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

/**
 * Set/Update custom claims for a user
 * PUT /api/admin/users/:id/claims
 */
const setUserClaims = async (req, res) => {
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

        const { claims, merge = true } = req.body;

        // Validate claims object
        if (!claims || typeof claims !== 'object' || Array.isArray(claims)) {
            return res.status(400).json({
                error: true,
                message: 'Claims must be a non-null object',
                code: 'INVALID_CLAIMS'
            });
        }

        // Get target user
        const targetUser = await User.findById(targetUserId).select('email firmId');

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
                message: 'Cannot modify claims for user from different firm',
                code: 'FIRM_ACCESS_DENIED'
            });
        }

        // Validate claims
        const validation = customClaimsService.validateCustomClaims(claims);
        if (!validation.valid) {
            return res.status(400).json({
                error: true,
                message: 'Invalid claims',
                code: 'INVALID_CLAIMS',
                errors: validation.errors
            });
        }

        const oldClaims = targetUser.customClaims ? { ...targetUser.customClaims } : {};

        // Set custom claims using service
        const updatedClaims = await customClaimsService.setCustomClaims(
            targetUserId,
            claims,
            { merge, validate: false } // Already validated above
        );

        // Update metadata
        targetUser.customClaimsUpdatedAt = new Date();
        targetUser.customClaimsUpdatedBy = adminUser._id || req.userId || req.userID;
        await targetUser.save();

        // Log admin action
        await auditLogService.log(
            'admin_set_user_claims',
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
                    merge,
                    oldClaims: sanitizeForLog(oldClaims),
                    newClaims: sanitizeForLog(updatedClaims)
                }
            }
        );

        return res.json({
            error: false,
            message: merge ? 'Custom claims updated successfully' : 'Custom claims set successfully',
            data: {
                userId: targetUserId,
                email: targetUser.email,
                customClaims: updatedClaims,
                merge,
                updatedAt: targetUser.customClaimsUpdatedAt,
                updatedBy: adminUser.email
            }
        });

    } catch (error) {
        logger.error('Admin setUserClaims error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to set user claims',
            messageEn: 'An error occurred while processing your request',
            details: error.message
        });
    }
};

/**
 * Delete custom claims for a user
 * DELETE /api/admin/users/:id/claims
 */
const deleteUserClaims = async (req, res) => {
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

        // Optional: delete specific claim keys
        const { keys } = req.body; // Array of claim keys to delete

        // Get target user
        const targetUser = await User.findById(targetUserId).select('email firmId customClaims');

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
                message: 'Cannot modify claims for user from different firm',
                code: 'FIRM_ACCESS_DENIED'
            });
        }

        const oldClaims = targetUser.customClaims ? { ...targetUser.customClaims } : {};

        // Delete custom claims using service
        if (keys && Array.isArray(keys) && keys.length > 0) {
            // Delete specific keys
            await customClaimsService.deleteCustomClaims(targetUserId, keys);
        } else {
            // Delete all custom claims
            await customClaimsService.deleteCustomClaims(targetUserId);
        }

        // Update metadata
        targetUser.customClaimsUpdatedAt = new Date();
        targetUser.customClaimsUpdatedBy = adminUser._id || req.userId || req.userID;
        await targetUser.save();

        // Log admin action
        await auditLogService.log(
            'admin_delete_user_claims',
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
                    deletedKeys: keys || 'all',
                    oldClaims: sanitizeForLog(oldClaims)
                }
            }
        );

        return res.json({
            error: false,
            message: keys ? 'Specific custom claims deleted successfully' : 'All custom claims deleted successfully',
            data: {
                userId: targetUserId,
                email: targetUser.email,
                deletedKeys: keys || 'all',
                deletedAt: new Date()
            }
        });

    } catch (error) {
        logger.error('Admin deleteUserClaims error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to delete user claims',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

/**
 * Preview token claims for a user
 * GET /api/admin/users/:id/claims/preview
 */
const previewTokenClaims = async (req, res) => {
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

        // Get target user
        const targetUser = await User.findById(targetUserId).lean();

        if (!targetUser) {
            return res.status(404).json({
                error: true,
                message: 'User not found',
                code: 'NOT_FOUND'
            });
        }

        // Check firm access for multi-tenancy
        if (adminUser.firmId && targetUser.firmId &&
            adminUser.firmId.toString() !== targetUser.firmId.toString()) {
            return res.status(403).json({
                error: true,
                message: 'Cannot access user from different firm',
                code: 'FIRM_ACCESS_DENIED'
            });
        }

        // Get full claims preview
        const claims = await customClaimsService.getCustomClaims(targetUserId);

        // Get breakdown of claim sources
        const standardClaims = customClaimsService.getStandardClaims(targetUser);
        const userCustomClaims = customClaimsService.getUserCustomClaims(targetUser);
        const dynamicClaims = customClaimsService.getDynamicClaims(targetUser);
        const conditionalClaims = customClaimsService.getConditionalClaims(targetUser);

        return res.json({
            error: false,
            data: {
                userId: targetUserId,
                userEmail: targetUser.email,
                // Complete claims that will be in token
                allClaims: claims,
                // Breakdown by source
                breakdown: {
                    standard: standardClaims,
                    userCustom: userCustomClaims,
                    dynamic: dynamicClaims,
                    conditional: conditionalClaims
                },
                metadata: {
                    claimCount: Object.keys(claims).length,
                    tokenSize: JSON.stringify(claims).length + ' bytes'
                }
            }
        });

    } catch (error) {
        logger.error('Admin previewTokenClaims error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to preview token claims',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

/**
 * Validate custom claims without saving
 * POST /api/admin/users/:id/claims/validate
 */
const validateClaims = async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId || req.userID).select('role email').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        const { claims } = req.body;

        if (!claims || typeof claims !== 'object') {
            return res.status(400).json({
                error: true,
                message: 'Claims must be a valid object',
                code: 'INVALID_INPUT'
            });
        }

        // Validate claims
        const validation = customClaimsService.validateCustomClaims(claims);

        return res.json({
            error: false,
            data: {
                valid: validation.valid,
                errors: validation.errors || [],
                claimCount: Object.keys(claims).length,
                estimatedSize: JSON.stringify(claims).length + ' bytes'
            }
        });

    } catch (error) {
        logger.error('Admin validateClaims error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to validate claims',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

module.exports = {
    getUserClaims,
    setUserClaims,
    deleteUserClaims,
    previewTokenClaims,
    validateClaims
};
