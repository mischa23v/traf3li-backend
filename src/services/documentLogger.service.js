/**
 * Document Logger Service
 *
 * Comprehensive debug logging for document operations in a legal platform.
 * Captures detailed context to help debug production issues.
 *
 * Security Features:
 * - PII redaction for file names and paths
 * - Log injection prevention
 * - Non-blocking async logging
 * - Memory leak prevention
 *
 * Features:
 * - Request/response logging
 * - Error tracking with stack traces
 * - Performance metrics (numeric values)
 * - User context (firmId, userId)
 * - File metadata
 * - Storage operation tracking
 */

const crypto = require('crypto');
const logger = require('../utils/logger');
const { PRESIGNED_URL_EXPIRY } = require('../configs/storage');

// Log levels for filtering
const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

// PII patterns to redact in file names
const PII_PATTERNS = [
  /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g, // SSN
  /\b\d{9,10}\b/g, // ID numbers
  /\b[A-Za-z]+[._]?[A-Za-z]+@/g, // Email prefixes in filenames
  /passport/gi,
  /license/gi,
  /\bssn\b/gi,
  /\bid[-_]?card\b/gi,
];

// Enable debug mode via environment variable
const isDebugEnabled = () => process.env.DOCUMENT_DEBUG_LOGGING === 'true' || process.env.NODE_ENV === 'development';

/**
 * Sanitize user input to prevent log injection
 * Removes control characters, newlines, and limits length
 * @param {string} input - User input to sanitize
 * @param {number} maxLength - Maximum length (default 200)
 * @returns {string} - Sanitized string
 */
const sanitizeInput = (input, maxLength = 200) => {
  if (!input || typeof input !== 'string') return input;
  return input
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/[\r\n]/g, ' ') // Replace newlines with space
    .substring(0, maxLength)
    .trim();
};

/**
 * Redact PII from file names
 * @param {string} fileName - Original file name
 * @returns {string} - Redacted file name
 */
const redactFileName = (fileName) => {
  if (!fileName || typeof fileName !== 'string') return fileName;
  let redacted = fileName;
  for (const pattern of PII_PATTERNS) {
    redacted = redacted.replace(pattern, '[REDACTED]');
  }
  return sanitizeInput(redacted, 100);
};

/**
 * Redact sensitive path components
 * @param {string} filePath - File path to redact
 * @returns {string} - Redacted path
 */
const redactPath = (filePath) => {
  if (!filePath) return filePath;
  const parts = filePath.split('/');
  if (parts.length <= 2) return sanitizeInput(filePath, 150);
  return `${parts[0]}/***/${sanitizeInput(parts[parts.length - 1], 50)}`;
};

/**
 * Safely get request ID, preferring existing ones
 * @param {Object} req - Express request
 * @returns {string} - Request ID
 */
const getRequestId = (req) => {
  return req.requestId || req.headers?.['x-request-id'] || crypto.randomUUID();
};

/**
 * Log document operation with full context (non-blocking)
 * @param {string} operation - Operation name (upload, download, delete, etc.)
 * @param {Object} context - Context object
 */
const logOperation = (operation, context = {}) => {
  // Skip debug logs in production unless explicitly enabled
  if (!isDebugEnabled() && context.level === LOG_LEVELS.DEBUG) {
    return;
  }

  // Use setImmediate to make logging non-blocking
  setImmediate(() => {
    try {
      const logEntry = {
        service: 'document-system',
        operation,
        ...context,
        // Redact sensitive data
        ...(context.fileKey && { fileKey: redactPath(context.fileKey) }),
        ...(context.fileName && { fileName: redactFileName(context.fileName) }),
      };

      const level = context.level || LOG_LEVELS.INFO;
      delete logEntry.level;

      switch (level) {
        case LOG_LEVELS.ERROR:
          logger.error(`[DOC:${operation}]`, logEntry);
          break;
        case LOG_LEVELS.WARN:
          logger.warn(`[DOC:${operation}]`, logEntry);
          break;
        case LOG_LEVELS.DEBUG:
          logger.debug(`[DOC:${operation}]`, logEntry);
          break;
        default:
          logger.info(`[DOC:${operation}]`, logEntry);
      }
    } catch (err) {
      // Silently fail - logging should never break the application
      // Use console.error as last resort
      console.error('[DOC:LOGGING_ERROR]', err.message);
    }
  });
};

/**
 * Safe logging wrapper - catches errors to prevent silent failures
 * @param {Function} logFn - Logging function to wrap
 * @returns {Function} - Wrapped function
 */
const safeLog = (logFn) => {
  return (...args) => {
    try {
      return logFn(...args);
    } catch (err) {
      console.error('[DOC:SAFE_LOG_ERROR]', err.message);
    }
  };
};

/**
 * Log upload start
 */
const logUploadStart = safeLog((req, fileInfo) => {
  logOperation('UPLOAD_START', {
    level: LOG_LEVELS.INFO,
    requestId: getRequestId(req),
    userId: req.userID,
    firmId: req.firmId,
    lawyerId: req.lawyerId,
    endpoint: sanitizeInput(req.originalUrl, 200),
    method: req.method,
    file: {
      name: redactFileName(fileInfo.fileName || fileInfo.originalname),
      size: fileInfo.fileSize || fileInfo.size,
      type: sanitizeInput(fileInfo.fileType || fileInfo.mimetype, 100),
    },
    ip: req.ip,
    userAgent: sanitizeInput(req.get('user-agent'), 100),
  });
});

/**
 * Log upload success
 */
const logUploadSuccess = safeLog((req, document, durationMs) => {
  logOperation('UPLOAD_SUCCESS', {
    level: LOG_LEVELS.INFO,
    requestId: getRequestId(req),
    userId: req.userID,
    firmId: req.firmId,
    documentId: document._id?.toString(),
    fileKey: document.fileKey,
    fileName: redactFileName(document.fileName),
    fileSize: document.fileSize,
    fileType: document.fileType,
    storageType: document.storageType,
    bucket: document.bucket,
    durationMs: typeof durationMs === 'number' ? durationMs : 0,
  });
});

/**
 * Log upload failure
 */
const logUploadError = safeLog((req, error, fileInfo = {}) => {
  logOperation('UPLOAD_ERROR', {
    level: LOG_LEVELS.ERROR,
    requestId: getRequestId(req),
    userId: req.userID,
    firmId: req.firmId,
    endpoint: sanitizeInput(req.originalUrl, 200),
    file: {
      name: redactFileName(fileInfo.fileName || fileInfo.originalname),
      size: fileInfo.fileSize || fileInfo.size,
      type: sanitizeInput(fileInfo.fileType || fileInfo.mimetype, 100),
    },
    error: {
      message: sanitizeInput(error.message, 500),
      code: error.code,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 5).join(' | '),
    },
    ip: req.ip,
  });
});

/**
 * Log download start
 */
const logDownloadStart = safeLog((req, documentId) => {
  logOperation('DOWNLOAD_START', {
    level: LOG_LEVELS.DEBUG,
    requestId: getRequestId(req),
    userId: req.userID,
    firmId: req.firmId,
    documentId: sanitizeInput(String(documentId), 50),
    endpoint: sanitizeInput(req.originalUrl, 200),
    disposition: req.query?.disposition || 'attachment',
    ip: req.ip,
  });
});

/**
 * Log download success
 */
const logDownloadSuccess = safeLog((req, document, urlExpirySeconds = PRESIGNED_URL_EXPIRY) => {
  logOperation('DOWNLOAD_SUCCESS', {
    level: LOG_LEVELS.INFO,
    requestId: getRequestId(req),
    userId: req.userID,
    firmId: req.firmId,
    documentId: document._id?.toString(),
    fileName: redactFileName(document.fileName),
    fileSize: document.fileSize,
    urlExpirySeconds: typeof urlExpirySeconds === 'number' ? urlExpirySeconds : PRESIGNED_URL_EXPIRY,
    disposition: req.query?.disposition || 'attachment',
  });
});

/**
 * Log download failure
 */
const logDownloadError = safeLog((req, error, documentId) => {
  logOperation('DOWNLOAD_ERROR', {
    level: LOG_LEVELS.ERROR,
    requestId: getRequestId(req),
    userId: req.userID,
    firmId: req.firmId,
    documentId: sanitizeInput(String(documentId), 50),
    endpoint: sanitizeInput(req.originalUrl, 200),
    error: {
      message: sanitizeInput(error.message, 500),
      code: error.code,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 5).join(' | '),
    },
    ip: req.ip,
  });
});

/**
 * Log delete operation
 */
const logDelete = safeLog((req, document, success, error = null) => {
  logOperation(success ? 'DELETE_SUCCESS' : 'DELETE_ERROR', {
    level: success ? LOG_LEVELS.INFO : LOG_LEVELS.ERROR,
    requestId: getRequestId(req),
    userId: req.userID,
    firmId: req.firmId,
    documentId: document?._id?.toString(),
    fileName: redactFileName(document?.fileName),
    fileKey: document?.fileKey,
    ...(error && {
      error: {
        message: sanitizeInput(error.message, 500),
        code: error.code,
      }
    }),
    ip: req.ip,
  });
});

/**
 * Log malware scan result
 */
const logMalwareScan = safeLog((req, result, fileInfo) => {
  const level = result.clean ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;

  logOperation('MALWARE_SCAN', {
    level,
    requestId: getRequestId(req),
    userId: req.userID,
    firmId: req.firmId,
    file: {
      name: redactFileName(fileInfo.originalname || fileInfo.fileName),
      size: fileInfo.size || fileInfo.fileSize,
      type: sanitizeInput(fileInfo.mimetype || fileInfo.fileType, 100),
    },
    scanResult: {
      clean: result.clean,
      virus: result.virus ? sanitizeInput(result.virus, 100) : null,
      provider: result.provider,
      skipped: result.skipped || false,
      blocked: result.blocked || false,
    },
    ip: req.ip,
  });
});

/**
 * Log presigned URL generation
 */
const logPresignedUrl = safeLog((operation, bucket, fileKey, expiresInSeconds, success, error = null) => {
  logOperation('PRESIGNED_URL', {
    level: success ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR,
    operation,
    bucket,
    fileKey: redactPath(fileKey),
    expiresInSeconds: typeof expiresInSeconds === 'number' ? expiresInSeconds : 0,
    success,
    ...(error && {
      error: {
        message: sanitizeInput(error.message, 500),
        code: error.code,
      }
    }),
  });
});

/**
 * Log storage operation (R2)
 */
const logStorageOperation = safeLog((operation, bucket, fileKey, success, metadata = {}) => {
  logOperation(`STORAGE_${operation.toUpperCase()}`, {
    level: success ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR,
    bucket,
    fileKey: redactPath(fileKey),
    success,
    ...metadata,
  });
});

/**
 * Log version operation
 */
const logVersionOperation = safeLog((req, operation, documentId, versionInfo) => {
  logOperation(`VERSION_${operation.toUpperCase()}`, {
    level: LOG_LEVELS.INFO,
    requestId: getRequestId(req),
    userId: req.userID,
    firmId: req.firmId,
    documentId,
    version: versionInfo.version,
    previousVersion: versionInfo.previousVersion,
    changeNote: sanitizeInput(versionInfo.changeNote, 100),
  });
});

/**
 * Log access denied
 */
const logAccessDenied = safeLog((req, documentId, reason) => {
  logOperation('ACCESS_DENIED', {
    level: LOG_LEVELS.WARN,
    requestId: getRequestId(req),
    userId: req.userID,
    firmId: req.firmId,
    documentId: sanitizeInput(String(documentId), 50),
    endpoint: sanitizeInput(req.originalUrl, 200),
    reason: sanitizeInput(reason, 200),
    ip: req.ip,
    userAgent: sanitizeInput(req.get('user-agent'), 100),
  });
});

/**
 * Log document not found
 */
const logNotFound = safeLog((req, documentId, collection) => {
  logOperation('NOT_FOUND', {
    level: LOG_LEVELS.WARN,
    requestId: getRequestId(req),
    userId: req.userID,
    firmId: req.firmId,
    documentId: sanitizeInput(String(documentId), 50),
    collection: sanitizeInput(collection, 50),
    endpoint: sanitizeInput(req.originalUrl, 200),
    ip: req.ip,
  });
});

/**
 * Document-specific routes pattern for middleware
 */
const DOCUMENT_ROUTE_PATTERNS = [
  '/documents',
  '/attachments',
  '/voice-memo',
  '/upload',
  '/storage',
];

/**
 * Check if URL matches document routes
 * @param {string} url - Request URL
 * @returns {boolean}
 */
const isDocumentRoute = (url) => {
  if (!url) return false;
  return DOCUMENT_ROUTE_PATTERNS.some(pattern => url.includes(pattern));
};

/**
 * Create request context middleware
 * Adds requestId and timing to document-related requests
 *
 * IMPORTANT: Mount this only on document routes, not globally!
 * Example: app.use('/api/documents', documentLoggingMiddleware);
 */
const documentLoggingMiddleware = (req, res, next) => {
  // Only process document-related routes
  if (!isDocumentRoute(req.originalUrl)) {
    return next();
  }

  // Add request ID if not present (use crypto.randomUUID for security)
  if (!req.requestId) {
    req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
  }

  // Track request timing
  req.documentOpStart = Date.now();

  // Log request start
  logOperation('REQUEST_START', {
    level: LOG_LEVELS.DEBUG,
    requestId: req.requestId,
    method: req.method,
    endpoint: sanitizeInput(req.originalUrl, 200),
    userId: req.userID,
    firmId: req.firmId,
    contentType: sanitizeInput(req.get('content-type')?.split(';')[0], 100), // Remove boundary
    contentLength: parseInt(req.get('content-length')) || 0,
  });

  // Track if we've already logged (prevent double logging)
  let logged = false;

  const logEnd = () => {
    if (logged) return;
    logged = true;

    const durationMs = Date.now() - req.documentOpStart;
    logOperation('REQUEST_END', {
      level: res.statusCode >= 400 ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG,
      requestId: req.requestId,
      method: req.method,
      endpoint: sanitizeInput(req.originalUrl, 200),
      statusCode: res.statusCode,
      durationMs,
    });
  };

  // Log response on finish (normal completion)
  res.on('finish', logEnd);

  // Also handle close event (client disconnect - prevents memory leak)
  res.on('close', () => {
    if (!logged) {
      logOperation('REQUEST_ABORTED', {
        level: LOG_LEVELS.WARN,
        requestId: req.requestId,
        method: req.method,
        endpoint: sanitizeInput(req.originalUrl, 200),
        durationMs: Date.now() - req.documentOpStart,
      });
      logged = true;
    }
  });

  next();
};

/**
 * Get duration from request start
 * @param {Object} req - Express request
 * @returns {number} - Duration in milliseconds
 */
const getDuration = (req) => {
  if (!req.documentOpStart) return 0;
  return Date.now() - req.documentOpStart;
};

module.exports = {
  // Core logging functions
  logOperation,
  logUploadStart,
  logUploadSuccess,
  logUploadError,
  logDownloadStart,
  logDownloadSuccess,
  logDownloadError,
  logDelete,
  logMalwareScan,
  logPresignedUrl,
  logStorageOperation,
  logVersionOperation,
  logAccessDenied,
  logNotFound,

  // Middleware
  documentLoggingMiddleware,

  // Utilities
  getDuration,
  getRequestId,
  isDebugEnabled,
  isDocumentRoute,
  sanitizeInput,
  redactFileName,
  redactPath,
  LOG_LEVELS,
  DOCUMENT_ROUTE_PATTERNS,
};
