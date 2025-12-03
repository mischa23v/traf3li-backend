const AuditLog = require('../models/auditLog.model');

/**
 * Audit logging middleware for PDPL compliance
 * Automatically logs sensitive actions to audit trail
 * 
 * Usage:
 * router.get('/judgments/:id', authenticate, auditLog('view_judgment'), getJudgment);
 */

/**
 * Create audit log middleware
 * @param {string} action - Action being performed (from AuditLog enum)
 * @param {object} options - Additional options
 * @returns {Function} - Express middleware
 */
const auditLog = (action, options = {}) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Track if response was successful
    let responseStatus = 'success';
    let errorMessage = null;
    
    // Override res.json to capture response
    res.json = function (data) {
      // Check if response indicates error
      if (res.statusCode >= 400) {
        responseStatus = 'failed';
        errorMessage = data.error || data.message || 'Unknown error';
      }
      
      // Create audit log after response
      createAuditLog(req, responseStatus, errorMessage);
      
      // Call original json method
      return originalJson(data);
    };
    
    // Continue to next middleware
    next();
    
    /**
     * Create audit log entry
     */
    async function createAuditLog(req, status, error) {
      try {
        // Extract user info from request (set by authenticate middleware)
        const user = req.user;
        
        if (!user) {
          console.warn('⚠️  Audit log: No user found in request');
          return;
        }
        
        // Determine resource type and ID from request
        const resourceType = options.resourceType || detectResourceType(req);
        const resourceId = options.resourceId || req.params.id || req.params.caseId || req.params.documentId;
        const resourceName = options.resourceName || null;
        
        // Get IP address (considering proxies)
        const ipAddress = req.ip || 
                         req.headers['x-forwarded-for']?.split(',')[0] || 
                         req.connection.remoteAddress ||
                         'unknown';
        
        // Prepare log data
        const logData = {
          userId: user._id || user.id,
          userEmail: user.email,
          userRole: user.role,
          action: action,
          resourceType: resourceType,
          resourceId: resourceId,
          resourceName: resourceName,
          details: options.details || extractDetails(req),
          ipAddress: ipAddress,
          userAgent: req.headers['user-agent'] || 'unknown',
          method: req.method,
          endpoint: req.originalUrl || req.url,
          status: status,
          errorMessage: error,
          timestamp: new Date(),
        };
        
        // Create audit log (async, don't wait)
        await AuditLog.log(logData);
        
      } catch (error) {
        // Don't let audit log failure break the main operation
        console.error('❌ Failed to create audit log:', error.message);
      }
    }
  };
};

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

module.exports = {
  auditLog,
  logAuthEvent,
  checkSuspiciousActivity,
};
