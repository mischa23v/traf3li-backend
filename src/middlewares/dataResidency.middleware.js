/**
 * Data Residency Middleware
 *
 * Enforces geographic access restrictions based on firm's data residency configuration.
 * Blocks requests from countries not in the firm's allowed list.
 *
 * Usage:
 *   app.use('/api/documents', enforceDataResidency());
 *   router.post('/upload', enforceDataResidency({ strict: true }), uploadHandler);
 */

const logger = require('../utils/logger');
const dataResidencyService = require('../services/dataResidency.service');
const geoip = require('geoip-lite');

/**
 * Get country code from IP address
 * @param {string} ip - IP address
 * @returns {string|null} ISO 2-letter country code
 */
function getCountryFromIP(ip) {
    // Handle localhost/private IPs
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return process.env.DEFAULT_COUNTRY || 'SA'; // Default to Saudi Arabia for local dev
    }

    const geo = geoip.lookup(ip);
    return geo?.country || null;
}

/**
 * Extract client IP from request
 * @param {Object} req - Express request
 * @returns {string} Client IP address
 */
function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip;
}

/**
 * Data residency enforcement middleware
 * @param {Object} options - Middleware options
 * @param {boolean} options.strict - If true, block request on violation. If false, just log warning.
 * @param {boolean} options.skipForAdmin - Skip enforcement for admin users
 * @returns {Function} Express middleware
 */
function enforceDataResidency(options = {}) {
    const { strict = true, skipForAdmin = false } = options;

    return async (req, res, next) => {
        try {
            // Get firm ID from user or request
            const firmId = req.user?.firmId || req.params.firmId || req.body?.firmId;

            if (!firmId) {
                // No firm context, skip enforcement
                return next();
            }

            // Skip for admin if configured
            if (skipForAdmin && req.user?.role === 'admin') {
                return next();
            }

            // Get client's country
            const clientIP = getClientIP(req);
            const countryCode = getCountryFromIP(clientIP);

            if (!countryCode) {
                // Could not determine country
                if (strict && process.env.NODE_ENV === 'production') {
                    return res.status(403).json({
                        success: false,
                        error: 'Unable to verify geographic location',
                        code: 'DATA_RESIDENCY_UNKNOWN_LOCATION'
                    });
                }
                return next();
            }

            // Check if access is allowed
            const accessCheck = await dataResidencyService.isAccessAllowedFromCountry(firmId, countryCode);

            if (!accessCheck.allowed) {
                if (strict) {
                    return res.status(403).json({
                        success: false,
                        error: accessCheck.reason,
                        code: 'DATA_RESIDENCY_BLOCKED',
                        allowedCountries: accessCheck.allowedCountries
                    });
                }

                // Non-strict mode: log warning but allow
                logger.warn(`Data residency warning: Access from ${countryCode} for firm ${firmId}`);
            }

            // Attach residency info to request for downstream use
            req.dataResidency = {
                firmId,
                clientCountry: countryCode,
                clientIP,
                allowed: accessCheck.allowed
            };

            next();
        } catch (error) {
            logger.error('Data residency middleware error:', error);

            // On error, fail open in development, fail closed in production
            if (process.env.NODE_ENV === 'production' && strict) {
                return res.status(500).json({
                    success: false,
                    error: 'Data residency check failed',
                    code: 'DATA_RESIDENCY_ERROR'
                });
            }

            next();
        }
    };
}

/**
 * Middleware to validate data operations against residency rules
 * Use for upload/download/transfer operations
 */
function validateDataOperation(operationType) {
    return async (req, res, next) => {
        try {
            const firmId = req.user?.firmId || req.params.firmId;

            if (!firmId) {
                return next();
            }

            const clientIP = getClientIP(req);
            const countryCode = getCountryFromIP(clientIP);

            const context = {
                sourceCountry: countryCode,
                destinationRegion: req.body?.destinationRegion,
                dataClassification: req.body?.classification
            };

            const compliance = await dataResidencyService.validateCompliance(firmId, operationType, context);

            if (!compliance.compliant) {
                return res.status(403).json({
                    success: false,
                    error: 'Operation violates data residency policy',
                    code: 'DATA_RESIDENCY_COMPLIANCE_VIOLATION',
                    violations: compliance.violations
                });
            }

            req.dataResidencyCompliance = compliance;
            next();
        } catch (error) {
            logger.error('Data operation validation error:', error);
            next();
        }
    };
}

/**
 * Get region-aware storage configuration for a firm
 * Attaches the correct R2 client and bucket to the request
 * Note: R2 uses a single global endpoint (no regional variants like AWS S3)
 */
async function attachRegionConfig(req, res, next) {
    try {
        const firmId = req.user?.firmId || req.params.firmId;

        if (!firmId) {
            return next();
        }

        const [storageClient, bucket, config] = await Promise.all([
            dataResidencyService.getStorageClientForFirm(firmId),
            dataResidencyService.getBucketForFirm(firmId),
            dataResidencyService.getFirmResidencyConfig(firmId)
        ]);

        req.regionConfig = {
            storageClient, // R2 client (global, not regional)
            bucket,
            region: config.primaryRegion, // 'cloudflare-global'
            storageProvider: 'cloudflare-r2'
        };

        next();
    } catch (error) {
        logger.error('Storage config attachment error:', error);
        next();
    }
}

module.exports = {
    enforceDataResidency,
    validateDataOperation,
    attachRegionConfig,
    getCountryFromIP,
    getClientIP
};
