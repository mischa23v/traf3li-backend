/**
 * Playbook Model
 *
 * Incident response playbooks with automated and manual steps.
 * Provides structured procedures for handling different types of incidents.
 *
 * Features:
 * - Multi-tenant isolation (firmId)
 * - Categorized by incident type and severity
 * - Multi-step workflows with actions
 * - Escalation paths
 * - Versioning support
 * - Trigger conditions for auto-execution
 */

const mongoose = require('mongoose');

// Step schema for playbook execution steps
const stepSchema = new mongoose.Schema({
  order: {
    type: Number,
    required: true,
    min: 1
  },

  title: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    trim: true
  },

  actionType: {
    type: String,
    enum: ['manual', 'automated', 'notification', 'escalation'],
    required: true,
    default: 'manual'
  },

  // Action configuration (command, script, notification config, etc.)
  action: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  requiredRole: {
    type: String,
    enum: ['owner', 'admin', 'partner', 'lawyer', 'paralegal', 'secretary', 'accountant', null],
    default: null
  },

  // Timeout in minutes
  timeout: {
    type: Number,
    min: 0,
    default: 30
  },

  // What to do on successful completion
  onSuccess: {
    nextStep: {
      type: Number,
      default: null
    },
    complete: {
      type: Boolean,
      default: false
    }
  },

  // What to do on failure
  onFailure: {
    retry: {
      type: Boolean,
      default: false
    },
    maxRetries: {
      type: Number,
      default: 3,
      min: 0
    },
    escalate: {
      type: Boolean,
      default: false
    },
    abort: {
      type: Boolean,
      default: false
    }
  }
}, { _id: true, versionKey: false });

// Trigger condition schema
const triggerConditionSchema = new mongoose.Schema({
  field: {
    type: String,
    required: true
  },

  operator: {
    type: String,
    enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'in', 'not_in'],
    required: true
  },

  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
}, { _id: false, versionKey: false });

const playbookSchema = new mongoose.Schema({
  // ═══════════════════════════════════════════════════════════════
  // TENANT ISOLATION (Multi-Tenancy)
  // ═══════════════════════════════════════════════════════════════
  firmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Firm',
    required: false,
    index: true
   },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
  // ═══════════════════════════════════════════════════════════════
  // PLAYBOOK IDENTIFICATION
  // ═══════════════════════════════════════════════════════════════
  name: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    trim: true
  },

  // ═══════════════════════════════════════════════════════════════
  // CATEGORIZATION
  // ═══════════════════════════════════════════════════════════════
  category: {
    type: String,
    enum: ['infrastructure', 'security', 'performance', 'data', 'integration'],
    required: true,
    index: true
  },

  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
    index: true
  },

  // ═══════════════════════════════════════════════════════════════
  // TRIGGER CONDITIONS
  // ═══════════════════════════════════════════════════════════════
  triggerConditions: [triggerConditionSchema],

  // ═══════════════════════════════════════════════════════════════
  // EXECUTION STEPS
  // ═══════════════════════════════════════════════════════════════
  steps: {
    type: [stepSchema],
    validate: {
      validator: function(steps) {
        return steps && steps.length > 0;
      },
      message: 'At least one step is required'
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ESCALATION PATH
  // ═══════════════════════════════════════════════════════════════
  escalationPath: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // ═══════════════════════════════════════════════════════════════
  // STATUS & VERSIONING
  // ═══════════════════════════════════════════════════════════════
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  version: {
    type: Number,
    default: 1,
    min: 1
  },

  // ═══════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true,
  versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
playbookSchema.index({ firmId: 1, category: 1, severity: 1 });
playbookSchema.index({ firmId: 1, isActive: 1, createdAt: -1 });
playbookSchema.index({ category: 1, severity: 1, isActive: 1 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Find playbooks matching incident criteria
 * @param {String} category - Incident category
 * @param {String} severity - Incident severity
 * @param {String} firmId - Firm ID (optional)
 * @returns {Promise<Array>} - Matching playbooks
 */
playbookSchema.statics.findMatching = async function(category, severity, firmId = null) {
  const query = {
    category,
    severity,
    isActive: true
  };

  if (firmId) {
    query.firmId = firmId;
  }

  return await this.find(query)
    .sort({ version: -1, createdAt: -1 })
    .populate('createdBy', 'firstName lastName')
    .populate('escalationPath', 'firstName lastName email')
    .lean();
};

/**
 * Get active playbooks for firm
 * @param {String} firmId - Firm ID
 * @param {Object} filters - Additional filters
 * @returns {Promise<Array>} - Active playbooks
 */
playbookSchema.statics.getActive = async function(firmId, filters = {}) {
  const query = {
    isActive: true,
    ...filters
  };

  if (firmId) {
    query.firmId = firmId;
  }

  return await this.find(query)
    .sort({ category: 1, severity: -1, createdAt: -1 })
    .populate('createdBy', 'firstName lastName')
    .lean();
};

/**
 * Get playbook statistics
 * @param {String} firmId - Firm ID (optional)
 * @returns {Promise<Object>} - Statistics
 */
playbookSchema.statics.getStats = async function(firmId = null) {
  const matchQuery = {};
  if (firmId) matchQuery.firmId = firmId;

  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $facet: {
        byCategory: [
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ],
        bySeverity: [
          { $group: { _id: '$severity', count: { $sum: 1 } } }
        ],
        total: [
          { $count: 'count' }
        ],
        active: [
          { $match: { isActive: true } },
          { $count: 'count' }
        ]
      }
    }
  ]);

  const result = stats[0];

  return {
    total: result.total[0]?.count || 0,
    active: result.active[0]?.count || 0,
    byCategory: result.byCategory,
    bySeverity: result.bySeverity
  };
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if playbook matches incident
 * @param {Object} incident - Incident object
 * @returns {Boolean} - True if matches
 */
playbookSchema.methods.matchesIncident = function(incident) {
  // Check category and severity match
  if (this.category !== incident.category || this.severity !== incident.severity) {
    return false;
  }

  // Check trigger conditions
  if (!this.triggerConditions || this.triggerConditions.length === 0) {
    return true; // No specific conditions, matches by category/severity
  }

  // Evaluate all trigger conditions
  return this.triggerConditions.every(condition => {
    return this.evaluateCondition(condition, incident);
  });
};

/**
 * Evaluate a trigger condition
 * @param {Object} condition - Condition to evaluate
 * @param {Object} data - Data to evaluate against
 * @returns {Boolean} - True if condition met
 */
playbookSchema.methods.evaluateCondition = function(condition, data) {
  const fieldValue = this.getNestedValue(data, condition.field);
  const conditionValue = condition.value;

  switch (condition.operator) {
    case 'equals':
      return fieldValue == conditionValue;
    case 'not_equals':
      return fieldValue != conditionValue;
    case 'contains':
      return String(fieldValue).includes(String(conditionValue));
    case 'greater_than':
      return Number(fieldValue) > Number(conditionValue);
    case 'less_than':
      return Number(fieldValue) < Number(conditionValue);
    case 'in':
      return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
    case 'not_in':
      return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
    default:
      return false;
  }
};

/**
 * Get nested value from object using dot notation
 * @private
 */
playbookSchema.methods.getNestedValue = function(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

/**
 * Create new version of playbook
 * @param {Object} updates - Updated data
 * @param {String} userId - User making the update
 * @returns {Promise<Object>} - New version
 */
playbookSchema.methods.createVersion = async function(updates, userId) {
  // Deactivate current version
  this.isActive = false;
  await this.save();

  // Create new version
  const newVersion = new this.constructor({
    ...this.toObject(),
    _id: undefined,
    version: this.version + 1,
    ...updates,
    updatedBy: userId,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await newVersion.save();
  return newVersion;
};

module.exports = mongoose.model('Playbook', playbookSchema);
