/**
 * Security Stack Middleware
 *
 * Centralizes security enforcement for routes by combining:
 * - Authentication
 * - Firm context
 * - Permission checking
 * - IDOR protection
 *
 * Usage:
 * router.get('/cases/:id',
 *   ...securityStack({
 *     permission: 'cases:view',
 *     resource: 'Case'
 *   }),
 *   caseController.getCase
 * );
 */

const authenticate = require('./authenticate');
const { globalFirmContext } = require('./globalFirmContext.middleware');
const { resourceAccessMiddleware } = require('./resourceAccess.middleware');

/**
 * Main security stack factory
 *
 * @param {Object} config - Configuration options
 * @param {boolean} config.public - If true, skips authentication and firm context
 * @param {string} config.permission - Permission in format "module:level" (e.g., "cases:view")
 * @param {string} config.resource - Model name for IDOR protection (e.g., "Case")
 * @param {string} config.idParam - Route parameter name (defaults to 'id')
 * @param {boolean} config.optional - If true, resource check is optional when param missing
 * @param {Function} config.custom - Custom middleware function to add to the stack
 * @returns {Array} Array of middleware functions
 */
const securityStack = (config = {}) => {
  const middlewares = [];

  // 1. Authentication (always required unless explicitly public)
  if (!config.public) {
    middlewares.push(authenticate);
  }

  // 2. Firm context (always for authenticated routes)
  // Note: globalFirmContext is also applied globally, but explicit is better
  if (!config.public) {
    middlewares.push(globalFirmContext);
  }

  // 3. Permission check
  if (config.permission) {
    middlewares.push(requirePermission(config.permission));
  }

  // 4. Resource IDOR protection
  if (config.resource) {
    middlewares.push(resourceAccess(config.resource, config.idParam || 'id', config.optional));
  }

  // 5. Custom middleware (if provided)
  if (config.custom && typeof config.custom === 'function') {
    middlewares.push(config.custom);
  }

  return middlewares.filter(Boolean);
};

/**
 * Permission checker middleware
 * Validates module-level permissions
 *
 * @param {string} permission - Permission in format "module:level" (e.g., "cases:edit")
 * @returns {Function} Express middleware
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      // Parse permission format
      const [module, level] = permission.split(':');

      if (!module) {
        return res.status(500).json({
          success: false,
          error: 'Invalid permission format. Use "module:level"'
        });
      }

      // Default to 'view' if no level specified
      const requiredLevel = level || 'view';

      // Check if user has the permission
      if (!req.hasPermission || !req.hasPermission(module, requiredLevel)) {
        return res.status(403).json({
          success: false,
          error: 'Permission denied',
          code: 'PERMISSION_DENIED',
          required: `${module}:${requiredLevel}`
        });
      }

      next();
    } catch (error) {
      console.error('[SecurityStack] Permission check error:', error);
      next(error);
    }
  };
};

/**
 * Special permission checker middleware
 * Validates special permissions (non-module permissions)
 *
 * @param {string} permission - Special permission name (e.g., "viewAllCases")
 * @returns {Function} Express middleware
 */
const requireSpecialPermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.hasSpecialPermission || !req.hasSpecialPermission(permission)) {
        return res.status(403).json({
          success: false,
          error: 'Special permission denied',
          code: 'SPECIAL_PERMISSION_DENIED',
          required: permission
        });
      }
      next();
    } catch (error) {
      console.error('[SecurityStack] Special permission check error:', error);
      next(error);
    }
  };
};

/**
 * Resource access middleware (IDOR protection)
 * Validates that the requested resource belongs to the user's firm
 *
 * @param {string} modelName - Mongoose model name (e.g., "Case")
 * @param {string} idParam - Route parameter name (defaults to 'id')
 * @param {boolean} optional - If true, skip check when param is missing
 * @returns {Function} Express middleware
 */
const resourceAccess = (modelName, idParam = 'id', optional = false) => {
  return async (req, res, next) => {
    try {
      const mongoose = require('mongoose');

      // Get resource ID from route params
      const resourceId = req.params[idParam];

      // If optional and no ID provided, skip check
      if (optional && !resourceId) {
        return next();
      }

      // If required and no ID provided, error
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: 'Resource ID required',
          code: 'MISSING_RESOURCE_ID'
        });
      }

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(resourceId)) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found',
          code: 'INVALID_RESOURCE_ID'
        });
      }

      // Skip if no firm context (will be caught by firmFilter)
      if (!req.firmQuery) {
        return next();
      }

      // Check if model exists
      let Model;
      try {
        Model = mongoose.model(modelName);
      } catch (error) {
        console.error(`[SecurityStack] Model "${modelName}" not found`);
        return res.status(500).json({
          success: false,
          error: 'Invalid resource configuration',
          code: 'INVALID_MODEL'
        });
      }

      // Query resource with firm filter
      const resource = await Model.findOne({
        _id: resourceId,
        ...req.firmQuery
      }).select('_id').lean();

      // Return 404 to avoid revealing resource existence
      if (!resource) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found or access denied',
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      // Attach validated resource info to request
      req.validatedResources = req.validatedResources || {};
      req.validatedResources[idParam] = resourceId;

      next();
    } catch (error) {
      console.error('[SecurityStack] Resource access error:', error);
      next(error);
    }
  };
};

/**
 * Pre-configured security stacks for common scenarios
 */
const commonStacks = {
  /**
   * Standard authenticated route
   * Requires authentication + firm context only
   */
  authenticated: () => securityStack({}),

  /**
   * View-only resource route
   * Auth + firm + view permission + IDOR protection
   */
  viewResource: (module, modelName) => securityStack({
    permission: `${module}:view`,
    resource: modelName
  }),

  /**
   * Edit resource route
   * Auth + firm + edit permission + IDOR protection
   */
  editResource: (module, modelName) => securityStack({
    permission: `${module}:edit`,
    resource: modelName
  }),

  /**
   * Delete resource route
   * Auth + firm + delete permission + IDOR protection
   */
  deleteResource: (module, modelName) => securityStack({
    permission: `${module}:delete`,
    resource: modelName
  }),

  /**
   * Create resource route
   * Auth + firm + create permission (no IDOR needed)
   */
  createResource: (module) => securityStack({
    permission: `${module}:create`
  }),

  /**
   * List resources route
   * Auth + firm + view permission (no IDOR needed)
   */
  listResources: (module) => securityStack({
    permission: `${module}:view`
  })
};

module.exports = {
  securityStack,
  requirePermission,
  requireSpecialPermission,
  resourceAccess,
  commonStacks
};
