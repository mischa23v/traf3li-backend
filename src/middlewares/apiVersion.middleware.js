/**
 * API Versioning Middleware
 *
 * Extracts API version from:
 * 1. URL path (/api/v1/, /api/v2/)
 * 2. API-Version header
 * 3. Accept header (application/vnd.traf3li.v1+json)
 *
 * Sets req.apiVersion and validates version
 * Adds deprecation warnings for old versions
 */

const logger = require('../utils/logger');

// Supported API versions
const SUPPORTED_VERSIONS = ['v1', 'v2'];
const DEFAULT_VERSION = 'v1';
const DEPRECATED_VERSIONS = []; // Add versions here when deprecated
const SUNSET_VERSIONS = []; // Add versions here when sunset date is set

// Deprecation and sunset information
const VERSION_INFO = {
    v1: {
        released: '2024-01-01',
        deprecationDate: null, // Set when deprecating
        sunsetDate: null, // Set when planning removal
        status: 'stable'
    },
    v2: {
        released: '2025-01-01',
        deprecationDate: null,
        sunsetDate: null,
        status: 'beta' // 'beta', 'stable', 'deprecated', 'sunset'
    }
};

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
 * Extract version from API-Version header
 * @param {Object} headers - Request headers
 * @returns {String|null} - Extracted version or null
 */
const extractVersionFromHeader = (headers) => {
    const versionHeader = headers['api-version'];
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
    return SUPPORTED_VERSIONS.includes(version);
};

/**
 * Check if version is deprecated
 * @param {String} version - Version to check
 * @returns {Boolean} - True if deprecated, false otherwise
 */
const isDeprecated = (version) => {
    return DEPRECATED_VERSIONS.includes(version);
};

/**
 * Check if version is sunset (removed)
 * @param {String} version - Version to check
 * @returns {Boolean} - True if sunset, false otherwise
 */
const isSunset = (version) => {
    return SUNSET_VERSIONS.includes(version);
};

/**
 * Add deprecation headers to response
 * @param {Object} res - Express response object
 * @param {String} version - API version
 */
const addDeprecationHeaders = (res, version) => {
    const versionInfo = VERSION_INFO[version];

    if (isDeprecated(version) && versionInfo) {
        res.set('Deprecation', 'true');

        if (versionInfo.deprecationDate) {
            res.set('X-API-Deprecated-Since', versionInfo.deprecationDate);
        }

        if (versionInfo.sunsetDate) {
            res.set('Sunset', versionInfo.sunsetDate);
            res.set('X-API-Sunset-Date', versionInfo.sunsetDate);
        }

        res.set('X-API-Deprecation-Info', 'https://docs.traf3li.com/api/deprecation');
        res.set('Link', '<https://docs.traf3li.com/api/migration>; rel="alternate"');
    }
};

/**
 * Add version headers to response
 * @param {Object} res - Express response object
 * @param {String} version - API version
 */
const addVersionHeaders = (res, version) => {
    res.set('X-API-Version', version);
    res.set('X-API-Status', VERSION_INFO[version]?.status || 'unknown');
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
        if (isSunset(apiVersion)) {
            logger.warn('Sunset API version requested', {
                version: apiVersion,
                path: req.path,
                ip: req.ip
            });

            return res.status(410).json({
                success: false,
                error: true,
                message: `API version ${apiVersion} has been sunset and is no longer available`,
                code: 'API_VERSION_SUNSET',
                supportedVersions: SUPPORTED_VERSIONS,
                sunsetDate: VERSION_INFO[apiVersion]?.sunsetDate,
                migrationGuide: 'https://docs.traf3li.com/api/migration'
            });
        }

        // Set version in request and response locals
        req.apiVersion = apiVersion;
        res.locals.apiVersion = apiVersion;

        // Add version headers
        addVersionHeaders(res, apiVersion);

        // Add deprecation headers if applicable
        if (isDeprecated(apiVersion)) {
            addDeprecationHeaders(res, apiVersion);

            // Log deprecation warning
            logger.warn('Deprecated API version used', {
                version: apiVersion,
                path: req.path,
                ip: req.ip,
                userAgent: req.get('user-agent'),
                deprecationDate: VERSION_INFO[apiVersion]?.deprecationDate,
                sunsetDate: VERSION_INFO[apiVersion]?.sunsetDate
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
 * Get version info for a specific version
 * @param {String} version - Version to get info for
 * @returns {Object} - Version information
 */
const getVersionInfo = (version) => {
    return VERSION_INFO[version] || null;
};

/**
 * Get all supported versions
 * @returns {Array} - Array of supported versions
 */
const getSupportedVersions = () => {
    return [...SUPPORTED_VERSIONS];
};

module.exports = {
    apiVersionMiddleware,
    addNonVersionedDeprecationWarning,
    getVersionInfo,
    getSupportedVersions,
    SUPPORTED_VERSIONS,
    DEFAULT_VERSION,
    VERSION_INFO
};
