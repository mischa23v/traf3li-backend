/**
 * API Key Authentication Middleware
 *
 * Authenticates requests using API keys for external integrations.
 * API keys are available for Professional and Enterprise plans.
 */

const ApiKey = require('../models/apiKey.model');
const { hasApiAccess } = require('../config/plans.config');
const AuditLog = require('../models/auditLog.model');

/**
 * Main API Key Authentication Middleware
 * Validates API key and attaches key info to request
 */
const apiKeyAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Check for Bearer token with traf_ prefix
    if (!authHeader || !authHeader.startsWith('Bearer traf_')) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'Valid API key required',
            messageAr: 'مفتاح API صالح مطلوب'
        });
    }

    const key = authHeader.replace('Bearer ', '');

    try {
        const apiKey = await ApiKey.verifyKey(key);

        if (!apiKey) {
            // Log failed attempt
            await AuditLog.log({
                action: 'login_failed',
                resourceType: 'api_key',
                userEmail: 'api_request',
                userRole: 'client',
                userId: null,
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.get('user-agent'),
                status: 'failed',
                severity: 'medium',
                details: {
                    reason: 'Invalid or expired API key',
                    keyPrefix: key.substring(0, 12)
                }
            }).catch(() => {});

            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Invalid or expired API key',
                messageAr: 'مفتاح API غير صالح أو منتهي الصلاحية'
            });
        }

        // Check if API key is expired
        if (apiKey.isExpired()) {
            return res.status(401).json({
                success: false,
                error: 'API key expired',
                message: 'API key has expired',
                messageAr: 'مفتاح API منتهي الصلاحية'
            });
        }

        // Check IP restrictions
        const clientIp = req.ip || req.connection.remoteAddress;
        if (!apiKey.isIpAllowed(clientIp)) {
            await AuditLog.log({
                action: 'ip_blocked',
                resourceType: 'api_key',
                resourceId: apiKey._id,
                firmId: apiKey.firmId._id,
                userEmail: 'api_request',
                userRole: 'client',
                userId: apiKey.createdBy,
                ipAddress: clientIp,
                userAgent: req.get('user-agent'),
                status: 'failed',
                severity: 'high',
                details: {
                    reason: 'IP not in allowlist',
                    attemptedIp: clientIp,
                    allowedIps: apiKey.allowedIps
                }
            }).catch(() => {});

            return res.status(403).json({
                success: false,
                error: 'IP not allowed',
                message: 'Request from this IP is not allowed',
                messageAr: 'الطلب من هذا العنوان IP غير مسموح'
            });
        }

        // Check firm's plan allows API access
        const firmPlan = apiKey.firmId?.subscription?.plan || 'free';
        if (!hasApiAccess(firmPlan)) {
            return res.status(403).json({
                success: false,
                error: 'API access not available',
                message: 'API access requires Professional or Enterprise plan',
                messageAr: 'الوصول إلى API يتطلب باقة Professional أو Enterprise'
            });
        }

        // Update last used IP
        apiKey.lastUsedIp = clientIp;
        await apiKey.save();

        // Attach API key info to request
        req.apiKey = apiKey;
        req.firmId = apiKey.firmId._id;
        req.plan = firmPlan;
        req.isApiRequest = true;
        req.apiKeyId = apiKey._id;
        req.apiKeyScopes = apiKey.scopes;

        // Create a helper to check scopes
        req.hasScope = (scope) => apiKey.hasScope(scope);

        // Create firmQuery for data isolation
        req.firmQuery = { firmId: apiKey.firmId._id };

        next();
    } catch (error) {
        console.error('API key auth error:', error);
        return res.status(500).json({
            success: false,
            error: 'Authentication error',
            message: 'Failed to authenticate API key',
            messageAr: 'فشل في مصادقة مفتاح API'
        });
    }
};

/**
 * Middleware to check if API key has required scope
 * @param {string} requiredScope - Required scope
 * @returns {Function} Express middleware
 */
const requireScope = (requiredScope) => {
    return (req, res, next) => {
        if (!req.apiKey) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'API key authentication required'
            });
        }

        if (!req.hasScope(requiredScope)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient scope',
                message: `This endpoint requires the "${requiredScope}" scope`,
                messageAr: `هذه النقطة النهائية تتطلب نطاق "${requiredScope}"`,
                requiredScope,
                currentScopes: req.apiKeyScopes
            });
        }

        next();
    };
};

/**
 * Middleware to check if API key has any of the required scopes
 * @param {Array<string>} scopes - Array of acceptable scopes
 * @returns {Function} Express middleware
 */
const requireAnyScope = (scopes) => {
    return (req, res, next) => {
        if (!req.apiKey) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'API key authentication required'
            });
        }

        const hasAnyScope = scopes.some(scope => req.hasScope(scope));

        if (!hasAnyScope) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient scope',
                message: 'This endpoint requires one of the specified scopes',
                requiredScopes: scopes,
                currentScopes: req.apiKeyScopes
            });
        }

        next();
    };
};

/**
 * Rate limiting for API key requests
 * Checks if the API key has exceeded its rate limit
 */
const apiKeyRateLimit = async (req, res, next) => {
    if (!req.apiKey) {
        return next();
    }

    // In production, use Redis for proper rate limiting
    // This is a simple in-memory check based on usage count
    // For now, we just pass through - implement Redis-based rate limiting later

    next();
};

/**
 * Combined authentication - supports both JWT and API key
 * Useful for endpoints that should work with both auth methods
 */
const flexibleAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Check if it's an API key request
    if (authHeader && authHeader.startsWith('Bearer traf_')) {
        return apiKeyAuth(req, res, next);
    }

    // Otherwise, continue to normal JWT auth (handled by userMiddleware)
    next();
};

module.exports = {
    apiKeyAuth,
    requireScope,
    requireAnyScope,
    apiKeyRateLimit,
    flexibleAuth
};
