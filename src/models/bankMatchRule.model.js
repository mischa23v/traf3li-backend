const mongoose = require('mongoose');

const amountMatchSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['exact', 'range', 'percentage'],
        default: 'exact'
    },
    tolerance: {
        type: Number,
        default: 0,
        min: 0
    }
}, { _id: false });

const dateMatchSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['exact', 'range'],
        default: 'range'
    },
    daysTolerance: {
        type: Number,
        default: 7,
        min: 0,
        max: 90
    }
}, { _id: false });

const descriptionMatchSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['contains', 'exact', 'regex', 'fuzzy', 'starts_with', 'ends_with'],
        default: 'contains'
    },
    patterns: {
        type: [String],
        default: []
    },
    minSimilarity: {
        type: Number,
        default: 0.8,
        min: 0,
        max: 1
    },
    caseSensitive: {
        type: Boolean,
        default: false
    }
}, { _id: false });

const criteriaSchema = new mongoose.Schema({
    amountMatch: {
        type: amountMatchSchema,
        default: () => ({ type: 'exact', tolerance: 0 })
    },
    dateMatch: {
        type: dateMatchSchema,
        default: () => ({ type: 'range', daysTolerance: 7 })
    },
    descriptionMatch: {
        type: descriptionMatchSchema,
        default: () => ({ type: 'contains', patterns: [], minSimilarity: 0.8 })
    },
    referenceMatch: {
        type: Boolean,
        default: false
    },
    vendorMatch: {
        type: Boolean,
        default: false
    },
    clientMatch: {
        type: Boolean,
        default: false
    },
    categoryMatch: {
        type: String,
        trim: true
    },
    minAmount: {
        type: Number,
        min: 0
    },
    maxAmount: {
        type: Number,
        min: 0
    },
    transactionTypes: {
        type: [String],
        enum: ['credit', 'debit'],
        default: []
    }
}, { _id: false });

const actionsSchema = new mongoose.Schema({
    autoMatch: {
        type: Boolean,
        default: false
    },
    autoReconcile: {
        type: Boolean,
        default: false
    },
    autoCategory: {
        type: String,
        trim: true
    },
    accountCode: {
        type: String,
        trim: true
    },
    addTags: {
        type: [String],
        default: []
    },
    setPayee: {
        type: String,
        trim: true
    },
    requireConfirmation: {
        type: Boolean,
        default: true
    }
}, { _id: false });

const bankMatchRuleSchema = new mongoose.Schema({
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    priority: {
        type: Number,
        required: true,
        default: 100,
        min: 0,
        max: 1000
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    criteria: {
        type: criteriaSchema,
        required: true
    },
    actions: {
        type: actionsSchema,
        required: true
    },
    matchType: {
        type: String,
        enum: ['invoice', 'expense', 'payment', 'bill', 'transfer', 'journal', 'any'],
        default: 'any'
    },
    bankAccountIds: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'BankAccount',
        default: []
    },
    timesMatched: {
        type: Number,
        default: 0
    },
    timesApplied: {
        type: Number,
        default: 0
    },
    lastMatchedAt: {
        type: Date
    },
    successRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
bankMatchRuleSchema.index({ firmId: 1, priority: -1 });
bankMatchRuleSchema.index({ lawyerId: 1, isActive: 1 });
bankMatchRuleSchema.index({ firmId: 1, isActive: 1, priority: -1 });
bankMatchRuleSchema.index({ name: 'text', description: 'text' });

// Validate priority is unique per firm
bankMatchRuleSchema.pre('save', async function(next) {
    if (this.isModified('priority')) {
        const existing = await this.constructor.findOne({
            firmId: this.firmId,
            priority: this.priority,
            _id: { $ne: this._id },
            isActive: true
        });

        if (existing) {
            // Auto-adjust priority if conflict
            const maxPriority = await this.constructor.findOne({
                firmId: this.firmId,
                isActive: true
            }).sort({ priority: -1 });

            this.priority = (maxPriority?.priority || 0) + 10;
        }
    }
    next();
});

// Instance method: Record match
bankMatchRuleSchema.methods.recordMatch = function(successful = true) {
    this.timesApplied += 1;
    if (successful) {
        this.timesMatched += 1;
        this.lastMatchedAt = new Date();
    }
    this.successRate = (this.timesMatched / this.timesApplied) * 100;
};

// Instance method: Test if rule matches transaction
bankMatchRuleSchema.methods.testMatch = function(transaction) {
    const criteria = this.criteria;
    const results = {
        matches: true,
        scores: {},
        reasons: []
    };

    // Check transaction type
    if (criteria.transactionTypes && criteria.transactionTypes.length > 0) {
        if (!criteria.transactionTypes.includes(transaction.type)) {
            results.matches = false;
            results.reasons.push('Transaction type does not match');
            return results;
        }
    }

    // Check amount range
    if (criteria.minAmount !== undefined && transaction.amount < criteria.minAmount) {
        results.matches = false;
        results.reasons.push(`Amount ${transaction.amount} is below minimum ${criteria.minAmount}`);
        return results;
    }

    if (criteria.maxAmount !== undefined && transaction.amount > criteria.maxAmount) {
        results.matches = false;
        results.reasons.push(`Amount ${transaction.amount} is above maximum ${criteria.maxAmount}`);
        return results;
    }

    // Check bank account
    if (this.bankAccountIds && this.bankAccountIds.length > 0) {
        const accountMatch = this.bankAccountIds.some(id =>
            id.toString() === transaction.accountId.toString()
        );
        if (!accountMatch) {
            results.matches = false;
            results.reasons.push('Bank account does not match');
            return results;
        }
    }

    return results;
};

// Static method: Get rules for bank account
bankMatchRuleSchema.statics.getRulesForAccount = async function(bankAccountId, options = {}) {
    const query = {
        isActive: true,
        $or: [
            { bankAccountIds: { $size: 0 } }, // Apply to all accounts
            { bankAccountIds: bankAccountId }
        ]
    };

    if (options.firmId) {
        query.firmId = options.firmId;
    }

    return await this.find(query).sort({ priority: -1 });
};

// Static method: Get rule statistics
bankMatchRuleSchema.statics.getStatistics = async function(lawyerId, firmId) {
    const match = { lawyerId };
    if (firmId) match.firmId = firmId;

    return await this.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                totalRules: { $sum: 1 },
                activeRules: {
                    $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
                },
                totalMatches: { $sum: '$timesMatched' },
                avgSuccessRate: { $avg: '$successRate' }
            }
        }
    ]);
};

// Static method: Get most effective rules
bankMatchRuleSchema.statics.getMostEffective = async function(firmId, limit = 10) {
    return await this.find({
        firmId,
        isActive: true,
        timesApplied: { $gte: 5 }
    })
    .sort({ successRate: -1, timesMatched: -1 })
    .limit(limit);
};

// Static method: Duplicate rule
bankMatchRuleSchema.statics.duplicateRule = async function(ruleId, userId) {
    const original = await this.findById(ruleId);
    if (!original) {
        throw new Error('Rule not found');
    }

    const duplicate = new this({
        ...original.toObject(),
        _id: undefined,
        name: `${original.name} (Copy)`,
        priority: original.priority + 1,
        timesMatched: 0,
        timesApplied: 0,
        lastMatchedAt: null,
        successRate: 0,
        createdBy: userId,
        createdAt: undefined,
        updatedAt: undefined
    });

    return await duplicate.save();
};

module.exports = mongoose.model('BankMatchRule', bankMatchRuleSchema);
