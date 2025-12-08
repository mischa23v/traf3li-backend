/**
 * Permission Middleware - Route-level Authorization
 *
 * Wraps the permission enforcer for easy integration with Express routes.
 * Provides decorator-like syntax for permission checks.
 *
 * Usage:
 *   const { requirePermission, requireRelation } = require('../middlewares/permission.middleware');
 *
 *   // Basic permission check
 *   router.get('/cases', requirePermission('cases', 'view'), getCases);
 *
 *   // With resource ID from params
 *   router.put('/cases/:id', requirePermission('cases', 'edit', { resourceIdParam: 'id' }), updateCase);
 *
 *   // Check relation (ReBAC)
 *   router.get('/cases/:id', requireRelation('cases', 'viewer', { resourceIdParam: 'id' }), getCase);
 */

const permissionEnforcer = require('../services/permissionEnforcer.service');
const CustomException = require('../utils/CustomException');

/**
 * Create middleware that checks permission via policies (RBAC/ABAC)
 *
 * @param {string} namespace - Resource namespace (e.g., 'cases', 'clients')
 * @param {string} action - Action being performed (e.g., 'view', 'edit', 'delete')
 * @param {Object} options - Additional options
 * @param {string} options.resourceIdParam - Request param name containing resource ID
 * @param {Function} options.getResourceId - Custom function to extract resource ID from request
 * @param {Function} options.getResourceAttributes - Custom function to get resource attributes
 * @param {boolean} options.skipLogging - Skip decision logging
 */
function requirePermission(namespace, action, options = {}) {
    return async (req, res, next) => {
        try {
            const firmId = req.firmId;

            // If no firm, skip permission check (firmFilter middleware will handle)
            if (!firmId) {
                return next();
            }

            // Skip for departed users (they should already be blocked)
            if (req.isDeparted) {
                throw CustomException('ليس لديك صلاحية للوصول - حسابك في وضع المغادرة', 403);
            }

            // Get resource ID
            let resourceId = null;
            if (options.getResourceId) {
                resourceId = options.getResourceId(req);
            } else if (options.resourceIdParam) {
                resourceId = req.params[options.resourceIdParam];
            }

            // Get resource attributes
            const resourceAttributes = options.getResourceAttributes
                ? options.getResourceAttributes(req)
                : {};

            // Build permission request
            const request = {
                subject: {
                    userId: req.userID,
                    role: req.firmRole,
                    attributes: {
                        status: req.isDeparted ? 'departed' : 'active',
                        ...req.user // Include user object attributes
                    }
                },
                resource: {
                    namespace,
                    type: namespace,
                    id: resourceId,
                    attributes: resourceAttributes
                },
                action
            };

            // Build context
            const context = {
                ipAddress: req.ip || req.connection?.remoteAddress,
                userAgent: req.headers['user-agent'],
                requestPath: req.originalUrl || req.path,
                requestMethod: req.method
            };

            // Check permission
            const result = await permissionEnforcer.check(
                firmId,
                request,
                context,
                { skipLog: options.skipLogging }
            );

            // Attach result to request for downstream use
            req.permissionResult = result;

            if (!result.allowed) {
                throw CustomException(
                    result.reason || 'ليس لديك صلاحية لتنفيذ هذا الإجراء',
                    403,
                    { code: result.reasonCode }
                );
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Create middleware that checks relation (ReBAC)
 *
 * @param {string} namespace - Resource namespace
 * @param {string} relation - Required relation (e.g., 'owner', 'viewer', 'editor')
 * @param {Object} options - Additional options
 */
function requireRelation(namespace, relation, options = {}) {
    return async (req, res, next) => {
        try {
            const firmId = req.firmId;

            if (!firmId) {
                return next();
            }

            // Get resource ID
            let resourceId = null;
            if (options.getResourceId) {
                resourceId = options.getResourceId(req);
            } else if (options.resourceIdParam) {
                resourceId = req.params[options.resourceIdParam];
            }

            if (!resourceId) {
                throw CustomException('معرف المورد مطلوب', 400);
            }

            // Check relation using expand
            const expanded = await permissionEnforcer.expand(firmId, namespace, resourceId, relation);

            const hasRelation = expanded.subjects.some(s =>
                (s.namespace === 'user' && s.object === req.userID?.toString()) ||
                (s.namespace === 'role' && s.object === req.firmRole)
            );

            if (!hasRelation) {
                throw CustomException(
                    'ليس لديك صلاحية للوصول إلى هذا المورد',
                    403,
                    { code: 'RELATION_NOT_FOUND' }
                );
            }

            // Attach relation info to request
            req.resourceRelation = { namespace, resourceId, relation };

            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Require one of multiple permissions (OR logic)
 */
function requireAnyPermission(checks) {
    return async (req, res, next) => {
        try {
            const firmId = req.firmId;

            if (!firmId) {
                return next();
            }

            for (const check of checks) {
                try {
                    const middleware = requirePermission(check.namespace, check.action, check.options);
                    await new Promise((resolve, reject) => {
                        middleware(req, res, (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                    // If we get here, permission was granted
                    return next();
                } catch (err) {
                    // Continue to next check
                    continue;
                }
            }

            // None of the permissions were granted
            throw CustomException('ليس لديك صلاحية لتنفيذ هذا الإجراء', 403);
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Require all permissions (AND logic)
 */
function requireAllPermissions(checks) {
    return async (req, res, next) => {
        try {
            const firmId = req.firmId;

            if (!firmId) {
                return next();
            }

            for (const check of checks) {
                const middleware = requirePermission(check.namespace, check.action, check.options);
                await new Promise((resolve, reject) => {
                    middleware(req, res, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Grant relation when resource is created
 */
function grantOnCreate(namespace, relation) {
    return async (req, res, next) => {
        // Store original res.json
        const originalJson = res.json.bind(res);

        res.json = async function(data) {
            // Check if creation was successful
            if (data.success && data.data?._id) {
                try {
                    await permissionEnforcer.grant(
                        req.firmId,
                        {
                            namespace,
                            object: data.data._id.toString(),
                            relation,
                            subjectNamespace: 'user',
                            subjectObject: req.userID.toString(),
                            metadata: {
                                grantedAt: new Date(),
                                grantedBy: 'auto_on_create'
                            }
                        },
                        req.userID
                    );
                } catch (err) {
                    console.error('Failed to grant relation on create:', err);
                }
            }

            return originalJson(data);
        };

        next();
    };
}

/**
 * Revoke relations when resource is deleted
 */
function revokeOnDelete(namespace) {
    return async (req, res, next) => {
        const originalJson = res.json.bind(res);
        const resourceId = req.params.id;

        res.json = async function(data) {
            if (data.success && resourceId) {
                try {
                    const RelationTuple = require('../models/relationTuple.model');
                    await RelationTuple.deleteForObject(req.firmId, namespace, resourceId);
                } catch (err) {
                    console.error('Failed to revoke relations on delete:', err);
                }
            }

            return originalJson(data);
        };

        next();
    };
}

/**
 * Check if user has any of the specified roles
 */
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.firmRole) {
            return next(CustomException('يجب أن تكون عضواً في مكتب', 403));
        }

        if (!roles.includes(req.firmRole)) {
            return next(CustomException('ليس لديك الدور المطلوب للوصول', 403));
        }

        next();
    };
}

/**
 * Check if user is owner or admin
 */
function requireAdmin() {
    return requireRole('owner', 'admin');
}

/**
 * Check if user is owner
 */
function requireOwner() {
    return requireRole('owner');
}

/**
 * Log access without blocking
 */
function logAccess(namespace, action) {
    return async (req, res, next) => {
        try {
            const firmId = req.firmId;

            if (firmId) {
                const PolicyDecision = require('../models/policyDecision.model');
                await PolicyDecision.log({
                    firmId,
                    request: {
                        subject: { userId: req.userID, role: req.firmRole },
                        resource: { namespace, id: req.params.id },
                        action,
                        context: {
                            ipAddress: req.ip,
                            requestPath: req.path,
                            requestMethod: req.method,
                            timestamp: new Date()
                        }
                    },
                    decision: {
                        allowed: true,
                        reason: 'Access logged (not enforced)',
                        effect: 'allow'
                    },
                    metrics: { evaluationTimeMs: 0, policiesChecked: 0, relationsChecked: 0 }
                });
            }
        } catch (err) {
            console.error('Failed to log access:', err);
        }

        next();
    };
}

module.exports = {
    requirePermission,
    requireRelation,
    requireAnyPermission,
    requireAllPermissions,
    grantOnCreate,
    revokeOnDelete,
    requireRole,
    requireAdmin,
    requireOwner,
    logAccess
};
