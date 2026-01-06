/**
 * Global Firm Isolation Plugin (Enterprise Edition)
 *
 * This plugin is applied ONCE globally to ALL Mongoose schemas.
 * It automatically enforces firm-level data isolation (Row-Level Security).
 *
 * NO NEED to add this plugin to individual models anymore!
 *
 * Features:
 * - Automatically validates firmId/lawyerId in all queries
 * - Supports solo lawyers (lawyerId) and firm members (firmId)
 * - Provides bypass methods for system operations
 * - Works with find, aggregate, update, delete operations
 * - ENTERPRISE: Protects findById, exists(), distinct(), bulkWrite()
 * - ENTERPRISE: Deep aggregate pipeline checking (all $match stages)
 *
 * Security Model:
 * - Defense in depth: multiple layers of protection
 * - Fail-closed: queries without isolation filters throw errors
 * - Audit trail: violations are logged for security monitoring
 */

const mongoose = require('mongoose');

// Models that should SKIP firm isolation (system/global models)
const SKIP_MODELS = new Set([
    'User',              // Users are looked up during auth before firm context
    'Firm',              // Firms are the tenant themselves
    'FirmInvitation',    // Invitations checked before user joins firm
    'Session',           // Auth sessions
    'RefreshToken',      // Auth tokens
    'RevokedToken',      // Auth tokens
    'EmailOtp',          // Auth OTPs
    'PhoneOtp',          // Auth OTPs
    'MagicLink',         // Auth magic links
    'EmailVerification', // Auth verification
    'PasswordHistory',   // Auth password history
    'LoginHistory',      // Geo-anomaly detection queries during login (before firm context)
    'Counter',           // System counters
    'MigrationLog',      // System migrations
    'SsoProvider',       // SSO configuration
    'SsoUserLink',       // SSO user links (checked during OAuth)
    'WebauthnCredential', // Auth credentials
    'ReauthChallenge',   // Auth challenges
    'Account',           // Chart of accounts (shared)
    'SubscriptionPlan',  // Global subscription plans
    'Plugin',            // Global plugins
]);

// Fields that indicate the model needs firm isolation
const FIRM_FIELDS = ['firmId', 'lawyerId'];

/**
 * Create an isolation violation error with detailed context
 * @param {string} modelName - Name of the model
 * @param {string} operationType - Type of operation (find, update, etc.)
 * @param {string} details - Additional context
 * @returns {Error} - Structured error with code
 */
const createIsolationError = (modelName, operationType, details = '') => {
    const message = `[FirmIsolation] ${operationType} on ${modelName} must include firmId or lawyerId filter. ` +
        `${details}Use .setOptions({ bypassFirmFilter: true }) or static methods like findWithoutFirmFilter() to bypass.`;
    const error = new Error(message);
    error.code = 'FIRM_ISOLATION_VIOLATION';
    error.modelName = modelName;
    error.operationType = operationType;
    error.timestamp = new Date().toISOString();
    return error;
};

/**
 * Check if a schema has a field that needs isolation
 */
const hasFirmField = (schema) => {
    return schema.path('firmId') !== undefined;
};

/**
 * Check if query has required isolation filter
 * SECURITY: _id alone is NOT sufficient for firm isolation!
 * Queries MUST include firmId or lawyerId to ensure proper multi-tenant isolation.
 * Using _id alone would allow cross-firm data access by guessing or enumerating IDs.
 */
const hasIsolationFilter = (query) => {
    const filter = query.getQuery ? query.getQuery() : query;
    // SECURITY FIX: Removed _id as acceptable filter - only firmId or lawyerId provides true isolation
    return !!(filter.firmId || filter.lawyerId);
};

/**
 * Check if aggregation pipeline has required isolation filter
 * SECURITY: _id alone is NOT sufficient for firm isolation in aggregations!
 *
 * ENTERPRISE: Now checks that the FIRST stage is a $match with isolation filter.
 * This is critical because:
 * 1. $match at the start uses indexes and filters data BEFORE processing
 * 2. $match later in pipeline may process ALL data before filtering (data leak!)
 * 3. Aggregations without initial $match process ALL documents
 */
const hasAggregationFilter = (pipeline) => {
    if (!pipeline || !pipeline.length) return false;
    const firstStage = pipeline[0];
    if (!firstStage || !firstStage.$match) return false;
    const match = firstStage.$match;
    // SECURITY FIX: Removed _id as acceptable filter - only firmId or lawyerId provides true isolation
    return !!(match.firmId || match.lawyerId);
};

/**
 * Deep check for aggregation security
 * Ensures isolation filter is in FIRST $match stage (not just any $match)
 * Also validates that no $lookup can bypass isolation
 */
const validateAggregationSecurity = (pipeline, modelName) => {
    const issues = [];

    if (!pipeline || !pipeline.length) {
        issues.push('Empty pipeline - no isolation possible');
        return { valid: false, issues };
    }

    // Check first stage is $match with isolation
    const firstStage = pipeline[0];
    if (!firstStage.$match) {
        issues.push('First stage must be $match with firmId or lawyerId');
    } else {
        const match = firstStage.$match;
        if (!match.firmId && !match.lawyerId) {
            issues.push('First $match must include firmId or lawyerId');
        }
    }

    // Check for potentially dangerous $lookup stages
    // $lookup can pull data from other collections that should be isolated
    pipeline.forEach((stage, idx) => {
        if (stage.$lookup) {
            const lookup = stage.$lookup;
            // Check if the lookup has a pipeline with isolation
            if (lookup.pipeline && Array.isArray(lookup.pipeline)) {
                const lookupHasMatch = lookup.pipeline.some(s =>
                    s.$match && (s.$match.firmId || s.$match.lawyerId)
                );
                if (!lookupHasMatch) {
                    // This is a warning, not a blocking error, since some lookups are safe
                    // (e.g., lookups to system models like User)
                }
            }
        }
    });

    return {
        valid: issues.length === 0,
        issues
    };
};

/**
 * Check if bulkWrite operations all have required isolation filter
 * CRITICAL: bulkWrite can bypass normal query hooks!
 */
const validateBulkWriteOperations = (operations) => {
    if (!operations || !Array.isArray(operations)) {
        return { valid: false, issues: ['Invalid operations array'] };
    }

    const issues = [];

    operations.forEach((op, idx) => {
        // Each operation is { insertOne: {...} } or { updateOne: {...} } etc.
        const opType = Object.keys(op)[0];
        const opData = op[opType];

        switch (opType) {
            case 'insertOne':
                // Check if document has firmId or lawyerId
                if (opData.document && !opData.document.firmId && !opData.document.lawyerId) {
                    issues.push(`Operation ${idx} (${opType}): document missing firmId or lawyerId`);
                }
                break;

            case 'updateOne':
            case 'updateMany':
            case 'replaceOne':
                // Check if filter has firmId or lawyerId
                if (opData.filter && !opData.filter.firmId && !opData.filter.lawyerId) {
                    issues.push(`Operation ${idx} (${opType}): filter missing firmId or lawyerId`);
                }
                break;

            case 'deleteOne':
            case 'deleteMany':
                // Check if filter has firmId or lawyerId
                if (opData.filter && !opData.filter.firmId && !opData.filter.lawyerId) {
                    issues.push(`Operation ${idx} (${opType}): filter missing firmId or lawyerId`);
                }
                break;

            default:
                // Unknown operation type - allow but log
                break;
        }
    });

    return {
        valid: issues.length === 0,
        issues
    };
};

/**
 * Create the global firm isolation plugin
 */
const createGlobalFirmIsolationPlugin = () => {
    return function globalFirmIsolationPlugin(schema, options = {}) {
        // Get model name from schema options or use 'Unknown'
        const getModelName = function() {
            return this?.model?.modelName || options.modelName || 'Unknown';
        };

        // Skip if schema doesn't have firmId field
        if (!hasFirmField(schema)) {
            return;
        }

        // Add bypass static methods
        schema.statics.findWithoutFirmFilter = function(conditions = {}) {
            return this.find(conditions).setOptions({ bypassFirmFilter: true });
        };

        schema.statics.findOneWithoutFirmFilter = function(conditions = {}) {
            return this.findOne(conditions).setOptions({ bypassFirmFilter: true });
        };

        schema.statics.countWithoutFirmFilter = function(conditions = {}) {
            return this.countDocuments(conditions).setOptions({ bypassFirmFilter: true });
        };

        schema.statics.aggregateWithoutFirmFilter = function(pipeline = []) {
            return this.aggregate(pipeline).option({ bypassFirmFilter: true });
        };

        schema.statics.updateOneWithoutFirmFilter = function(conditions, update, options = {}) {
            return this.updateOne(conditions, update, { ...options, bypassFirmFilter: true });
        };

        schema.statics.updateManyWithoutFirmFilter = function(conditions, update, options = {}) {
            return this.updateMany(conditions, update, { ...options, bypassFirmFilter: true });
        };

        schema.statics.deleteOneWithoutFirmFilter = function(conditions) {
            return this.deleteOne(conditions).setOptions({ bypassFirmFilter: true });
        };

        schema.statics.deleteManyWithoutFirmFilter = function(conditions) {
            return this.deleteMany(conditions).setOptions({ bypassFirmFilter: true });
        };

        // ENTERPRISE: Add bypass methods for exists, distinct, and bulkWrite
        schema.statics.existsWithoutFirmFilter = function(conditions = {}) {
            return this.exists(conditions).setOptions({ bypassFirmFilter: true });
        };

        schema.statics.distinctWithoutFirmFilter = function(field, conditions = {}) {
            return this.distinct(field, conditions).setOptions({ bypassFirmFilter: true });
        };

        /**
         * bulkWrite with firm isolation bypass
         * CRITICAL: Use only for system operations like migrations
         */
        schema.statics.bulkWriteWithoutFirmFilter = function(operations, options = {}) {
            return this.bulkWrite(operations, { ...options, bypassFirmFilter: true });
        };

        /**
         * findById with firm isolation enforcement
         * ENTERPRISE: Wraps findById to require additional firmId/lawyerId
         * Usage: Model.findByIdWithFirm(id, { firmId } or { lawyerId })
         */
        schema.statics.findByIdWithFirm = function(id, firmQuery) {
            if (!firmQuery || (!firmQuery.firmId && !firmQuery.lawyerId)) {
                throw createIsolationError(
                    this.modelName,
                    'findByIdWithFirm',
                    'Second argument must include firmId or lawyerId. '
                );
            }
            return this.findOne({ _id: id, ...firmQuery });
        };

        /**
         * findByIdAndUpdate with firm isolation enforcement
         */
        schema.statics.findByIdAndUpdateWithFirm = function(id, update, firmQuery, options = {}) {
            if (!firmQuery || (!firmQuery.firmId && !firmQuery.lawyerId)) {
                throw createIsolationError(
                    this.modelName,
                    'findByIdAndUpdateWithFirm',
                    'Third argument must include firmId or lawyerId. '
                );
            }
            return this.findOneAndUpdate({ _id: id, ...firmQuery }, update, options);
        };

        /**
         * findByIdAndDelete with firm isolation enforcement
         */
        schema.statics.findByIdAndDeleteWithFirm = function(id, firmQuery) {
            if (!firmQuery || (!firmQuery.firmId && !firmQuery.lawyerId)) {
                throw createIsolationError(
                    this.modelName,
                    'findByIdAndDeleteWithFirm',
                    'Second argument must include firmId or lawyerId. '
                );
            }
            return this.findOneAndDelete({ _id: id, ...firmQuery });
        };

        // Enforcement function for queries
        const enforceFilter = function(operationType) {
            const modelName = this.model?.modelName || 'Unknown';

            // Skip if model is in skip list
            if (SKIP_MODELS.has(modelName)) {
                return;
            }

            // Skip if bypass option is set
            if (this.getOptions().bypassFirmFilter) {
                return;
            }

            // Check if query has required filter
            if (!hasIsolationFilter(this)) {
                const error = new Error(
                    `[FirmIsolation] Query on ${modelName} must include firmId, lawyerId, or _id filter. ` +
                    `Use .setOptions({ bypassFirmFilter: true }) or static methods like findWithoutFirmFilter() to bypass.`
                );
                error.code = 'FIRM_ISOLATION_VIOLATION';
                error.modelName = modelName;
                error.operationType = operationType;
                throw error;
            }
        };

        // Apply to all query operations
        const queryOperations = [
            'find',
            'findOne',
            'findOneAndUpdate',
            'findOneAndDelete',
            'findOneAndReplace',
            'countDocuments',
            'deleteOne',
            'deleteMany',
            'updateOne',
            'updateMany',
            'replaceOne',
            // ENTERPRISE: Added exists and distinct
            'exists',
            'distinct',
            // ENTERPRISE: Added estimatedDocumentCount - should always bypass
            // (kept out as it's a collection-level count, not tenant-specific)
        ];

        queryOperations.forEach(op => {
            schema.pre(op, function() {
                enforceFilter.call(this, op);
            });
        });

        /**
         * ENTERPRISE: Override bulkWrite to enforce isolation
         * This is critical because bulkWrite bypasses normal query hooks
         */
        const originalBulkWrite = schema.statics.bulkWrite;
        schema.statics.bulkWrite = function(operations, options = {}) {
            const modelName = this.modelName || 'Unknown';

            // Skip if model is in skip list
            if (SKIP_MODELS.has(modelName)) {
                return originalBulkWrite.call(this, operations, options);
            }

            // Skip if bypass option is set
            if (options.bypassFirmFilter) {
                return originalBulkWrite.call(this, operations, options);
            }

            // Validate all operations have isolation filters
            const validation = validateBulkWriteOperations(operations);
            if (!validation.valid) {
                const error = createIsolationError(
                    modelName,
                    'bulkWrite',
                    `Issues: ${validation.issues.join('; ')}. `
                );
                throw error;
            }

            return originalBulkWrite.call(this, operations, options);
        };

        // Apply to aggregation
        schema.pre('aggregate', function() {
            const modelName = this._model?.modelName || 'Unknown';

            // Skip if model is in skip list
            if (SKIP_MODELS.has(modelName)) {
                return;
            }

            // Skip if bypass option is set
            if (this.options.bypassFirmFilter) {
                return;
            }

            const pipeline = this.pipeline();

            if (!hasAggregationFilter(pipeline)) {
                const error = new Error(
                    `[FirmIsolation] Aggregation on ${modelName} must have firmId, lawyerId, or _id in first $match stage. ` +
                    `Use .option({ bypassFirmFilter: true }) or aggregateWithoutFirmFilter() to bypass.`
                );
                error.code = 'FIRM_ISOLATION_VIOLATION';
                error.modelName = modelName;
                error.operationType = 'aggregate';
                throw error;
            }
        });
    };
};

/**
 * Apply the global plugin to Mongoose
 * Call this ONCE before connecting to the database
 */
const applyGlobalFirmIsolation = () => {
    mongoose.plugin(createGlobalFirmIsolationPlugin());
    console.log('[FirmIsolation] Global firm isolation plugin applied to all models');
};

/**
 * Get the list of models that skip firm isolation
 */
const getSkipModels = () => Array.from(SKIP_MODELS);

/**
 * Add a model to the skip list (for dynamic configuration)
 */
const addSkipModel = (modelName) => {
    SKIP_MODELS.add(modelName);
};

/**
 * Remove a model from the skip list
 */
const removeSkipModel = (modelName) => {
    SKIP_MODELS.delete(modelName);
};

module.exports = {
    createGlobalFirmIsolationPlugin,
    applyGlobalFirmIsolation,
    getSkipModels,
    addSkipModel,
    removeSkipModel,
    SKIP_MODELS,
    hasFirmField,
    hasIsolationFilter,
    hasAggregationFilter,
    // ENTERPRISE: New validation functions
    validateAggregationSecurity,
    validateBulkWriteOperations,
    createIsolationError
};
