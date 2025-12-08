/**
 * Standardized API Response Utility
 *
 * Provides consistent response formats across all API versions
 * Includes success, error, and paginated response helpers
 */

/**
 * Success Response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {String} message - Success message
 * @param {Object} meta - Additional metadata
 * @param {Number} statusCode - HTTP status code (default: 200)
 * @returns {Object} JSON response
 */
const success = (res, data = null, message = 'Success', meta = {}, statusCode = 200) => {
    const response = {
        success: true,
        message,
        data,
        meta: {
            timestamp: new Date().toISOString(),
            apiVersion: res.locals.apiVersion || 'v1',
            requestId: res.locals.requestId || res.req?.id,
            ...meta
        }
    };

    return res.status(statusCode).json(response);
};

/**
 * Error Response
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {String} code - Error code
 * @param {Object} details - Additional error details
 * @param {Number} statusCode - HTTP status code (default: 400)
 * @returns {Object} JSON response
 */
const error = (res, message = 'An error occurred', code = 'ERROR', details = null, statusCode = 400) => {
    const response = {
        success: false,
        error: true,
        message,
        code,
        meta: {
            timestamp: new Date().toISOString(),
            apiVersion: res.locals.apiVersion || 'v1',
            requestId: res.locals.requestId || res.req?.id
        }
    };

    // Include details only if provided
    if (details) {
        response.details = details;
    }

    // Include stack trace in development mode
    if (process.env.NODE_ENV !== 'production' && details?.stack) {
        response.stack = details.stack;
    }

    return res.status(statusCode).json(response);
};

/**
 * Paginated Response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of data items
 * @param {Object} pagination - Pagination information
 * @param {String} message - Success message
 * @param {Object} meta - Additional metadata
 * @returns {Object} JSON response
 */
const paginated = (
    res,
    data = [],
    pagination = {},
    message = 'Success',
    meta = {}
) => {
    const {
        page = 1,
        limit = 10,
        total = 0,
        totalPages = 0,
        hasNextPage = false,
        hasPrevPage = false
    } = pagination;

    const response = {
        success: true,
        message,
        data,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total: Number(total),
            totalPages: Number(totalPages),
            hasNextPage: Boolean(hasNextPage),
            hasPrevPage: Boolean(hasPrevPage)
        },
        meta: {
            timestamp: new Date().toISOString(),
            apiVersion: res.locals.apiVersion || 'v1',
            requestId: res.locals.requestId || res.req?.id,
            ...meta
        }
    };

    return res.status(200).json(response);
};

/**
 * Created Response (201)
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {String} message - Success message
 * @param {Object} meta - Additional metadata
 * @returns {Object} JSON response
 */
const created = (res, data = null, message = 'Resource created successfully', meta = {}) => {
    return success(res, data, message, meta, 201);
};

/**
 * No Content Response (204)
 * @param {Object} res - Express response object
 * @returns {Object} Empty response
 */
const noContent = (res) => {
    return res.status(204).send();
};

/**
 * Bad Request Error (400)
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Object} details - Additional error details
 * @returns {Object} JSON response
 */
const badRequest = (res, message = 'Bad request', details = null) => {
    return error(res, message, 'BAD_REQUEST', details, 400);
};

/**
 * Unauthorized Error (401)
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Object} details - Additional error details
 * @returns {Object} JSON response
 */
const unauthorized = (res, message = 'Unauthorized', details = null) => {
    return error(res, message, 'UNAUTHORIZED', details, 401);
};

/**
 * Forbidden Error (403)
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Object} details - Additional error details
 * @returns {Object} JSON response
 */
const forbidden = (res, message = 'Forbidden', details = null) => {
    return error(res, message, 'FORBIDDEN', details, 403);
};

/**
 * Not Found Error (404)
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Object} details - Additional error details
 * @returns {Object} JSON response
 */
const notFound = (res, message = 'Resource not found', details = null) => {
    return error(res, message, 'NOT_FOUND', details, 404);
};

/**
 * Conflict Error (409)
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Object} details - Additional error details
 * @returns {Object} JSON response
 */
const conflict = (res, message = 'Resource conflict', details = null) => {
    return error(res, message, 'CONFLICT', details, 409);
};

/**
 * Validation Error (422)
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Object} errors - Validation errors object
 * @returns {Object} JSON response
 */
const validationError = (res, message = 'Validation failed', errors = {}) => {
    return error(res, message, 'VALIDATION_ERROR', { errors }, 422);
};

/**
 * Internal Server Error (500)
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Object} details - Additional error details
 * @returns {Object} JSON response
 */
const internalError = (res, message = 'Internal server error', details = null) => {
    return error(res, message, 'INTERNAL_ERROR', details, 500);
};

/**
 * Service Unavailable Error (503)
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Object} details - Additional error details
 * @returns {Object} JSON response
 */
const serviceUnavailable = (res, message = 'Service unavailable', details = null) => {
    return error(res, message, 'SERVICE_UNAVAILABLE', details, 503);
};

/**
 * Too Many Requests Error (429)
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Number} retryAfter - Seconds to wait before retry
 * @returns {Object} JSON response
 */
const tooManyRequests = (res, message = 'Too many requests', retryAfter = null) => {
    if (retryAfter) {
        res.set('Retry-After', retryAfter);
    }
    return error(res, message, 'TOO_MANY_REQUESTS', { retryAfter }, 429);
};

module.exports = {
    // Core response methods
    success,
    error,
    paginated,

    // Status-specific methods
    created,
    noContent,

    // Error helpers
    badRequest,
    unauthorized,
    forbidden,
    notFound,
    conflict,
    validationError,
    internalError,
    serviceUnavailable,
    tooManyRequests
};
