/**
 * Shift Type Model
 *
 * Defines work shift schedules with Saudi Labor Law compliance.
 * Saudi Labor Law Article 53: Working hours shall not exceed 8 hours per day
 * or 48 hours per week.
 *
 * Features:
 * - Regular and Ramadan shift timing
 * - Grace periods for attendance
 * - Overtime configuration (1.5x rate per Article 107)
 * - Auto attendance settings
 */

const mongoose = require('mongoose');
const Counter = require('./counter.model');

const shiftTypeSchema = new mongoose.Schema({
  // Unique identifier
  shiftTypeId: {
    type: String,
    unique: true,
    index: true
  },

  // Basic Info
  name: {
    type: String,
    required: [true, 'Shift name is required'],
    trim: true
  },
  nameAr: {
    type: String,
    required: [true, 'Arabic shift name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },

  // Timing
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    validate: {
      validator: function(v) {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
      },
      message: 'Invalid time format. Use HH:MM (24-hour)'
    }
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    validate: {
      validator: function(v) {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
      },
      message: 'Invalid time format. Use HH:MM (24-hour)'
    }
  },

  // Working hours calculation
  workingHours: {
    type: Number,
    min: 0,
    max: 24
  },

  // Auto attendance settings
  enableAutoAttendance: {
    type: Boolean,
    default: false
  },
  processAttendanceAfter: {
    type: Number,
    default: 30,
    min: 0,
    max: 1440 // Max 24 hours in minutes
  },
  determineCheckInAndCheckOutFromBiometric: {
    type: Boolean,
    default: true
  },

  // Grace periods (in minutes) - Saudi-specific
  beginCheckInBeforeShiftStart: {
    type: Number,
    default: 60,
    min: 0,
    max: 240
  },
  allowCheckOutAfterShiftEnd: {
    type: Number,
    default: 60,
    min: 0,
    max: 240
  },
  lateEntryGracePeriod: {
    type: Number,
    default: 15, // 15 minutes grace period
    min: 0,
    max: 60
  },
  earlyExitGracePeriod: {
    type: Number,
    default: 15,
    min: 0,
    max: 60
  },

  // Thresholds for attendance marking
  workingHoursThresholdForHalfDay: {
    type: Number,
    default: 4, // If worked less than 4 hours, mark as half day
    min: 0
  },
  workingHoursThresholdForAbsent: {
    type: Number,
    default: 2, // If worked less than 2 hours, mark as absent
    min: 0
  },

  // Break settings
  breakDuration: {
    type: Number,
    default: 60, // 60 minutes lunch break
    min: 0,
    max: 180
  },
  breakType: {
    type: String,
    enum: ['paid', 'unpaid'],
    default: 'unpaid'
  },
  breakStartTime: String,
  breakEndTime: String,

  // Overtime settings (Saudi Labor Law Article 107: 1.5x rate)
  allowOvertime: {
    type: Boolean,
    default: true
  },
  maxOvertimeHours: {
    type: Number,
    default: 2, // Maximum overtime per day
    min: 0,
    max: 8
  },
  overtimeMultiplier: {
    type: Number,
    default: 1.5, // 1.5x rate as per Saudi Labor Law
    min: 1
  },
  weekendOvertimeMultiplier: {
    type: Number,
    default: 2.0, // Double pay for weekend work
    min: 1
  },
  holidayOvertimeMultiplier: {
    type: Number,
    default: 2.0, // Double pay for holiday work
    min: 1
  },

  // Ramadan settings (reduced working hours during Ramadan)
  isRamadanShift: {
    type: Boolean,
    default: false
  },
  ramadanStartTime: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
      },
      message: 'Invalid time format. Use HH:MM (24-hour)'
    }
  },
  ramadanEndTime: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
      },
      message: 'Invalid time format. Use HH:MM (24-hour)'
    }
  },
  ramadanWorkingHours: {
    type: Number,
    default: 6, // 6 hours during Ramadan for Muslims
    min: 0
  },

  // Applicable days
  applicableDays: [{
    type: String,
    enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  }],

  // Night shift settings
  isNightShift: {
    type: Boolean,
    default: false
  },
  nightShiftAllowance: {
    type: Number,
    default: 0, // Additional allowance for night shift
    min: 0
  },

  // Flexible shift settings
  isFlexibleShift: {
    type: Boolean,
    default: false
  },
  coreHoursStart: String,
  coreHoursEnd: String,
  minHoursRequired: {
    type: Number,
    default: 8
  },

  // Color for calendar display
  color: {
    type: String,
    default: '#3B82F6' // Blue
  },

  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isDefault: {
    type: Boolean,
    default: false,
    index: true
  },

  // Firm reference (multi-tenant)
  firmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Firm',
    required: true,
    index: true
  },

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
shiftTypeSchema.index({ firmId: 1, isActive: 1 });
shiftTypeSchema.index({ firmId: 1, isDefault: 1 });
shiftTypeSchema.index({ firmId: 1, shiftTypeId: 1 }, { unique: true });

// Generate shift type ID before saving
shiftTypeSchema.pre('save', async function(next) {
  if (this.isNew && !this.shiftTypeId) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { model: 'ShiftType', firmId: this.firmId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.shiftTypeId = `ST-${String(counter.seq).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }

  // Calculate working hours if not set
  if (!this.workingHours && this.startTime && this.endTime) {
    const [startHour, startMin] = this.startTime.split(':').map(Number);
    const [endHour, endMin] = this.endTime.split(':').map(Number);

    let totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60; // Overnight shift
    }

    // Subtract break if unpaid
    if (this.breakType === 'unpaid' && this.breakDuration) {
      totalMinutes -= this.breakDuration;
    }

    this.workingHours = totalMinutes / 60;
  }

  // Set default applicable days if not set
  if (!this.applicableDays || this.applicableDays.length === 0) {
    // Default Saudi work week: Sunday to Thursday
    this.applicableDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
  }

  next();
});

// Ensure only one default shift per firm
shiftTypeSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { firmId: this.firmId, _id: { $ne: this._id }, isDefault: true },
      { $set: { isDefault: false } }
    );
  }
  next();
});

// Virtual for display name
shiftTypeSchema.virtual('displayName').get(function() {
  return `${this.name} (${this.startTime} - ${this.endTime})`;
});

// Virtual for current timing (considering Ramadan)
shiftTypeSchema.virtual('currentTiming').get(function() {
  // Note: This is a simplified check. Real implementation should use Hijri calendar
  const now = new Date();
  const isRamadan = false; // This should be calculated from Hijri calendar

  if (this.isRamadanShift && isRamadan && this.ramadanStartTime && this.ramadanEndTime) {
    return {
      startTime: this.ramadanStartTime,
      endTime: this.ramadanEndTime,
      workingHours: this.ramadanWorkingHours,
      isRamadanTiming: true
    };
  }

  return {
    startTime: this.startTime,
    endTime: this.endTime,
    workingHours: this.workingHours,
    isRamadanTiming: false
  };
});

// Methods
shiftTypeSchema.methods.isLate = function(checkInTime) {
  if (!checkInTime) return false;

  const [shiftHour, shiftMin] = this.startTime.split(':').map(Number);
  const checkIn = new Date(checkInTime);
  const shiftStart = new Date(checkIn);
  shiftStart.setHours(shiftHour, shiftMin, 0, 0);

  // Add grace period
  const graceEnd = new Date(shiftStart);
  graceEnd.setMinutes(graceEnd.getMinutes() + this.lateEntryGracePeriod);

  return checkIn > graceEnd;
};

shiftTypeSchema.methods.isEarlyExit = function(checkOutTime) {
  if (!checkOutTime) return false;

  const [shiftHour, shiftMin] = this.endTime.split(':').map(Number);
  const checkOut = new Date(checkOutTime);
  const shiftEnd = new Date(checkOut);
  shiftEnd.setHours(shiftHour, shiftMin, 0, 0);

  // Subtract grace period
  const graceStart = new Date(shiftEnd);
  graceStart.setMinutes(graceStart.getMinutes() - this.earlyExitGracePeriod);

  return checkOut < graceStart;
};

shiftTypeSchema.methods.calculateOvertime = function(hoursWorked) {
  if (!this.allowOvertime || hoursWorked <= this.workingHours) {
    return 0;
  }

  const overtime = Math.min(hoursWorked - this.workingHours, this.maxOvertimeHours);
  return overtime;
};

// Statics
shiftTypeSchema.statics.getActiveShifts = function(firmId) {
  return this.find({ firmId, isActive: true }).sort({ name: 1 });
};

shiftTypeSchema.statics.getDefaultShift = function(firmId) {
  return this.findOne({ firmId, isActive: true, isDefault: true });
};

shiftTypeSchema.statics.getRamadanShifts = function(firmId) {
  return this.find({ firmId, isActive: true, isRamadanShift: true });
};

// Ensure indexes are created
shiftTypeSchema.set('toJSON', { virtuals: true });
shiftTypeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ShiftType', shiftTypeSchema);
