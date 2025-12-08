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
 * Error Response with bilingual support
 * @param {Object} res - Express response object
 * @param {String} message - Error message (English)
 * @param {String} code - Error code
 * @param {Object} details - Additional error details
 * @param {Number} statusCode - HTTP status code (default: 400)
 * @param {String} messageAr - Arabic error message (optional)
 * @returns {Object} JSON response
 *
 * Response format matches frontend expectations:
 * {
 *   success: false,
 *   error: {
 *     code: "ERROR_CODE",
 *     message: "English message",
 *     messageAr: "رسالة بالعربية"
 *   }
 * }
 */
const error = (res, message = 'An error occurred', code = 'ERROR', details = null, statusCode = 400, messageAr = null) => {
    const response = {
        success: false,
        error: {
            code,
            message,
            messageAr: messageAr || getArabicMessage(code, message)
        },
        meta: {
            timestamp: new Date().toISOString(),
            apiVersion: res.locals.apiVersion || 'v1',
            requestId: res.locals.requestId || res.req?.id
        }
    };

    // Include details only if provided
    if (details) {
        response.error.details = details;
    }

    // Include stack trace in development mode
    if (process.env.NODE_ENV !== 'production' && details?.stack) {
        response.stack = details.stack;
    }

    return res.status(statusCode).json(response);
};

/**
 * Get Arabic message from error code or provide default translation
 * @param {String} code - Error code
 * @param {String} englishMessage - English message as fallback
 * @returns {String} Arabic message
 */
const getArabicMessage = (code, englishMessage) => {
    const arabicMessages = {
        // Common errors
        'ERROR': 'حدث خطأ',
        'BAD_REQUEST': 'طلب غير صالح',
        'UNAUTHORIZED': 'غير مصرح بالوصول',
        'FORBIDDEN': 'تم رفض الوصول',
        'NOT_FOUND': 'المورد غير موجود',
        'CONFLICT': 'تعارض في البيانات',
        'VALIDATION_ERROR': 'خطأ في التحقق من البيانات',
        'INTERNAL_ERROR': 'خطأ داخلي في الخادم',
        'SERVICE_UNAVAILABLE': 'الخدمة غير متوفرة',
        'TOO_MANY_REQUESTS': 'طلبات كثيرة جداً',

        // Authentication errors
        'INVALID_CREDENTIALS': 'بيانات الاعتماد غير صالحة',
        'TOKEN_EXPIRED': 'انتهت صلاحية الرمز',
        'INVALID_TOKEN': 'رمز غير صالح',

        // Resource errors
        'ALREADY_EXISTS': 'المورد موجود بالفعل',
        'RESOURCE_DELETED': 'تم حذف المورد',

        // Permission errors
        'INSUFFICIENT_PERMISSIONS': 'صلاحيات غير كافية',

        // Business logic errors
        'OPERATION_FAILED': 'فشلت العملية',
        'INVALID_STATE': 'حالة غير صالحة',
        'INVALID_INPUT': 'المدخلات غير صالحة'
    };

    return arabicMessages[code] || englishMessage;
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
 * @param {String} message - Error message (English)
 * @param {Object} details - Additional error details
 * @param {String} messageAr - Arabic error message
 * @returns {Object} JSON response
 */
const badRequest = (res, message = 'Bad request', details = null, messageAr = 'طلب غير صالح') => {
    return error(res, message, 'BAD_REQUEST', details, 400, messageAr);
};

/**
 * Unauthorized Error (401)
 * @param {Object} res - Express response object
 * @param {String} message - Error message (English)
 * @param {Object} details - Additional error details
 * @param {String} messageAr - Arabic error message
 * @returns {Object} JSON response
 */
const unauthorized = (res, message = 'Unauthorized', details = null, messageAr = 'غير مصرح بالوصول') => {
    return error(res, message, 'UNAUTHORIZED', details, 401, messageAr);
};

/**
 * Forbidden Error (403)
 * @param {Object} res - Express response object
 * @param {String} message - Error message (English)
 * @param {Object} details - Additional error details
 * @param {String} messageAr - Arabic error message
 * @returns {Object} JSON response
 */
const forbidden = (res, message = 'Forbidden', details = null, messageAr = 'تم رفض الوصول') => {
    return error(res, message, 'FORBIDDEN', details, 403, messageAr);
};

/**
 * Not Found Error (404)
 * @param {Object} res - Express response object
 * @param {String} message - Error message (English)
 * @param {Object} details - Additional error details
 * @param {String} messageAr - Arabic error message
 * @returns {Object} JSON response
 */
const notFound = (res, message = 'Resource not found', details = null, messageAr = 'المورد غير موجود') => {
    return error(res, message, 'NOT_FOUND', details, 404, messageAr);
};

/**
 * Conflict Error (409)
 * @param {Object} res - Express response object
 * @param {String} message - Error message (English)
 * @param {Object} details - Additional error details
 * @param {String} messageAr - Arabic error message
 * @returns {Object} JSON response
 */
const conflict = (res, message = 'Resource conflict', details = null, messageAr = 'تعارض في البيانات') => {
    return error(res, message, 'CONFLICT', details, 409, messageAr);
};

/**
 * Validation Error (422)
 * @param {Object} res - Express response object
 * @param {String} message - Error message (English)
 * @param {Object} errors - Validation errors object
 * @param {String} messageAr - Arabic error message
 * @returns {Object} JSON response
 */
const validationError = (res, message = 'Validation failed', errors = {}, messageAr = 'خطأ في التحقق من البيانات') => {
    return error(res, message, 'VALIDATION_ERROR', { errors }, 422, messageAr);
};

/**
 * Internal Server Error (500)
 * @param {Object} res - Express response object
 * @param {String} message - Error message (English)
 * @param {Object} details - Additional error details
 * @param {String} messageAr - Arabic error message
 * @returns {Object} JSON response
 */
const internalError = (res, message = 'Internal server error', details = null, messageAr = 'خطأ داخلي في الخادم') => {
    return error(res, message, 'INTERNAL_ERROR', details, 500, messageAr);
};

/**
 * Service Unavailable Error (503)
 * @param {Object} res - Express response object
 * @param {String} message - Error message (English)
 * @param {Object} details - Additional error details
 * @param {String} messageAr - Arabic error message
 * @returns {Object} JSON response
 */
const serviceUnavailable = (res, message = 'Service unavailable', details = null, messageAr = 'الخدمة غير متوفرة') => {
    return error(res, message, 'SERVICE_UNAVAILABLE', details, 503, messageAr);
};

/**
 * Too Many Requests Error (429)
 * @param {Object} res - Express response object
 * @param {String} message - Error message (English)
 * @param {Number} retryAfter - Seconds to wait before retry
 * @param {String} messageAr - Arabic error message
 * @returns {Object} JSON response
 */
const tooManyRequests = (res, message = 'Too many requests', retryAfter = null, messageAr = 'طلبات كثيرة جداً') => {
    if (retryAfter) {
        res.set('Retry-After', retryAfter);
    }
    return error(res, message, 'TOO_MANY_REQUESTS', { retryAfter }, 429, messageAr);
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
