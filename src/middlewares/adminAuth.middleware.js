/**
 * Admin Authentication Middleware
 *
 * Enhanced admin authentication and authorization middleware
 * with comprehensive security features.
 *
 * Features:
 * - Verify admin role
 * - Log all admin actions
 * - Optional IP whitelist check
 * - Multi-tenancy support
 * - Rate limiting integration
 */

const { User } = require('../models');
const auditLogService = require('../services/auditLog.service');
const logger = require('../utils/logger');
const { sanitizeForLog } = require('../utils/securityUtils');

/**
 * Verify user has admin role
 * This middleware should be used after the authenticate middleware
 */
const requireAdmin = () => {
    return async (req, res, next) => {
        try {
            // Check if user is authenticated
            const userId = req.userId || req.userID;

            if (!userId) {
                return res.status(401).json({
                    error: true,
                    message: 'Authentication required',
                    code: 'UNAUTHORIZED'
                });
            }

            // Get user with role
            const user = await User.findById(userId).select('role email firmId status').lean();

            if (!user) {
                return res.status(401).json({
                    error: true,
                    message: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            // Check if user is admin
            if (user.role !== 'admin') {
                // Log unauthorized admin access attempt
                await auditLogService.log(
                    'unauthorized_admin_access',
                    'system',
                    null,
                    'FAILED',
                    {
                        userId,
                        userEmail: user.email,
                        userRole: user.role,
                        ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                        userAgent: req.headers['user-agent'] || 'unknown',
                        method: req.method,
                        endpoint: req.originalUrl,
                        severity: 'critical',
                        details: {
                            attemptedAction: 'Access admin endpoint',
                            reason: 'Insufficient role',
                            requiredRole: 'admin',
                            actualRole: user.role
                        }
                    }
                );

                return res.status(403).json({
                    error: true,
                    message: 'Admin access required',
                    code: 'ADMIN_ONLY'
                });
            }

            // Check if account is active
            if (user.status !== 'active') {
                return res.status(403).json({
                    error: true,
                    message: `Account is ${user.status}`,
                    code: 'ACCOUNT_NOT_ACTIVE'
                });
            }

            // Attach admin user info to request
            req.adminUser = user;

            next();

        } catch (error) {
            logger.error('Admin auth middleware error:', sanitizeForLog(error.message));
            return res.status(500).json({
                error: true,
                message: 'Authentication check failed',
                messageEn: 'An error occurred while processing your request'
            });
        }
    };
};

/**
 * Require super admin (admin without firmId)
 * For operations that affect the entire platform
 */
const requireSuperAdmin = () => {
    return async (req, res, next) => {
        try {
            const userId = req.userId || req.userID;

            if (!userId) {
                return res.status(401).json({
                    error: true,
                    message: 'Authentication required',
                    code: 'UNAUTHORIZED'
                });
            }

            const user = await User.findById(userId).select('role email firmId status').lean();

            if (!user) {
                return res.status(401).json({
                    error: true,
                    message: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            if (user.role !== 'admin' || user.firmId) {
                // Log unauthorized super admin access attempt
                await auditLogService.log(
                    'unauthorized_super_admin_access',
                    'system',
                    null,
                    'FAILED',
                    {
                        userId,
                        userEmail: user.email,
                        userRole: user.role,
                        firmId: user.firmId,
                        ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                        userAgent: req.headers['user-agent'] || 'unknown',
                        method: req.method,
                        endpoint: req.originalUrl,
                        severity: 'critical',
                        details: {
                            attemptedAction: 'Access super admin endpoint',
                            reason: user.role !== 'admin'
                                ? 'Insufficient role'
                                : 'User has firm association',
                            requiredRole: 'super admin',
                            actualRole: user.role,
                            hasFirmId: !!user.firmId
                        }
                    }
                );

                return res.status(403).json({
                    error: true,
                    message: 'Super admin access required',
                    code: 'SUPER_ADMIN_ONLY'
                });
            }

            req.adminUser = user;
            next();

        } catch (error) {
            logger.error('Super admin auth middleware error:', sanitizeForLog(error.message));
            return res.status(500).json({
                error: true,
                message: 'Authentication check failed',
                messageEn: 'An error occurred while processing your request'
            });
        }
    };
};

/**
 * Log all admin actions
 * This should be applied to all admin routes for audit trail
 */
const logAdminAction = () => {
    return async (req, res, next) => {
        try {
            const userId = req.userId || req.userID;
            const user = req.adminUser || (userId ? await User.findById(userId).select('email role').lean() : null);

            if (!user || user.role !== 'admin') {
                return next(); // Not an admin, skip logging
            }

            // Capture the original res.json to log after response
            const originalJson = res.json.bind(res);

            res.json = function (data) {
                // Log the admin action
                const action = `admin_${req.method.toLowerCase()}_${req.path.split('/').filter(Boolean).join('_')}`;

                auditLogService.log(
                    action,
                    'system',
                    null,
                    data.error ? 'FAILED' : 'SUCCESS',
                    {
                        userId,
                        userEmail: user.email,
                        userRole: 'admin',
                        ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                        userAgent: req.headers['user-agent'] || 'unknown',
                        method: req.method,
                        endpoint: req.originalUrl,
                        severity: 'medium',
                        details: {
                            action: req.originalUrl,
                            requestBody: sanitizeForLog(req.body),
                            responseStatus: res.statusCode,
                            responseError: data.error || false
                        }
                    }
                ).catch(err => {
                    logger.error('Failed to log admin action:', err.message);
                });

                return originalJson(data);
            };

            next();

        } catch (error) {
            logger.error('Admin action logging middleware error:', sanitizeForLog(error.message));
            // Don't block the request if logging fails
            next();
        }
    };
};

/**
 * Check IP whitelist for admin access (optional)
 * Uses the existing adminIPWhitelist middleware if configured
 */
const checkAdminIPWhitelist = () => {
    return (req, res, next) => {
        try {
            // Skip if no whitelist configured
            const whitelist = process.env.ADMIN_IP_WHITELIST;

            if (!whitelist) {
                return next();
            }

            // Get the existing IP whitelist middleware
            const { adminIPWhitelist } = require('./adminIPWhitelist.middleware');

            // Apply it
            return adminIPWhitelist()(req, res, next);

        } catch (error) {
            logger.error('Admin IP whitelist check error:', sanitizeForLog(error.message));
            // Don't block if whitelist check fails - let other security measures handle it
            next();
        }
    };
};

/**
 * Validate admin has access to specified firm
 * For multi-tenancy support
 *
 * Usage: validateFirmAccess('params', 'firmId')
 * or: validateFirmAccess('body', 'firmId')
 */
const validateFirmAccess = (location = 'params', fieldName = 'firmId') => {
    return async (req, res, next) => {
        try {
            const userId = req.userId || req.userID;
            const adminUser = req.adminUser || await User.findById(userId).select('role firmId email').lean();

            if (!adminUser || adminUser.role !== 'admin') {
                return res.status(403).json({
                    error: true,
                    message: 'Admin access required',
                    code: 'ADMIN_ONLY'
                });
            }

            // Super admins (no firmId) can access all firms
            if (!adminUser.firmId) {
                return next();
            }

            // Get target firm ID from request
            const targetFirmId = location === 'params'
                ? req.params[fieldName]
                : req[location][fieldName];

            if (!targetFirmId) {
                return res.status(400).json({
                    error: true,
                    message: `Missing ${fieldName} in ${location}`,
                    code: 'MISSING_FIRM_ID'
                });
            }

            // Check if admin's firm matches target firm
            if (adminUser.firmId.toString() !== targetFirmId.toString()) {
                // Log unauthorized cross-firm access attempt
                await auditLogService.log(
                    'unauthorized_cross_firm_access',
                    'firm',
                    targetFirmId,
                    'FAILED',
                    {
                        userId,
                        userEmail: adminUser.email,
                        userRole: 'admin',
                        adminFirmId: adminUser.firmId,
                        ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                        userAgent: req.headers['user-agent'] || 'unknown',
                        method: req.method,
                        endpoint: req.originalUrl,
                        severity: 'high',
                        details: {
                            targetFirmId,
                            reason: 'Cross-firm access denied'
                        }
                    }
                );

                return res.status(403).json({
                    error: true,
                    message: 'Cannot access resources from different firm',
                    code: 'FIRM_ACCESS_DENIED'
                });
            }

            next();

        } catch (error) {
            logger.error('Firm access validation error:', sanitizeForLog(error.message));
            return res.status(500).json({
                error: true,
                message: 'Firm access validation failed',
                messageEn: 'An error occurred while processing your request'
            });
        }
    };
};

/**
 * Rate limiter specifically for admin endpoints
 * More lenient than public endpoints but still protective
 */
const adminRateLimiter = () => {
    const { createRateLimiter } = require('./rateLimiter.middleware');

    return createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 500, // 500 requests per 15 minutes for admins
        keyGenerator: (req) => {
            // Use user ID for admin rate limiting
            return req.userId || req.userID || req.ip;
        },
        message: {
            error: true,
            message: 'Too many admin requests - Please slow down',
            code: 'ADMIN_RATE_LIMIT_EXCEEDED'
        }
    });
};

module.exports = {
    requireAdmin,
    requireSuperAdmin,
    logAdminAction,
    checkAdminIPWhitelist,
    validateFirmAccess,
    adminRateLimiter
};
