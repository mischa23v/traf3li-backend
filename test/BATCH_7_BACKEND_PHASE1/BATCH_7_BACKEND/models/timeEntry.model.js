const mongoose = require('mongoose');

const timeEntrySchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    startTime: {
      type: String,
      required: true, // Format: "HH:mm" (e.g., "09:30")
    },
    endTime: {
      type: String, // Format: "HH:mm"
    },
    duration: {
      type: Number,
      required: true, // Duration in minutes
      min: 1,
    },
    hourlyRate: {
      type: Number,
      required: true, // Rate in SAR
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true, // Calculated: (duration / 60) * hourlyRate
      min: 0,
    },
    isBillable: {
      type: Boolean,
      default: true, // Can this be billed to client?
    },
    isBilled: {
      type: Boolean,
      default: false, // Has this been invoiced?
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice', // Link to invoice when billed
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
    // Timer data (if created from timer)
    wasTimerBased: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
timeEntrySchema.index({ caseId: 1, date: -1 });
timeEntrySchema.index({ userId: 1, date: -1 });
timeEntrySchema.index({ isBilled: 1, isBillable: 1 });
timeEntrySchema.index({ date: -1 });

// Pre-save: Calculate total amount
timeEntrySchema.pre('save', function(next) {
  if (this.isModified('duration') || this.isModified('hourlyRate')) {
    const hours = this.duration / 60;
    this.totalAmount = Math.round(hours * this.hourlyRate * 100) / 100; // Round to 2 decimals
  }
  next();
});

// Static method: Get time stats
timeEntrySchema.statics.getTimeStats = async function(filters = {}) {
  const matchStage = {};
  
  if (filters.userId) matchStage.userId = mongoose.Types.ObjectId(filters.userId);
  if (filters.caseId) matchStage.caseId = mongoose.Types.ObjectId(filters.caseId);
  if (filters.startDate || filters.endDate) {
    matchStage.date = {};
    if (filters.startDate) matchStage.date.$gte = new Date(filters.startDate);
    if (filters.endDate) matchStage.date.$lte = new Date(filters.endDate);
  }

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalMinutes: { $sum: '$duration' },
        billableMinutes: {
          $sum: { $cond: ['$isBillable', '$duration', 0] }
        },
        nonBillableMinutes: {
          $sum: { $cond: ['$isBillable', 0, '$duration'] }
        },
        totalAmount: { $sum: '$totalAmount' },
        billedAmount: {
          $sum: { $cond: ['$isBilled', '$totalAmount', 0] }
        },
        unbilledAmount: {
          $sum: { $cond: ['$isBilled', 0, '$totalAmount'] }
        },
      },
    },
  ]);

  return stats[0] || {
    totalMinutes: 0,
    billableMinutes: 0,
    nonBillableMinutes: 0,
    totalAmount: 0,
    billedAmount: 0,
    unbilledAmount: 0,
  };
};

// Static method: Get time by case
timeEntrySchema.statics.getTimeByCase = async function(userId, filters = {}) {
  const matchStage = { userId: mongoose.Types.ObjectId(userId) };
  
  if (filters.startDate || filters.endDate) {
    matchStage.date = {};
    if (filters.startDate) matchStage.date.$gte = new Date(filters.startDate);
    if (filters.endDate) matchStage.date.$lte = new Date(filters.endDate);
  }

  return await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$caseId',
        totalMinutes: { $sum: '$duration' },
        totalAmount: { $sum: '$totalAmount' },
        entryCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'cases',
        localField: '_id',
        foreignField: '_id',
        as: 'case',
      },
    },
    { $unwind: '$case' },
    {
      $project: {
        caseId: '$_id',
        caseNumber: '$case.caseNumber',
        caseTitle: '$case.title',
        totalMinutes: 1,
        totalAmount: 1,
        entryCount: 1,
        _id: 0,
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);
};

// Static method: Get time by day
timeEntrySchema.statics.getTimeByDay = async function(filters = {}) {
  const matchStage = {};
  
  if (filters.userId) matchStage.userId = mongoose.Types.ObjectId(filters.userId);
  if (filters.caseId) matchStage.caseId = mongoose.Types.ObjectId(filters.caseId);
  if (filters.startDate || filters.endDate) {
    matchStage.date = {};
    if (filters.startDate) matchStage.date.$gte = new Date(filters.startDate);
    if (filters.endDate) matchStage.date.$lte = new Date(filters.endDate);
  }

  return await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$date' }
        },
        totalMinutes: { $sum: '$duration' },
        totalAmount: { $sum: '$totalAmount' },
        entryCount: { $sum: 1 },
      },
    },
    {
      $project: {
        date: '$_id',
        totalMinutes: 1,
        totalAmount: 1,
        entryCount: 1,
        _id: 0,
      },
    },
    { $sort: { date: 1 } },
  ]);
};

// Static method: Mark entries as billed
timeEntrySchema.statics.markAsBilled = async function(entryIds, invoiceId) {
  return await this.updateMany(
    { _id: { $in: entryIds } },
    {
      $set: {
        isBilled: true,
        invoiceId: invoiceId,
      },
    }
  );
};

const TimeEntry = mongoose.model('TimeEntry', timeEntrySchema);

module.exports = TimeEntry;
