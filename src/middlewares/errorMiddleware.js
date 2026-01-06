const logger = require('../utils/logger');

/**
 * Global Error Middleware (Gold Standard)
 *
 * Handles all errors that reach the Express error handler.
 * Logs full error details for debugging while returning safe messages to clients.
 *
 * @param {Error} error - The error object
 * @param {Request} request - Express request object
 * @param {Response} response - Express response object
 * @param {Function} next - Express next function
 */
const errorMiddleware = (error, request, response, next) => {
    // Already sent response - skip
    if (response.headersSent) {
        return next(error);
    }

    const status = error.status || error.statusCode || 500;
    const message = error.message || 'Something went wrong!';
    const requestId = request.requestId || request.headers['x-request-id'] || 'unknown';

    // Log full error details for debugging (Gold Standard: always log 500 errors)
    if (status >= 500) {
        logger.error(`[ERROR MIDDLEWARE] ${status} ${request.method} ${request.originalUrl}`, {
            requestId,
            errorCode: error.code,
            errorName: error.name,
            message: error.message,
            stack: error.stack,
            userId: request.userID || 'anonymous',
            firmId: request.firmId || null,
            query: request.query,
            body: request.body ? Object.keys(request.body) : [],
            // Additional context for specific error types
            ...(error.code === 'FIRM_ISOLATION_VIOLATION' && {
                modelName: error.modelName,
                operationType: error.operationType
            })
        });
    } else if (status >= 400) {
        // Log 4xx errors at warn level (client errors)
        logger.warn(`[ERROR MIDDLEWARE] ${status} ${request.method} ${request.originalUrl}`, {
            requestId,
            errorCode: error.code,
            message: error.message,
            userId: request.userID || 'anonymous'
        });
    }

    // Return safe error response to client
    return response.status(status).json({
        success: false,
        error: true,
        message,
        ...(error.code && { code: error.code }),
        ...(process.env.NODE_ENV !== 'production' && {
            stack: error.stack,
            details: error.details
        })
    });
};

module.exports = errorMiddleware;