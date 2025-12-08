/**
 * Structured Logger using Winston
 *
 * Provides consistent logging across the application with:
 * - JSON format for production (easy to parse by log aggregators)
 * - Pretty format for development
 * - Request correlation IDs
 * - Error stack traces
 * - Performance timing
 */

const winston = require('winston');
const path = require('path');

// Custom format for development
const devFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
    })
);

// Custom format for production (JSON)
const prodFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Determine log level based on environment
const getLogLevel = () => {
    const env = process.env.NODE_ENV || 'development';
    const levels = {
        production: 'info',
        development: 'debug',
        test: 'warn'
    };
    return process.env.LOG_LEVEL || levels[env] || 'info';
};

// Create transports
const transports = [
    // Console output
    new winston.transports.Console({
        format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat
    })
];

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
    // Error logs
    transports.push(
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'error.log'),
            level: 'error',
            format: prodFormat,
            maxsize: 10485760, // 10MB
            maxFiles: 5,
            tailable: true
        })
    );

    // Combined logs
    transports.push(
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'combined.log'),
            format: prodFormat,
            maxsize: 10485760, // 10MB
            maxFiles: 10,
            tailable: true
        })
    );
}

// Create the logger instance
const logger = winston.createLogger({
    level: getLogLevel(),
    defaultMeta: {
        service: 'traf3li-backend',
        version: process.env.npm_package_version || '1.0.0'
    },
    transports,
    // Don't exit on handled exceptions
    exitOnError: false
});

// Add request context helper
logger.withRequest = (req) => {
    return logger.child({
        requestId: req.id || req.headers['x-request-id'],
        userId: req.userID || req.user?._id,
        firmId: req.firmId,
        ip: req.ip,
        method: req.method,
        path: req.originalUrl
    });
};

// Performance timing helper
logger.startTimer = () => {
    const start = process.hrtime();
    return {
        done: (meta = {}) => {
            const diff = process.hrtime(start);
            const duration = (diff[0] * 1e9 + diff[1]) / 1e6; // Convert to ms
            logger.info('Operation completed', { ...meta, durationMs: duration.toFixed(2) });
        }
    };
};

// Audit log helper for security-sensitive operations
logger.audit = (action, details) => {
    logger.info('AUDIT', {
        audit: true,
        action,
        timestamp: new Date().toISOString(),
        ...details
    });
};

// HTTP request logging middleware
logger.requestMiddleware = (req, res, next) => {
    const start = process.hrtime();

    // Generate request ID if not present
    req.id = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('X-Request-Id', req.id);

    // Log request
    logger.debug('Incoming request', {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });

    // Log response when finished
    res.on('finish', () => {
        const diff = process.hrtime(start);
        const duration = (diff[0] * 1e9 + diff[1]) / 1e6;

        const logLevel = res.statusCode >= 500 ? 'error'
            : res.statusCode >= 400 ? 'warn'
            : 'info';

        logger[logLevel]('Request completed', {
            requestId: req.id,
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            durationMs: duration.toFixed(2),
            userId: req.userID,
            firmId: req.firmId
        });
    });

    next();
};

// Error logging helper
logger.logError = (error, context = {}) => {
    const errorInfo = {
        message: error.message,
        name: error.name,
        code: error.code,
        stack: error.stack,
        ...context
    };

    // Add Mongoose validation errors
    if (error.errors) {
        errorInfo.validationErrors = Object.keys(error.errors).map(key => ({
            field: key,
            message: error.errors[key].message
        }));
    }

    logger.error('Error occurred', errorInfo);
};

// Database operation logging
logger.db = {
    query: (operation, collection, query, duration) => {
        logger.debug('Database operation', {
            db: true,
            operation,
            collection,
            query: JSON.stringify(query),
            durationMs: duration
        });
    },
    error: (operation, collection, error) => {
        logger.error('Database error', {
            db: true,
            operation,
            collection,
            error: error.message
        });
    }
};

module.exports = logger;
