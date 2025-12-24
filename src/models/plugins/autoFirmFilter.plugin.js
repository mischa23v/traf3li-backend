/**
 * Auto Firm Filter Plugin - Automatic Multi-Tenancy Query Injection
 *
 * This Mongoose plugin automatically injects firmId or lawyerId into queries
 * based on the context provided via query options. It supports both firm-based
 * multi-tenancy and solo lawyer data isolation.
 *
 * Features:
 * - Automatic firmId/lawyerId injection based on query options
 * - Support for solo lawyers (uses lawyerId instead of firmId)
 * - Prevents data leakage between firms/lawyers
 * - Provides bypass methods for system-level operations
 * - Works in conjunction with firmFilter middleware
 *
 * Usage with middleware context:
 *   // In controller, pass context from req
 *   const clients = await Client.find({ status: 'active' })
 *       .setOptions({ firmId: req.firmId, lawyerId: req.userID, isSoloLawyer: req.isSoloLawyer });
 *
 *   // Or use the helper method
 *   const clients = await Client.findWithContext(
 *       { status: 'active' },
 *       { firmId: req.firmId, lawyerId: req.userID, isSoloLawyer: req.isSoloLawyer }
 *   );
 *
 * Bypass example:
 *   Model.findWithoutFirmFilter({ _id: id })
 *   Model.find({}).setOptions({ skipFirmFilter: true })
 *
 * @param {Schema} schema - Mongoose schema to apply plugin to
 * @param {Object} options - Plugin configuration options
 * @param {String} options.firmField - Name of the firm field (default: 'firmId')
 * @param {String} options.lawyerField - Name of the lawyer field for solo lawyers (default: 'lawyerId')
 * @param {Boolean} options.warnOnMissingContext - Log warning if no firm context provided (default: true)
 */
const logger = require('../../utils/logger');

module.exports = function autoFirmFilterPlugin(schema, options = {}) {
    const {
        firmField = 'firmId',
        lawyerField = 'lawyerId',
        warnOnMissingContext = true
    } = options;

    // Check if the schema has the required fields
    const hasFirmField = !!schema.paths[firmField];
    const hasLawyerField = !!schema.paths[lawyerField];

    if (!hasFirmField && !hasLawyerField) {
        // Schema doesn't have either field, skip plugin application
        return;
    }

    // ═══════════════════════════════════════════════════════════════
    // QUERY HOOKS - Auto-inject firmId/lawyerId
    // ═══════════════════════════════════════════════════════════════

    const queryOps = [
        'find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete',
        'findOneAndReplace', 'countDocuments', 'deleteOne', 'deleteMany',
        'updateOne', 'updateMany', 'replaceOne'
    ];

    queryOps.forEach(op => {
        schema.pre(op, function(next) {
            try {
                injectFirmFilter(this, firmField, lawyerField, hasFirmField, hasLawyerField, warnOnMissingContext);
                next();
            } catch (error) {
                next(error);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // AGGREGATE HOOK - Auto-inject firmId/lawyerId in first $match
    // ═══════════════════════════════════════════════════════════════

    schema.pre('aggregate', function(next) {
        const queryOptions = this.options;

        // Allow bypass for system operations
        if (queryOptions.skipFirmFilter || queryOptions.bypassFirmFilter) {
            return next();
        }

        const firmId = queryOptions.firmId;
        const lawyerId = queryOptions.lawyerId;
        const isSoloLawyer = queryOptions.isSoloLawyer;

        // If no context provided, check if pipeline already has firmId
        if (!firmId && !lawyerId) {
            const pipeline = this.pipeline();
            if (pipeline.length > 0 && pipeline[0].$match) {
                // Check if firmId or lawyerId is in the first $match
                if (pipeline[0].$match[firmField] || pipeline[0].$match[lawyerField]) {
                    return next();
                }
            }

            if (warnOnMissingContext) {
                logger.warn('Aggregate executed without firm context', {
                    model: this._model?.modelName || 'Unknown',
                    operation: 'aggregate'
                });
            }
            return next();
        }

        // Get the pipeline
        const pipeline = this.pipeline();

        // Determine the filter to inject
        let filterToInject = {};
        if (isSoloLawyer && hasLawyerField) {
            filterToInject[lawyerField] = lawyerId;
        } else if (firmId && hasFirmField) {
            filterToInject[firmField] = firmId;
        }

        // If no filter to inject, continue
        if (Object.keys(filterToInject).length === 0) {
            return next();
        }

        // If first stage is $match, merge with it
        if (pipeline.length > 0 && pipeline[0].$match) {
            // Only merge if the filter isn't already present
            if (!pipeline[0].$match[firmField] && !pipeline[0].$match[lawyerField]) {
                Object.assign(pipeline[0].$match, filterToInject);
            }
        } else {
            // Prepend a new $match stage
            pipeline.unshift({ $match: filterToInject });
        }

        next();
    });

    // ═══════════════════════════════════════════════════════════════
    // STATIC METHODS - Helper methods with context
    // ═══════════════════════════════════════════════════════════════

    /**
     * Find documents with firm/lawyer context automatically applied
     * @param {Object} conditions - Query conditions
     * @param {Object} context - Context object { firmId, lawyerId, isSoloLawyer }
     * @returns {Query} Mongoose query
     */
    schema.statics.findWithContext = function(conditions = {}, context = {}) {
        const { firmId, lawyerId, isSoloLawyer } = context;
        return this.find(conditions).setOptions({ firmId, lawyerId, isSoloLawyer });
    };

    /**
     * Find one document with firm/lawyer context automatically applied
     * @param {Object} conditions - Query conditions
     * @param {Object} context - Context object { firmId, lawyerId, isSoloLawyer }
     * @returns {Query} Mongoose query
     */
    schema.statics.findOneWithContext = function(conditions = {}, context = {}) {
        const { firmId, lawyerId, isSoloLawyer } = context;
        return this.findOne(conditions).setOptions({ firmId, lawyerId, isSoloLawyer });
    };

    /**
     * Count documents with firm/lawyer context automatically applied
     * @param {Object} conditions - Query conditions
     * @param {Object} context - Context object { firmId, lawyerId, isSoloLawyer }
     * @returns {Query} Mongoose query
     */
    schema.statics.countWithContext = function(conditions = {}, context = {}) {
        const { firmId, lawyerId, isSoloLawyer } = context;
        return this.countDocuments(conditions).setOptions({ firmId, lawyerId, isSoloLawyer });
    };

    /**
     * Update one document with firm/lawyer context automatically applied
     * @param {Object} conditions - Query conditions
     * @param {Object} update - Update operations
     * @param {Object} context - Context object { firmId, lawyerId, isSoloLawyer }
     * @returns {Query} Mongoose query
     */
    schema.statics.updateOneWithContext = function(conditions = {}, update = {}, context = {}) {
        const { firmId, lawyerId, isSoloLawyer } = context;
        return this.updateOne(conditions, update).setOptions({ firmId, lawyerId, isSoloLawyer });
    };

    /**
     * Update many documents with firm/lawyer context automatically applied
     * @param {Object} conditions - Query conditions
     * @param {Object} update - Update operations
     * @param {Object} context - Context object { firmId, lawyerId, isSoloLawyer }
     * @returns {Query} Mongoose query
     */
    schema.statics.updateManyWithContext = function(conditions = {}, update = {}, context = {}) {
        const { firmId, lawyerId, isSoloLawyer } = context;
        return this.updateMany(conditions, update).setOptions({ firmId, lawyerId, isSoloLawyer });
    };

    /**
     * Delete one document with firm/lawyer context automatically applied
     * @param {Object} conditions - Query conditions
     * @param {Object} context - Context object { firmId, lawyerId, isSoloLawyer }
     * @returns {Query} Mongoose query
     */
    schema.statics.deleteOneWithContext = function(conditions = {}, context = {}) {
        const { firmId, lawyerId, isSoloLawyer } = context;
        return this.deleteOne(conditions).setOptions({ firmId, lawyerId, isSoloLawyer });
    };

    /**
     * Find and update with firm/lawyer context automatically applied
     * @param {Object} conditions - Query conditions
     * @param {Object} update - Update operations
     * @param {Object} options - Query options
     * @param {Object} context - Context object { firmId, lawyerId, isSoloLawyer }
     * @returns {Query} Mongoose query
     */
    schema.statics.findOneAndUpdateWithContext = function(conditions = {}, update = {}, options = {}, context = {}) {
        const { firmId, lawyerId, isSoloLawyer } = context;
        return this.findOneAndUpdate(conditions, update, options)
            .setOptions({ firmId, lawyerId, isSoloLawyer });
    };

    /**
     * Find and delete with firm/lawyer context automatically applied
     * @param {Object} conditions - Query conditions
     * @param {Object} context - Context object { firmId, lawyerId, isSoloLawyer }
     * @returns {Query} Mongoose query
     */
    schema.statics.findOneAndDeleteWithContext = function(conditions = {}, context = {}) {
        const { firmId, lawyerId, isSoloLawyer } = context;
        return this.findOneAndDelete(conditions).setOptions({ firmId, lawyerId, isSoloLawyer });
    };

    /**
     * Aggregate with firm/lawyer context automatically applied
     * @param {Array} pipeline - Aggregation pipeline
     * @param {Object} context - Context object { firmId, lawyerId, isSoloLawyer }
     * @returns {Aggregate} Mongoose aggregate
     */
    schema.statics.aggregateWithContext = function(pipeline = [], context = {}) {
        const { firmId, lawyerId, isSoloLawyer } = context;
        return this.aggregate(pipeline).option('firmId', firmId).option('lawyerId', lawyerId).option('isSoloLawyer', isSoloLawyer);
    };

    // ═══════════════════════════════════════════════════════════════
    // BYPASS METHODS - For system-level operations
    // ═══════════════════════════════════════════════════════════════

    /**
     * Find documents without firm filter (for system operations)
     * @param {Object} conditions - Query conditions
     * @returns {Query} Mongoose query
     */
    if (!schema.statics.findWithoutFirmFilter) {
        schema.statics.findWithoutFirmFilter = function(conditions = {}) {
            return this.find(conditions).setOptions({ skipFirmFilter: true });
        };
    }

    /**
     * Find one document without firm filter (for system operations)
     * @param {Object} conditions - Query conditions
     * @returns {Query} Mongoose query
     */
    if (!schema.statics.findOneWithoutFirmFilter) {
        schema.statics.findOneWithoutFirmFilter = function(conditions = {}) {
            return this.findOne(conditions).setOptions({ skipFirmFilter: true });
        };
    }

    /**
     * Count documents without firm filter (for system operations)
     * @param {Object} conditions - Query conditions
     * @returns {Query} Mongoose query
     */
    if (!schema.statics.countWithoutFirmFilter) {
        schema.statics.countWithoutFirmFilter = function(conditions = {}) {
            return this.countDocuments(conditions).setOptions({ skipFirmFilter: true });
        };
    }

    /**
     * Aggregate without firm filter (for system operations)
     * @param {Array} pipeline - Aggregation pipeline
     * @returns {Aggregate} Mongoose aggregate
     */
    if (!schema.statics.aggregateWithoutFirmFilter) {
        schema.statics.aggregateWithoutFirmFilter = function(pipeline = []) {
            return this.aggregate(pipeline).option('skipFirmFilter', true);
        };
    }

    /**
     * Update one without firm filter (for system operations)
     * @param {Object} conditions - Query conditions
     * @param {Object} update - Update operations
     * @param {Object} options - Query options
     * @returns {Query} Mongoose query
     */
    if (!schema.statics.updateOneWithoutFirmFilter) {
        schema.statics.updateOneWithoutFirmFilter = function(conditions = {}, update = {}, options = {}) {
            return this.updateOne(conditions, update, { ...options, skipFirmFilter: true });
        };
    }

    /**
     * Update many without firm filter (for system operations)
     * @param {Object} conditions - Query conditions
     * @param {Object} update - Update operations
     * @param {Object} options - Query options
     * @returns {Query} Mongoose query
     */
    if (!schema.statics.updateManyWithoutFirmFilter) {
        schema.statics.updateManyWithoutFirmFilter = function(conditions = {}, update = {}, options = {}) {
            return this.updateMany(conditions, update, { ...options, skipFirmFilter: true });
        };
    }

    /**
     * Delete one without firm filter (for system operations)
     * @param {Object} conditions - Query conditions
     * @returns {Query} Mongoose query
     */
    if (!schema.statics.deleteOneWithoutFirmFilter) {
        schema.statics.deleteOneWithoutFirmFilter = function(conditions = {}) {
            return this.deleteOne(conditions).setOptions({ skipFirmFilter: true });
        };
    }

    /**
     * Delete many without firm filter (for system operations)
     * @param {Object} conditions - Query conditions
     * @returns {Query} Mongoose query
     */
    if (!schema.statics.deleteManyWithoutFirmFilter) {
        schema.statics.deleteManyWithoutFirmFilter = function(conditions = {}) {
            return this.deleteMany(conditions).setOptions({ skipFirmFilter: true });
        };
    }
};

/**
 * Core injection function that adds firmId/lawyerId to queries
 *
 * @param {Query} query - Mongoose query object
 * @param {String} firmField - Name of the firm field
 * @param {String} lawyerField - Name of the lawyer field
 * @param {Boolean} hasFirmField - Whether schema has firmId field
 * @param {Boolean} hasLawyerField - Whether schema has lawyerId field
 * @param {Boolean} warnOnMissingContext - Whether to log warning on missing context
 */
function injectFirmFilter(query, firmField, lawyerField, hasFirmField, hasLawyerField, warnOnMissingContext) {
    const filter = query.getFilter();
    const queryOptions = query.getOptions();

    // Allow bypass if explicitly set
    if (queryOptions.skipFirmFilter || queryOptions.bypassFirmFilter) {
        return;
    }

    // Check if filter already has firmId or lawyerId
    if (filter[firmField] || filter[lawyerField]) {
        return; // Already filtered
    }

    // Get context from options
    const firmId = queryOptions.firmId;
    const lawyerId = queryOptions.lawyerId;
    const isSoloLawyer = queryOptions.isSoloLawyer;

    // If no context provided, log warning (if enabled)
    if (!firmId && !lawyerId) {
        if (warnOnMissingContext) {
            logger.warn('Query executed without firm context', {
                model: query.model?.modelName || 'Unknown',
                operation: query.op,
                filter: JSON.stringify(filter)
            });
        }
        return; // Don't modify query if no context
    }

    // Inject appropriate filter based on user type
    if (isSoloLawyer && hasLawyerField && lawyerId) {
        // Solo lawyers filter by their own ID
        query.where({ [lawyerField]: lawyerId });
    } else if (firmId && hasFirmField) {
        // Firm users filter by firmId
        query.where({ [firmField]: firmId });
    } else if (lawyerId && hasLawyerField && !hasFirmField) {
        // Fallback: if only lawyerField exists, use it
        query.where({ [lawyerField]: lawyerId });
    }
}

/**
 * Helper to create context object from Express request
 *
 * Usage in controller:
 *   const context = createFirmContext(req);
 *   const clients = await Client.findWithContext({ status: 'active' }, context);
 *
 * @param {Object} req - Express request object with firmFilter middleware applied
 * @returns {Object} Context object for use with *WithContext methods
 */
module.exports.createFirmContext = function(req) {
    return {
        firmId: req.firmId || null,
        lawyerId: req.userID || null,
        isSoloLawyer: req.isSoloLawyer || false
    };
};

/**
 * Helper to get firm query filter from Express request
 * This returns the appropriate filter object based on user type
 *
 * Usage in controller:
 *   const filter = getFirmQuery(req);
 *   const clients = await Client.find({ ...filter, status: 'active' });
 *
 * @param {Object} req - Express request object with firmFilter middleware applied
 * @returns {Object} Query filter object
 */
module.exports.getFirmQuery = function(req) {
    if (req.isSoloLawyer) {
        return { lawyerId: req.userID };
    }
    if (req.firmId) {
        return { firmId: req.firmId };
    }
    // Fallback for backwards compatibility
    return req.firmQuery || {};
};
