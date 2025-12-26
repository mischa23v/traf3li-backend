/**
 * Global Firm Isolation Plugin
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
 * Check if a schema has a field that needs isolation
 */
const hasFirmField = (schema) => {
    return schema.path('firmId') !== undefined;
};

/**
 * Check if query has required isolation filter
 */
const hasIsolationFilter = (query) => {
    const filter = query.getQuery ? query.getQuery() : query;
    return !!(filter.firmId || filter.lawyerId || filter._id);
};

/**
 * Check if aggregation pipeline has required isolation filter
 */
const hasAggregationFilter = (pipeline) => {
    if (!pipeline || !pipeline.length) return false;
    const firstStage = pipeline[0];
    if (!firstStage || !firstStage.$match) return false;
    const match = firstStage.$match;
    return !!(match.firmId || match.lawyerId || match._id);
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
            'replaceOne'
        ];

        queryOperations.forEach(op => {
            schema.pre(op, function() {
                enforceFilter.call(this, op);
            });
        });

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
    hasAggregationFilter
};
