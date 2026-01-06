/**
 * Document Logger Service
 *
 * Comprehensive debug logging for document operations in a legal platform.
 * Captures detailed context to help debug production issues.
 *
 * Features:
 * - Request/response logging
 * - Error tracking with stack traces
 * - Performance metrics
 * - User context (firmId, userId)
 * - File metadata
 * - Storage operation tracking
 */

const logger = require('../utils/logger');

// Log levels for filtering
const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

// Enable debug mode via environment variable
const isDebugEnabled = () => process.env.DOCUMENT_DEBUG_LOGGING === 'true' || process.env.NODE_ENV === 'development';

/**
 * Log document operation with full context
 * @param {string} operation - Operation name (upload, download, delete, etc.)
 * @param {Object} context - Context object
 */
const logOperation = (operation, context = {}) => {
  if (!isDebugEnabled() && context.level === LOG_LEVELS.DEBUG) {
    return; // Skip debug logs in production unless explicitly enabled
  }

  const logEntry = {
    service: 'document-system',
    operation,
    timestamp: new Date().toISOString(),
    ...context,
    // Redact sensitive data
    ...(context.fileKey && { fileKey: redactPath(context.fileKey) }),
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
};

/**
 * Redact sensitive path components
 */
const redactPath = (path) => {
  if (!path) return path;
  // Keep first and last parts visible
  const parts = path.split('/');
  if (parts.length <= 2) return path;
  return `${parts[0]}/***/${parts[parts.length - 1]}`;
};

/**
 * Log upload start
 */
const logUploadStart = (req, fileInfo) => {
  logOperation('UPLOAD_START', {
    level: LOG_LEVELS.INFO,
    requestId: req.requestId || req.headers['x-request-id'],
    userId: req.userID,
    firmId: req.firmId,
    lawyerId: req.lawyerId,
    endpoint: req.originalUrl,
    method: req.method,
    file: {
      name: fileInfo.fileName || fileInfo.originalname,
      size: fileInfo.fileSize || fileInfo.size,
      type: fileInfo.fileType || fileInfo.mimetype,
    },
    ip: req.ip,
    userAgent: req.get('user-agent')?.substring(0, 100),
  });
};

/**
 * Log upload success
 */
const logUploadSuccess = (req, document, duration) => {
  logOperation('UPLOAD_SUCCESS', {
    level: LOG_LEVELS.INFO,
    requestId: req.requestId || req.headers['x-request-id'],
    userId: req.userID,
    firmId: req.firmId,
    documentId: document._id?.toString(),
    fileKey: document.fileKey,
    fileName: document.fileName,
    fileSize: document.fileSize,
    fileType: document.fileType,
    storageType: document.storageType,
    bucket: document.bucket,
    duration: `${duration}ms`,
  });
};

/**
 * Log upload failure
 */
const logUploadError = (req, error, fileInfo = {}) => {
  logOperation('UPLOAD_ERROR', {
    level: LOG_LEVELS.ERROR,
    requestId: req.requestId || req.headers['x-request-id'],
    userId: req.userID,
    firmId: req.firmId,
    endpoint: req.originalUrl,
    file: {
      name: fileInfo.fileName || fileInfo.originalname,
      size: fileInfo.fileSize || fileInfo.size,
      type: fileInfo.fileType || fileInfo.mimetype,
    },
    error: {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    },
    ip: req.ip,
  });
};

/**
 * Log download start
 */
const logDownloadStart = (req, documentId) => {
  logOperation('DOWNLOAD_START', {
    level: LOG_LEVELS.DEBUG,
    requestId: req.requestId || req.headers['x-request-id'],
    userId: req.userID,
    firmId: req.firmId,
    documentId,
    endpoint: req.originalUrl,
    disposition: req.query.disposition || 'attachment',
    ip: req.ip,
  });
};

/**
 * Log download success
 */
const logDownloadSuccess = (req, document, urlExpiry) => {
  logOperation('DOWNLOAD_SUCCESS', {
    level: LOG_LEVELS.INFO,
    requestId: req.requestId || req.headers['x-request-id'],
    userId: req.userID,
    firmId: req.firmId,
    documentId: document._id?.toString(),
    fileName: document.fileName,
    fileSize: document.fileSize,
    urlExpiresIn: `${urlExpiry}s`,
    disposition: req.query.disposition || 'attachment',
  });
};

/**
 * Log download failure
 */
const logDownloadError = (req, error, documentId) => {
  logOperation('DOWNLOAD_ERROR', {
    level: LOG_LEVELS.ERROR,
    requestId: req.requestId || req.headers['x-request-id'],
    userId: req.userID,
    firmId: req.firmId,
    documentId,
    endpoint: req.originalUrl,
    error: {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    },
    ip: req.ip,
  });
};

/**
 * Log delete operation
 */
const logDelete = (req, document, success, error = null) => {
  logOperation(success ? 'DELETE_SUCCESS' : 'DELETE_ERROR', {
    level: success ? LOG_LEVELS.INFO : LOG_LEVELS.ERROR,
    requestId: req.requestId || req.headers['x-request-id'],
    userId: req.userID,
    firmId: req.firmId,
    documentId: document?._id?.toString(),
    fileName: document?.fileName,
    fileKey: document?.fileKey,
    ...(error && {
      error: {
        message: error.message,
        code: error.code,
      }
    }),
    ip: req.ip,
  });
};

/**
 * Log malware scan result
 */
const logMalwareScan = (req, result, fileInfo) => {
  const level = result.clean ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;

  logOperation('MALWARE_SCAN', {
    level,
    requestId: req.requestId || req.headers['x-request-id'],
    userId: req.userID,
    firmId: req.firmId,
    file: {
      name: fileInfo.originalname || fileInfo.fileName,
      size: fileInfo.size || fileInfo.fileSize,
      type: fileInfo.mimetype || fileInfo.fileType,
    },
    scanResult: {
      clean: result.clean,
      virus: result.virus || null,
      provider: result.provider,
      skipped: result.skipped || false,
      blocked: result.blocked || false,
    },
    ip: req.ip,
  });
};

/**
 * Log presigned URL generation
 */
const logPresignedUrl = (operation, bucket, fileKey, expiresIn, success, error = null) => {
  logOperation('PRESIGNED_URL', {
    level: success ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR,
    operation, // 'upload' or 'download'
    bucket,
    fileKey: redactPath(fileKey),
    expiresIn: `${expiresIn}s`,
    success,
    ...(error && {
      error: {
        message: error.message,
        code: error.code,
      }
    }),
  });
};

/**
 * Log storage operation (R2)
 */
const logStorageOperation = (operation, bucket, fileKey, success, metadata = {}) => {
  logOperation(`STORAGE_${operation.toUpperCase()}`, {
    level: success ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR,
    bucket,
    fileKey: redactPath(fileKey),
    success,
    ...metadata,
  });
};

/**
 * Log version operation
 */
const logVersionOperation = (req, operation, documentId, versionInfo) => {
  logOperation(`VERSION_${operation.toUpperCase()}`, {
    level: LOG_LEVELS.INFO,
    requestId: req.requestId || req.headers['x-request-id'],
    userId: req.userID,
    firmId: req.firmId,
    documentId,
    version: versionInfo.version,
    previousVersion: versionInfo.previousVersion,
    changeNote: versionInfo.changeNote?.substring(0, 100),
  });
};

/**
 * Log access denied
 */
const logAccessDenied = (req, documentId, reason) => {
  logOperation('ACCESS_DENIED', {
    level: LOG_LEVELS.WARN,
    requestId: req.requestId || req.headers['x-request-id'],
    userId: req.userID,
    firmId: req.firmId,
    documentId,
    endpoint: req.originalUrl,
    reason,
    ip: req.ip,
    userAgent: req.get('user-agent')?.substring(0, 100),
  });
};

/**
 * Log document not found
 */
const logNotFound = (req, documentId, collection) => {
  logOperation('NOT_FOUND', {
    level: LOG_LEVELS.WARN,
    requestId: req.requestId || req.headers['x-request-id'],
    userId: req.userID,
    firmId: req.firmId,
    documentId,
    collection,
    endpoint: req.originalUrl,
    ip: req.ip,
  });
};

/**
 * Create request context middleware
 * Adds requestId and timing to requests
 */
const documentLoggingMiddleware = (req, res, next) => {
  // Add request ID if not present
  if (!req.requestId) {
    req.requestId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  // Track request timing
  req.documentOpStart = Date.now();

  // Log request start for document endpoints
  if (req.originalUrl.includes('/document') ||
      req.originalUrl.includes('/attachment') ||
      req.originalUrl.includes('/voice-memo') ||
      req.originalUrl.includes('/upload')) {
    logOperation('REQUEST_START', {
      level: LOG_LEVELS.DEBUG,
      requestId: req.requestId,
      method: req.method,
      endpoint: req.originalUrl,
      userId: req.userID,
      firmId: req.firmId,
      contentType: req.get('content-type'),
      contentLength: req.get('content-length'),
    });
  }

  // Log response on finish
  res.on('finish', () => {
    if (req.originalUrl.includes('/document') ||
        req.originalUrl.includes('/attachment') ||
        req.originalUrl.includes('/voice-memo') ||
        req.originalUrl.includes('/upload')) {
      const duration = Date.now() - req.documentOpStart;
      logOperation('REQUEST_END', {
        level: res.statusCode >= 400 ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG,
        requestId: req.requestId,
        method: req.method,
        endpoint: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      });
    }
  });

  next();
};

/**
 * Get duration from request start
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
  isDebugEnabled,
  LOG_LEVELS,
};
