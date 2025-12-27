const mongoose = require('mongoose');

const budgetTaskSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    estimatedHours: { type: Number, default: 0 },
    actualHours: { type: Number, default: 0 },
    estimatedAmount: { type: Number, default: 0 },
    actualAmount: { type: Number, default: 0 },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed'],
        default: 'pending'
    }
});

const budgetPhaseSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    budgetAmount: { type: Number, required: true },
    usedAmount: { type: Number, default: 0 },
    remainingAmount: Number,
    percentUsed: { type: Number, default: 0 },
    startDate: Date,
    endDate: Date,
    status: {
        type: String,
        enum: ['pending', 'active', 'completed'],
        default: 'pending'
    },
    tasks: [budgetTaskSchema]
});

const budgetCategorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    code: String, // LEDES/UTBMS code
    budgetAmount: { type: Number, required: true },
    usedAmount: { type: Number, default: 0 },
    remainingAmount: Number,
    percentUsed: { type: Number, default: 0 },
    subcategories: [{
        name: String,
        budgetAmount: Number,
        usedAmount: Number
    }]
});

const budgetAlertSchema = new mongoose.Schema({
    level: {
        type: String,
        enum: ['info', 'warning', 'critical'],
        required: true
    },
    message: { type: String, required: true },
    threshold: { type: Number, required: true },
    currentValue: { type: Number, required: true },
    triggeredAt: { type: Date, default: Date.now },
    acknowledged: { type: Boolean, default: false },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: Date
});

const matterBudgetSchema = new mongoose.Schema({
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
    matterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        required: true,
        index: true
    },
    matterNumber: {
        type: String,
        required: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    clientName: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: String,
    type: {
        type: String,
        enum: ['fixed', 'time_based', 'phased', 'contingency', 'hybrid'],
        required: true
    },
    currency: {
        type: String,
        default: 'SAR'
    },
    totalBudget: {
        type: Number,
        required: true
    },
    usedAmount: {
        type: Number,
        default: 0
    },
    remainingAmount: Number,
    percentUsed: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['draft', 'approved', 'active', 'over_budget', 'completed', 'cancelled'],
        default: 'draft'
    },
    phases: [budgetPhaseSchema],
    categories: [budgetCategorySchema],
    alerts: [budgetAlertSchema],
    alertThresholds: {
        warning: { type: Number, default: 80 },
        critical: { type: Number, default: 95 }
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: Date,
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    notes: String,
    attachments: [String],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
matterBudgetSchema.index({ lawyerId: 1, status: 1 });
matterBudgetSchema.index({ firmId: 1, lawyerId: 1 });
matterBudgetSchema.index({ matterId: 1 }, { unique: true });
matterBudgetSchema.index({ clientId: 1 });

// Pre-save hook to calculate remaining and percent
matterBudgetSchema.pre('save', function(next) {
    this.remainingAmount = this.totalBudget - this.usedAmount;
    this.percentUsed = this.totalBudget > 0 ? Math.round((this.usedAmount / this.totalBudget) * 100) : 0;

    // Update phases
    this.phases.forEach(phase => {
        phase.remainingAmount = phase.budgetAmount - phase.usedAmount;
        phase.percentUsed = phase.budgetAmount > 0 ? Math.round((phase.usedAmount / phase.budgetAmount) * 100) : 0;
    });

    // Update categories
    this.categories.forEach(category => {
        category.remainingAmount = category.budgetAmount - category.usedAmount;
        category.percentUsed = category.budgetAmount > 0 ? Math.round((category.usedAmount / category.budgetAmount) * 100) : 0;
    });

    // Check for alerts
    if (this.status === 'active') {
        if (this.percentUsed >= this.alertThresholds.critical && !this.alerts.find(a => a.level === 'critical' && !a.acknowledged)) {
            this.alerts.push({
                level: 'critical',
                message: `Budget is at ${this.percentUsed}% - critical threshold reached`,
                threshold: this.alertThresholds.critical,
                currentValue: this.percentUsed
            });
            this.status = 'over_budget';
        } else if (this.percentUsed >= this.alertThresholds.warning && !this.alerts.find(a => a.level === 'warning' && !a.acknowledged)) {
            this.alerts.push({
                level: 'warning',
                message: `Budget is at ${this.percentUsed}% - warning threshold reached`,
                threshold: this.alertThresholds.warning,
                currentValue: this.percentUsed
            });
        }
    }

    next();
});

// Static method: Add expense to budget
matterBudgetSchema.statics.addExpense = async function(matterId, amount, phaseId = null, categoryId = null) {
    const budget = await this.findOne({ matterId });
    if (!budget) return null;

    budget.usedAmount += amount;

    if (phaseId) {
        const phase = budget.phases.id(phaseId);
        if (phase) {
            phase.usedAmount += amount;
        }
    }

    if (categoryId) {
        const category = budget.categories.id(categoryId);
        if (category) {
            category.usedAmount += amount;
        }
    }

    return await budget.save();
};

// Static method: Get budget summary
matterBudgetSchema.statics.getSummary = async function(lawyerId) {
    const budgets = await this.find({ lawyerId, status: { $in: ['active', 'over_budget'] } });

    return {
        totalBudgets: budgets.length,
        totalBudgeted: budgets.reduce((sum, b) => sum + b.totalBudget, 0),
        totalUsed: budgets.reduce((sum, b) => sum + b.usedAmount, 0),
        overBudgetCount: budgets.filter(b => b.status === 'over_budget').length,
        nearLimitCount: budgets.filter(b => b.percentUsed >= 80 && b.percentUsed < 100).length
    };
};

module.exports = mongoose.model('MatterBudget', matterBudgetSchema);
