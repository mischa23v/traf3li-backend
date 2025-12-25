/**
 * API Version Service
 *
 * Service for managing API versions and transforming data between versions.
 * Handles:
 * - Version validation and information
 * - Response/request transformation
 * - Field mapping between versions
 * - Date format conversion
 * - Backward compatibility
 */

const {
    VERSIONS,
    SUPPORTED_VERSIONS,
    DEFAULT_VERSION,
    DEPRECATED_VERSIONS,
    SUNSET_VERSIONS,
    FIELD_MAPPINGS,
    RESPONSE_TEMPLATES,
    DATE_FORMATS,
    DATE_FIELDS,
    getVersionConfig,
    isVersionSupported,
    isVersionDeprecated,
    isVersionSunset,
    getLatestStableVersion,
    getDeprecationInfo,
    getBreakingChanges
} = require('../config/apiVersions');

const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// VERSION INFORMATION
// ═══════════════════════════════════════════════════════════════

/**
 * Get list of supported API versions
 * @returns {Array<string>} - Array of supported version identifiers
 */
const getSupportedVersions = () => {
    return [...SUPPORTED_VERSIONS];
};

/**
 * Get default API version
 * @returns {string} - Default version identifier
 */
const getDefaultVersion = () => {
    return DEFAULT_VERSION;
};

/**
 * Check if a version is supported
 * @param {string} version - Version identifier
 * @returns {boolean}
 */
const isVersionValid = (version) => {
    return isVersionSupported(version);
};

/**
 * Get detailed information about a version
 * @param {string} version - Version identifier
 * @returns {Object|null} - Version information or null if not found
 */
const getVersionInfo = (version) => {
    return getVersionConfig(version);
};

/**
 * Get deprecation warnings for a version
 * @param {string} version - Version identifier
 * @returns {Object|null} - Deprecation warnings with dates and migration info
 */
const getDeprecationWarnings = (version) => {
    return getDeprecationInfo(version);
};

/**
 * Get all versions with their status
 * @returns {Object} - Object with version categories
 */
const getAllVersionsInfo = () => {
    return {
        supported: SUPPORTED_VERSIONS,
        default: DEFAULT_VERSION,
        latest: getLatestStableVersion(),
        deprecated: DEPRECATED_VERSIONS,
        sunset: SUNSET_VERSIONS,
        versions: VERSIONS
    };
};

// ═══════════════════════════════════════════════════════════════
// FIELD TRANSFORMATION
// ═══════════════════════════════════════════════════════════════

/**
 * Transform field names from one version to another
 * @param {Object} data - Data object to transform
 * @param {string} fromVersion - Source version
 * @param {string} toVersion - Target version
 * @returns {Object} - Transformed data
 */
const transformFieldNames = (data, fromVersion, toVersion) => {
    if (!data || typeof data !== 'object') {
        return data;
    }

    // Handle arrays
    if (Array.isArray(data)) {
        return data.map(item => transformFieldNames(item, fromVersion, toVersion));
    }

    const mappingKey = `${fromVersion}_to_${toVersion}`;
    const fieldMapping = FIELD_MAPPINGS[mappingKey];

    if (!fieldMapping) {
        logger.debug(`No field mapping found for ${mappingKey}`);
        return data;
    }

    const transformed = {};

    for (const [key, value] of Object.entries(data)) {
        // Map field name if mapping exists
        const newKey = fieldMapping[key] || key;

        // Recursively transform nested objects
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            transformed[newKey] = transformFieldNames(value, fromVersion, toVersion);
        } else if (Array.isArray(value)) {
            transformed[newKey] = value.map(item =>
                typeof item === 'object' ? transformFieldNames(item, fromVersion, toVersion) : item
            );
        } else {
            transformed[newKey] = value;
        }
    }

    return transformed;
};

/**
 * Transform date fields to the target version format
 * @param {Object} data - Data object containing dates
 * @param {string} toVersion - Target version
 * @returns {Object} - Data with transformed dates
 */
const transformDateFields = (data, toVersion) => {
    if (!data || typeof data !== 'object') {
        return data;
    }

    // Handle arrays
    if (Array.isArray(data)) {
        return data.map(item => transformDateFields(item, toVersion));
    }

    const dateFormat = DATE_FORMATS[toVersion];
    if (!dateFormat) {
        return data;
    }

    const transformed = { ...data };

    for (const [key, value] of Object.entries(data)) {
        // Check if this is a date field
        if (DATE_FIELDS.includes(key) && value) {
            if (dateFormat.returns === 'ISO8601') {
                // Convert to ISO8601
                if (typeof value === 'number') {
                    // Unix timestamp
                    transformed[key] = new Date(value).toISOString();
                } else if (typeof value === 'string') {
                    // Try to parse and convert
                    try {
                        const date = new Date(value);
                        if (!isNaN(date.getTime())) {
                            transformed[key] = date.toISOString();
                        }
                    } catch (error) {
                        logger.warn(`Failed to parse date for key ${key}:`, value);
                    }
                } else if (value instanceof Date) {
                    transformed[key] = value.toISOString();
                }
            }
        } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            // Recursively transform nested objects
            transformed[key] = transformDateFields(value, toVersion);
        } else if (Array.isArray(value)) {
            transformed[key] = value.map(item =>
                typeof item === 'object' ? transformDateFields(item, toVersion) : item
            );
        }
    }

    return transformed;
};

// ═══════════════════════════════════════════════════════════════
// RESPONSE TRANSFORMATION
// ═══════════════════════════════════════════════════════════════

/**
 * Transform response data from one version format to another
 * @param {Object} data - Response data
 * @param {string} fromVersion - Source version
 * @param {string} toVersion - Target version
 * @returns {Object} - Transformed response
 */
const transformResponse = (data, fromVersion, toVersion) => {
    try {
        if (fromVersion === toVersion) {
            return data;
        }

        // Step 1: Transform field names
        let transformed = transformFieldNames(data, fromVersion, toVersion);

        // Step 2: Transform date fields
        transformed = transformDateFields(transformed, toVersion);

        // Step 3: Apply version-specific response structure
        if (toVersion === 'v2' && fromVersion === 'v1') {
            // Transform v1 to v2 response structure
            if (!data.success && !data.error) {
                // Add v2 wrapper
                transformed = {
                    success: true,
                    data: transformed,
                    meta: {
                        timestamp: new Date().toISOString(),
                        apiVersion: 'v2',
                        transformedFrom: 'v1'
                    }
                };
            }
        } else if (toVersion === 'v1' && fromVersion === 'v2') {
            // Transform v2 to v1 response structure
            if (transformed.success !== undefined) {
                // Remove v2 wrapper
                transformed = transformed.data || transformed;
                delete transformed.meta;
                delete transformed.success;
            }
        }

        logger.debug(`Transformed response from ${fromVersion} to ${toVersion}`);
        return transformed;
    } catch (error) {
        logger.error('Error transforming response:', error);
        return data; // Return original data on error
    }
};

/**
 * Transform request data from one version format to another
 * @param {Object} data - Request data
 * @param {string} fromVersion - Source version
 * @param {string} toVersion - Target version
 * @returns {Object} - Transformed request
 */
const transformRequest = (data, fromVersion, toVersion) => {
    try {
        if (fromVersion === toVersion) {
            return data;
        }

        // Step 1: Transform field names
        let transformed = transformFieldNames(data, fromVersion, toVersion);

        // Step 2: Transform date fields
        transformed = transformDateFields(transformed, toVersion);

        logger.debug(`Transformed request from ${fromVersion} to ${toVersion}`);
        return transformed;
    } catch (error) {
        logger.error('Error transforming request:', error);
        return data; // Return original data on error
    }
};

// ═══════════════════════════════════════════════════════════════
// RESPONSE FORMATTING
// ═══════════════════════════════════════════════════════════════

/**
 * Format success response for a specific version
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {string} version - API version
 * @returns {Object} - Formatted response
 */
const formatSuccessResponse = (data, message = 'Success', version = DEFAULT_VERSION) => {
    const template = RESPONSE_TEMPLATES[version];
    if (!template || !template.success) {
        logger.warn(`No success template found for version ${version}`);
        return { data, message };
    }

    return template.success(data, message);
};

/**
 * Format error response for a specific version
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {Object} details - Error details
 * @param {string} version - API version
 * @returns {Object} - Formatted error response
 */
const formatErrorResponse = (message, code = 'INTERNAL_ERROR', details = null, version = DEFAULT_VERSION) => {
    const template = RESPONSE_TEMPLATES[version];
    if (!template || !template.error) {
        logger.warn(`No error template found for version ${version}`);
        return { error: true, message };
    }

    return template.error(message, code, details);
};

/**
 * Format paginated response for a specific version
 * @param {Array} data - Data array
 * @param {Object} paginationInfo - Pagination metadata
 * @param {string} version - API version
 * @returns {Object} - Formatted paginated response
 */
const formatPaginatedResponse = (data, paginationInfo, version = DEFAULT_VERSION) => {
    const template = RESPONSE_TEMPLATES[version];
    if (!template || !template.pagination) {
        logger.warn(`No pagination template found for version ${version}`);
        return { data, pagination: paginationInfo };
    }

    if (version === 'v1') {
        const { page = 1, limit = 20, total = 0 } = paginationInfo;
        return template.pagination(data, page, limit, total);
    } else if (version === 'v2') {
        const { cursor = null, limit = 20, hasMore = false, total = 0 } = paginationInfo;
        return template.pagination(data, cursor, limit, hasMore, total);
    }

    return { data, pagination: paginationInfo };
};

// ═══════════════════════════════════════════════════════════════
// PAGINATION TRANSFORMATION
// ═══════════════════════════════════════════════════════════════

/**
 * Transform pagination parameters between versions
 * @param {Object} paginationParams - Pagination parameters
 * @param {string} fromVersion - Source version
 * @param {string} toVersion - Target version
 * @returns {Object} - Transformed pagination parameters
 */
const transformPaginationParams = (paginationParams, fromVersion, toVersion) => {
    if (fromVersion === toVersion) {
        return paginationParams;
    }

    // V1 to V2: offset-based to cursor-based
    if (fromVersion === 'v1' && toVersion === 'v2') {
        const { page = 1, limit = 20 } = paginationParams;
        const offset = (page - 1) * limit;
        const cursor = offset > 0 ? Buffer.from(JSON.stringify({ offset })).toString('base64') : null;

        return {
            cursor,
            limit
        };
    }

    // V2 to V1: cursor-based to offset-based
    if (fromVersion === 'v2' && toVersion === 'v1') {
        const { cursor, limit = 20 } = paginationParams;
        let page = 1;

        if (cursor) {
            try {
                const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
                const offset = decoded.offset || 0;
                page = Math.floor(offset / limit) + 1;
            } catch (error) {
                logger.warn('Failed to decode cursor:', error);
            }
        }

        return {
            page,
            limit
        };
    }

    return paginationParams;
};

// ═══════════════════════════════════════════════════════════════
// VERSION COMPARISON
// ═══════════════════════════════════════════════════════════════

/**
 * Compare two versions
 * @param {string} version1 - First version
 * @param {string} version2 - Second version
 * @returns {number} - -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
const compareVersions = (version1, version2) => {
    const v1Num = parseInt(version1.replace('v', ''));
    const v2Num = parseInt(version2.replace('v', ''));

    if (v1Num < v2Num) return -1;
    if (v1Num > v2Num) return 1;
    return 0;
};

/**
 * Check if version needs upgrade
 * @param {string} currentVersion - Current version
 * @param {string} requiredVersion - Required version
 * @returns {boolean} - True if upgrade needed
 */
const needsUpgrade = (currentVersion, requiredVersion) => {
    return compareVersions(currentVersion, requiredVersion) < 0;
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // Version information
    getSupportedVersions,
    getDefaultVersion,
    isVersionSupported: isVersionValid,
    getVersionInfo,
    getDeprecationWarnings,
    getAllVersionsInfo,

    // Transformation functions
    transformFieldNames,
    transformDateFields,
    transformResponse,
    transformRequest,

    // Response formatting
    formatSuccessResponse,
    formatErrorResponse,
    formatPaginatedResponse,

    // Pagination transformation
    transformPaginationParams,

    // Version comparison
    compareVersions,
    needsUpgrade,

    // Re-export from config for convenience
    getBreakingChanges
};
