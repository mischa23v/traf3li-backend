/**
 * Field History Plugin - Mongoose Middleware for Automatic Field Change Tracking
 *
 * This plugin automatically tracks field-level changes on document save operations.
 * It can be applied to any Mongoose schema to enable granular change tracking.
 *
 * Usage:
 * ```javascript
 * const fieldHistoryPlugin = require('./plugins/fieldHistoryPlugin');
 *
 * // Apply to schema with default settings
 * invoiceSchema.plugin(fieldHistoryPlugin);
 *
 * // Or with custom options
 * invoiceSchema.plugin(fieldHistoryPlugin, {
 *   trackFields: ['status', 'total', 'dueDate'],
 *   excludeFields: ['internalNotes'],
 *   trackOnCreate: true,
 *   trackOnUpdate: true,
 *   trackOnDelete: false
 * });
 * ```
 */

const fieldHistoryService = require('../services/fieldHistory.service');
const logger = require('../utils/logger');

/**
 * Field History Plugin
 * @param {Object} schema - Mongoose schema
 * @param {Object} options - Plugin options
 */
function fieldHistoryPlugin(schema, options = {}) {
  const defaultOptions = {
    // Fields to track (if empty, tracks all non-excluded fields)
    trackFields: [],

    // Fields to explicitly exclude from tracking
    excludeFields: [
      '_id',
      '__v',
      'password',
      'passwordHash',
      'salt',
      'token',
      'refreshToken',
      'accessToken',
      'apiKey',
      'secret',
      'privateKey',
      'createdAt',
      'updatedAt',
    ],

    // Enable/disable tracking for different operations
    trackOnCreate: true,
    trackOnUpdate: true,
    trackOnDelete: false,

    // Entity type (if not provided, uses model name)
    entityType: null,

    // Function to extract user context from document
    // Should return { userId, firmId, metadata }
    getUserContext: null,

    // Custom field filter function
    shouldTrackField: null,
  };

  const config = { ...defaultOptions, ...options };

  // ═══════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Check if a field should be tracked
   */
  function shouldTrackField(fieldName) {
    // Use custom filter if provided
    if (config.shouldTrackField && typeof config.shouldTrackField === 'function') {
      return config.shouldTrackField(fieldName);
    }

    // Check excluded fields
    if (config.excludeFields.includes(fieldName)) {
      return false;
    }

    // If trackFields is specified, only track those fields
    if (config.trackFields.length > 0) {
      return config.trackFields.includes(fieldName);
    }

    // Track all non-excluded fields
    return true;
  }

  /**
   * Get fields that have been modified
   */
  function getModifiedFields(doc) {
    const modifiedPaths = doc.modifiedPaths();
    return modifiedPaths.filter((path) => shouldTrackField(path));
  }

  /**
   * Extract user context from document or options
   */
  function getUserContextFromDoc(doc) {
    // Use custom context extractor if provided
    if (config.getUserContext && typeof config.getUserContext === 'function') {
      return config.getUserContext(doc);
    }

    // Try to extract from document's __fieldHistory property (set by pre-save hook)
    if (doc.__fieldHistory) {
      return {
        userId: doc.__fieldHistory.userId,
        firmId: doc.__fieldHistory.firmId,
        metadata: doc.__fieldHistory.metadata || {},
      };
    }

    // Fallback: try common field names
    return {
      userId: doc._userId || doc.userId || doc.updatedBy || doc.createdBy || null,
      firmId: doc.firmId || null,
      metadata: {},
    };
  }

  /**
   * Get entity type
   */
  function getEntityType(doc) {
    if (config.entityType) {
      return config.entityType;
    }
    return doc.constructor.modelName || 'Unknown';
  }

  // ═══════════════════════════════════════════════════════════════
  // MIDDLEWARE HOOKS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Pre-save hook: Store original values before save
   */
  schema.pre('save', function (next) {
    // Only proceed if tracking is enabled
    if (!config.trackOnCreate && !config.trackOnUpdate) {
      return next();
    }

    // Store the original document state
    if (this.isNew) {
      // New document - no original values
      this.__originalDoc = null;
    } else {
      // Existing document - store original values for modified fields
      const modifiedFields = getModifiedFields(this);
      const originalValues = {};

      modifiedFields.forEach((field) => {
        // Get the original value from the database
        const path = this.$__.activePaths.states.modify[field];
        if (path) {
          originalValues[field] = this.get(field, null, { getters: false });
        }
      });

      this.__originalDoc = originalValues;
    }

    next();
  });

  /**
   * Post-save hook: Track field changes
   */
  schema.post('save', async function (doc) {
    try {
      // Skip if no tracking enabled
      if (!config.trackOnCreate && !config.trackOnUpdate) {
        return;
      }

      // Skip if this is a new document and trackOnCreate is false
      if (doc.__originalDoc === null && !config.trackOnCreate) {
        return;
      }

      // Skip if this is an update and trackOnUpdate is false
      if (doc.__originalDoc !== null && !config.trackOnUpdate) {
        return;
      }

      // Get user context
      const context = getUserContextFromDoc(doc);

      if (!context.userId) {
        logger.warn('Field history tracking skipped: No userId found in context');
        return;
      }

      const entityType = getEntityType(doc);
      const entityId = doc._id;

      // New document (create)
      if (doc.__originalDoc === null) {
        const newDoc = doc.toObject();
        await fieldHistoryService.trackChanges(
          entityType,
          entityId,
          null,
          newDoc,
          context.userId,
          context.firmId,
          context.metadata
        );
      }
      // Existing document (update)
      else {
        const modifiedFields = getModifiedFields(doc);

        if (modifiedFields.length > 0) {
          // Build old and new document snapshots with only modified fields
          const oldDoc = { ...doc.__originalDoc };
          const newDoc = {};

          modifiedFields.forEach((field) => {
            newDoc[field] = doc.get(field);
          });

          await fieldHistoryService.trackChanges(
            entityType,
            entityId,
            oldDoc,
            newDoc,
            context.userId,
            context.firmId,
            context.metadata
          );
        }
      }

      // Clean up temporary properties
      delete doc.__originalDoc;
      delete doc.__fieldHistory;
    } catch (error) {
      logger.error('Field history tracking failed in post-save hook:', error.message);
      // Don't throw - we don't want to break the save operation
    }
  });

  /**
   * Pre-remove hook: Track deletion (if enabled)
   */
  if (config.trackOnDelete) {
    schema.pre('remove', function (next) {
      // Store the document state before deletion
      this.__deletedDoc = this.toObject();
      next();
    });

    schema.post('remove', async function (doc) {
      try {
        const context = getUserContextFromDoc(doc);

        if (!context.userId) {
          logger.warn('Field history tracking skipped: No userId found in context');
          return;
        }

        const entityType = getEntityType(doc);
        const entityId = doc._id;

        // Track deletion
        await fieldHistoryService.trackChanges(
          entityType,
          entityId,
          doc.__deletedDoc,
          null,
          context.userId,
          context.firmId,
          context.metadata
        );

        // Clean up
        delete doc.__deletedDoc;
      } catch (error) {
        logger.error('Field history tracking failed in post-remove hook:', error.message);
      }
    });
  }

  /**
   * findOneAndUpdate and updateOne hooks
   * Note: These require special handling as they don't have access to the document instance
   */
  schema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) {
    // Store query options for post-hook
    this.__fieldHistoryOptions = {
      update: this.getUpdate(),
      filter: this.getFilter(),
    };
    next();
  });

  schema.post(['findOneAndUpdate', 'updateOne'], async function (doc) {
    try {
      if (!config.trackOnUpdate) {
        return;
      }

      // findOneAndUpdate returns the document, updateOne doesn't
      if (!doc) {
        return;
      }

      const context = getUserContextFromDoc(doc);

      if (!context.userId) {
        logger.warn('Field history tracking skipped: No userId found in context');
        return;
      }

      const entityType = getEntityType(doc);
      const entityId = doc._id;

      // Get the update object
      const update = this.__fieldHistoryOptions.update;
      const updateFields = {};

      // Extract fields from update operators
      ['$set', '$inc', '$push', '$pull', '$addToSet'].forEach((op) => {
        if (update[op]) {
          Object.assign(updateFields, update[op]);
        }
      });

      // If no operator, the whole update object is the update
      if (Object.keys(updateFields).length === 0) {
        Object.assign(updateFields, update);
      }

      // Track only the fields that should be tracked
      const fieldsToTrack = Object.keys(updateFields).filter(shouldTrackField);

      if (fieldsToTrack.length > 0) {
        const oldDoc = {};
        const newDoc = {};

        fieldsToTrack.forEach((field) => {
          newDoc[field] = doc.get(field);
          // We don't have access to old values in findOneAndUpdate
          // unless returnOriginal/returnDocument is set
        });

        await fieldHistoryService.trackChanges(
          entityType,
          entityId,
          oldDoc,
          newDoc,
          context.userId,
          context.firmId,
          context.metadata
        );
      }
    } catch (error) {
      logger.error('Field history tracking failed in findOneAndUpdate hook:', error.message);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // INSTANCE METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Set field history context (call this before save)
   * @param {String} userId - User making the change
   * @param {String} firmId - Firm ID (optional)
   * @param {Object} metadata - Request metadata
   */
  schema.methods.setFieldHistoryContext = function (userId, firmId = null, metadata = {}) {
    this.__fieldHistory = {
      userId,
      firmId,
      metadata,
    };
  };

  /**
   * Get field history for this document
   * @param {String} fieldName - Optional field name
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  schema.methods.getFieldHistory = async function (fieldName = null, options = {}) {
    const entityType = getEntityType(this);
    const entityId = this._id;

    if (fieldName) {
      return await fieldHistoryService.getFieldHistory(entityType, entityId, fieldName, options);
    } else {
      return await fieldHistoryService.getEntityHistory(entityType, entityId, options);
    }
  };

  /**
   * Get timeline for a specific field
   * @param {String} fieldName - Field name
   * @returns {Promise<Array>}
   */
  schema.methods.getFieldTimeline = async function (fieldName) {
    const entityType = getEntityType(this);
    const entityId = this._id;

    return await fieldHistoryService.getFieldTimeline(entityType, entityId, fieldName);
  };

  // ═══════════════════════════════════════════════════════════════
  // STATIC METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Compare two versions of a document
   * @param {String} entityId - Document ID
   * @param {Date} version1 - First version timestamp
   * @param {Date} version2 - Second version timestamp
   * @returns {Promise<Object>}
   */
  schema.statics.compareVersions = async function (entityId, version1, version2) {
    const entityType = this.modelName;
    return await fieldHistoryService.compareVersions(entityType, entityId, version1, version2);
  };
}

module.exports = fieldHistoryPlugin;
