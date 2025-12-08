/**
 * Custom Exception with bilingual support
 * Supports both English and Arabic error messages
 *
 * @param {string} message - English error message
 * @param {number} status - HTTP status code
 * @param {Object} options - Additional options
 * @param {string} options.messageAr - Arabic error message
 * @param {string} options.code - Error code for frontend handling
 * @returns {Error} Custom error object
 */
const CustomException = (message, status, options = {}) => {
    const error = new Error(message);
    error.status = status;

    // Bilingual support
    if (options.messageAr) {
        error.messageAr = options.messageAr;
    }

    // Error code for frontend handling
    if (options.code) {
        error.code = options.code;
    }

    return error;
};

/**
 * Common error codes with bilingual messages
 * Use these for consistent error responses across the application
 */
const ErrorCodes = {
    // Authentication errors
    UNAUTHORIZED: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized access',
        messageAr: 'غير مصرح بالوصول'
    },
    INVALID_CREDENTIALS: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        messageAr: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
    },
    TOKEN_EXPIRED: {
        code: 'TOKEN_EXPIRED',
        message: 'Token has expired',
        messageAr: 'انتهت صلاحية الرمز'
    },

    // Resource errors
    NOT_FOUND: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
        messageAr: 'المورد غير موجود'
    },
    ALREADY_EXISTS: {
        code: 'ALREADY_EXISTS',
        message: 'Resource already exists',
        messageAr: 'المورد موجود بالفعل'
    },

    // Validation errors
    VALIDATION_ERROR: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        messageAr: 'فشل التحقق من البيانات'
    },
    INVALID_INPUT: {
        code: 'INVALID_INPUT',
        message: 'Invalid input provided',
        messageAr: 'المدخلات غير صالحة'
    },

    // Permission errors
    FORBIDDEN: {
        code: 'FORBIDDEN',
        message: 'Access denied',
        messageAr: 'تم رفض الوصول'
    },
    INSUFFICIENT_PERMISSIONS: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Insufficient permissions',
        messageAr: 'صلاحيات غير كافية'
    },

    // Rate limiting
    TOO_MANY_REQUESTS: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests, please try again later',
        messageAr: 'طلبات كثيرة جداً، يرجى المحاولة لاحقاً'
    },

    // Server errors
    INTERNAL_ERROR: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        messageAr: 'حدث خطأ داخلي'
    },
    SERVICE_UNAVAILABLE: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service temporarily unavailable',
        messageAr: 'الخدمة غير متوفرة مؤقتاً'
    },

    // Business logic errors
    OPERATION_FAILED: {
        code: 'OPERATION_FAILED',
        message: 'Operation failed',
        messageAr: 'فشلت العملية'
    },
    INVALID_STATE: {
        code: 'INVALID_STATE',
        message: 'Invalid state for this operation',
        messageAr: 'حالة غير صالحة لهذه العملية'
    }
};

/**
 * Create exception from predefined error code
 * @param {Object} errorCode - Error code object from ErrorCodes
 * @param {number} status - HTTP status code (optional, defaults based on error type)
 * @param {Object} overrides - Override message or messageAr
 * @returns {Error} Custom error object
 */
const createException = (errorCode, status, overrides = {}) => {
    const message = overrides.message || errorCode.message;
    const messageAr = overrides.messageAr || errorCode.messageAr;
    const code = errorCode.code;

    return CustomException(message, status, { messageAr, code });
};

module.exports = CustomException;
module.exports.ErrorCodes = ErrorCodes;
module.exports.createException = createException;