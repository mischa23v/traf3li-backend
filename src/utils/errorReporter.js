const { Sentry } = require('../configs/sentry');

/**
 * Error Reporter Utility
 * Provides a clean interface for error tracking and reporting to Sentry
 */

/**
 * Capture an exception and send it to Sentry
 * @param {Error} error - The error object to capture
 * @param {Object} context - Additional context about the error
 * @param {string} context.level - Severity level (fatal, error, warning, info, debug)
 * @param {Object} context.tags - Tags to categorize the error
 * @param {Object} context.extra - Extra data to attach to the error
 * @param {Object} context.user - User information
 * @returns {string} Event ID from Sentry
 */
function captureException(error, context = {}) {
    if (!Sentry) {
        console.error('Sentry not initialized. Error:', error);
        return null;
    }

    // Set scope with context
    return Sentry.withScope((scope) => {
        // Set level (severity)
        if (context.level) {
            scope.setLevel(context.level);
        }

        // Set tags for categorization
        if (context.tags) {
            Object.keys(context.tags).forEach((key) => {
                scope.setTag(key, context.tags[key]);
            });
        }

        // Set extra context
        if (context.extra) {
            Object.keys(context.extra).forEach((key) => {
                scope.setExtra(key, context.extra[key]);
            });
        }

        // Set user context
        if (context.user) {
            scope.setUser(context.user);
        }

        // Set fingerprint for grouping similar errors
        if (context.fingerprint) {
            scope.setFingerprint(context.fingerprint);
        }

        // Capture the exception
        return Sentry.captureException(error);
    });
}

/**
 * Capture a message and send it to Sentry
 * @param {string} message - The message to capture
 * @param {string} level - Severity level (fatal, error, warning, info, debug)
 * @param {Object} context - Additional context
 * @returns {string} Event ID from Sentry
 */
function captureMessage(message, level = 'info', context = {}) {
    if (!Sentry) {
        console.log(`[${level.toUpperCase()}] ${message}`);
        return null;
    }

    return Sentry.withScope((scope) => {
        // Set level
        scope.setLevel(level);

        // Set tags
        if (context.tags) {
            Object.keys(context.tags).forEach((key) => {
                scope.setTag(key, context.tags[key]);
            });
        }

        // Set extra context
        if (context.extra) {
            Object.keys(context.extra).forEach((key) => {
                scope.setExtra(key, context.extra[key]);
            });
        }

        // Set user context
        if (context.user) {
            scope.setUser(context.user);
        }

        // Capture the message
        return Sentry.captureMessage(message, level);
    });
}

/**
 * Set user context for error tracking
 * @param {Object} user - User information
 * @param {string} user.id - User ID
 * @param {string} user.username - Username
 * @param {string} user.email - User email
 * @param {string} user.firmId - Firm ID
 */
function setUserContext(user) {
    if (!Sentry) {
        return;
    }

    Sentry.setUser({
        id: user.id || user._id,
        username: user.username,
        // Don't send email for privacy (can be enabled if needed)
        // email: user.email,
        firmId: user.firmId,
    });
}

/**
 * Clear user context (useful for logout)
 */
function clearUserContext() {
    if (!Sentry) {
        return;
    }

    Sentry.setUser(null);
}

/**
 * Add a breadcrumb to track user actions leading to an error
 * @param {Object} data - Breadcrumb data
 * @param {string} data.message - Breadcrumb message
 * @param {string} data.category - Category (navigation, http, user, etc.)
 * @param {string} data.level - Severity level (fatal, error, warning, info, debug)
 * @param {Object} data.data - Additional data
 */
function addBreadcrumb(data) {
    if (!Sentry) {
        return;
    }

    Sentry.addBreadcrumb({
        message: data.message,
        category: data.category || 'custom',
        level: data.level || 'info',
        data: data.data || {},
        timestamp: Date.now() / 1000, // Unix timestamp in seconds
    });
}

/**
 * Set a tag for categorizing errors
 * @param {string} key - Tag key
 * @param {string} value - Tag value
 */
function setTag(key, value) {
    if (!Sentry) {
        return;
    }

    Sentry.setTag(key, value);
}

/**
 * Set multiple tags at once
 * @param {Object} tags - Object with key-value pairs
 */
function setTags(tags) {
    if (!Sentry || !tags) {
        return;
    }

    Sentry.setTags(tags);
}

/**
 * Set extra context data
 * @param {string} key - Context key
 * @param {any} value - Context value
 */
function setContext(key, value) {
    if (!Sentry) {
        return;
    }

    Sentry.setContext(key, value);
}

/**
 * Start a new transaction for performance monitoring
 * @param {Object} context - Transaction context
 * @param {string} context.op - Operation name (e.g., 'http.server')
 * @param {string} context.name - Transaction name (e.g., 'GET /api/users')
 * @param {Object} context.data - Additional data
 * @returns {Transaction} Sentry transaction object
 */
function startTransaction(context) {
    if (!Sentry) {
        return null;
    }

    return Sentry.startTransaction({
        op: context.op,
        name: context.name,
        data: context.data || {},
    });
}

/**
 * Capture a database query for performance monitoring
 * @param {string} query - The database query
 * @param {string} collection - The collection/table name
 * @param {number} duration - Query duration in milliseconds
 */
function captureQuery(query, collection, duration) {
    addBreadcrumb({
        category: 'query',
        message: `Database query on ${collection}`,
        level: 'info',
        data: {
            query,
            collection,
            duration,
        },
    });

    // Log slow queries (> 1000ms) as warnings
    if (duration > 1000) {
        captureMessage(`Slow query detected on ${collection}`, 'warning', {
            extra: {
                query,
                collection,
                duration,
            },
            tags: {
                slowQuery: 'true',
                collection,
            },
        });
    }
}

/**
 * Capture API errors with useful context
 * @param {Error} error - The error object
 * @param {Object} req - Express request object
 * @param {Object} additionalContext - Additional context
 */
function captureAPIError(error, req, additionalContext = {}) {
    return captureException(error, {
        level: 'error',
        tags: {
            type: 'api_error',
            method: req.method,
            route: req.route?.path || req.path,
            statusCode: error.status || error.statusCode || 500,
            ...additionalContext.tags,
        },
        extra: {
            url: req.originalUrl,
            params: req.params,
            query: req.query,
            body: sanitizeBody(req.body),
            headers: sanitizeHeaders(req.headers),
            ...additionalContext.extra,
        },
        user: req.userID ? {
            id: req.userID,
            username: req.username,
            firmId: req.firmId,
        } : undefined,
    });
}

/**
 * Capture authentication errors
 * @param {Error} error - The error object
 * @param {Object} context - Authentication context
 */
function captureAuthError(error, context = {}) {
    return captureException(error, {
        level: 'warning',
        tags: {
            type: 'auth_error',
            authMethod: context.method || 'unknown',
            ...context.tags,
        },
        extra: {
            ...context.extra,
        },
    });
}

/**
 * Capture payment/financial errors (high priority)
 * @param {Error} error - The error object
 * @param {Object} context - Payment context
 */
function capturePaymentError(error, context = {}) {
    return captureException(error, {
        level: 'error',
        tags: {
            type: 'payment_error',
            critical: 'true',
            ...context.tags,
        },
        extra: {
            ...context.extra,
        },
        fingerprint: ['payment-error', context.transactionId].filter(Boolean),
    });
}

/**
 * Capture integration errors (third-party APIs)
 * @param {Error} error - The error object
 * @param {string} integration - Integration name (e.g., 'stripe', 'aws')
 * @param {Object} context - Additional context
 */
function captureIntegrationError(error, integration, context = {}) {
    return captureException(error, {
        level: 'error',
        tags: {
            type: 'integration_error',
            integration,
            ...context.tags,
        },
        extra: {
            ...context.extra,
        },
    });
}

/**
 * Helper to sanitize request body (remove sensitive data)
 */
function sanitizeBody(body) {
    if (!body || typeof body !== 'object') {
        return body;
    }

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'creditCard', 'cvv'];

    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    });

    return sanitized;
}

/**
 * Helper to sanitize request headers
 */
function sanitizeHeaders(headers) {
    if (!headers || typeof headers !== 'object') {
        return headers;
    }

    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    sensitiveHeaders.forEach(header => {
        if (sanitized[header]) {
            sanitized[header] = '[REDACTED]';
        }
    });

    return sanitized;
}

module.exports = {
    captureException,
    captureMessage,
    setUserContext,
    clearUserContext,
    addBreadcrumb,
    setTag,
    setTags,
    setContext,
    startTransaction,
    captureQuery,
    captureAPIError,
    captureAuthError,
    capturePaymentError,
    captureIntegrationError,
};
