/**
 * Context-aware Logger Wrapper
 *
 * Provides enhanced logging capabilities with automatic context injection:
 * - Request-scoped logging with requestId, userId, firmId
 * - Module-scoped logging for background jobs and services
 * - Automatic sensitive data filtering
 * - Structured logging for better observability
 *
 * Usage:
 *
 * // In HTTP request handlers:
 * const logger = require('../utils/contextLogger');
 * router.get('/api/cases', (req, res) => {
 *   const log = logger.fromRequest(req);
 *   log.info('Fetching cases', { filters });
 * });
 *
 * // In background jobs or services:
 * const logger = require('../utils/contextLogger');
 * const log = logger.child({ module: 'EmailCampaignJob' });
 * log.info('Processing campaign', { campaignId });
 *
 * // For database operations:
 * logger.db.query('find', 'users', { email: 'user@example.com' }, 45);
 */

const baseLogger = require('./logger');

/**
 * List of sensitive fields that should be redacted from logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'privateKey',
  'cookie',
  'authorization',
  'credentials',
  'ssn',
  'nationalId',
  'cardNumber',
  'cvv',
  'pin'
];

/**
 * Recursively redact sensitive fields from an object
 * @param {*} obj - Object to redact
 * @returns {*} - Redacted object
 */
const redactSensitiveData = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item));
  }

  const redacted = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some(field => lowerKey.includes(field));

    if (isSensitive) {
      redacted[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
};

/**
 * Create a child logger from an Express request
 * Automatically includes request context (requestId, userId, firmId, etc.)
 * @param {Object} req - Express request object
 * @returns {Object} - Child logger with request context
 */
const fromRequest = (req) => {
  if (!req) {
    return baseLogger;
  }

  const context = {
    requestId: req.id || req.headers['x-request-id'],
    method: req.method,
    path: req.originalUrl || req.url,
    ip: req.ip
  };

  // Add user context if available
  if (req.userID) {
    context.userId = req.userID;
  }
  if (req.user?._id) {
    context.userId = req.user._id.toString();
  }
  if (req.firmId) {
    context.firmId = req.firmId.toString();
  }

  return baseLogger.child(context);
};

/**
 * Create a child logger with module context
 * Useful for background jobs, services, and utilities
 * @param {Object} context - Context object (e.g., { module: 'EmailJob', jobId: '123' })
 * @returns {Object} - Child logger with module context
 */
const child = (context = {}) => {
  // Redact any sensitive data from context
  const safeContext = redactSensitiveData(context);
  return baseLogger.child(safeContext);
};

/**
 * Safe logging wrapper that redacts sensitive data
 * @param {string} level - Log level (info, warn, error, debug)
 * @param {string} message - Log message
 * @param {Object} meta - Metadata object
 */
const safelog = (level, message, meta = {}) => {
  const safeMeta = redactSensitiveData(meta);
  baseLogger[level](message, safeMeta);
};

/**
 * Database operation logging helpers
 */
const db = {
  /**
   * Log a database query
   * @param {string} operation - Operation type (find, update, insert, etc.)
   * @param {string} collection - Collection name
   * @param {Object} query - Query object (will be truncated if too large)
   * @param {number} duration - Duration in milliseconds
   */
  query: (operation, collection, query, duration) => {
    const queryStr = JSON.stringify(query || {});
    const truncatedQuery = queryStr.length > 300 ? queryStr.substring(0, 300) + '...' : queryStr;

    baseLogger.debug('Database query', {
      db: true,
      operation,
      collection,
      query: truncatedQuery,
      durationMs: duration
    });
  },

  /**
   * Log a database error
   * @param {string} operation - Operation type
   * @param {string} collection - Collection name
   * @param {Error} error - Error object
   */
  error: (operation, collection, error) => {
    baseLogger.error('Database error', {
      db: true,
      operation,
      collection,
      error: error.message,
      code: error.code,
      stack: error.stack
    });
  },

  /**
   * Log a slow query warning
   * @param {string} operation - Operation type
   * @param {string} collection - Collection name
   * @param {Object} query - Query object
   * @param {number} duration - Duration in milliseconds
   */
  slowQuery: (operation, collection, query, duration) => {
    const queryStr = JSON.stringify(query || {});
    const truncatedQuery = queryStr.length > 300 ? queryStr.substring(0, 300) + '...' : queryStr;

    baseLogger.warn('Slow database query detected', {
      db: true,
      slow: true,
      operation,
      collection,
      query: truncatedQuery,
      durationMs: duration
    });
  }
};

/**
 * Audit logging for security-sensitive operations
 * @param {string} action - Action being performed
 * @param {Object} details - Additional details
 */
const audit = (action, details = {}) => {
  const safeDetails = redactSensitiveData(details);
  baseLogger.audit(action, safeDetails);
};

/**
 * Error logging with context
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
const logError = (error, context = {}) => {
  const safeContext = redactSensitiveData(context);
  baseLogger.logError(error, safeContext);
};

/**
 * Performance timer
 * @returns {Object} - Timer object with done() method
 */
const startTimer = () => {
  return baseLogger.startTimer();
};

// Export all logger methods
module.exports = {
  // Context creation
  fromRequest,
  child,

  // Safe logging
  info: (message, meta) => safelog('info', message, meta),
  warn: (message, meta) => safelog('warn', message, meta),
  error: (message, meta) => safelog('error', message, meta),
  debug: (message, meta) => safelog('debug', message, meta),

  // Specialized logging
  db,
  audit,
  logError,
  startTimer,

  // Direct access to base logger for advanced use cases
  base: baseLogger
};
