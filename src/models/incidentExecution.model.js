/**
 * Incident Execution Model
 *
 * Tracks playbook execution for incidents.
 * Records step-by-step progress, results, and decision points.
 *
 * Features:
 * - Multi-tenant isolation (firmId)
 * - Step-by-step execution tracking
 * - Result recording for each step
 * - Status tracking (running, completed, failed, aborted, escalated)
 * - Execution timeline and audit trail
 */

const mongoose = require('mongoose');

// Step result schema
const stepResultSchema = new mongoose.Schema({
  stepOrder: {
    type: Number,
    required: true
  },

  stepTitle: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ['pending', 'running', 'success', 'failed', 'skipped', 'timeout'],
    default: 'pending',
    required: true
  },

  startedAt: {
    type: Date
  },

  completedAt: {
    type: Date
  },

  executedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  result: {
    type: mongoose.Schema.Types.Mixed
  },

  error: {
    type: String
  },

  retryCount: {
    type: Number,
    default: 0,
    min: 0
  },

  output: {
    type: String
  },

  notes: {
    type: String
  }
}, { _id: true, versionKey: false });

const incidentExecutionSchema = new mongoose.Schema({
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
  // REFERENCES
  // ═══════════════════════════════════════════════════════════════
  incidentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
    required: true,
    index: true
  },

  playbookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Playbook',
    required: true,
    index: true
  },

  // ═══════════════════════════════════════════════════════════════
  // EXECUTION STATUS
  // ═══════════════════════════════════════════════════════════════
  status: {
    type: String,
    enum: ['running', 'completed', 'failed', 'aborted', 'escalated'],
    default: 'running',
    required: true,
    index: true
  },

  // ═══════════════════════════════════════════════════════════════
  // TIMELINE
  // ═══════════════════════════════════════════════════════════════
  startedAt: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },

  completedAt: {
    type: Date,
    index: true
  },

  // ═══════════════════════════════════════════════════════════════
  // EXECUTION PROGRESS
  // ═══════════════════════════════════════════════════════════════
  currentStep: {
    type: Number,
    default: 1,
    min: 1
  },

  totalSteps: {
    type: Number,
    required: true,
    min: 1
  },

  stepResults: {
    type: [stepResultSchema],
    default: []
  },

  // ═══════════════════════════════════════════════════════════════
  // EXECUTION METADATA
  // ═══════════════════════════════════════════════════════════════
  executedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  abortedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  notes: {
    type: String,
    trim: true
  },

  // ═══════════════════════════════════════════════════════════════
  // ESCALATION
  // ═══════════════════════════════════════════════════════════════
  escalatedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  escalatedAt: {
    type: Date
  },

  escalationReason: {
    type: String
  }
}, {
  timestamps: true,
  versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
incidentExecutionSchema.index({ firmId: 1, status: 1, startedAt: -1 });
incidentExecutionSchema.index({ firmId: 1, incidentId: 1, startedAt: -1 });
incidentExecutionSchema.index({ playbookId: 1, status: 1 });
incidentExecutionSchema.index({ executedBy: 1, status: 1, startedAt: -1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUAL FIELDS
// ═══════════════════════════════════════════════════════════════
incidentExecutionSchema.virtual('duration').get(function() {
  if (this.completedAt) {
    return this.completedAt - this.startedAt;
  }
  return Date.now() - this.startedAt;
});

incidentExecutionSchema.virtual('progress').get(function() {
  if (this.totalSteps === 0) return 0;
  const completedSteps = this.stepResults.filter(
    r => ['success', 'skipped'].includes(r.status)
  ).length;
  return Math.round((completedSteps / this.totalSteps) * 100);
});

incidentExecutionSchema.virtual('isRunning').get(function() {
  return this.status === 'running';
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get executions for incident
 * @param {String} incidentId - Incident ID
 * @param {String} firmId - Firm ID (optional)
 * @returns {Promise<Array>} - Executions
 */
incidentExecutionSchema.statics.getByIncident = async function(incidentId, firmId = null) {
  const query = { incidentId };
  if (firmId) query.firmId = firmId;

  return await this.find(query)
    .sort({ startedAt: -1 })
    .populate('playbookId', 'name category severity')
    .populate('executedBy', 'firstName lastName')
    .populate('completedBy', 'firstName lastName')
    .populate('escalatedTo', 'firstName lastName email')
    .lean();
};

/**
 * Get active executions
 * @param {String} firmId - Firm ID (optional)
 * @returns {Promise<Array>} - Active executions
 */
incidentExecutionSchema.statics.getActive = async function(firmId = null) {
  const query = { status: 'running' };
  if (firmId) query.firmId = firmId;

  return await this.find(query)
    .sort({ startedAt: -1 })
    .populate('incidentId', 'title status impact')
    .populate('playbookId', 'name category severity')
    .populate('executedBy', 'firstName lastName')
    .lean();
};

/**
 * Get execution statistics
 * @param {String} firmId - Firm ID (optional)
 * @param {Object} dateRange - Date range filter
 * @returns {Promise<Object>} - Statistics
 */
incidentExecutionSchema.statics.getStats = async function(firmId = null, dateRange = {}) {
  const matchQuery = {};
  if (firmId) matchQuery.firmId = firmId;

  if (dateRange.startDate || dateRange.endDate) {
    matchQuery.startedAt = {};
    if (dateRange.startDate) matchQuery.startedAt.$gte = new Date(dateRange.startDate);
    if (dateRange.endDate) matchQuery.startedAt.$lte = new Date(dateRange.endDate);
  }

  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $facet: {
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ],
        total: [
          { $count: 'count' }
        ],
        avgDuration: [
          { $match: { status: { $in: ['completed', 'failed'] }, completedAt: { $exists: true } } },
          {
            $project: {
              duration: {
                $subtract: ['$completedAt', '$startedAt']
              }
            }
          },
          {
            $group: {
              _id: null,
              avgDuration: { $avg: '$duration' }
            }
          }
        ],
        successRate: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              successful: {
                $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
              }
            }
          },
          {
            $project: {
              successRate: {
                $multiply: [
                  { $divide: ['$successful', '$total'] },
                  100
                ]
              }
            }
          }
        ]
      }
    }
  ]);

  const result = stats[0];

  return {
    total: result.total[0]?.count || 0,
    byStatus: result.byStatus,
    avgDurationMs: result.avgDuration[0]?.avgDuration || null,
    successRate: result.successRate[0]?.successRate || 0
  };
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Record step start
 * @param {Number} stepOrder - Step order number
 * @param {String} stepTitle - Step title
 * @param {String} userId - User ID
 * @returns {Promise<Object>} - Updated execution
 */
incidentExecutionSchema.methods.startStep = async function(stepOrder, stepTitle, userId) {
  const existingResult = this.stepResults.find(r => r.stepOrder === stepOrder);

  if (existingResult) {
    existingResult.status = 'running';
    existingResult.startedAt = new Date();
    existingResult.executedBy = userId;
  } else {
    this.stepResults.push({
      stepOrder,
      stepTitle,
      status: 'running',
      startedAt: new Date(),
      executedBy: userId
    });
  }

  this.currentStep = stepOrder;
  await this.save();
  return this;
};

/**
 * Record step completion
 * @param {Number} stepOrder - Step order number
 * @param {Boolean} success - Whether step succeeded
 * @param {Object} result - Step result data
 * @param {String} error - Error message (if failed)
 * @returns {Promise<Object>} - Updated execution
 */
incidentExecutionSchema.methods.completeStep = async function(stepOrder, success, result = {}, error = null) {
  const stepResult = this.stepResults.find(r => r.stepOrder === stepOrder);

  if (!stepResult) {
    throw new Error('Step result not found');
  }

  stepResult.status = success ? 'success' : 'failed';
  stepResult.completedAt = new Date();
  stepResult.result = result;
  if (error) {
    stepResult.error = error;
  }

  await this.save();
  return this;
};

/**
 * Skip step
 * @param {Number} stepOrder - Step order number
 * @param {String} reason - Skip reason
 * @returns {Promise<Object>} - Updated execution
 */
incidentExecutionSchema.methods.skipStep = async function(stepOrder, reason) {
  const stepResult = this.stepResults.find(r => r.stepOrder === stepOrder);

  if (stepResult) {
    stepResult.status = 'skipped';
    stepResult.completedAt = new Date();
    stepResult.notes = reason;
  } else {
    this.stepResults.push({
      stepOrder,
      stepTitle: 'Skipped',
      status: 'skipped',
      startedAt: new Date(),
      completedAt: new Date(),
      notes: reason
    });
  }

  await this.save();
  return this;
};

/**
 * Complete execution
 * @param {String} userId - User completing
 * @param {String} notes - Completion notes
 * @returns {Promise<Object>} - Updated execution
 */
incidentExecutionSchema.methods.complete = async function(userId, notes = '') {
  this.status = 'completed';
  this.completedAt = new Date();
  this.completedBy = userId;
  if (notes) {
    this.notes = notes;
  }
  await this.save();
  return this;
};

/**
 * Fail execution
 * @param {String} userId - User ID
 * @param {String} reason - Failure reason
 * @returns {Promise<Object>} - Updated execution
 */
incidentExecutionSchema.methods.fail = async function(userId, reason) {
  this.status = 'failed';
  this.completedAt = new Date();
  this.completedBy = userId;
  this.notes = reason;
  await this.save();
  return this;
};

/**
 * Abort execution
 * @param {String} userId - User aborting
 * @param {String} reason - Abort reason
 * @returns {Promise<Object>} - Updated execution
 */
incidentExecutionSchema.methods.abort = async function(userId, reason) {
  this.status = 'aborted';
  this.completedAt = new Date();
  this.abortedBy = userId;
  this.notes = reason;
  await this.save();
  return this;
};

/**
 * Escalate execution
 * @param {String} userId - User to escalate to
 * @param {String} reason - Escalation reason
 * @returns {Promise<Object>} - Updated execution
 */
incidentExecutionSchema.methods.escalate = async function(userId, reason) {
  this.status = 'escalated';
  this.escalatedTo = userId;
  this.escalatedAt = new Date();
  this.escalationReason = reason;
  await this.save();
  return this;
};

incidentExecutionSchema.set('toJSON', { virtuals: true });
incidentExecutionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('IncidentExecution', incidentExecutionSchema);
