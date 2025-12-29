/**
 * Leave Period Model
 *
 * Defines leave periods/fiscal years for leave management.
 * Supports carry forward settings.
 */

const mongoose = require('mongoose');
const Counter = require('./counter.model');

const leavePeriodSchema = new mongoose.Schema({
  // Unique identifier
  periodId: {
    type: String,
    unique: true,
    index: true
  },

  // Basic Info
  name: {
    type: String,
    required: [true, 'Period name is required'],
    trim: true
  },
  nameAr: {
    type: String,
    trim: true
  },

  // Period dates
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    index: true
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    index: true
  },

  // Carry forward settings
  allowCarryForward: {
    type: Boolean,
    default: true
  },
  carryForwardExpiryDate: Date,
  maxCarryForwardDays: {
    type: Number,
    default: 10,
    min: 0
  },
  carryForwardExpiryMonths: {
    type: Number,
    default: 3, // Carry forward expires after 3 months into new period
    min: 0
  },

  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isCurrent: {
    type: Boolean,
    default: false,
    index: true
  },
  isClosed: {
    type: Boolean,
    default: false
  },
  closedAt: Date,
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Firm reference (multi-tenant)
  firmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Firm',
    required: true,
    index: true
   },


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
  }
}, {
  timestamps: true
});

// Indexes
leavePeriodSchema.index({ firmId: 1, isActive: 1, isCurrent: 1 });
leavePeriodSchema.index({ firmId: 1, startDate: 1, endDate: 1 });

// Generate period ID before saving
leavePeriodSchema.pre('save', async function(next) {
  if (this.isNew && !this.periodId) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { model: 'LeavePeriod', firmId: this.firmId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.periodId = `LP-${String(counter.seq).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }

  // Calculate carry forward expiry date
  if (this.allowCarryForward && !this.carryForwardExpiryDate && this.endDate) {
    const expiryDate = new Date(this.endDate);
    expiryDate.setMonth(expiryDate.getMonth() + (this.carryForwardExpiryMonths || 3));
    this.carryForwardExpiryDate = expiryDate;
  }

  next();
});

// Ensure only one current period per firm
leavePeriodSchema.pre('save', async function(next) {
  if (this.isCurrent && this.isModified('isCurrent')) {
    await this.constructor.updateMany(
      { firmId: this.firmId, _id: { $ne: this._id }, isCurrent: true },
      { $set: { isCurrent: false } }
    );
  }
  next();
});

// Virtual for period status
leavePeriodSchema.virtual('status').get(function() {
  if (this.isClosed) return 'closed';
  const now = new Date();
  if (now < this.startDate) return 'upcoming';
  if (now > this.endDate) return 'ended';
  return 'active';
});

// Statics
leavePeriodSchema.statics.getCurrentPeriod = function(firmId) {
  return this.findOne({ firmId, isCurrent: true, isActive: true });
};

leavePeriodSchema.statics.getPeriodForDate = function(firmId, date) {
  return this.findOne({
    firmId,
    isActive: true,
    startDate: { $lte: date },
    endDate: { $gte: date }
  });
};

leavePeriodSchema.set('toJSON', { virtuals: true });
leavePeriodSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('LeavePeriod', leavePeriodSchema);
