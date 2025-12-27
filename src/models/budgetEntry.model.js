const mongoose = require('mongoose');

const budgetEntrySchema = new mongoose.Schema({
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },
    budgetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MatterBudget',
        required: true
    },
    phaseId: mongoose.Schema.Types.ObjectId,
    categoryId: mongoose.Schema.Types.ObjectId,
    entryType: {
        type: String,
        enum: ['time', 'expense'],
        required: true
    },
    sourceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    sourceType: {
        type: String,
        enum: ['time_entry', 'expense', 'invoice_line'],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    staffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    staffName: String
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
budgetEntrySchema.index({ lawyerId: 1, budgetId: 1 });
budgetEntrySchema.index({ budgetId: 1, date: -1 });
budgetEntrySchema.index({ sourceId: 1, sourceType: 1 });
budgetEntrySchema.index({ firmId: 1, budgetId: 1 });

// Post-save hook to update budget
budgetEntrySchema.post('save', async function() {
    const MatterBudget = mongoose.model('MatterBudget');
    await MatterBudget.addExpense(
        this.budgetId,
        this.amount,
        this.phaseId,
        this.categoryId
    );
});

// Static method: Get entries for budget
budgetEntrySchema.statics.getEntriesForBudget = async function(budgetId, filters = {}) {
    const query = { budgetId };

    if (filters.entryType) query.entryType = filters.entryType;
    if (filters.phaseId) query.phaseId = filters.phaseId;
    if (filters.categoryId) query.categoryId = filters.categoryId;
    if (filters.startDate) query.date = { $gte: new Date(filters.startDate) };
    if (filters.endDate) query.date = { ...query.date, $lte: new Date(filters.endDate) };

    return await this.find(query)
        .sort({ date: -1 })
        .populate('staffId', 'firstName lastName');
};

module.exports = mongoose.model('BudgetEntry', budgetEntrySchema);
