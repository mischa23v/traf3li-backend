/**
 * Maintenance Window Model
 *
 * Manages scheduled and ongoing maintenance windows for system components.
 * Tracks planned downtime and maintenance activities.
 *
 * Features:
 * - Multi-tenant isolation (firmId)
 * - Affected components tracking
 * - Scheduled vs actual time tracking
 * - Status tracking (scheduled, in_progress, completed, cancelled)
 * - Subscriber notification control
 */

const mongoose = require('mongoose');

const maintenanceWindowSchema = new mongoose.Schema({
  // ═══════════════════════════════════════════════════════════════
  // TENANT ISOLATION (Multi-Tenancy)
  // ═══════════════════════════════════════════════════════════════
  firmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Firm',
    required: false,
    index: true
  },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
  // ═══════════════════════════════════════════════════════════════
  // MAINTENANCE IDENTIFICATION
  // ═══════════════════════════════════════════════════════════════
  title: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    trim: true
  },

  // ═══════════════════════════════════════════════════════════════
  // AFFECTED COMPONENTS
  // ═══════════════════════════════════════════════════════════════
  affectedComponents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SystemComponent'
  }],

  // ═══════════════════════════════════════════════════════════════
  // SCHEDULED TIME
  // ═══════════════════════════════════════════════════════════════
  scheduledStart: {
    type: Date,
    required: true,
    index: true
  },

  scheduledEnd: {
    type: Date,
    required: true,
    index: true
  },

  // ═══════════════════════════════════════════════════════════════
  // ACTUAL TIME
  // ═══════════════════════════════════════════════════════════════
  actualStart: {
    type: Date
  },

  actualEnd: {
    type: Date
  },

  // ═══════════════════════════════════════════════════════════════
  // STATUS
  // ═══════════════════════════════════════════════════════════════
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled',
    required: true,
    index: true
  },

  // ═══════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════
  notifySubscribers: {
    type: Boolean,
    default: true
  },

  notificationsSent: {
    scheduled: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date }
    },
    starting: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date }
    },
    completed: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
maintenanceWindowSchema.index({ firmId: 1, status: 1, scheduledStart: -1 });
maintenanceWindowSchema.index({ firmId: 1, scheduledStart: 1, scheduledEnd: 1 });
maintenanceWindowSchema.index({ affectedComponents: 1, scheduledStart: -1 });
maintenanceWindowSchema.index({ status: 1, scheduledStart: 1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUAL FIELDS
// ═══════════════════════════════════════════════════════════════
maintenanceWindowSchema.virtual('scheduledDuration').get(function() {
  return this.scheduledEnd - this.scheduledStart;
});

maintenanceWindowSchema.virtual('actualDuration').get(function() {
  if (this.actualStart && this.actualEnd) {
    return this.actualEnd - this.actualStart;
  }
  return null;
});

maintenanceWindowSchema.virtual('isUpcoming').get(function() {
  return this.status === 'scheduled' && this.scheduledStart > new Date();
});

maintenanceWindowSchema.virtual('isActive').get(function() {
  return this.status === 'in_progress';
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get upcoming maintenance windows
 */
maintenanceWindowSchema.statics.getUpcoming = async function(firmId = null, limit = 10) {
  const query = {
    status: 'scheduled',
    scheduledStart: { $gte: new Date() }
  };
  if (firmId) query.firmId = firmId;

  return await this.find(query)
    .sort({ scheduledStart: 1 })
    .limit(limit)
    .populate('affectedComponents', 'name category')
    .populate('createdBy', 'firstName lastName')
    .lean();
};

/**
 * Get active maintenance windows
 */
maintenanceWindowSchema.statics.getActive = async function(firmId = null) {
  const query = { status: 'in_progress' };
  if (firmId) query.firmId = firmId;

  return await this.find(query)
    .populate('affectedComponents', 'name category status')
    .lean();
};

/**
 * Get maintenance windows by component
 */
maintenanceWindowSchema.statics.getByComponent = async function(componentId, firmId = null) {
  const query = { affectedComponents: componentId };
  if (firmId) query.firmId = firmId;

  return await this.find(query)
    .sort({ scheduledStart: -1 })
    .lean();
};

/**
 * Get maintenance windows in date range
 */
maintenanceWindowSchema.statics.getInDateRange = async function(startDate, endDate, firmId = null) {
  const query = {
    $or: [
      {
        scheduledStart: { $gte: startDate, $lte: endDate }
      },
      {
        scheduledEnd: { $gte: startDate, $lte: endDate }
      },
      {
        scheduledStart: { $lte: startDate },
        scheduledEnd: { $gte: endDate }
      }
    ]
  };
  if (firmId) query.firmId = firmId;

  return await this.find(query)
    .sort({ scheduledStart: 1 })
    .populate('affectedComponents', 'name category')
    .lean();
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Start maintenance window
 */
maintenanceWindowSchema.methods.start = async function(userId = null) {
  this.status = 'in_progress';
  this.actualStart = new Date();
  this.updatedBy = userId;
  await this.save();
  return this;
};

/**
 * Complete maintenance window
 */
maintenanceWindowSchema.methods.complete = async function(userId = null) {
  this.status = 'completed';
  this.actualEnd = new Date();
  this.updatedBy = userId;
  await this.save();
  return this;
};

/**
 * Cancel maintenance window
 */
maintenanceWindowSchema.methods.cancel = async function(userId = null) {
  this.status = 'cancelled';
  this.updatedBy = userId;
  await this.save();
  return this;
};

/**
 * Reschedule maintenance window
 */
maintenanceWindowSchema.methods.reschedule = async function(newStart, newEnd, userId = null) {
  if (this.status !== 'scheduled') {
    throw new Error('Can only reschedule maintenance windows with status "scheduled"');
  }

  this.scheduledStart = newStart;
  this.scheduledEnd = newEnd;
  this.updatedBy = userId;

  // Reset notifications when rescheduled
  this.notificationsSent.scheduled.sent = false;
  this.notificationsSent.scheduled.sentAt = null;

  await this.save();
  return this;
};

/**
 * Mark notification as sent
 */
maintenanceWindowSchema.methods.markNotificationSent = async function(type) {
  if (this.notificationsSent[type]) {
    this.notificationsSent[type].sent = true;
    this.notificationsSent[type].sentAt = new Date();
    await this.save();
  }
  return this;
};

/**
 * Add affected component
 */
maintenanceWindowSchema.methods.addAffectedComponent = async function(componentId, userId = null) {
  if (!this.affectedComponents.includes(componentId)) {
    this.affectedComponents.push(componentId);
    this.updatedBy = userId;
    await this.save();
  }
  return this;
};

/**
 * Remove affected component
 */
maintenanceWindowSchema.methods.removeAffectedComponent = async function(componentId, userId = null) {
  this.affectedComponents = this.affectedComponents.filter(
    id => id.toString() !== componentId.toString()
  );
  this.updatedBy = userId;
  await this.save();
  return this;
};

maintenanceWindowSchema.set('toJSON', { virtuals: true });
maintenanceWindowSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MaintenanceWindow', maintenanceWindowSchema);
