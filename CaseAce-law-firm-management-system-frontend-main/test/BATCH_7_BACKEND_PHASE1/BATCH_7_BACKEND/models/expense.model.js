const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      enum: ['court_fees', 'travel', 'consultation', 'documents', 'research', 'other'],
      required: true,
      default: 'other',
    },
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
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
    receiptUrl: {
      type: String, // Cloudinary/S3 URL
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
    isBillable: {
      type: Boolean,
      default: false, // Can this be charged to client?
    },
    isReimbursed: {
      type: Boolean,
      default: false, // Has lawyer been reimbursed?
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice', // Link to invoice if billed
    },
    reimbursedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
expenseSchema.index({ caseId: 1, date: -1 });
expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ isBillable: 1, invoiceId: 1 });
expenseSchema.index({ date: -1 });

// Static method: Get expense stats
expenseSchema.statics.getExpenseStats = async function(filters = {}) {
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
        totalExpenses: { $sum: '$amount' },
        billableExpenses: {
          $sum: { $cond: ['$isBillable', '$amount', 0] }
        },
        nonBillableExpenses: {
          $sum: { $cond: ['$isBillable', 0, '$amount'] }
        },
        reimbursedExpenses: {
          $sum: { $cond: ['$isReimbursed', '$amount', 0] }
        },
        expenseCount: { $sum: 1 },
      },
    },
  ]);

  return stats[0] || {
    totalExpenses: 0,
    billableExpenses: 0,
    nonBillableExpenses: 0,
    reimbursedExpenses: 0,
    expenseCount: 0,
  };
};

// Static method: Get expenses by category
expenseSchema.statics.getExpensesByCategory = async function(filters = {}) {
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
        _id: '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        category: '$_id',
        total: 1,
        count: 1,
        _id: 0,
      },
    },
    { $sort: { total: -1 } },
  ]);
};

// Static method: Get expenses by month
expenseSchema.statics.getExpensesByMonth = async function(filters = {}) {
  const matchStage = {};
  
  if (filters.userId) matchStage.userId = mongoose.Types.ObjectId(filters.userId);
  if (filters.caseId) matchStage.caseId = mongoose.Types.ObjectId(filters.caseId);

  return await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
        },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        month: {
          $dateFromParts: {
            year: '$_id.year',
            month: '$_id.month',
          },
        },
        total: 1,
        count: 1,
        _id: 0,
      },
    },
    { $sort: { month: 1 } },
  ]);
};

// Static method: Mark as reimbursed
expenseSchema.statics.markAsReimbursed = async function(expenseIds) {
  return await this.updateMany(
    { _id: { $in: expenseIds } },
    {
      $set: {
        isReimbursed: true,
        reimbursedAt: new Date(),
      },
    }
  );
};

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;
