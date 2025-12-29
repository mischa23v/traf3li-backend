const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * SLO Measurement Model
 *
 * Stores individual measurements/samples for SLO tracking
 * Allows for historical analysis and trend detection
 */

const sloMeasurementSchema = new mongoose.Schema(
  {
    // ═══════════════════════════════════════════════════════════════
    // REFERENCE TO SLO
    // ═══════════════════════════════════════════════════════════════
    sloId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SLO',
      required: true,
      index: true,
    },

    firmId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Firm',
      index: true,
      required: false,
     },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ═══════════════════════════════════════════════════════════════
    // MEASUREMENT DATA
    // ═══════════════════════════════════════════════════════════════
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    // The measured value (e.g., 99.95 for availability, 450 for latency in ms)
    value: {
      type: Number,
      required: true,
    },

    // Status of this measurement against the SLO
    status: {
      type: String,
      required: true,
      enum: ['met', 'warning', 'breached'],
      index: true,
    },

    // ═══════════════════════════════════════════════════════════════
    // TIME WINDOW
    // ═══════════════════════════════════════════════════════════════
    // The time window this measurement covers
    windowStart: {
      type: Date,
      required: true,
      index: true,
    },
    windowEnd: {
      type: Date,
      required: true,
      index: true,
    },

    // ═══════════════════════════════════════════════════════════════
    // SAMPLE STATISTICS
    // ═══════════════════════════════════════════════════════════════
    sampleCount: {
      type: Number,
      default: 1,
      // Number of data points used to calculate this measurement
    },

    // ═══════════════════════════════════════════════════════════════
    // ADDITIONAL METADATA
    // ═══════════════════════════════════════════════════════════════
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // Store additional context about the measurement
      // e.g., { totalRequests: 10000, failedRequests: 5, avgLatency: 450, p95: 750, p99: 1200 }
    },
  },
  {
    timestamps: true,
  }
);

// ═══════════════════════════════════════════════════════════════
// INDEXES FOR PERFORMANCE
// ═══════════════════════════════════════════════════════════════
sloMeasurementSchema.index({ sloId: 1, timestamp: -1 });
sloMeasurementSchema.index({ sloId: 1, windowStart: 1, windowEnd: 1 });
sloMeasurementSchema.index({ sloId: 1, status: 1, timestamp: -1 });
sloMeasurementSchema.index({ timestamp: -1 });
sloMeasurementSchema.index({ firmId: 1, createdAt: -1 });

// TTL index: Auto-delete measurements older than 1 year
sloMeasurementSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// ═══════════════════════════════════════════════════════════════
// VIRTUAL PROPERTIES
// ═══════════════════════════════════════════════════════════════

/**
 * Get window duration in milliseconds
 */
sloMeasurementSchema.virtual('windowDuration').get(function () {
  return this.windowEnd - this.windowStart;
});

/**
 * Check if measurement is recent (within last hour)
 */
sloMeasurementSchema.virtual('isRecent').get(function () {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  return this.timestamp.getTime() > oneHourAgo;
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if measurement is in breach
 */
sloMeasurementSchema.methods.isBreached = function () {
  return this.status === 'breached';
};

/**
 * Check if measurement is at warning level
 */
sloMeasurementSchema.methods.isWarning = function () {
  return this.status === 'warning';
};

/**
 * Get human-readable duration
 */
sloMeasurementSchema.methods.getWindowDurationText = function () {
  const duration = this.windowEnd - this.windowStart;
  const hours = Math.floor(duration / (60 * 60 * 1000));
  const minutes = Math.floor((duration % (60 * 60 * 1000)) / (60 * 1000));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get measurements for an SLO within a date range
 */
sloMeasurementSchema.statics.getMeasurements = async function (sloId, dateRange = {}) {
  const query = { sloId };

  if (dateRange.start || dateRange.end) {
    query.timestamp = {};
    if (dateRange.start) {
      query.timestamp.$gte = new Date(dateRange.start);
    }
    if (dateRange.end) {
      query.timestamp.$lte = new Date(dateRange.end);
    }
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .lean();
};

/**
 * Get latest measurement for an SLO
 */
sloMeasurementSchema.statics.getLatestMeasurement = async function (sloId) {
  return this.findOne({ sloId })
    .sort({ timestamp: -1 })
    .lean();
};

/**
 * Get breached measurements for an SLO
 */
sloMeasurementSchema.statics.getBreachedMeasurements = async function (sloId, dateRange = {}) {
  const query = { sloId, status: 'breached' };

  if (dateRange.start || dateRange.end) {
    query.timestamp = {};
    if (dateRange.start) {
      query.timestamp.$gte = new Date(dateRange.start);
    }
    if (dateRange.end) {
      query.timestamp.$lte = new Date(dateRange.end);
    }
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .lean();
};

/**
 * Get aggregated statistics for an SLO
 */
sloMeasurementSchema.statics.getStatistics = async function (sloId, dateRange = {}) {
  const query = { sloId };

  if (dateRange.start || dateRange.end) {
    query.timestamp = {};
    if (dateRange.start) {
      query.timestamp.$gte = new Date(dateRange.start);
    }
    if (dateRange.end) {
      query.timestamp.$lte = new Date(dateRange.end);
    }
  }

  const stats = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$sloId',
        avgValue: { $avg: '$value' },
        minValue: { $min: '$value' },
        maxValue: { $max: '$value' },
        totalMeasurements: { $sum: 1 },
        metCount: {
          $sum: { $cond: [{ $eq: ['$status', 'met'] }, 1, 0] },
        },
        warningCount: {
          $sum: { $cond: [{ $eq: ['$status', 'warning'] }, 1, 0] },
        },
        breachedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'breached'] }, 1, 0] },
        },
        totalSamples: { $sum: '$sampleCount' },
      },
    },
  ]);

  if (stats.length === 0) {
    return null;
  }

  const stat = stats[0];
  const complianceRate = (stat.metCount / stat.totalMeasurements) * 100;

  return {
    avgValue: Math.round(stat.avgValue * 100) / 100,
    minValue: stat.minValue,
    maxValue: stat.maxValue,
    totalMeasurements: stat.totalMeasurements,
    metCount: stat.metCount,
    warningCount: stat.warningCount,
    breachedCount: stat.breachedCount,
    totalSamples: stat.totalSamples,
    complianceRate: Math.round(complianceRate * 100) / 100,
  };
};

/**
 * Create a new measurement
 */
sloMeasurementSchema.statics.createMeasurement = async function (data) {
  try {
    const measurement = new this(data);
    await measurement.save();
    logger.debug(`SLO measurement created for SLO ${data.sloId}: ${data.value} (${data.status})`);
    return measurement;
  } catch (error) {
    logger.error('Error creating SLO measurement:', error);
    throw error;
  }
};

/**
 * Get trend data for visualization
 */
sloMeasurementSchema.statics.getTrendData = async function (sloId, dateRange = {}, granularity = 'hourly') {
  const query = { sloId };

  if (dateRange.start || dateRange.end) {
    query.timestamp = {};
    if (dateRange.start) {
      query.timestamp.$gte = new Date(dateRange.start);
    }
    if (dateRange.end) {
      query.timestamp.$lte = new Date(dateRange.end);
    }
  }

  // Define grouping based on granularity
  let dateGroup;
  switch (granularity) {
    case 'hourly':
      dateGroup = {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' },
        hour: { $hour: '$timestamp' },
      };
      break;
    case 'daily':
      dateGroup = {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' },
      };
      break;
    case 'weekly':
      dateGroup = {
        year: { $year: '$timestamp' },
        week: { $week: '$timestamp' },
      };
      break;
    case 'monthly':
      dateGroup = {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
      };
      break;
    default:
      dateGroup = {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' },
      };
  }

  const trends = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: dateGroup,
        avgValue: { $avg: '$value' },
        minValue: { $min: '$value' },
        maxValue: { $max: '$value' },
        measurements: { $sum: 1 },
        breached: {
          $sum: { $cond: [{ $eq: ['$status', 'breached'] }, 1, 0] },
        },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } },
  ]);

  return trends;
};

const SLOMeasurement = mongoose.model('SLOMeasurement', sloMeasurementSchema);

module.exports = SLOMeasurement;
