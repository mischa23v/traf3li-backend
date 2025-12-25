/**
 * API Versions Configuration
 *
 * Central configuration for API version management:
 * - Supported versions and their status
 * - Deprecation and sunset dates
 * - Breaking changes documentation
 * - Response transformation rules
 * - Version negotiation rules
 */

// ═══════════════════════════════════════════════════════════════
// VERSION DEFINITIONS
// ═══════════════════════════════════════════════════════════════

/**
 * API Version Status
 * - beta: New version under testing, not production-ready
 * - stable: Current stable version, recommended for production
 * - deprecated: Still available but will be removed, migrate away
 * - sunset: No longer available, returns 410 Gone
 */
const VERSION_STATUS = {
    BETA: 'beta',
    STABLE: 'stable',
    DEPRECATED: 'deprecated',
    SUNSET: 'sunset'
};

/**
 * Supported API versions with detailed metadata
 */
const VERSIONS = {
    v1: {
        version: 'v1',
        name: 'API Version 1.0',
        status: VERSION_STATUS.DEPRECATED,
        released: '2024-01-01',
        deprecatedDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months from now
        sunsetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 12 months from now
        description: 'Original API version with basic functionality',
        features: [
            'Basic CRUD operations',
            'Simple authentication',
            'Limited error handling',
            'Basic response formats'
        ],
        knownIssues: [
            'Inconsistent response formats across endpoints',
            'Limited pagination support',
            'No standardized error codes'
        ],
        documentation: 'https://docs.traf3li.com/api/v1',
        migrationGuide: 'https://docs.traf3li.com/api/migration/v1-to-v2'
    },
    v2: {
        version: 'v2',
        name: 'API Version 2.0',
        status: VERSION_STATUS.STABLE,
        released: '2025-01-01',
        deprecatedDate: null,
        sunsetDate: null,
        description: 'Enhanced API with improved features and breaking changes',
        features: [
            'Standardized response formats',
            'Enhanced pagination with cursor support',
            'Comprehensive error codes',
            'Better validation and error messages',
            'Improved filtering and sorting',
            'Batch operations support',
            'Enhanced metadata in responses'
        ],
        breakingChanges: [
            'Response format changed from nested to flat structure',
            'Date fields now use ISO 8601 format exclusively',
            'Pagination parameters changed (page/limit to cursor-based)',
            'Error response structure standardized',
            'Authentication token format updated'
        ],
        documentation: 'https://docs.traf3li.com/api/v2',
        migrationGuide: 'https://docs.traf3li.com/api/migration/v1-to-v2'
    }
};

// ═══════════════════════════════════════════════════════════════
// VERSION LISTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get array of supported version strings
 */
const SUPPORTED_VERSIONS = Object.keys(VERSIONS);

/**
 * Get default version (latest stable)
 */
const DEFAULT_VERSION = 'v1'; // Will be 'v2' once fully stable

/**
 * Get deprecated versions
 */
const DEPRECATED_VERSIONS = Object.keys(VERSIONS).filter(
    v => VERSIONS[v].status === VERSION_STATUS.DEPRECATED
);

/**
 * Get sunset (removed) versions
 */
const SUNSET_VERSIONS = Object.keys(VERSIONS).filter(
    v => VERSIONS[v].status === VERSION_STATUS.SUNSET
);

/**
 * Get beta versions
 */
const BETA_VERSIONS = Object.keys(VERSIONS).filter(
    v => VERSIONS[v].status === VERSION_STATUS.BETA
);

// ═══════════════════════════════════════════════════════════════
// BREAKING CHANGES DOCUMENTATION
// ═══════════════════════════════════════════════════════════════

/**
 * Detailed breaking changes between versions
 * Used for migration guides and transformation logic
 */
const BREAKING_CHANGES = {
    v1_to_v2: {
        fromVersion: 'v1',
        toVersion: 'v2',
        changes: [
            {
                category: 'Response Format',
                description: 'Response structure changed to standardized format',
                before: {
                    // V1 format
                    data: { /* data */ },
                    message: 'Success'
                },
                after: {
                    // V2 format
                    success: true,
                    data: { /* data */ },
                    message: 'Success',
                    meta: {
                        timestamp: '2025-01-01T00:00:00Z',
                        apiVersion: 'v2'
                    }
                },
                migration: 'Update response parsing to expect new structure'
            },
            {
                category: 'Pagination',
                description: 'Pagination changed from offset-based to cursor-based',
                before: {
                    page: 1,
                    limit: 20,
                    total: 100
                },
                after: {
                    cursor: 'eyJpZCI6MTIzfQ==',
                    limit: 20,
                    hasMore: true,
                    total: 100
                },
                migration: 'Update pagination logic to use cursor instead of page offset'
            },
            {
                category: 'Date Format',
                description: 'All dates now use ISO 8601 format exclusively',
                before: {
                    createdAt: '2024-01-01 12:00:00',
                    updatedAt: 1704110400000 // Unix timestamp
                },
                after: {
                    createdAt: '2024-01-01T12:00:00.000Z',
                    updatedAt: '2024-01-01T12:00:00.000Z'
                },
                migration: 'Update date parsing to handle ISO 8601 format'
            },
            {
                category: 'Error Response',
                description: 'Error responses now include structured error codes',
                before: {
                    error: true,
                    message: 'Validation failed'
                },
                after: {
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Validation failed',
                        details: [
                            { field: 'email', message: 'Invalid email format' }
                        ]
                    }
                },
                migration: 'Update error handling to parse new error structure'
            },
            {
                category: 'Field Names',
                description: 'Some field names changed for consistency',
                changes: [
                    { old: 'userId', new: 'user_id' },
                    { old: 'firmId', new: 'firm_id' },
                    { old: 'caseId', new: 'case_id' }
                ],
                migration: 'Update field references to use new names'
            }
        ]
    }
};

// ═══════════════════════════════════════════════════════════════
// RESPONSE TRANSFORMATION RULES
// ═══════════════════════════════════════════════════════════════

/**
 * Field mapping rules for transforming between versions
 */
const FIELD_MAPPINGS = {
    v2_to_v1: {
        // Map v2 field names to v1 field names
        user_id: 'userId',
        firm_id: 'firmId',
        case_id: 'caseId',
        client_id: 'clientId',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        deleted_at: 'deletedAt'
    },
    v1_to_v2: {
        // Map v1 field names to v2 field names
        userId: 'user_id',
        firmId: 'firm_id',
        caseId: 'case_id',
        clientId: 'client_id',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at'
    }
};

/**
 * Response structure templates for each version
 */
const RESPONSE_TEMPLATES = {
    v1: {
        success: (data, message = 'Success') => ({
            data,
            message
        }),
        error: (message, error = null) => ({
            error: true,
            message,
            ...(error && { details: error })
        }),
        pagination: (data, page, limit, total) => ({
            data,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        })
    },
    v2: {
        success: (data, message = 'Success') => ({
            success: true,
            data,
            message,
            meta: {
                timestamp: new Date().toISOString(),
                apiVersion: 'v2'
            }
        }),
        error: (message, code = 'INTERNAL_ERROR', details = null) => ({
            success: false,
            error: {
                code,
                message,
                ...(details && { details })
            },
            meta: {
                timestamp: new Date().toISOString(),
                apiVersion: 'v2'
            }
        }),
        pagination: (data, cursor, limit, hasMore, total) => ({
            success: true,
            data,
            pagination: {
                cursor,
                limit,
                hasMore,
                total
            },
            meta: {
                timestamp: new Date().toISOString(),
                apiVersion: 'v2'
            }
        })
    }
};

// ═══════════════════════════════════════════════════════════════
// DATE TRANSFORMATION RULES
// ═══════════════════════════════════════════════════════════════

/**
 * Date format configurations for each version
 */
const DATE_FORMATS = {
    v1: {
        // V1 accepts multiple formats
        accepts: ['ISO8601', 'UNIX_TIMESTAMP', 'MYSQL_DATETIME'],
        returns: 'ISO8601', // But returns ISO8601
        timezone: 'UTC'
    },
    v2: {
        // V2 only accepts/returns ISO8601
        accepts: ['ISO8601'],
        returns: 'ISO8601',
        timezone: 'UTC'
    }
};

/**
 * Date fields that need transformation
 */
const DATE_FIELDS = [
    'createdAt', 'created_at',
    'updatedAt', 'updated_at',
    'deletedAt', 'deleted_at',
    'deprecatedDate', 'deprecated_date',
    'sunsetDate', 'sunset_date',
    'startDate', 'start_date',
    'endDate', 'end_date',
    'dueDate', 'due_date',
    'completedAt', 'completed_at'
];

// ═══════════════════════════════════════════════════════════════
// VERSION NEGOTIATION RULES
// ═══════════════════════════════════════════════════════════════

/**
 * Version extraction priority order
 */
const VERSION_PRIORITY = [
    'path',      // /api/v1/... takes highest priority
    'header',    // X-API-Version header
    'accept',    // Accept: application/vnd.traf3li.v1+json
    'default'    // Fall back to default version
];

/**
 * HTTP headers for version communication
 */
const VERSION_HEADERS = {
    // Request headers
    REQUEST_VERSION: 'X-API-Version',           // Client can specify version
    ACCEPT_VERSION: 'Accept',                   // Alternative version specification

    // Response headers
    CURRENT_VERSION: 'X-API-Version',           // Current version being used
    VERSION_STATUS: 'X-API-Status',             // Status (stable, deprecated, etc.)
    DEPRECATION: 'Deprecation',                 // RFC 8594 deprecation header
    SUNSET: 'Sunset',                           // RFC 8594 sunset header
    DEPRECATED_SINCE: 'X-API-Deprecated-Since', // When deprecation started
    SUNSET_DATE: 'X-API-Sunset-Date',           // When version will be removed
    DEPRECATION_INFO: 'X-API-Deprecation-Info', // Link to deprecation info
    MIGRATION_GUIDE: 'Link',                    // RFC 8288 link to migration guide
    WARNING: 'Warning',                          // RFC 7234 warning for deprecation

    // Version upgrade/downgrade info
    AVAILABLE_VERSIONS: 'X-API-Available-Versions',
    LATEST_VERSION: 'X-API-Latest-Version',
    RECOMMENDED_VERSION: 'X-API-Recommended-Version'
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get version configuration
 * @param {string} version - Version identifier (e.g., 'v1', 'v2')
 * @returns {Object|null} - Version configuration or null if not found
 */
function getVersionConfig(version) {
    return VERSIONS[version] || null;
}

/**
 * Check if version is supported
 * @param {string} version - Version identifier
 * @returns {boolean}
 */
function isVersionSupported(version) {
    return SUPPORTED_VERSIONS.includes(version);
}

/**
 * Check if version is deprecated
 * @param {string} version - Version identifier
 * @returns {boolean}
 */
function isVersionDeprecated(version) {
    return DEPRECATED_VERSIONS.includes(version);
}

/**
 * Check if version is sunset (removed)
 * @param {string} version - Version identifier
 * @returns {boolean}
 */
function isVersionSunset(version) {
    return SUNSET_VERSIONS.includes(version);
}

/**
 * Get latest stable version
 * @returns {string}
 */
function getLatestStableVersion() {
    const stableVersions = Object.keys(VERSIONS).filter(
        v => VERSIONS[v].status === VERSION_STATUS.STABLE
    );
    return stableVersions[stableVersions.length - 1] || DEFAULT_VERSION;
}

/**
 * Get deprecation warnings for a version
 * @param {string} version - Version identifier
 * @returns {Object|null} - Deprecation info or null
 */
function getDeprecationInfo(version) {
    const versionConfig = getVersionConfig(version);
    if (!versionConfig || !isVersionDeprecated(version)) {
        return null;
    }

    return {
        version,
        deprecatedDate: versionConfig.deprecatedDate,
        sunsetDate: versionConfig.sunsetDate,
        migrationGuide: versionConfig.migrationGuide,
        recommendedVersion: getLatestStableVersion(),
        daysUntilSunset: versionConfig.sunsetDate
            ? Math.ceil((new Date(versionConfig.sunsetDate) - new Date()) / (1000 * 60 * 60 * 24))
            : null
    };
}

/**
 * Get breaking changes between two versions
 * @param {string} fromVersion - Source version
 * @param {string} toVersion - Target version
 * @returns {Object|null} - Breaking changes or null
 */
function getBreakingChanges(fromVersion, toVersion) {
    const key = `${fromVersion}_to_${toVersion}`;
    return BREAKING_CHANGES[key] || null;
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // Constants
    VERSION_STATUS,
    VERSIONS,
    SUPPORTED_VERSIONS,
    DEFAULT_VERSION,
    DEPRECATED_VERSIONS,
    SUNSET_VERSIONS,
    BETA_VERSIONS,

    // Breaking changes
    BREAKING_CHANGES,

    // Transformation rules
    FIELD_MAPPINGS,
    RESPONSE_TEMPLATES,
    DATE_FORMATS,
    DATE_FIELDS,

    // Negotiation rules
    VERSION_PRIORITY,
    VERSION_HEADERS,

    // Helper functions
    getVersionConfig,
    isVersionSupported,
    isVersionDeprecated,
    isVersionSunset,
    getLatestStableVersion,
    getDeprecationInfo,
    getBreakingChanges
};
