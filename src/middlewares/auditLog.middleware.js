const AuditLog = require('../models/auditLog.model');
const auditLogService = require('../services/auditLog.service');

/**
 * Enhanced Audit Logging Middleware for Compliance
 *
 * Automatically logs sensitive actions with before/after state tracking
 *
 * Usage:
 * // Basic usage
 * router.post('/clients', authenticate, auditAction('create', 'client'), createClient);
 *
 * // With options
 * router.put('/clients/:id', authenticate, auditAction('update', 'client', {
 *   captureChanges: true,
 *   skipGET: false
 * }), updateClient);
 *
 * // Skip audit for specific routes
 * router.get('/clients', authenticate, auditAction('read', 'client', { skip: true }), getClients);
 */

/**
 * Create audit log middleware with enhanced features
 * @param {String} action - Action being performed (e.g., 'create', 'update', 'delete')
 * @param {String} entityType - Type of entity (e.g., 'client', 'case', 'invoice')
 * @param {Object} options - Additional options
 * @param {Boolean} options.captureChanges - Auto-capture before/after state (default: true for updates)
 * @param {Boolean} options.skipGET - Skip logging for GET requests (default: true)
 * @param {Boolean} options.skip - Skip audit logging entirely (default: false)
 * @param {Function} options.getEntityId - Custom function to extract entity ID
 * @param {Function} options.getBeforeState - Custom function to get before state
 * @param {String} options.severity - Override automatic severity determination
 * @returns {Function} - Express middleware
 */
const auditAction = (action, entityType, options = {}) => {
  return async (req, res, next) => {
    // Skip if explicitly disabled
    if (options.skip === true) {
      return next();
    }

    // Skip GET requests if configured (default: true)
    const skipGET = options.skipGET !== undefined ? options.skipGET : true;
    if (skipGET && req.method === 'GET') {
      return next();
    }

    // Determine if we should capture changes
    const shouldCaptureChanges = options.captureChanges !== undefined
      ? options.captureChanges
      : ['update', 'delete', 'PUT', 'PATCH', 'DELETE'].includes(action) || ['PUT', 'PATCH', 'DELETE'].includes(req.method);

    // Store before state for updates/deletes
    let beforeState = null;
    if (shouldCaptureChanges && options.getBeforeState) {
      try {
        beforeState = await options.getBeforeState(req);
      } catch (error) {
        console.error('Failed to capture before state:', error.message);
      }
    }

    // Store original methods
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Track response
    let responseStatus = 'success';
    let errorMessage = null;
    let responseData = null;

    // Override res.json to capture response
    res.json = function (data) {
      responseData = data;
      if (res.statusCode >= 400) {
        responseStatus = 'failed';
        errorMessage = data.error || data.message || 'Unknown error';
      }

      // Create audit log after response
      createAuditLog(req, res, responseStatus, errorMessage, responseData, beforeState);

      return originalJson(data);
    };

    // Override res.send to capture response
    res.send = function (data) {
      if (!responseData) {
        responseData = data;
        if (res.statusCode >= 400) {
          responseStatus = 'failed';
          errorMessage = typeof data === 'string' ? data : 'Unknown error';
        }

        createAuditLog(req, res, responseStatus, errorMessage, responseData, beforeState);
      }

      return originalSend(data);
    };

    // Continue to next middleware
    next();

    /**
     * Create comprehensive audit log entry
     */
    async function createAuditLog(req, res, status, error, responseData, beforeState) {
      try {
        // Extract user info from request (set by authenticate middleware)
        const user = req.user;

        if (!user) {
          console.warn('Audit log: No user found in request');
          return;
        }

        // Extract entity ID
        let entityId = null;
        if (options.getEntityId) {
          entityId = options.getEntityId(req, responseData);
        } else {
          entityId = req.params.id
            || req.params.clientId
            || req.params.caseId
            || req.params.invoiceId
            || req.params.paymentId
            || req.params.userId
            || responseData?.data?._id
            || responseData?.data?.id
            || responseData?._id
            || responseData?.id;
        }

        // Capture after state for creates/updates
        let afterState = null;
        if (shouldCaptureChanges && status === 'success') {
          afterState = responseData?.data || responseData;
        }

        // Calculate changes for updates
        let changes = null;
        if (beforeState && afterState && typeof beforeState === 'object' && typeof afterState === 'object') {
          changes = calculateChanges(beforeState, afterState);
        }

        // Get IP address (considering proxies)
        const ipAddress = req.ip
          || req.headers['x-forwarded-for']?.split(',')[0]
          || req.headers['x-real-ip']
          || req.connection?.remoteAddress
          || req.socket?.remoteAddress
          || 'unknown';

        // Build context object
        const context = {
          userId: user._id || user.id,
          userEmail: user.email,
          userRole: user.role,
          userName: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : null,
          firmId: user.firmId || req.firmId,
          ipAddress: ipAddress,
          userAgent: req.headers['user-agent'] || 'unknown',
          method: req.method,
          endpoint: req.originalUrl || req.url,
          url: req.originalUrl || req.url,
          sessionId: req.sessionID || req.session?.id,
          status: status,
          errorMessage: error,
          statusCode: res.statusCode,
          severity: options.severity,
          details: options.details || extractDetails(req),
          metadata: options.metadata || {},
          timestamp: new Date(),
        };

        // Create changes object if we have before/after states
        const changesObj = changes ? {
          changes: changes,
          before: beforeState,
          after: afterState
        } : null;

        // Use the service to create audit log
        await auditLogService.log(
          action,
          entityType,
          entityId,
          changesObj,
          context
        );

      } catch (error) {
        // Don't let audit log failure break the main operation
        console.error('Failed to create audit log:', error.message);
      }
    }
  };
};

/**
 * Calculate field-level changes between before and after states
 * @param {Object} before - Before state
 * @param {Object} after - After state
 * @returns {Array} - Array of changes
 */
function calculateChanges(before, after) {
  const changes = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  // Fields to exclude from change tracking
  const excludeFields = [
    '_id',
    '__v',
    'createdAt',
    'updatedAt',
    'password',
    'token',
    'refreshToken'
  ];

  for (const key of allKeys) {
    if (excludeFields.includes(key)) continue;

    const oldValue = before[key];
    const newValue = after[key];

    // Check if values are different
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field: key,
        oldValue: oldValue,
        newValue: newValue
      });
    }
  }

  return changes;
}

/**
 * Detect resource type from request path
 * @param {object} req - Express request
 * @returns {string} - Resource type
 */
const detectResourceType = (req) => {
  const path = req.originalUrl || req.url;
  
  if (path.includes('/case')) return 'Case';
  if (path.includes('/document')) return 'Document';
  if (path.includes('/judgment')) return 'Judgment';
  if (path.includes('/invoice')) return 'Invoice';
  if (path.includes('/payment')) return 'Payment';
  if (path.includes('/order')) return 'Order';
  if (path.includes('/user')) return 'User';
  if (path.includes('/message')) return 'Message';
  
  return 'System';
};

/**
 * Extract relevant details from request
 * @param {object} req - Express request
 * @returns {object} - Details object
 */
const extractDetails = (req) => {
  const details = {};
  
  // Add query params if present
  if (req.query && Object.keys(req.query).length > 0) {
    details.queryParams = req.query;
  }
  
  // Add relevant body fields (exclude sensitive data like passwords)
  if (req.body && Object.keys(req.body).length > 0) {
    const safeBody = { ...req.body };
    delete safeBody.password;
    delete safeBody.currentPassword;
    delete safeBody.newPassword;
    delete safeBody.token;
    
    if (Object.keys(safeBody).length > 0) {
      details.requestBody = safeBody;
    }
  }
  
  return details;
};

/**
 * Log authentication events (login, logout, etc.)
 * Use separately from route middleware
 */
const logAuthEvent = async (action, data) => {
  try {
    const logData = {
      userId: data.userId || null,
      userEmail: data.email || 'unknown',
      userRole: data.role || 'unknown',
      action: action,
      resourceType: 'User',
      resourceId: data.userId || null,
      details: data.details || {},
      ipAddress: data.ipAddress || 'unknown',
      userAgent: data.userAgent || 'unknown',
      method: data.method || 'POST',
      endpoint: data.endpoint || '/auth',
      status: data.status || 'success',
      errorMessage: data.errorMessage || null,
      timestamp: new Date(),
    };
    
    await AuditLog.log(logData);
  } catch (error) {
    console.error('❌ Failed to log auth event:', error.message);
  }
};

/**
 * Check for suspicious activity patterns
 * Call this periodically or on specific events
 */
const checkSuspiciousActivity = async (userId, ipAddress) => {
  try {
    // Check for multiple failed logins
    const failedLogins = await AuditLog.checkBruteForce(userId || ipAddress, 900000); // 15 min
    
    if (failedLogins >= 5) {
      // Log suspicious activity
      await AuditLog.log({
        userId: userId,
        userEmail: userId || 'unknown',
        userRole: 'unknown',
        action: 'access_sensitive_data',
        resourceType: 'System',
        details: { 
          reason: 'Multiple failed login attempts',
          failedAttempts: failedLogins,
        },
        ipAddress: ipAddress,
        userAgent: 'unknown',
        method: 'POST',
        endpoint: '/auth/login',
        status: 'suspicious',
        timestamp: new Date(),
      });
      
      return true; // Is suspicious
    }
    
    return false; // Not suspicious
  } catch (error) {
    console.error('❌ Failed to check suspicious activity:', error.message);
    return false;
  }
};

// Export both old and new naming for backward compatibility
module.exports = {
  // New enhanced middleware (recommended)
  auditAction,

  // Legacy exports (backward compatibility)
  auditLog,
  logAuthEvent,
  checkSuspiciousActivity,
};
