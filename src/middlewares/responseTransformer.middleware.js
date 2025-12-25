/**
 * Response Transformer Middleware
 *
 * Transforms API responses for backward compatibility between versions.
 * Intercepts outgoing responses and transforms them based on the requested API version.
 *
 * Features:
 * - Automatic field name transformation
 * - Date format conversion
 * - Response structure adaptation
 * - Pagination format conversion
 * - Error response standardization
 */

const apiVersionService = require('../services/apiVersion.service');
const { DEFAULT_VERSION } = require('../config/apiVersions');
const logger = require('../utils/logger');

/**
 * Middleware to transform responses based on API version
 * This middleware intercepts the response and transforms it before sending
 *
 * @param {Object} options - Transformer options
 * @param {string} options.targetVersion - Target version to transform to (if different from request)
 * @param {boolean} options.preserveOriginal - Keep original response in debug mode
 * @param {boolean} options.transformDates - Enable date transformation
 * @param {boolean} options.transformFields - Enable field name transformation
 * @returns {Function} Express middleware
 */
const responseTransformer = (options = {}) => {
    const {
        targetVersion = null,
        preserveOriginal = false,
        transformDates = true,
        transformFields = true
    } = options;

    return (req, res, next) => {
        // Store original json method
        const originalJson = res.json.bind(res);

        // Override res.json to transform before sending
        res.json = function (data) {
            try {
                // Determine version to transform to
                const requestedVersion = req.apiVersion || DEFAULT_VERSION;
                const finalVersion = targetVersion || requestedVersion;

                // Skip transformation if already in target version or not needed
                const currentVersion = res.locals.responseVersion || requestedVersion;
                if (currentVersion === finalVersion) {
                    return originalJson(data);
                }

                logger.debug('Transforming response', {
                    from: currentVersion,
                    to: finalVersion,
                    path: req.path
                });

                // Transform the response data
                let transformed = data;

                // Apply transformations
                if (transformFields) {
                    transformed = apiVersionService.transformFieldNames(
                        transformed,
                        currentVersion,
                        finalVersion
                    );
                }

                if (transformDates) {
                    transformed = apiVersionService.transformDateFields(
                        transformed,
                        finalVersion
                    );
                }

                // Apply full response transformation
                transformed = apiVersionService.transformResponse(
                    transformed,
                    currentVersion,
                    finalVersion
                );

                // Preserve original in development mode if requested
                if (preserveOriginal && process.env.NODE_ENV === 'development') {
                    transformed._original = data;
                    transformed._transformation = {
                        from: currentVersion,
                        to: finalVersion,
                        timestamp: new Date().toISOString()
                    };
                }

                // Send transformed response
                return originalJson(transformed);
            } catch (error) {
                logger.error('Error in response transformation:', error);
                // Fall back to original response on error
                return originalJson(data);
            }
        };

        next();
    };
};

/**
 * Middleware to automatically transform all responses to match requested version
 * This is the recommended middleware for automatic backward compatibility
 */
const autoTransformResponse = responseTransformer({
    transformDates: true,
    transformFields: true,
    preserveOriginal: process.env.NODE_ENV === 'development'
});

/**
 * Middleware to transform v2 responses to v1 format
 * Use this when serving v1 API from v2 controllers
 */
const transformV2toV1 = responseTransformer({
    targetVersion: 'v1',
    transformDates: true,
    transformFields: true
});

/**
 * Middleware to transform v1 responses to v2 format
 * Use this when serving v2 API from v1 controllers
 */
const transformV1toV2 = responseTransformer({
    targetVersion: 'v2',
    transformDates: true,
    transformFields: true
});

/**
 * Middleware to add transformation metadata to responses
 * Useful for debugging and monitoring transformation performance
 */
const addTransformationMetadata = (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (data) {
        // Add transformation metadata if not already present
        if (!data._meta && process.env.NODE_ENV === 'development') {
            data._meta = {
                apiVersion: req.apiVersion || DEFAULT_VERSION,
                requestedVersion: req.apiVersion,
                timestamp: new Date().toISOString(),
                path: req.path,
                method: req.method
            };
        }

        return originalJson(data);
    };

    next();
};

/**
 * Middleware to wrap raw data in versioned response format
 * Ensures all responses follow the correct format for the requested version
 *
 * @param {Object} options - Wrapper options
 * @param {string} options.defaultMessage - Default success message
 * @returns {Function} Express middleware
 */
const wrapInVersionedFormat = (options = {}) => {
    const { defaultMessage = 'Success' } = options;

    return (req, res, next) => {
        const originalJson = res.json.bind(res);

        res.json = function (data) {
            const version = req.apiVersion || DEFAULT_VERSION;

            // Check if data is already wrapped
            const isAlreadyWrapped = data && (
                data.success !== undefined ||
                data.error !== undefined ||
                data.data !== undefined
            );

            if (isAlreadyWrapped) {
                return originalJson(data);
            }

            // Wrap in version-specific format
            const wrapped = apiVersionService.formatSuccessResponse(
                data,
                defaultMessage,
                version
            );

            return originalJson(wrapped);
        };

        next();
    };
};

/**
 * Middleware to handle pagination transformation
 * Converts between offset-based (v1) and cursor-based (v2) pagination
 */
const transformPagination = (req, res, next) => {
    const originalJson = res.json.bind(res);
    const requestedVersion = req.apiVersion || DEFAULT_VERSION;

    res.json = function (data) {
        // Only transform if data contains pagination
        if (!data || !data.pagination) {
            return originalJson(data);
        }

        try {
            // Store current pagination format
            const currentFormat = data.pagination.cursor !== undefined ? 'v2' : 'v1';

            // Transform if needed
            if (currentFormat !== requestedVersion) {
                const transformed = { ...data };

                if (requestedVersion === 'v1' && currentFormat === 'v2') {
                    // Convert cursor-based to offset-based
                    const { cursor, limit, hasMore, total } = data.pagination;
                    let page = 1;

                    if (cursor) {
                        try {
                            const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
                            page = Math.floor((decoded.offset || 0) / limit) + 1;
                        } catch (error) {
                            logger.warn('Failed to decode pagination cursor:', error);
                        }
                    }

                    transformed.pagination = {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit)
                    };
                } else if (requestedVersion === 'v2' && currentFormat === 'v1') {
                    // Convert offset-based to cursor-based
                    const { page = 1, limit = 20, total = 0 } = data.pagination;
                    const offset = (page - 1) * limit;
                    const cursor = offset > 0
                        ? Buffer.from(JSON.stringify({ offset })).toString('base64')
                        : null;
                    const hasMore = offset + limit < total;

                    transformed.pagination = {
                        cursor,
                        limit,
                        hasMore,
                        total
                    };
                }

                return originalJson(transformed);
            }

            return originalJson(data);
        } catch (error) {
            logger.error('Error transforming pagination:', error);
            return originalJson(data);
        }
    };

    next();
};

/**
 * Middleware to standardize error responses across versions
 * Ensures errors follow the correct format for the requested version
 */
const transformErrorResponse = (req, res, next) => {
    const originalStatus = res.status.bind(res);
    const originalJson = res.json.bind(res);
    const version = req.apiVersion || DEFAULT_VERSION;

    // Override status to capture error codes
    let statusCode = 200;
    res.status = function (code) {
        statusCode = code;
        return originalStatus(code);
    };

    // Override json to transform errors
    res.json = function (data) {
        // Only transform error responses (4xx, 5xx)
        if (statusCode >= 400 && data) {
            const isV1Format = data.error === true && typeof data.message === 'string';
            const isV2Format = data.success === false && data.error && typeof data.error === 'object';

            // Transform to requested version format
            if (version === 'v2' && isV1Format) {
                // Transform v1 error to v2 format
                return originalJson(
                    apiVersionService.formatErrorResponse(
                        data.message,
                        data.code || 'ERROR',
                        data.details || null,
                        'v2'
                    )
                );
            } else if (version === 'v1' && isV2Format) {
                // Transform v2 error to v1 format
                return originalJson({
                    error: true,
                    message: data.error.message,
                    code: data.error.code,
                    ...(data.error.details && { details: data.error.details })
                });
            }
        }

        return originalJson(data);
    };

    next();
};

/**
 * Combined transformer middleware
 * Applies all transformations in the correct order
 */
const applyAllTransformations = [
    transformErrorResponse,
    transformPagination,
    autoTransformResponse
];

module.exports = {
    // Core transformer
    responseTransformer,
    autoTransformResponse,

    // Version-specific transformers
    transformV2toV1,
    transformV1toV2,

    // Utility transformers
    addTransformationMetadata,
    wrapInVersionedFormat,
    transformPagination,
    transformErrorResponse,

    // Combined middleware
    applyAllTransformations
};
