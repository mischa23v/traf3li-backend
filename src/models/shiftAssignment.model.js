/**
 * Shift Assignment Model
 *
 * Assigns shifts to employees with support for:
 * - Permanent assignments
 * - Temporary assignments with dates
 * - Rotational shifts
 * - Bulk assignments
 */

const mongoose = require('mongoose');
const Counter = require('./counter.model');

const shiftAssignmentSchema = new mongoose.Schema({
  // Unique identifier
  assignmentId: {
    type: String,
    unique: true,
    index: true
  },

  // Employee reference
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Employee is required'],
    index: true
  },

  // Shift reference
  shiftTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShiftType',
    required: [true, 'Shift type is required'],
    index: true
  },

  // Assignment period
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    index: true
  },
  endDate: {
    type: Date,
    index: true
    // null means permanent assignment
  },

  // Assignment type
  assignmentType: {
    type: String,
    enum: ['permanent', 'temporary', 'rotational', 'substitute'],
    default: 'permanent'
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'completed', 'cancelled'],
    default: 'active',
    index: true
  },

  // Rotational shift pattern (if isRotational is true)
  isRotational: {
    type: Boolean,
    default: false
  },
  rotationPattern: [{
    shiftTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShiftType'
    },
    days: [{
      type: String,
      enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    }],
    weekNumber: Number // For weekly rotation: 1, 2, 3, etc.
  }],
  rotationFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'biweekly', 'monthly'],
    default: 'weekly'
  },

  // Override for specific dates
  dateOverrides: [{
    date: Date,
    shiftTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShiftType'
    },
    reason: String
  }],

  // Substitute assignment
  substituteFor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  substituteReason: String,

  // Priority (for handling multiple assignments)
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },

  // Notes
  notes: {
    type: String,
    trim: true
  },

  // Firm reference (multi-tenant)
  firmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Firm',
    required: true,
    index: true
  },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
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
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: Date,
  cancelReason: String
}, {
  timestamps: true
});

// Indexes
shiftAssignmentSchema.index({ firmId: 1, employeeId: 1, status: 1 });
shiftAssignmentSchema.index({ firmId: 1, shiftTypeId: 1, status: 1 });
shiftAssignmentSchema.index({ firmId: 1, startDate: 1, endDate: 1 });
shiftAssignmentSchema.index({ firmId: 1, employeeId: 1, startDate: 1, endDate: 1 });

// Generate assignment ID before saving
shiftAssignmentSchema.pre('save', async function(next) {
  if (this.isNew && !this.assignmentId) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { model: 'ShiftAssignment', firmId: this.firmId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.assignmentId = `SA-${String(counter.seq).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }

  // Set status to completed if end date is past
  if (this.endDate && new Date(this.endDate) < new Date() && this.status === 'active') {
    this.status = 'completed';
  }

  next();
});

// Check for overlapping assignments before save
shiftAssignmentSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('startDate') || this.isModified('endDate')) {
    const query = {
      firmId: this.firmId,
      employeeId: this.employeeId,
      status: 'active',
      _id: { $ne: this._id }
    };

    // Check for date overlap
    if (this.endDate) {
      query.$or = [
        {
          startDate: { $lte: this.endDate },
          $or: [
            { endDate: { $gte: this.startDate } },
            { endDate: null }
          ]
        }
      ];
    } else {
      // Permanent assignment - check for any overlapping active assignment
      query.startDate = { $lte: this.startDate };
      query.$or = [
        { endDate: { $gte: this.startDate } },
        { endDate: null }
      ];
    }

    const overlapping = await this.constructor.findOne(query);
    if (overlapping) {
      // Instead of error, mark the overlapping assignment as completed
      await this.constructor.updateOne(
        { _id: overlapping._id },
        {
          status: 'completed',
          endDate: new Date(this.startDate.getTime() - 24 * 60 * 60 * 1000) // Day before new assignment
        }
      );
    }
  }

  next();
});

// Virtual for checking if assignment is active now
shiftAssignmentSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  const isAfterStart = this.startDate <= now;
  const isBeforeEnd = !this.endDate || this.endDate >= now;
  return this.status === 'active' && isAfterStart && isBeforeEnd;
});

// Virtual for days remaining
shiftAssignmentSchema.virtual('daysRemaining').get(function() {
  if (!this.endDate || this.status !== 'active') return null;
  const now = new Date();
  const diff = this.endDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Methods
shiftAssignmentSchema.methods.getShiftForDate = async function(date) {
  // Check for date override first
  const override = this.dateOverrides?.find(
    o => o.date.toDateString() === date.toDateString()
  );
  if (override) {
    return mongoose.model('ShiftType').findById(override.shiftTypeId);
  }

  // Check rotational pattern
  if (this.isRotational && this.rotationPattern?.length > 0) {
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];

    // Find rotation based on frequency
    if (this.rotationFrequency === 'weekly') {
      const weekNumber = Math.ceil((date - this.startDate) / (7 * 24 * 60 * 60 * 1000));
      const patternIndex = weekNumber % this.rotationPattern.length;
      const pattern = this.rotationPattern[patternIndex];

      if (pattern?.days?.includes(dayName)) {
        return mongoose.model('ShiftType').findById(pattern.shiftTypeId);
      }
    }

    // Find pattern for this day
    for (const pattern of this.rotationPattern) {
      if (pattern.days?.includes(dayName)) {
        return mongoose.model('ShiftType').findById(pattern.shiftTypeId);
      }
    }
  }

  // Return default shift
  return mongoose.model('ShiftType').findById(this.shiftTypeId);
};

shiftAssignmentSchema.methods.cancel = async function(userId, reason) {
  this.status = 'cancelled';
  this.cancelledBy = userId;
  this.cancelledAt = new Date();
  this.cancelReason = reason;
  return this.save();
};

// Statics
shiftAssignmentSchema.statics.getActiveAssignment = function(firmId, employeeId, date = new Date()) {
  return this.findOne({
    firmId,
    employeeId,
    status: 'active',
    startDate: { $lte: date },
    $or: [
      { endDate: null },
      { endDate: { $gte: date } }
    ]
  })
  .populate('shiftTypeId')
  .sort({ priority: -1 });
};

shiftAssignmentSchema.statics.getEmployeeAssignments = function(firmId, employeeId, options = {}) {
  const query = { firmId, employeeId };

  if (options.status) {
    query.status = options.status;
  }

  if (options.startDate && options.endDate) {
    query.$or = [
      {
        startDate: { $lte: options.endDate },
        $or: [
          { endDate: { $gte: options.startDate } },
          { endDate: null }
        ]
      }
    ];
  }

  return this.find(query)
    .populate('shiftTypeId')
    .sort({ startDate: -1 });
};

shiftAssignmentSchema.statics.getShiftAssignments = function(firmId, shiftTypeId, options = {}) {
  const query = {
    firmId,
    shiftTypeId,
    status: options.status || 'active'
  };

  return this.find(query)
    .populate('employeeId', 'employeeNumber firstName lastName')
    .sort({ employeeId: 1 });
};

shiftAssignmentSchema.statics.bulkAssign = async function(firmId, shiftTypeId, employeeIds, startDate, endDate, createdBy) {
  const assignments = employeeIds.map(employeeId => ({
    firmId,
    shiftTypeId,
    employeeId,
    startDate,
    endDate,
    assignmentType: endDate ? 'temporary' : 'permanent',
    createdBy
  }));

  return this.insertMany(assignments);
};

// Ensure indexes are created
shiftAssignmentSchema.set('toJSON', { virtuals: true });
shiftAssignmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ShiftAssignment', shiftAssignmentSchema);
