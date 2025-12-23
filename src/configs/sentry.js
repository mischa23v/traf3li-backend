const Sentry = require('@sentry/node');
const logger = require('../utils/logger');

// Optional: Try to import ProfilingIntegration (requires @sentry/profiling-node package)
let ProfilingIntegration;
try {
    ProfilingIntegration = require('@sentry/profiling-node').ProfilingIntegration;
} catch (e) {
    // ProfilingIntegration not available - profiling will be disabled
    ProfilingIntegration = null;
}

/**
 * Initialize Sentry for error tracking and performance monitoring
 * Must be called before any other imports in server.js
 */
function initSentry(app) {
    // Skip initialization if DSN is not configured
    if (!process.env.SENTRY_DSN) {
        logger.warn('⚠️  Sentry DSN not configured - error tracking disabled');
        return;
    }

    // Get package version for release tracking
    const packageJson = require('../../package.json');

    // Base integrations (always included)
    const integrations = [
        // HTTP integration for tracking requests
        new Sentry.Integrations.Http({ tracing: true }),

        // Express integration
        new Sentry.Integrations.Express({ app }),

        // MongoDB integration for tracking database queries
        new Sentry.Integrations.Mongo({
            useMongoose: true
        }),
    ];

    // Add profiling integration if available
    if (ProfilingIntegration) {
        integrations.push(new ProfilingIntegration());
    }

    // Initialize Sentry
    Sentry.init({
        dsn: process.env.SENTRY_DSN,

        // Environment configuration
        environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',

        // Release version for tracking deployments
        release: `traf3li-backend@${packageJson.version}`,

        // Performance Monitoring
        tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1, // 10% by default

        // Profiling (optional, requires @sentry/profiling-node package)
        profilesSampleRate: ProfilingIntegration ? parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE) || 0.1 : undefined,

        // Integrations
        integrations,

        // Before send hook - filter and sanitize data
        beforeSend(event, hint) {
            // Filter sensitive data from request body
            if (event.request && event.request.data) {
                event.request.data = sanitizeSensitiveData(event.request.data);
            }

            // Filter sensitive data from extra context
            if (event.extra) {
                event.extra = sanitizeSensitiveData(event.extra);
            }

            // Filter sensitive data from user context
            if (event.user) {
                delete event.user.email; // Remove email for privacy
                delete event.user.ip_address; // Remove IP for privacy
            }

            // Don't send errors in test environment
            if (process.env.NODE_ENV === 'test') {
                return null;
            }

            return event;
        },

        // Before breadcrumb hook - filter sensitive breadcrumbs
        beforeBreadcrumb(breadcrumb, hint) {
            // Filter sensitive data from breadcrumbs
            if (breadcrumb.data) {
                breadcrumb.data = sanitizeSensitiveData(breadcrumb.data);
            }

            return breadcrumb;
        },

        // Ignore certain errors
        ignoreErrors: [
            // Network errors
            'ECONNREFUSED',
            'ETIMEDOUT',
            'ENOTFOUND',

            // Client-side errors that shouldn't be tracked
            'NetworkError',
            'AbortError',

            // JWT errors (expected in normal flow)
            'JsonWebTokenError',
            'TokenExpiredError',

            // Validation errors (these are user errors)
            'ValidationError',

            // MongoDB duplicate key errors (expected validation errors)
            'MongoServerError: E11000',
        ],

        // Debug mode in development
        debug: process.env.NODE_ENV === 'development',

        // Attach stack traces
        attachStacktrace: true,

        // Server name
        serverName: process.env.SERVER_NAME || 'traf3li-backend',

        // Maximum breadcrumbs
        maxBreadcrumbs: 50,

        // Transaction name based on route
        normalizeDepth: 5,
    });

    logger.info('✅ Sentry initialized successfully');
    logger.info(`   Environment: ${process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development'}`);
    logger.info(`   Release: traf3li-backend@${packageJson.version}`);
    logger.info(`   Traces Sample Rate: ${parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1}`);
}

/**
 * Sanitize sensitive data from objects
 * Removes passwords, tokens, and other sensitive information
 */
function sanitizeSensitiveData(data) {
    if (!data || typeof data !== 'object') {
        return data;
    }

    // Clone the object to avoid mutating the original
    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    // List of sensitive keys to remove or mask
    const sensitiveKeys = [
        'password',
        'newPassword',
        'oldPassword',
        'currentPassword',
        'confirmPassword',
        'token',
        'accessToken',
        'refreshToken',
        'apiKey',
        'api_key',
        'secret',
        'secretKey',
        'privateKey',
        'authorization',
        'cookie',
        'cookies',
        'jwt',
        'bearer',
        'creditCard',
        'cardNumber',
        'cvv',
        'ssn',
        'socialSecurityNumber',
        'encryptionKey',
        'ENCRYPTION_KEY',
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'STRIPE_SECRET_KEY',
        'AWS_SECRET_ACCESS_KEY',
        'CLOUDINARY_API_SECRET',
        'SENTRY_DSN',
    ];

    // Recursively sanitize nested objects and arrays
    for (const key in sanitized) {
        if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
            const lowerKey = key.toLowerCase();

            // Check if key contains sensitive information
            const isSensitive = sensitiveKeys.some(sensitiveKey =>
                lowerKey.includes(sensitiveKey.toLowerCase())
            );

            if (isSensitive) {
                sanitized[key] = '[REDACTED]';
            } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
                // Recursively sanitize nested objects
                sanitized[key] = sanitizeSensitiveData(sanitized[key]);
            }
        }
    }

    return sanitized;
}

/**
 * Get Sentry request handler middleware
 * Must be added as the first middleware in Express
 */
function getRequestHandler() {
    return Sentry.Handlers.requestHandler({
        // Include user information in error reports
        user: ['id', 'username', 'firmId'],

        // Include request information
        request: ['method', 'url', 'headers', 'data'],

        // Include IP address
        ip: false, // Disabled for privacy

        // Include transaction name
        transaction: 'methodPath',
    });
}

/**
 * Get Sentry tracing middleware
 * Adds performance monitoring for requests
 */
function getTracingHandler() {
    return Sentry.Handlers.tracingHandler();
}

/**
 * Get Sentry error handler middleware
 * Must be added before other error handlers but after all routes
 */
function getErrorHandler() {
    return Sentry.Handlers.errorHandler({
        // Include error details
        shouldHandleError(error) {
            // Capture all errors with status >= 500
            return !error.status || error.status >= 500;
        },
    });
}

/**
 * Middleware to set user context from authenticated requests
 */
function setUserContext(req, res, next) {
    if (req.userID) {
        Sentry.setUser({
            id: req.userID,
            username: req.username,
            firmId: req.firmId,
        });
    }
    next();
}

/**
 * Middleware to add request breadcrumb
 */
function addRequestBreadcrumb(req, res, next) {
    Sentry.addBreadcrumb({
        category: 'http',
        message: `${req.method} ${req.path}`,
        level: 'info',
        data: {
            method: req.method,
            url: req.originalUrl,
            query: sanitizeSensitiveData(req.query),
            params: req.params,
        },
    });
    next();
}

module.exports = {
    initSentry,
    getRequestHandler,
    getTracingHandler,
    getErrorHandler,
    setUserContext,
    addRequestBreadcrumb,
    Sentry,
};
