const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * SLO (Service Level Objective) Model
 *
 * Defines service level objectives for monitoring system performance
 * Includes availability, latency, error rate, throughput, and custom metrics
 */

const sloSchema = new mongoose.Schema(
  {
    // ═══════════════════════════════════════════════════════════════
    // TENANT ISOLATION (for multi-tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Firm',
      index: true,
      // null for system-wide SLOs
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ═══════════════════════════════════════════════════════════════
    // SLO DEFINITION
    // ═══════════════════════════════════════════════════════════════
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },

    // SLO Category
    category: {
      type: String,
      required: true,
      enum: ['availability', 'latency', 'error_rate', 'throughput', 'custom'],
      index: true,
    },

    // ═══════════════════════════════════════════════════════════════
    // TARGET CONFIGURATION
    // ═══════════════════════════════════════════════════════════════

    // Target value (e.g., 99.9 for 99.9% availability, 500 for 500ms latency)
    target: {
      type: Number,
      required: true,
    },

    // Threshold configuration for alerts
    threshold: {
      warning: {
        type: Number,
        required: true,
        // e.g., 99.0 for availability warning at 99.0%
      },
      critical: {
        type: Number,
        required: true,
        // e.g., 98.0 for availability critical at 98.0%
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // TIME WINDOW CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    timeWindow: {
      type: String,
      required: true,
      enum: ['hourly', 'daily', 'weekly', 'monthly', 'quarterly'],
      default: 'daily',
      index: true,
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS & ACTIVATION
    // ═══════════════════════════════════════════════════════════════
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // ═══════════════════════════════════════════════════════════════
    // ALERT SETTINGS
    // ═══════════════════════════════════════════════════════════════
    alertSettings: {
      // Who to notify when SLO is breached
      notifyUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }],
      notifyEmails: [{
        type: String,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      }],
      // Notification channels
      channels: [{
        type: String,
        enum: ['email', 'sms', 'webhook', 'slack'],
      }],
      // Webhook URL for custom integrations
      webhookUrl: {
        type: String,
        match: /^https?:\/\/.+/,
      },
      // Minimum time between alerts (in minutes) to prevent alert fatigue
      alertCooldown: {
        type: Number,
        default: 60, // 60 minutes
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA FOR CUSTOM SLOs
    // ═══════════════════════════════════════════════════════════════
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // For custom SLOs, store additional configuration
      // e.g., { endpoint: '/api/invoices', method: 'POST', metric: 'processingTime' }
    },

    // ═══════════════════════════════════════════════════════════════
    // TRACKING
    // ═══════════════════════════════════════════════════════════════
    lastAlertSent: {
      type: Date,
      index: true,
    },
    lastMeasurement: {
      value: Number,
      timestamp: Date,
      status: {
        type: String,
        enum: ['met', 'warning', 'breached'],
      },
    },

    // Current error budget (calculated)
    errorBudget: {
      total: Number,      // Total allowed errors/downtime
      consumed: Number,   // Already consumed
      remaining: Number,  // Remaining budget
      percentage: Number, // Remaining as percentage
    },
  },
  {
    timestamps: true,
  }
);

// ═══════════════════════════════════════════════════════════════
// INDEXES FOR PERFORMANCE
// ═══════════════════════════════════════════════════════════════
sloSchema.index({ firmId: 1, category: 1 });
sloSchema.index({ firmId: 1, isActive: 1 });
sloSchema.index({ category: 1, isActive: 1 });
sloSchema.index({ 'lastMeasurement.status': 1, isActive: 1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUAL PROPERTIES
// ═══════════════════════════════════════════════════════════════

/**
 * Check if alert cooldown period has passed
 */
sloSchema.virtual('canSendAlert').get(function () {
  if (!this.lastAlertSent) return true;

  const cooldownMs = this.alertSettings.alertCooldown * 60 * 1000;
  const timeSinceLastAlert = Date.now() - this.lastAlertSent.getTime();

  return timeSinceLastAlert >= cooldownMs;
});

/**
 * Get time window in milliseconds
 */
sloSchema.virtual('timeWindowMs').get(function () {
  const windows = {
    hourly: 60 * 60 * 1000,
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
    quarterly: 90 * 24 * 60 * 60 * 1000,
  };
  return windows[this.timeWindow] || windows.daily;
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Update last measurement
 */
sloSchema.methods.updateMeasurement = async function (value, status) {
  this.lastMeasurement = {
    value,
    timestamp: new Date(),
    status,
  };
  await this.save();
};

/**
 * Update error budget
 */
sloSchema.methods.updateErrorBudget = async function (budget) {
  this.errorBudget = budget;
  await this.save();
};

/**
 * Record alert sent
 */
sloSchema.methods.recordAlertSent = async function () {
  this.lastAlertSent = new Date();
  await this.save();
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get active SLOs for a firm
 */
sloSchema.statics.getActiveSLOs = async function (firmId = null) {
  const query = { isActive: true };
  if (firmId) {
    query.$or = [
      { firmId },
      { firmId: null }, // Include system-wide SLOs
    ];
  } else {
    query.firmId = null; // System-wide only
  }

  return this.find(query).sort({ category: 1, name: 1 }).lean();
};

/**
 * Get SLOs by category
 */
sloSchema.statics.getSLOsByCategory = async function (category, firmId = null) {
  const query = { category, isActive: true };
  if (firmId) {
    query.$or = [
      { firmId },
      { firmId: null },
    ];
  }

  return this.find(query).sort({ name: 1 }).lean();
};

/**
 * Get breached SLOs
 */
sloSchema.statics.getBreachedSLOs = async function (firmId = null) {
  const query = {
    isActive: true,
    'lastMeasurement.status': 'breached',
  };
  if (firmId) {
    query.$or = [
      { firmId },
      { firmId: null },
    ];
  }

  return this.find(query).sort({ 'lastMeasurement.timestamp': -1 }).lean();
};

/**
 * Initialize default SLOs for a firm
 */
sloSchema.statics.initializeDefaultSLOs = async function (firmId = null) {
  try {
    const defaultSLOs = [
      {
        firmId,
        name: 'API Availability',
        description: 'API should be available 99.9% of the time',
        category: 'availability',
        target: 99.9,
        threshold: {
          warning: 99.5,
          critical: 99.0,
        },
        timeWindow: 'daily',
        isActive: true,
        alertSettings: {
          channels: ['email'],
          alertCooldown: 60,
        },
      },
      {
        firmId,
        name: 'API Latency P95',
        description: '95th percentile API response time should be under 500ms',
        category: 'latency',
        target: 500, // milliseconds
        threshold: {
          warning: 750,
          critical: 1000,
        },
        timeWindow: 'daily',
        isActive: true,
        alertSettings: {
          channels: ['email'],
          alertCooldown: 60,
        },
      },
      {
        firmId,
        name: 'API Error Rate',
        description: 'API error rate should be below 0.1%',
        category: 'error_rate',
        target: 0.1, // percentage
        threshold: {
          warning: 0.5,
          critical: 1.0,
        },
        timeWindow: 'daily',
        isActive: true,
        alertSettings: {
          channels: ['email'],
          alertCooldown: 60,
        },
      },
      {
        firmId,
        name: 'Invoice Processing Time',
        description: 'Invoice processing should complete within 5 seconds',
        category: 'custom',
        target: 5000, // milliseconds
        threshold: {
          warning: 7500,
          critical: 10000,
        },
        timeWindow: 'daily',
        isActive: true,
        alertSettings: {
          channels: ['email'],
          alertCooldown: 60,
        },
        metadata: {
          metric: 'invoice_processing_time',
          endpoint: '/api/invoices',
        },
      },
    ];

    const created = await this.insertMany(defaultSLOs);
    logger.info(`Initialized ${created.length} default SLOs${firmId ? ` for firm ${firmId}` : ' (system-wide)'}`);
    return created;
  } catch (error) {
    logger.error('Error initializing default SLOs:', error);
    throw error;
  }
};

const SLO = mongoose.model('SLO', sloSchema);

module.exports = SLO;
