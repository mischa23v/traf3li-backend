/**
 * Deprecation Warning Middleware
 *
 * Adds deprecation warnings to API responses for endpoints that are being phased out.
 * This middleware helps clients understand which endpoints they should migrate away from.
 *
 * Usage:
 * - Apply to specific routes that are deprecated
 * - Provide version and sunset date
 * - Clients receive clear migration guidance
 */

const logger = require('../utils/logger');

/**
 * Create deprecation warning middleware for old endpoints
 *
 * @param {String} version - The deprecated version (e.g., 'v1')
 * @param {String} sunset - ISO 8601 date when the endpoint will be removed (e.g., '2025-12-31')
 * @param {String} alternateUrl - Optional URL to the replacement endpoint
 * @returns {Function} Express middleware function
 *
 * @example
 * // Deprecate an old endpoint
 * router.get('/old-endpoint',
 *   deprecationWarning('v1', '2025-12-31', '/api/v2/new-endpoint'),
 *   controller.handleRequest
 * );
 */
const deprecationWarning = (version, sunset, alternateUrl = null) => {
    return (req, res, next) => {
        // Add RFC 8594 Deprecation header (true or HTTP-date)
        res.setHeader('Deprecation', 'true');

        // Add version-specific deprecation info
        res.setHeader('X-API-Deprecated-Version', version);

        // Add Sunset header (RFC 8594) - date when API will be removed
        if (sunset) {
            res.setHeader('Sunset', sunset);
            res.setHeader('X-API-Sunset-Date', sunset);
        }

        // Add Link header to migration guide (RFC 8288)
        res.setHeader('X-API-Deprecation-Info', 'https://docs.traf3li.com/api/deprecation');
        res.setHeader('Link', '<https://docs.traf3li.com/api/migration>; rel="alternate"');

        // Add alternate endpoint if provided
        if (alternateUrl) {
            res.setHeader('X-API-Alternate', alternateUrl);
            // Append to Link header
            const currentLink = res.getHeader('Link');
            res.setHeader('Link', `${currentLink}, <${alternateUrl}>; rel="successor-version"`);
        }

        // Add warning header with human-readable message
        const warningMessage = sunset
            ? `299 - "Deprecated API version ${version}. Will be removed on ${sunset}.${alternateUrl ? ` Use ${alternateUrl} instead.` : ''}"`
            : `299 - "Deprecated API version ${version}.${alternateUrl ? ` Use ${alternateUrl} instead.` : ''}"`;

        res.setHeader('Warning', warningMessage);

        // Log deprecation usage for analytics
        logger.warn('Deprecated endpoint accessed', {
            version,
            path: req.path,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            userId: req.userID,
            firmId: req.firmId,
            sunset,
            alternateUrl,
            timestamp: new Date().toISOString()
        });

        next();
    };
};

/**
 * Create soft deprecation warning (informational only)
 *
 * Use this for endpoints that will be deprecated in the future but are not yet officially deprecated.
 * This gives clients advance notice to plan migration.
 *
 * @param {String} version - The version that will be deprecated
 * @param {String} deprecationDate - ISO 8601 date when the endpoint will be deprecated
 * @param {String} sunsetDate - ISO 8601 date when the endpoint will be removed
 * @param {String} alternateUrl - Optional URL to the replacement endpoint
 * @returns {Function} Express middleware function
 *
 * @example
 * // Give advance notice of upcoming deprecation
 * router.get('/soon-to-be-deprecated',
 *   softDeprecationWarning('v1', '2025-06-30', '2025-12-31', '/api/v2/new-endpoint'),
 *   controller.handleRequest
 * );
 */
const softDeprecationWarning = (version, deprecationDate, sunsetDate = null, alternateUrl = null) => {
    return (req, res, next) => {
        // Add informational headers (not RFC standard, but useful)
        res.setHeader('X-API-Future-Deprecation', deprecationDate);
        res.setHeader('X-API-Planned-Sunset', sunsetDate || 'TBD');

        if (alternateUrl) {
            res.setHeader('X-API-Recommended-Alternative', alternateUrl);
        }

        // Add warning header with advance notice
        const warningMessage = `299 - "This endpoint (${version}) will be deprecated on ${deprecationDate}.${sunsetDate ? ` Removal planned for ${sunsetDate}.` : ''}${alternateUrl ? ` Migrate to ${alternateUrl}.` : ''}"`;

        res.setHeader('Warning', warningMessage);

        // Log for analytics (less severe than actual deprecation)
        logger.info('Endpoint with future deprecation accessed', {
            version,
            path: req.path,
            method: req.method,
            ip: req.ip,
            deprecationDate,
            sunsetDate,
            alternateUrl,
            timestamp: new Date().toISOString()
        });

        next();
    };
};

/**
 * Create endpoint removal warning (for sunset endpoints)
 *
 * Use this for endpoints that have been removed or will be removed very soon.
 * Returns 410 Gone status for removed endpoints, or 301 Moved Permanently for redirects.
 *
 * @param {String} version - The removed version
 * @param {String} sunsetDate - ISO 8601 date when the endpoint was/will be removed
 * @param {String} alternateUrl - URL to the replacement endpoint (if available)
 * @param {Boolean} redirect - Whether to redirect to alternate URL (default: false)
 * @returns {Function} Express middleware function
 *
 * @example
 * // Block access to removed endpoint
 * router.get('/removed-endpoint',
 *   endpointRemovalWarning('v1', '2024-12-31', '/api/v2/new-endpoint'),
 *   controller.handleRequest // This won't be reached
 * );
 */
const endpointRemovalWarning = (version, sunsetDate, alternateUrl = null, redirect = false) => {
    return (req, res, next) => {
        // Log removal attempt
        logger.warn('Sunset endpoint accessed', {
            version,
            path: req.path,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            userId: req.userID,
            firmId: req.firmId,
            sunsetDate,
            alternateUrl,
            timestamp: new Date().toISOString()
        });

        // If redirect is enabled and alternate URL exists, redirect
        if (redirect && alternateUrl) {
            res.setHeader('Location', alternateUrl);
            return res.status(301).json({
                success: false,
                error: {
                    code: 'ENDPOINT_MOVED',
                    message: `This endpoint has been moved to ${alternateUrl}`,
                    messageAr: `تم نقل هذه النقطة النهائية إلى ${alternateUrl}`
                },
                meta: {
                    version,
                    sunsetDate,
                    alternateUrl,
                    redirect: true,
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Return 410 Gone for permanently removed endpoints
        res.setHeader('Sunset', sunsetDate);
        res.setHeader('X-API-Sunset-Date', sunsetDate);

        if (alternateUrl) {
            res.setHeader('X-API-Alternate', alternateUrl);
            res.setHeader('Link', `<${alternateUrl}>; rel="successor-version"`);
        }

        return res.status(410).json({
            success: false,
            error: {
                code: 'ENDPOINT_GONE',
                message: `This endpoint (${version}) was removed on ${sunsetDate}${alternateUrl ? `. Please use ${alternateUrl} instead` : ''}`,
                messageAr: `تمت إزالة هذه النقطة النهائية (${version}) في ${sunsetDate}${alternateUrl ? `. يرجى استخدام ${alternateUrl} بدلاً من ذلك` : ''}`
            },
            meta: {
                version,
                sunsetDate,
                alternateUrl,
                migrationGuide: 'https://docs.traf3li.com/api/migration',
                timestamp: new Date().toISOString()
            }
        });
    };
};

/**
 * Get deprecation status for a version
 *
 * Helper function to check if a version is deprecated
 *
 * @param {String} version - The version to check
 * @param {Object} versionInfo - Version information object
 * @returns {Object} Deprecation status
 */
const getDeprecationStatus = (version, versionInfo = {}) => {
    const info = versionInfo[version];

    if (!info) {
        return {
            isDeprecated: false,
            isSunset: false,
            status: 'unknown'
        };
    }

    const now = new Date();
    const deprecationDate = info.deprecationDate ? new Date(info.deprecationDate) : null;
    const sunsetDate = info.sunsetDate ? new Date(info.sunsetDate) : null;

    return {
        isDeprecated: deprecationDate && now >= deprecationDate,
        isSunset: sunsetDate && now >= sunsetDate,
        status: info.status,
        deprecationDate: info.deprecationDate,
        sunsetDate: info.sunsetDate,
        daysUntilSunset: sunsetDate ? Math.ceil((sunsetDate - now) / (1000 * 60 * 60 * 24)) : null
    };
};

module.exports = {
    deprecationWarning,
    softDeprecationWarning,
    endpointRemovalWarning,
    getDeprecationStatus
};
