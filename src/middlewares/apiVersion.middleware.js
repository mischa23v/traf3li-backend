/**
 * API Versioning Middleware
 *
 * Extracts API version from:
 * 1. URL path (/api/v1/, /api/v2/)
 * 2. X-API-Version header
 * 3. Accept header (application/vnd.traf3li.v1+json)
 *
 * Sets req.apiVersion and validates version
 * Adds deprecation warnings for old versions
 * Supports version negotiation and transformation
 */

const logger = require('../utils/logger');
const apiVersionService = require('../services/apiVersion.service');
const {
    SUPPORTED_VERSIONS,
    DEFAULT_VERSION,
    VERSION_HEADERS,
    getVersionConfig,
    isVersionSupported,
    isVersionDeprecated,
    isVersionSunset,
    getDeprecationInfo
} = require('../config/apiVersions');

/**
 * Extract version from URL path
 * @param {String} path - Request path
 * @returns {String|null} - Extracted version or null
 */
const extractVersionFromPath = (path) => {
    // Match /api/v1/, /api/v2/, etc.
    const match = path.match(/\/api\/(v\d+)\//);
    return match ? match[1] : null;
};

/**
 * Extract version from X-API-Version header
 * @param {Object} headers - Request headers
 * @returns {String|null} - Extracted version or null
 */
const extractVersionFromHeader = (headers) => {
    const versionHeader = headers['x-api-version'] || headers['api-version'];
    if (!versionHeader) return null;

    // Support both "v1" and "1" formats
    return versionHeader.startsWith('v') ? versionHeader : `v${versionHeader}`;
};

/**
 * Extract version from Accept header
 * @param {Object} headers - Request headers
 * @returns {String|null} - Extracted version or null
 */
const extractVersionFromAccept = (headers) => {
    const accept = headers['accept'];
    if (!accept) return null;

    // Match application/vnd.traf3li.v1+json
    const match = accept.match(/application\/vnd\.traf3li\.(v\d+)\+json/);
    return match ? match[1] : null;
};

/**
 * Validate API version
 * @param {String} version - Version to validate
 * @returns {Boolean} - True if valid, false otherwise
 */
const isValidVersion = (version) => {
    return isVersionSupported(version);
};

/**
 * Add deprecation headers to response
 * @param {Object} res - Express response object
 * @param {String} version - API version
 */
const addDeprecationHeaders = (res, version) => {
    const deprecationInfo = getDeprecationInfo(version);

    if (deprecationInfo) {
        res.set(VERSION_HEADERS.DEPRECATION, 'true');

        if (deprecationInfo.deprecatedDate) {
            res.set(VERSION_HEADERS.DEPRECATED_SINCE, deprecationInfo.deprecatedDate);
        }

        if (deprecationInfo.sunsetDate) {
            res.set(VERSION_HEADERS.SUNSET, deprecationInfo.sunsetDate);
            res.set(VERSION_HEADERS.SUNSET_DATE, deprecationInfo.sunsetDate);
        }

        res.set(VERSION_HEADERS.DEPRECATION_INFO, 'https://docs.traf3li.com/api/deprecation');
        res.set(VERSION_HEADERS.MIGRATION_GUIDE, `<${deprecationInfo.migrationGuide}>; rel="alternate"`);

        // Add warning header with days until sunset
        if (deprecationInfo.daysUntilSunset) {
            const warningMessage = `299 - "API version ${version} is deprecated. Will be removed in ${deprecationInfo.daysUntilSunset} days. Migrate to ${deprecationInfo.recommendedVersion}."`;
            res.set(VERSION_HEADERS.WARNING, warningMessage);
        }
    }
};

/**
 * Add version headers to response
 * @param {Object} res - Express response object
 * @param {String} version - API version
 */
const addVersionHeaders = (res, version) => {
    const versionConfig = getVersionConfig(version);

    res.set(VERSION_HEADERS.CURRENT_VERSION, version);
    res.set(VERSION_HEADERS.VERSION_STATUS, versionConfig?.status || 'unknown');
    res.set(VERSION_HEADERS.AVAILABLE_VERSIONS, SUPPORTED_VERSIONS.join(', '));
    res.set(VERSION_HEADERS.LATEST_VERSION, apiVersionService.getSupportedVersions().slice(-1)[0]);

    // Add documentation link
    if (versionConfig?.documentation) {
        res.set('X-API-Documentation', versionConfig.documentation);
    }
};

/**
 * API Version Middleware
 */
const apiVersionMiddleware = (req, res, next) => {
    try {
        // Extract version from multiple sources (priority order)
        const versionFromPath = extractVersionFromPath(req.path);
        const versionFromHeader = extractVersionFromHeader(req.headers);
        const versionFromAccept = extractVersionFromAccept(req.headers);

        // Determine final version (path takes precedence)
        let apiVersion = versionFromPath || versionFromHeader || versionFromAccept || DEFAULT_VERSION;

        // Validate version
        if (!isValidVersion(apiVersion)) {
            logger.warn('Invalid API version requested', {
                requestedVersion: apiVersion,
                path: req.path,
                ip: req.ip,
                userAgent: req.get('user-agent')
            });

            return res.status(400).json({
                success: false,
                error: true,
                message: `Unsupported API version: ${apiVersion}`,
                code: 'INVALID_API_VERSION',
                supportedVersions: SUPPORTED_VERSIONS,
                requestedVersion: apiVersion
            });
        }

        // Check if version is sunset
        if (isVersionSunset(apiVersion)) {
            const versionConfig = getVersionConfig(apiVersion);

            logger.warn('Sunset API version requested', {
                version: apiVersion,
                path: req.path,
                ip: req.ip
            });

            return res.status(410).json({
                success: false,
                error: {
                    code: 'API_VERSION_SUNSET',
                    message: `API version ${apiVersion} has been sunset and is no longer available`,
                    supportedVersions: SUPPORTED_VERSIONS,
                    sunsetDate: versionConfig?.sunsetDate,
                    migrationGuide: versionConfig?.migrationGuide || 'https://docs.traf3li.com/api/migration'
                }
            });
        }

        // Set version in request and response locals
        req.apiVersion = apiVersion;
        res.locals.apiVersion = apiVersion;

        // Add version headers
        addVersionHeaders(res, apiVersion);

        // Add deprecation headers if applicable
        if (isVersionDeprecated(apiVersion)) {
            addDeprecationHeaders(res, apiVersion);

            const deprecationInfo = getDeprecationInfo(apiVersion);

            // Log deprecation warning
            logger.warn('Deprecated API version used', {
                version: apiVersion,
                path: req.path,
                ip: req.ip,
                userAgent: req.get('user-agent'),
                deprecationDate: deprecationInfo?.deprecatedDate,
                sunsetDate: deprecationInfo?.sunsetDate,
                daysUntilSunset: deprecationInfo?.daysUntilSunset
            });
        }

        // Log version usage for analytics
        logger.debug('API version extracted', {
            version: apiVersion,
            source: versionFromPath ? 'path' : versionFromHeader ? 'header' : versionFromAccept ? 'accept' : 'default',
            path: req.path
        });

        next();
    } catch (err) {
        logger.error('Error in API version middleware', {
            error: err.message,
            stack: err.stack,
            path: req.path
        });

        // Continue with default version on error
        req.apiVersion = DEFAULT_VERSION;
        res.locals.apiVersion = DEFAULT_VERSION;
        next();
    }
};

/**
 * Middleware to add deprecation warning for non-versioned routes
 * Use this for backward compatibility routes (/api/* without version)
 */
const addNonVersionedDeprecationWarning = (req, res, next) => {
    // Only apply to routes that don't have version in path
    if (!req.path.match(/\/api\/v\d+\//)) {
        res.set('X-API-Warning', 'Non-versioned endpoint. Please use versioned endpoints (e.g., /api/v1/) for future-proof integration');
        res.set('X-API-Migration-Info', 'https://docs.traf3li.com/api/versioning');

        logger.info('Non-versioned endpoint accessed', {
            path: req.path,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
    }

    next();
};

/**
 * Middleware to enforce minimum API version
 * @param {string} minVersion - Minimum required version
 * @returns {Function} Express middleware
 */
const requireMinVersion = (minVersion) => {
    return (req, res, next) => {
        const currentVersion = req.apiVersion || DEFAULT_VERSION;

        if (apiVersionService.compareVersions(currentVersion, minVersion) < 0) {
            return res.status(426).json({
                success: false,
                error: {
                    code: 'UPGRADE_REQUIRED',
                    message: `This endpoint requires API version ${minVersion} or higher`,
                    currentVersion,
                    requiredVersion: minVersion,
                    upgradeGuide: 'https://docs.traf3li.com/api/upgrade'
                }
            });
        }

        next();
    };
};

/**
 * Get version info for a specific version
 * @param {String} version - Version to get info for
 * @returns {Object} - Version information
 */
const getVersionInformation = (version) => {
    return getVersionConfig(version);
};

/**
 * Get all supported versions
 * @returns {Array} - Array of supported versions
 */
const getSupportedVersionsList = () => {
    return apiVersionService.getSupportedVersions();
};

module.exports = {
    apiVersionMiddleware,
    addNonVersionedDeprecationWarning,
    requireMinVersion,
    getVersionInfo: getVersionInformation,
    getSupportedVersions: getSupportedVersionsList,
    SUPPORTED_VERSIONS,
    DEFAULT_VERSION
};
