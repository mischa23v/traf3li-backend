/**
 * Permission Enforcer Service - Policy Enforcement Point (PEP)
 *
 * Core authorization service combining:
 * - Casbin: PERM policy matching with role hierarchy
 * - Ory Keto: Relation tuple checks with computed usersets
 * - Keycloak: Decision strategies (unanimous, affirmative, consensus)
 * - OPA: Decision logging and structured outputs
 *
 * Usage:
 *   const { check, enforce, expand, grant, revoke } = require('./permissionEnforcer.service');
 *
 *   // Check permission (returns boolean)
 *   const allowed = await check(firmId, { subject, resource, action }, context);
 *
 *   // Enforce permission (throws if denied)
 *   await enforce(firmId, { subject, resource, action }, context);
 */

const PermissionConfig = require('../models/permission.model');
const RelationTuple = require('../models/relationTuple.model');
const PolicyDecision = require('../models/policyDecision.model');
const logger = require('../utils/logger');

// Simple in-memory cache (consider Redis for production)
const cache = new Map();
const CACHE_TTL = 300000; // 5 minutes

/**
 * Escape special regex characters to prevent ReDoS attacks
 */
const escapeRegex = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// ═══════════════════════════════════════════════════════════════
// CORE CHECK FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a subject has permission to perform an action on a resource
 *
 * @param {ObjectId} firmId - The firm ID
 * @param {Object} request - The permission request
 * @param {Object} request.subject - Subject info { userId, role, attributes }
 * @param {Object} request.resource - Resource info { namespace, type, id, attributes }
 * @param {string} request.action - The action being performed
 * @param {Object} context - Additional context (ipAddress, etc.)
 * @param {Object} options - Options { skipLog, skipCache }
 * @returns {Promise<{allowed: boolean, reason: string, decision: Object}>}
 */
async function check(firmId, request, context = {}, options = {}) {
    const startTime = Date.now();
    const { subject, resource, action } = request;

    // Build cache key
    const cacheKey = `${firmId}:${subject.userId}:${subject.role}:${resource.namespace}:${resource.id || '*'}:${action}`;

    // Check cache
    if (!options.skipCache) {
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            if (!options.skipLog) {
                await logDecision(firmId, request, context, cached.result, {
                    ...cached.result.metrics,
                    cacheHit: true
                });
            }
            return cached.result;
        }
    }

    // Get permission configuration
    const config = await PermissionConfig.getForFirm(firmId);
    const effectiveRoles = await PermissionConfig.getEffectiveRoles(firmId, subject.role);

    // Track evaluation details
    const policiesEvaluated = [];
    const relationsChecked = [];
    let policiesCheckedCount = 0;
    let relationsCheckedCount = 0;

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Check relation tuples (ReBAC)
    // ═══════════════════════════════════════════════════════════════

    if (resource.id) {
        // Check direct relation
        const directRelation = await checkRelation(
            firmId,
            resource.namespace,
            resource.id,
            actionToRelation(action),
            subject,
            config.namespaces?.find(ns => ns.name === resource.namespace)
        );
        relationsCheckedCount++;

        relationsChecked.push({
            namespace: resource.namespace,
            object: resource.id,
            relation: actionToRelation(action),
            subject: `${subject.userId || subject.role}`,
            found: directRelation.found,
            path: directRelation.path
        });

        // If direct relation found, allow (unless explicit deny exists)
        if (directRelation.found) {
            const denyPolicy = await checkExplicitDeny(firmId, config, request, effectiveRoles);
            if (!denyPolicy) {
                const result = {
                    allowed: true,
                    reason: 'Direct relation found',
                    reasonCode: 'RELATION_FOUND',
                    effect: 'allow',
                    relationsChecked,
                    policiesEvaluated,
                    metrics: {
                        evaluationTimeMs: Date.now() - startTime,
                        policiesChecked: policiesCheckedCount,
                        relationsChecked: relationsCheckedCount,
                        cacheHit: false,
                        depth: directRelation.depth || 1
                    }
                };

                // Cache result
                cache.set(cacheKey, { result, timestamp: Date.now() });

                if (!options.skipLog) {
                    await logDecision(firmId, request, context, result, result.metrics);
                }

                return result;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Evaluate policies (RBAC/ABAC)
    // ═══════════════════════════════════════════════════════════════

    const matchingPolicies = await PermissionConfig.getMatchingPolicies(firmId, {
        subject: { ...subject, roles: effectiveRoles },
        resource,
        action
    });

    policiesCheckedCount = matchingPolicies.length;

    // Evaluate each matching policy
    for (const policy of matchingPolicies) {
        const evaluation = evaluatePolicy(policy, request, context);
        policiesEvaluated.push({
            policyId: policy.policyId,
            policyName: policy.name,
            effect: policy.effect,
            matched: evaluation.matched,
            priority: policy.priority,
            conditions: evaluation.conditions
        });
    }

    // Apply decision strategy
    const decision = applyDecisionStrategy(
        policiesEvaluated.filter(p => p.matched),
        config.decisionStrategy,
        config.denyOverride
    );

    // Build result
    const result = {
        allowed: decision.allowed,
        reason: decision.reason,
        reasonCode: decision.reasonCode,
        effect: decision.effect,
        relationsChecked,
        policiesEvaluated,
        metrics: {
            evaluationTimeMs: Date.now() - startTime,
            policiesChecked: policiesCheckedCount,
            relationsChecked: relationsCheckedCount,
            cacheHit: false,
            depth: 1
        }
    };

    // Cache result
    cache.set(cacheKey, { result, timestamp: Date.now() });

    // Log decision
    if (!options.skipLog) {
        await logDecision(firmId, request, context, result, result.metrics);
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// ENFORCE FUNCTION (THROWS ON DENIAL)
// ═══════════════════════════════════════════════════════════════

/**
 * Enforce permission - throws CustomException if denied
 */
async function enforce(firmId, request, context = {}, options = {}) {
    const result = await check(firmId, request, context, options);

    if (!result.allowed) {
        const CustomException = require('../utils/CustomException');
        throw CustomException(
            result.reason || 'ليس لديك صلاحية لتنفيذ هذا الإجراء',
            403,
            { code: result.reasonCode, decision: result }
        );
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// BATCH CHECK
// ═══════════════════════════════════════════════════════════════

/**
 * Check multiple permissions at once
 */
async function checkBatch(firmId, requests, context = {}) {
    const results = await Promise.all(
        requests.map(request => check(firmId, request, context, { skipLog: true }))
    );

    // Log batch decision
    await PolicyDecision.log({
        firmId,
        request: {
            subject: requests[0]?.subject,
            resource: { namespace: 'batch_check', type: 'batch' },
            action: 'batch_check',
            context
        },
        decision: {
            allowed: results.every(r => r.allowed),
            reason: `Batch check: ${results.filter(r => r.allowed).length}/${results.length} allowed`,
            effect: results.every(r => r.allowed) ? 'allow' : 'deny'
        },
        metrics: {
            evaluationTimeMs: results.reduce((sum, r) => sum + r.metrics.evaluationTimeMs, 0),
            policiesChecked: results.reduce((sum, r) => sum + r.metrics.policiesChecked, 0),
            relationsChecked: results.reduce((sum, r) => sum + r.metrics.relationsChecked, 0)
        }
    });

    return results;
}

// ═══════════════════════════════════════════════════════════════
// EXPAND FUNCTION (GET ALL SUBJECTS WITH ACCESS)
// ═══════════════════════════════════════════════════════════════

/**
 * Expand - find all subjects that have a specific relation to a resource
 */
async function expand(firmId, namespace, resourceId, relation) {
    const config = await PermissionConfig.getForFirm(firmId);
    const namespaceConfig = config.namespaces?.find(ns => ns.name === namespace);

    const subjects = await RelationTuple.expand(firmId, namespace, resourceId, relation, namespaceConfig);

    return {
        namespace,
        resourceId,
        relation,
        subjects
    };
}

/**
 * Reverse expand - find all resources a subject has access to
 */
async function reverseExpand(firmId, subject, options = {}) {
    const objects = await RelationTuple.getObjects(
        firmId,
        subject.namespace || 'user',
        subject.id,
        options
    );

    return {
        subject,
        objects
    };
}

// ═══════════════════════════════════════════════════════════════
// GRANT/REVOKE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Grant a relation (add tuple)
 */
async function grant(firmId, tuple, grantedBy) {
    // Invalidate cache for this resource
    invalidateCacheForResource(firmId, tuple.namespace, tuple.object);

    const created = await RelationTuple.createTuple(firmId, tuple, grantedBy);

    // Log the grant
    await PolicyDecision.log({
        firmId,
        decisionId: `grant_${Date.now()}`,
        request: {
            subject: { userId: grantedBy },
            resource: { namespace: tuple.namespace, id: tuple.object },
            action: 'grant',
            context: { relation: tuple.relation, target: tuple.subjectObject }
        },
        decision: {
            allowed: true,
            reason: 'Relation granted',
            effect: 'allow'
        },
        metrics: { evaluationTimeMs: 0, policiesChecked: 0, relationsChecked: 0 }
    });

    return created;
}

/**
 * Revoke a relation (remove tuple)
 */
async function revoke(firmId, tuple, revokedBy) {
    // Invalidate cache for this resource
    invalidateCacheForResource(firmId, tuple.namespace, tuple.object);

    await RelationTuple.deleteTuple(firmId, tuple);

    // Log the revoke
    await PolicyDecision.log({
        firmId,
        decisionId: `revoke_${Date.now()}`,
        request: {
            subject: { userId: revokedBy },
            resource: { namespace: tuple.namespace, id: tuple.object },
            action: 'revoke',
            context: { relation: tuple.relation, target: tuple.subjectObject }
        },
        decision: {
            allowed: true,
            reason: 'Relation revoked',
            effect: 'allow'
        },
        metrics: { evaluationTimeMs: 0, policiesChecked: 0, relationsChecked: 0 }
    });

    return true;
}

/**
 * Bulk grant relations
 */
async function grantMany(firmId, tuples, grantedBy) {
    for (const tuple of tuples) {
        invalidateCacheForResource(firmId, tuple.namespace, tuple.object);
    }

    return RelationTuple.createMany(firmId, tuples, grantedBy);
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Check relation tuple (with computed usersets)
 */
async function checkRelation(firmId, namespace, object, relation, subject, namespaceConfig) {
    // Check direct relation
    const directCheck = await RelationTuple.checkDirect(firmId, {
        namespace,
        object,
        relation,
        subjectNamespace: 'user',
        subjectObject: subject.userId?.toString()
    });

    if (directCheck) {
        return { found: true, path: ['direct'], depth: 1 };
    }

    // Check role-based relation
    if (subject.role) {
        const roleCheck = await RelationTuple.checkDirect(firmId, {
            namespace,
            object,
            relation,
            subjectNamespace: 'role',
            subjectObject: subject.role
        });

        if (roleCheck) {
            return { found: true, path: ['role'], depth: 1 };
        }
    }

    // Check computed usersets
    if (namespaceConfig) {
        const relationConfig = namespaceConfig.relations?.find(r => r.name === relation);

        if (relationConfig?.computedUserset) {
            const computed = await checkRelation(
                firmId,
                namespace,
                object,
                relationConfig.computedUserset,
                subject,
                namespaceConfig
            );

            if (computed.found) {
                return {
                    found: true,
                    path: ['computed', relationConfig.computedUserset, ...computed.path],
                    depth: computed.depth + 1
                };
            }
        }
    }

    return { found: false, path: [], depth: 0 };
}

/**
 * Check for explicit deny policy
 */
async function checkExplicitDeny(firmId, config, request, effectiveRoles) {
    const denyPolicies = config.policies.filter(
        p => p.isActive && p.effect === 'deny'
    );

    for (const policy of denyPolicies) {
        const subjectMatch =
            policy.subject.type === 'any' ||
            (policy.subject.type === 'user' && policy.subject.value === request.subject.userId?.toString()) ||
            (policy.subject.type === 'role' && effectiveRoles.includes(policy.subject.value));

        if (!subjectMatch) continue;

        const resourceMatch =
            (policy.resource.namespace === '*' || policy.resource.namespace === request.resource.namespace) &&
            (!policy.resource.id || policy.resource.id === request.resource.id);

        if (!resourceMatch) continue;

        const actionMatch = policy.action === '*' || policy.action === request.action;

        if (actionMatch) {
            return policy;
        }
    }

    return null;
}

/**
 * Evaluate a single policy against request
 */
function evaluatePolicy(policy, request, context) {
    const conditions = [];

    // Check context conditions (ABAC)
    if (policy.contextConditions?.length > 0) {
        for (const condition of policy.contextConditions) {
            const actual = getNestedValue(
                condition.valueType === 'context' ? context :
                    condition.valueType === 'subject' ? request.subject :
                        condition.valueType === 'resource' ? request.resource :
                            null,
                condition.field
            );

            const result = evaluateCondition(actual, condition.operator, condition.value);

            conditions.push({
                field: condition.field,
                operator: condition.operator,
                expected: condition.value,
                actual,
                result
            });

            if (!result) {
                return { matched: false, conditions };
            }
        }
    }

    return { matched: true, conditions };
}

/**
 * Evaluate a condition
 */
function evaluateCondition(actual, operator, expected) {
    switch (operator) {
        case 'eq': return actual === expected;
        case 'neq': return actual !== expected;
        case 'gt': return actual > expected;
        case 'gte': return actual >= expected;
        case 'lt': return actual < expected;
        case 'lte': return actual <= expected;
        case 'in': return Array.isArray(expected) && expected.includes(actual);
        case 'nin': return Array.isArray(expected) && !expected.includes(actual);
        case 'contains': return Array.isArray(actual) && actual.includes(expected);
        case 'regex': return new RegExp(escapeRegex(expected)).test(actual);
        case 'exists': return actual !== undefined && actual !== null;
        default: return false;
    }
}

/**
 * Get nested value from object
 */
function getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((o, k) => o?.[k], obj);
}

/**
 * Apply decision strategy to matched policies
 */
function applyDecisionStrategy(matchedPolicies, strategy, denyOverride) {
    if (matchedPolicies.length === 0) {
        return {
            allowed: false,
            reason: 'No matching policy found',
            reasonCode: 'NO_POLICY',
            effect: 'not_applicable'
        };
    }

    // Check for explicit deny (if denyOverride is enabled)
    if (denyOverride) {
        const denyPolicy = matchedPolicies.find(p => p.effect === 'deny');
        if (denyPolicy) {
            return {
                allowed: false,
                reason: `Denied by policy: ${denyPolicy.policyName}`,
                reasonCode: 'EXPLICIT_DENY',
                effect: 'deny'
            };
        }
    }

    const allowPolicies = matchedPolicies.filter(p => p.effect === 'allow');
    const denyPolicies = matchedPolicies.filter(p => p.effect === 'deny');

    switch (strategy) {
        case 'unanimous':
            // All policies must allow
            if (denyPolicies.length > 0) {
                return {
                    allowed: false,
                    reason: `Denied by policy: ${denyPolicies[0].policyName}`,
                    reasonCode: 'UNANIMOUS_DENY',
                    effect: 'deny'
                };
            }
            return {
                allowed: allowPolicies.length > 0,
                reason: allowPolicies.length > 0 ? 'All policies allow' : 'No allow policy',
                reasonCode: 'UNANIMOUS_ALLOW',
                effect: 'allow'
            };

        case 'consensus':
            // Majority must allow
            if (allowPolicies.length > denyPolicies.length) {
                return {
                    allowed: true,
                    reason: 'Majority of policies allow',
                    reasonCode: 'CONSENSUS_ALLOW',
                    effect: 'allow'
                };
            }
            return {
                allowed: false,
                reason: 'Majority of policies deny',
                reasonCode: 'CONSENSUS_DENY',
                effect: 'deny'
            };

        case 'affirmative':
        default:
            // At least one policy must allow
            if (allowPolicies.length > 0) {
                return {
                    allowed: true,
                    reason: `Allowed by policy: ${allowPolicies[0].policyName}`,
                    reasonCode: 'AFFIRMATIVE_ALLOW',
                    effect: 'allow'
                };
            }
            return {
                allowed: false,
                reason: 'No allow policy matched',
                reasonCode: 'AFFIRMATIVE_DENY',
                effect: 'deny'
            };
    }
}

/**
 * Map action to relation name
 */
function actionToRelation(action) {
    const mapping = {
        'view': 'viewer',
        'edit': 'editor',
        'delete': 'owner',
        'create': 'owner',
        'approve': 'approver',
        'assign': 'manager',
        'manage': 'admin',
        '*': 'owner'
    };

    return mapping[action] || 'viewer';
}

/**
 * Log a policy decision
 */
async function logDecision(firmId, request, context, result, metrics) {
    try {
        await PolicyDecision.log({
            firmId,
            request: {
                subject: request.subject,
                resource: request.resource,
                action: request.action,
                context: {
                    ipAddress: context.ipAddress,
                    userAgent: context.userAgent,
                    requestPath: context.requestPath,
                    requestMethod: context.requestMethod,
                    timestamp: new Date()
                }
            },
            decision: {
                allowed: result.allowed,
                reason: result.reason,
                reasonCode: result.reasonCode,
                effect: result.effect
            },
            policiesEvaluated: result.policiesEvaluated,
            relationsChecked: result.relationsChecked,
            metrics
        });
    } catch (err) {
        logger.error('Failed to log policy decision:', err);
    }
}

/**
 * Invalidate cache for a resource
 */
function invalidateCacheForResource(firmId, namespace, object) {
    const prefix = `${firmId}:`;
    const suffix = `:${namespace}:${object}:`;

    for (const key of cache.keys()) {
        if (key.startsWith(prefix) && key.includes(suffix)) {
            cache.delete(key);
        }
    }
}

/**
 * Clear all cache
 */
function clearCache() {
    cache.clear();
}

/**
 * Get cache stats
 */
function getCacheStats() {
    return {
        size: cache.size,
        keys: Array.from(cache.keys())
    };
}

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE HELPER
// ═══════════════════════════════════════════════════════════════

/**
 * Create an Express middleware for permission checking
 */
function middleware(namespace, action, options = {}) {
    return async (req, res, next) => {
        try {
            const firmId = req.firmId;

            if (!firmId) {
                return next(); // Let firmFilter middleware handle this
            }

            const request = {
                subject: {
                    userId: req.userID,
                    role: req.firmRole,
                    attributes: {
                        status: req.isDeparted ? 'departed' : 'active'
                    }
                },
                resource: {
                    namespace,
                    type: namespace,
                    id: options.getResourceId ? options.getResourceId(req) : req.params.id,
                    attributes: options.getResourceAttributes ? options.getResourceAttributes(req) : {}
                },
                action
            };

            const context = {
                ipAddress: req.ip || req.connection?.remoteAddress,
                userAgent: req.headers['user-agent'],
                requestPath: req.path,
                requestMethod: req.method
            };

            await enforce(firmId, request, context);
            next();
        } catch (error) {
            next(error);
        }
    };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // Core functions
    check,
    enforce,
    checkBatch,

    // Expand functions
    expand,
    reverseExpand,

    // Grant/Revoke
    grant,
    revoke,
    grantMany,

    // Middleware
    middleware,

    // Cache management
    clearCache,
    getCacheStats,
    invalidateCacheForResource
};
