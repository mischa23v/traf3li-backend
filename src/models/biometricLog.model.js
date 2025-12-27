const mongoose = require('mongoose');

const biometricLogSchema = new mongoose.Schema({
  firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', index: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'BiometricDevice' },

  eventType: {
    type: String,
    enum: ['check_in', 'check_out', 'break_start', 'break_end', 'verify_success', 'verify_fail', 'identify_success', 'identify_fail', 'enrollment', 'device_error', 'spoofing_detected']
  },

  verificationMethod: {
    type: String,
    enum: ['fingerprint', 'facial', 'card', 'pin', 'multi', 'manual', 'mobile_gps']
  },

  // Verification Details
  verification: {
    score: Number,
    threshold: Number,
    passed: Boolean,
    templateUsed: String,
    verificationTime: Number, // milliseconds
    attempts: { type: Number, default: 1 },
    antiSpoofingPassed: Boolean,
    livenessScore: Number
  },

  // Geo-location (for mobile check-in)
  location: {
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    accuracy: Number, // meters
    address: String,
    withinGeofence: Boolean,
    distanceFromDevice: Number // meters
  },

  // Captured Data
  capturedData: {
    photo: String, // S3 URL
    fingerImage: String,
    reason: String
  },

  // Linked records
  attendanceRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceRecord' },

  // Device info
  deviceInfo: {
    ip: String,
    userAgent: String,
    platform: String
  },

  timestamp: { type: Date, default: Date.now },
  processedAt: Date,
  isProcessed: { type: Boolean, default: false }
}, { timestamps: true });

biometricLogSchema.index({ firmId: 1, timestamp: -1 });
biometricLogSchema.index({ firmId: 1, employeeId: 1, timestamp: -1 });
biometricLogSchema.index({ firmId: 1, eventType: 1, timestamp: -1 });
biometricLogSchema.index({ deviceId: 1, timestamp: -1 });
biometricLogSchema.index({ isProcessed: 1 });

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Mark as processed
biometricLogSchema.methods.markProcessed = function(attendanceRecordId) {
  this.isProcessed = true;
  this.processedAt = new Date();
  if (attendanceRecordId) {
    this.attendanceRecordId = attendanceRecordId;
  }
  return this.save();
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get unprocessed logs
biometricLogSchema.statics.getUnprocessedLogs = function(firmId, limit = 100) {
  return this.find({
    firmId,
    isProcessed: false,
    eventType: { $in: ['check_in', 'check_out', 'break_start', 'break_end'] }
  })
    .sort({ timestamp: 1 })
    .limit(limit)
    .populate('employeeId', 'personalInfo.fullNameArabic personalInfo.fullNameEnglish employeeId')
    .populate('deviceId', 'deviceName deviceType');
};

// Get logs for employee
biometricLogSchema.statics.getEmployeeLogs = function(firmId, employeeId, startDate, endDate) {
  const query = { firmId, employeeId };

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .populate('deviceId', 'deviceName deviceType location.name');
};

// Get logs by device
biometricLogSchema.statics.getDeviceLogs = function(deviceId, startDate, endDate, limit = 100) {
  const query = { deviceId };

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('employeeId', 'personalInfo.fullNameArabic personalInfo.fullNameEnglish employeeId');
};

// Get verification statistics
biometricLogSchema.statics.getVerificationStats = async function(firmId, startDate, endDate) {
  const matchStage = { firmId };

  if (startDate || endDate) {
    matchStage.timestamp = {};
    if (startDate) matchStage.timestamp.$gte = new Date(startDate);
    if (endDate) matchStage.timestamp.$lte = new Date(endDate);
  }

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          eventType: '$eventType',
          verificationMethod: '$verificationMethod'
        },
        count: { $sum: 1 },
        avgVerificationTime: { $avg: '$verification.verificationTime' },
        successRate: {
          $avg: {
            $cond: ['$verification.passed', 1, 0]
          }
        }
      }
    },
    {
      $group: {
        _id: '$_id.eventType',
        methods: {
          $push: {
            method: '$_id.verificationMethod',
            count: '$count',
            avgTime: '$avgVerificationTime',
            successRate: '$successRate'
          }
        },
        totalCount: { $sum: '$count' }
      }
    }
  ]);

  return stats;
};

// Get failed verification attempts
biometricLogSchema.statics.getFailedAttempts = function(firmId, hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  return this.find({
    firmId,
    timestamp: { $gte: since },
    eventType: { $in: ['verify_fail', 'identify_fail'] }
  })
    .sort({ timestamp: -1 })
    .populate('employeeId', 'personalInfo.fullNameArabic personalInfo.fullNameEnglish employeeId')
    .populate('deviceId', 'deviceName deviceType');
};

// Get spoofing attempts
biometricLogSchema.statics.getSpoofingAttempts = function(firmId, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return this.find({
    firmId,
    timestamp: { $gte: since },
    eventType: 'spoofing_detected'
  })
    .sort({ timestamp: -1 })
    .populate('employeeId', 'personalInfo.fullNameArabic personalInfo.fullNameEnglish employeeId')
    .populate('deviceId', 'deviceName deviceType location.name');
};

// Get daily summary
biometricLogSchema.statics.getDailySummary = async function(firmId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const summary = await this.aggregate([
    {
      $match: {
        firmId: mongoose.Types.ObjectId(firmId),
        timestamp: { $gte: startOfDay, $lte: endOfDay }
      }
    },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
        uniqueEmployees: { $addToSet: '$employeeId' }
      }
    },
    {
      $project: {
        eventType: '$_id',
        count: 1,
        uniqueEmployees: { $size: '$uniqueEmployees' }
      }
    }
  ]);

  return summary;
};

module.exports = mongoose.model('BiometricLog', biometricLogSchema);
