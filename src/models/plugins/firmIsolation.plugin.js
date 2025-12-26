/**
 * Firm Isolation Plugin - Row-Level Security (RLS) for Multi-Tenancy
 *
 * This Mongoose plugin enforces firm-level data isolation similar to
 * PostgreSQL's Row-Level Security (RLS). It automatically adds firmId
 * filtering to all queries unless explicitly bypassed.
 *
 * Features:
 * - Automatic firmId filter injection on all find operations
 * - Prevents queries without firmId unless explicitly bypassed
 * - Validates firmId presence on document creation
 * - Provides bypass methods for system-level operations
 * - Enforces firmId in aggregation pipelines
 *
 * Usage:
 *   const firmIsolationPlugin = require('./plugins/firmIsolation.plugin');
 *   mySchema.plugin(firmIsolationPlugin);
 *
 * Bypass example:
 *   Model.findWithoutFirmFilter({ _id: id })
 *   Model.find({}).setOptions({ bypassFirmFilter: true })
 *
 * @param {Schema} schema - Mongoose schema to apply plugin to
 * @param {Object} options - Plugin configuration options
 * @param {String} options.fieldName - Name of the firm field (default: 'firmId')
 * @param {String} options.bypassOption - Option name for bypassing (default: 'bypassFirmFilter')
 * @param {Boolean} options.required - Whether firmId is required for new documents (default: false)
 */
module.exports = function firmIsolationPlugin(schema, options = {}) {
  const {
    fieldName = 'firmId',
    bypassOption = 'bypassFirmFilter',
    required = false  // Set to false for backwards compatibility
  } = options;

  // Check if the schema has the firmId field
  if (!schema.paths[fieldName]) {
    throw new Error(`Schema does not have a '${fieldName}' field. Cannot apply firmIsolation plugin.`);
  }

  // ═══════════════════════════════════════════════════════════════
  // PRE-FIND HOOKS - Enforce firmId filter on all queries
  // ═══════════════════════════════════════════════════════════════

  /**
   * Enforce firmId filter on find() queries
   */
  schema.pre('find', function(next) {
    enforceFirmFilter(this, fieldName, bypassOption);
    next();
  });

  /**
   * Enforce firmId filter on findOne() queries
   */
  schema.pre('findOne', function(next) {
    enforceFirmFilter(this, fieldName, bypassOption);
    next();
  });

  /**
   * Enforce firmId filter on findOneAndUpdate() queries
   */
  schema.pre('findOneAndUpdate', function(next) {
    enforceFirmFilter(this, fieldName, bypassOption);
    next();
  });

  /**
   * Enforce firmId filter on findOneAndDelete() queries
   */
  schema.pre('findOneAndDelete', function(next) {
    enforceFirmFilter(this, fieldName, bypassOption);
    next();
  });

  /**
   * Enforce firmId filter on findOneAndReplace() queries
   */
  schema.pre('findOneAndReplace', function(next) {
    enforceFirmFilter(this, fieldName, bypassOption);
    next();
  });

  /**
   * Enforce firmId filter on countDocuments() queries
   */
  schema.pre('countDocuments', function(next) {
    enforceFirmFilter(this, fieldName, bypassOption);
    next();
  });

  /**
   * Enforce firmId filter on deleteOne() queries
   */
  schema.pre('deleteOne', function(next) {
    enforceFirmFilter(this, fieldName, bypassOption);
    next();
  });

  /**
   * Enforce firmId filter on deleteMany() queries
   */
  schema.pre('deleteMany', function(next) {
    enforceFirmFilter(this, fieldName, bypassOption);
    next();
  });

  /**
   * Enforce firmId filter on updateOne() queries
   */
  schema.pre('updateOne', function(next) {
    enforceFirmFilter(this, fieldName, bypassOption);
    next();
  });

  /**
   * Enforce firmId filter on updateMany() queries
   */
  schema.pre('updateMany', function(next) {
    enforceFirmFilter(this, fieldName, bypassOption);
    next();
  });

  /**
   * Enforce firmId filter on replaceOne() queries
   */
  schema.pre('replaceOne', function(next) {
    enforceFirmFilter(this, fieldName, bypassOption);
    next();
  });

  /**
   * Enforce firmId in aggregate pipelines
   * Checks if the first $match stage includes firmId or lawyerId (for solo users)
   */
  schema.pre('aggregate', function(next) {
    const options = this.options;

    // Allow bypass for system operations
    if (options[bypassOption]) {
      return next();
    }

    const pipeline = this.pipeline();

    // If pipeline is empty or first stage is not $match, require bypass
    if (pipeline.length === 0 || !pipeline[0].$match) {
      return next(new Error(
        `Aggregate pipeline must include ${fieldName} or lawyerId in first $match stage or use setOptions({ ${bypassOption}: true }) to bypass.`
      ));
    }

    // Check if firmId or lawyerId is in the first $match stage
    const firstMatch = pipeline[0].$match;
    const hasFirmId = firstMatch[fieldName] || firstMatch[fieldName] === null;
    const hasLawyerId = firstMatch.lawyerId;

    if (!hasFirmId && !hasLawyerId) {
      return next(new Error(
        `Aggregate pipeline must include ${fieldName} or lawyerId in first $match stage or use setOptions({ ${bypassOption}: true }) to bypass.`
      ));
    }

    next();
  });

  // ═══════════════════════════════════════════════════════════════
  // PRE-SAVE HOOK - Validate firmId on new documents
  // ═══════════════════════════════════════════════════════════════

  /**
   * Ensure firmId is set on new documents (if required option is true)
   * For backwards compatibility, this is optional by default
   */
  schema.pre('save', function(next) {
    // Only enforce on new documents if required is true
    if (this.isNew && required && !this[fieldName] && schema.paths[fieldName]) {
      return next(new Error(`${fieldName} is required for new documents`));
    }
    next();
  });

  // ═══════════════════════════════════════════════════════════════
  // STATIC METHODS - Bypass methods for system-level operations
  // ═══════════════════════════════════════════════════════════════

  /**
   * Find documents without firmId filter
   * Use for system-level operations that need to access all data
   *
   * @param {Object} conditions - Query conditions
   * @returns {Query} Mongoose query
   */
  schema.statics.findWithoutFirmFilter = function(conditions = {}) {
    return this.find(conditions).setOptions({ [bypassOption]: true });
  };

  /**
   * Find one document without firmId filter
   * Use for system-level operations that need to access all data
   *
   * @param {Object} conditions - Query conditions
   * @returns {Query} Mongoose query
   */
  schema.statics.findOneWithoutFirmFilter = function(conditions = {}) {
    return this.findOne(conditions).setOptions({ [bypassOption]: true });
  };

  /**
   * Count documents without firmId filter
   * Use for system-level operations that need to access all data
   *
   * @param {Object} conditions - Query conditions
   * @returns {Query} Mongoose query
   */
  schema.statics.countWithoutFirmFilter = function(conditions = {}) {
    return this.countDocuments(conditions).setOptions({ [bypassOption]: true });
  };

  /**
   * Aggregate without firmId filter
   * Use for system-level operations that need to access all data
   *
   * @param {Array} pipeline - Aggregation pipeline
   * @returns {Aggregate} Mongoose aggregate
   */
  schema.statics.aggregateWithoutFirmFilter = function(pipeline = []) {
    return this.aggregate(pipeline).option(bypassOption, true);
  };

  /**
   * Update one document without firmId filter
   * Use for system-level operations that need to access all data
   *
   * @param {Object} conditions - Query conditions
   * @param {Object} update - Update operations
   * @param {Object} options - Query options
   * @returns {Query} Mongoose query
   */
  schema.statics.updateOneWithoutFirmFilter = function(conditions = {}, update = {}, options = {}) {
    return this.updateOne(conditions, update, { ...options, [bypassOption]: true });
  };

  /**
   * Update many documents without firmId filter
   * Use for system-level operations that need to access all data
   *
   * @param {Object} conditions - Query conditions
   * @param {Object} update - Update operations
   * @param {Object} options - Query options
   * @returns {Query} Mongoose query
   */
  schema.statics.updateManyWithoutFirmFilter = function(conditions = {}, update = {}, options = {}) {
    return this.updateMany(conditions, update, { ...options, [bypassOption]: true });
  };

  /**
   * Delete one document without firmId filter
   * Use for system-level operations that need to access all data
   *
   * @param {Object} conditions - Query conditions
   * @returns {Query} Mongoose query
   */
  schema.statics.deleteOneWithoutFirmFilter = function(conditions = {}) {
    return this.deleteOne(conditions).setOptions({ [bypassOption]: true });
  };

  /**
   * Delete many documents without firmId filter
   * Use for system-level operations that need to access all data
   *
   * @param {Object} conditions - Query conditions
   * @returns {Query} Mongoose query
   */
  schema.statics.deleteManyWithoutFirmFilter = function(conditions = {}) {
    return this.deleteMany(conditions).setOptions({ [bypassOption]: true });
  };
};

/**
 * Core enforcement function that checks and validates firmId in queries
 * Allows lawyerId as an alternative for solo users who don't have a firmId
 *
 * @param {Query} query - Mongoose query object
 * @param {String} fieldName - Name of the firm field
 * @param {String} bypassOption - Option name for bypassing
 */
function enforceFirmFilter(query, fieldName, bypassOption) {
  const filter = query.getFilter();
  const options = query.getOptions();

  // Allow bypass if explicitly set
  if (options[bypassOption]) {
    return;
  }

  // Check if firmId or lawyerId is in the filter
  // Solo users use lawyerId instead of firmId for data isolation
  const hasFirmId = filter[fieldName] || filter[fieldName] === null;
  const hasLawyerId = filter.lawyerId;

  if (!hasFirmId && !hasLawyerId) {
    throw new Error(
      `Query must include ${fieldName} or lawyerId filter. Use .setOptions({ ${bypassOption}: true }) to bypass for system operations.`
    );
  }
}
