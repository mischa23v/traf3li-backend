/**
 * Security Monitoring Middleware
 *
 * Provides middleware functions to automatically monitor sensitive operations
 * and detect anomalous activity in real-time.
 *
 * Usage:
 *   router.delete('/clients/bulk', userMiddleware, monitorSensitiveOperation('bulk_delete'), handler);
 */

const securityMonitorService = require('../services/securityMonitor.service');
const logger = require('../utils/logger');

/**
 * Middleware to monitor sensitive operations
 * Automatically detects anomalous activity for specified operation types
 *
 * @param {String} operationType - Type of operation to monitor
 * @param {Object} options - Additional options
 * @returns {Function} - Express middleware function
 */
function monitorSensitiveOperation(operationType, options = {}) {
  return async (req, res, next) => {
    const userId = req.user?._id;
    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0];
    const userAgent = req.headers['user-agent'];

    // Store original end function
    const originalEnd = res.end;

    // Override end function to capture response
    res.end = function(chunk, encoding) {
      // Restore original end function
      res.end = originalEnd;

      // Only monitor if operation was successful
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Run detection asynchronously (don't block response)
        securityMonitorService.detectAnomalousActivity(userId, {
          type: operationType,
          resource: req.baseUrl + req.path,
          metadata: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            ...options.metadata,
          },
          ip,
          userAgent,
        }).catch(err => {
          logger.error('Security monitoring error:', err);
          // Don't throw - monitoring failures shouldn't affect the response
        });
      }

      // Call original end function
      res.end(chunk, encoding);
    };

    next();
  };
}

/**
 * Middleware to monitor login attempts
 * Automatically detects brute force attacks and account takeover attempts
 *
 * @param {Object} options - Options for login monitoring
 * @returns {Function} - Express middleware function
 */
function monitorLoginAttempt(options = {}) {
  return async (req, res, next) => {
    const { email } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0];
    const userAgent = req.headers['user-agent'];

    // Store original json function
    const originalJson = res.json;

    // Override json function to capture response
    res.json = function(data) {
      // Restore original json function
      res.json = originalJson;

      // Check if login was successful or failed
      if (data && data.success === false && res.statusCode === 401) {
        // Failed login - trigger brute force detection
        securityMonitorService.detectBruteForce(null, ip, {
          email,
          userAgent,
        }).catch(err => {
          logger.error('Brute force detection error:', err);
        });
      } else if (data && data.success === true) {
        // Successful login - check for account takeover
        const userId = data.user?.id || data.user?._id;
        if (userId) {
          securityMonitorService.detectAccountTakeover(userId, {
            ip,
            userAgent,
            ...options.loginInfo,
          }).catch(err => {
            logger.error('Account takeover detection error:', err);
          });
        }
      }

      // Call original json function
      res.json(data);
    };

    next();
  };
}

/**
 * Middleware to monitor data exports
 * Specifically watches for bulk data exfiltration patterns
 *
 * @param {Object} options - Options for export monitoring
 * @returns {Function} - Express middleware function
 */
function monitorDataExport(options = {}) {
  return async (req, res, next) => {
    const userId = req.user?._id;
    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0];
    const userAgent = req.headers['user-agent'];

    // Store original json/send function
    const originalJson = res.json;
    const originalSend = res.send;

    const monitorExport = (data) => {
      // Only monitor successful exports
      if (res.statusCode >= 200 && res.statusCode < 300) {
        let recordCount = 0;

        // Try to determine record count
        if (data && Array.isArray(data)) {
          recordCount = data.length;
        } else if (data && data.data && Array.isArray(data.data)) {
          recordCount = data.data.length;
        } else if (options.recordCount) {
          recordCount = options.recordCount;
        }

        // Trigger anomalous activity detection
        securityMonitorService.detectAnomalousActivity(userId, {
          type: 'bulk_export',
          resource: options.entityType || req.baseUrl,
          metadata: {
            recordCount,
            format: options.format || req.query.format || 'json',
            entityType: options.entityType,
          },
          ip,
          userAgent,
        }).catch(err => {
          logger.error('Data export monitoring error:', err);
        });
      }
    };

    // Override json function
    res.json = function(data) {
      res.json = originalJson;
      monitorExport(data);
      res.json(data);
    };

    // Override send function
    res.send = function(data) {
      res.send = originalSend;
      monitorExport(data);
      res.send(data);
    };

    next();
  };
}

/**
 * Middleware to monitor permission changes
 * Detects unauthorized privilege escalation attempts
 *
 * @param {Object} options - Options for permission monitoring
 * @returns {Function} - Express middleware function
 */
function monitorPermissionChange(options = {}) {
  return async (req, res, next) => {
    const userId = req.user?._id;
    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0];
    const userAgent = req.headers['user-agent'];

    // Store original json function
    const originalJson = res.json;

    // Override json function
    res.json = function(data) {
      res.json = originalJson;

      // Only monitor successful updates
      if (data && data.success === true && res.statusCode >= 200 && res.statusCode < 300) {
        const { role, permissions } = req.body;

        securityMonitorService.detectAnomalousActivity(userId, {
          type: 'update_permissions',
          resource: 'user',
          metadata: {
            targetUserId: req.params.id || req.params.userId,
            newRole: role,
            newPermissions: permissions,
          },
          ip,
          userAgent,
        }).catch(err => {
          logger.error('Permission change monitoring error:', err);
        });
      }

      res.json(data);
    };

    next();
  };
}

module.exports = {
  monitorSensitiveOperation,
  monitorLoginAttempt,
  monitorDataExport,
  monitorPermissionChange,
};
