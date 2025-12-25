const mongoose = require('mongoose');
const logger = require('../utils/logger');

const fieldHistorySchema = new mongoose.Schema(
  {
    // ═══════════════════════════════════════════════════════════════
    // ENTITY IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    entityType: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // ═══════════════════════════════════════════════════════════════
    // TENANT ISOLATION (for multi-tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Firm',
      index: true,
    },

    // ═══════════════════════════════════════════════════════════════
    // FIELD INFORMATION
    // ═══════════════════════════════════════════════════════════════
    fieldName: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    fieldPath: {
      type: String,
      trim: true,
      // For nested fields like 'address.street' or 'items.0.price'
    },

    // ═══════════════════════════════════════════════════════════════
    // VALUE TRACKING
    // ═══════════════════════════════════════════════════════════════
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    valueType: {
      type: String,
      enum: ['string', 'number', 'date', 'object', 'array', 'boolean', 'null'],
      required: true,
    },

    // ═══════════════════════════════════════════════════════════════
    // CHANGE INFORMATION
    // ═══════════════════════════════════════════════════════════════
    changeType: {
      type: String,
      enum: ['created', 'updated', 'deleted', 'restored'],
      required: true,
      index: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    changeReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // ═══════════════════════════════════════════════════════════════
    // REQUEST METADATA
    // ═══════════════════════════════════════════════════════════════
    metadata: {
      ipAddress: {
        type: String,
      },
      userAgent: {
        type: String,
      },
      sessionId: {
        type: String,
      },
      method: {
        type: String,
        enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      },
      endpoint: {
        type: String,
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // REVERT TRACKING
    // ═══════════════════════════════════════════════════════════════
    isReverted: {
      type: Boolean,
      default: false,
      index: true,
    },
    revertedAt: {
      type: Date,
    },
    revertedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// ═══════════════════════════════════════════════════════════════
// INDEXES FOR FAST QUERYING
// ═══════════════════════════════════════════════════════════════
fieldHistorySchema.index({ entityType: 1, entityId: 1, changedAt: -1 });
fieldHistorySchema.index({ entityType: 1, entityId: 1, fieldName: 1, changedAt: -1 });
fieldHistorySchema.index({ firmId: 1, changedAt: -1 });
fieldHistorySchema.index({ firmId: 1, entityType: 1, entityId: 1 });
fieldHistorySchema.index({ changedBy: 1, changedAt: -1 });
fieldHistorySchema.index({ changeType: 1, changedAt: -1 });

// Compound index for efficient timeline queries
fieldHistorySchema.index({
  entityType: 1,
  entityId: 1,
  fieldName: 1,
  changedAt: -1,
  isReverted: 1
});

// TTL index: Auto-delete field history older than 7 years (compliance retention)
fieldHistorySchema.index({ changedAt: 1 }, { expireAfterSeconds: 7 * 365 * 24 * 60 * 60 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get field history for a specific field
 * @param {String} entityType - Type of entity
 * @param {String} entityId - ID of the entity
 * @param {String} fieldName - Name of the field
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Field history entries
 */
fieldHistorySchema.statics.getFieldHistory = async function (
  entityType,
  entityId,
  fieldName,
  options = {}
) {
  const { limit = 50, skip = 0, includeReverted = false } = options;

  const query = {
    entityType,
    entityId: new mongoose.Types.ObjectId(entityId),
    fieldName,
  };

  if (!includeReverted) {
    query.isReverted = false;
  }

  return this.find(query)
    .sort({ changedAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('changedBy', 'firstName lastName email')
    .populate('revertedBy', 'firstName lastName email')
    .lean();
};

/**
 * Get all field changes for an entity
 * @param {String} entityType - Type of entity
 * @param {String} entityId - ID of the entity
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - All field history entries
 */
fieldHistorySchema.statics.getEntityHistory = async function (
  entityType,
  entityId,
  options = {}
) {
  const {
    limit = 100,
    skip = 0,
    startDate,
    endDate,
    changedBy,
    fieldName,
    changeType,
    includeReverted = false,
  } = options;

  const query = {
    entityType,
    entityId: new mongoose.Types.ObjectId(entityId),
  };

  if (!includeReverted) {
    query.isReverted = false;
  }

  if (changedBy) {
    query.changedBy = new mongoose.Types.ObjectId(changedBy);
  }

  if (fieldName) {
    query.fieldName = fieldName;
  }

  if (changeType) {
    query.changeType = changeType;
  }

  if (startDate || endDate) {
    query.changedAt = {};
    if (startDate) query.changedAt.$gte = new Date(startDate);
    if (endDate) query.changedAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ changedAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('changedBy', 'firstName lastName email')
    .populate('revertedBy', 'firstName lastName email')
    .lean();
};

/**
 * Get timeline visualization data for a field
 * @param {String} entityType - Type of entity
 * @param {String} entityId - ID of the entity
 * @param {String} fieldName - Name of the field
 * @returns {Promise<Array>} - Timeline data
 */
fieldHistorySchema.statics.getFieldTimeline = async function (
  entityType,
  entityId,
  fieldName
) {
  const history = await this.find({
    entityType,
    entityId: new mongoose.Types.ObjectId(entityId),
    fieldName,
    isReverted: false,
  })
    .sort({ changedAt: 1 })
    .populate('changedBy', 'firstName lastName email')
    .lean();

  return history.map((entry) => ({
    timestamp: entry.changedAt,
    value: entry.newValue,
    previousValue: entry.oldValue,
    changeType: entry.changeType,
    changedBy: entry.changedBy,
    reason: entry.changeReason,
  }));
};

/**
 * Get all changes made by a user
 * @param {String} userId - User ID
 * @param {Object} dateRange - { startDate, endDate }
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - User's change history
 */
fieldHistorySchema.statics.getUserChanges = async function (
  userId,
  dateRange = {},
  options = {}
) {
  const { limit = 100, skip = 0, entityType, firmId } = options;
  const { startDate, endDate } = dateRange;

  const query = {
    changedBy: new mongoose.Types.ObjectId(userId),
  };

  if (firmId) {
    query.firmId = new mongoose.Types.ObjectId(firmId);
  }

  if (entityType) {
    query.entityType = entityType;
  }

  if (startDate || endDate) {
    query.changedAt = {};
    if (startDate) query.changedAt.$gte = new Date(startDate);
    if (endDate) query.changedAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ changedAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('changedBy', 'firstName lastName email')
    .lean();
};

/**
 * Get recent changes across a firm
 * @param {String} firmId - Firm ID
 * @param {Number} limit - Number of records to return
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} - Recent changes
 */
fieldHistorySchema.statics.getRecentChanges = async function (
  firmId,
  limit = 50,
  options = {}
) {
  const { entityType, changeType } = options;

  const query = {
    firmId: new mongoose.Types.ObjectId(firmId),
  };

  if (entityType) {
    query.entityType = entityType;
  }

  if (changeType) {
    query.changeType = changeType;
  }

  return this.find(query)
    .sort({ changedAt: -1 })
    .limit(limit)
    .populate('changedBy', 'firstName lastName email')
    .lean();
};

/**
 * Compare two versions of an entity
 * @param {String} entityType - Type of entity
 * @param {String} entityId - ID of the entity
 * @param {Date} version1 - First version timestamp
 * @param {Date} version2 - Second version timestamp
 * @returns {Promise<Object>} - Comparison result
 */
fieldHistorySchema.statics.compareVersions = async function (
  entityType,
  entityId,
  version1,
  version2
) {
  const v1Date = new Date(version1);
  const v2Date = new Date(version2);

  // Get all changes between the two versions
  const changes = await this.find({
    entityType,
    entityId: new mongoose.Types.ObjectId(entityId),
    changedAt: {
      $gt: v1Date,
      $lte: v2Date,
    },
    isReverted: false,
  })
    .sort({ changedAt: 1 })
    .populate('changedBy', 'firstName lastName email')
    .lean();

  // Group changes by field
  const fieldChanges = {};
  changes.forEach((change) => {
    if (!fieldChanges[change.fieldName]) {
      fieldChanges[change.fieldName] = [];
    }
    fieldChanges[change.fieldName].push({
      changedAt: change.changedAt,
      oldValue: change.oldValue,
      newValue: change.newValue,
      changedBy: change.changedBy,
      changeType: change.changeType,
    });
  });

  return {
    entityType,
    entityId,
    version1: v1Date,
    version2: v2Date,
    totalChanges: changes.length,
    fieldsModified: Object.keys(fieldChanges).length,
    changes: fieldChanges,
  };
};

/**
 * Revert a field to a previous value
 * @param {String} historyId - History entry ID
 * @param {String} userId - User ID performing the revert
 * @returns {Promise<Object>} - Revert result
 */
fieldHistorySchema.statics.revertField = async function (historyId, userId) {
  const historyEntry = await this.findById(historyId);

  if (!historyEntry) {
    throw new Error('History entry not found');
  }

  if (historyEntry.isReverted) {
    throw new Error('This change has already been reverted');
  }

  // Mark this entry as reverted
  historyEntry.isReverted = true;
  historyEntry.revertedAt = new Date();
  historyEntry.revertedBy = new mongoose.Types.ObjectId(userId);
  await historyEntry.save();

  // Create a new history entry for the revert action
  const revertEntry = await this.create({
    entityType: historyEntry.entityType,
    entityId: historyEntry.entityId,
    firmId: historyEntry.firmId,
    fieldName: historyEntry.fieldName,
    fieldPath: historyEntry.fieldPath,
    oldValue: historyEntry.newValue,
    newValue: historyEntry.oldValue,
    valueType: historyEntry.valueType,
    changeType: 'restored',
    changedBy: userId,
    changedAt: new Date(),
    changeReason: `Reverted change from ${historyEntry.changedAt.toISOString()}`,
    metadata: historyEntry.metadata,
  });

  return {
    reverted: historyEntry,
    newEntry: revertEntry,
    previousValue: historyEntry.oldValue,
  };
};

/**
 * Track a single field change
 * @param {Object} changeData - Change information
 * @returns {Promise<Object>} - Created history entry
 */
fieldHistorySchema.statics.trackChange = async function (changeData) {
  try {
    const historyEntry = new this(changeData);
    await historyEntry.save();
    return historyEntry;
  } catch (error) {
    logger.error('Field history tracking failed:', error.message);
    return null;
  }
};

/**
 * Track multiple field changes in bulk
 * @param {Array} changes - Array of change data objects
 * @returns {Promise<Array|null>} - Created history entries or null
 */
fieldHistorySchema.statics.trackChanges = async function (changes) {
  try {
    const entries = await this.insertMany(changes, { ordered: false });
    return entries;
  } catch (error) {
    logger.error('Bulk field history tracking failed:', error.message);
    return null;
  }
};

const FieldHistory = mongoose.model('FieldHistory', fieldHistorySchema);

module.exports = FieldHistory;
