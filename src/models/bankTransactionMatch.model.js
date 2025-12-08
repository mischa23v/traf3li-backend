const mongoose = require('mongoose');

const splitMatchSchema = new mongoose.Schema({
    matchType: {
        type: String,
        enum: ['invoice', 'expense', 'payment', 'bill', 'transfer', 'journal'],
        required: true
    },
    matchedRecordId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'splits.matchType'
    },
    amount: {
        type: Number,
        required: true,
        min: 0.01
    },
    description: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        trim: true
    }
}, { _id: true });

const bankTransactionMatchSchema = new mongoose.Schema({
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    bankTransactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankTransaction',
        required: true,
        index: true
    },
    matchType: {
        type: String,
        enum: ['invoice', 'expense', 'payment', 'bill', 'transfer', 'journal', 'other'],
        required: true,
        index: true
    },
    matchedRecordId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'matchType'
    },
    matchScore: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 0
    },
    matchMethod: {
        type: String,
        enum: ['manual', 'rule_based', 'ai_suggested', 'reference', 'auto'],
        required: true,
        default: 'manual',
        index: true
    },
    matchedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    matchedAt: {
        type: Date,
        index: true
    },
    ruleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankMatchRule',
        index: true
    },
    status: {
        type: String,
        enum: ['suggested', 'confirmed', 'rejected', 'auto_confirmed'],
        required: true,
        default: 'suggested',
        index: true
    },
    isSplit: {
        type: Boolean,
        default: false,
        index: true
    },
    splits: {
        type: [splitMatchSchema],
        default: []
    },
    confidence: {
        type: String,
        enum: ['low', 'medium', 'high', 'exact'],
        default: 'medium'
    },
    matchReasons: {
        type: [String],
        default: []
    },
    rejectionReason: {
        type: String,
        trim: true
    },
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedAt: {
        type: Date
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
bankTransactionMatchSchema.index({ firmId: 1, status: 1 });
bankTransactionMatchSchema.index({ lawyerId: 1, status: 1 });
bankTransactionMatchSchema.index({ bankTransactionId: 1, status: 1 });
bankTransactionMatchSchema.index({ matchedRecordId: 1, status: 1 });
bankTransactionMatchSchema.index({ ruleId: 1, status: 1 });
bankTransactionMatchSchema.index({ matchScore: -1, status: 1 });
bankTransactionMatchSchema.index({ createdAt: -1, status: 1 });

// Unique index to prevent duplicate matches
bankTransactionMatchSchema.index(
    { bankTransactionId: 1, matchedRecordId: 1, status: 1 },
    { unique: true, partialFilterExpression: { status: { $in: ['confirmed', 'auto_confirmed'] } } }
);

// Pre-save validation
bankTransactionMatchSchema.pre('save', function(next) {
    // Validate split amounts
    if (this.isSplit && this.splits.length > 0) {
        const totalSplit = this.splits.reduce((sum, split) => sum + split.amount, 0);
        // Allow small rounding differences
        const difference = Math.abs(totalSplit - this.metadata.transactionAmount);
        if (difference > 0.01) {
            return next(new Error(`Split amounts (${totalSplit}) must equal transaction amount (${this.metadata.transactionAmount})`));
        }
    }

    // Set confidence based on match score
    if (this.matchScore >= 95) {
        this.confidence = 'exact';
    } else if (this.matchScore >= 80) {
        this.confidence = 'high';
    } else if (this.matchScore >= 60) {
        this.confidence = 'medium';
    } else {
        this.confidence = 'low';
    }

    next();
});

// Instance method: Confirm match
bankTransactionMatchSchema.methods.confirm = async function(userId) {
    if (this.status === 'confirmed' || this.status === 'auto_confirmed') {
        throw new Error('Match is already confirmed');
    }

    if (this.status === 'rejected') {
        throw new Error('Cannot confirm a rejected match');
    }

    this.status = 'confirmed';
    this.matchedBy = userId;
    this.matchedAt = new Date();

    // Update the bank transaction
    const BankTransaction = mongoose.model('BankTransaction');
    await BankTransaction.findByIdAndUpdate(this.bankTransactionId, {
        matched: true,
        matchedType: this.matchType,
        matchedTransactionId: this.matchedRecordId
    });

    // Update rule statistics if rule-based
    if (this.ruleId) {
        const BankMatchRule = mongoose.model('BankMatchRule');
        const rule = await BankMatchRule.findById(this.ruleId);
        if (rule) {
            rule.recordMatch(true);
            await rule.save();
        }
    }

    return await this.save();
};

// Instance method: Reject match
bankTransactionMatchSchema.methods.reject = async function(userId, reason) {
    if (this.status === 'confirmed' || this.status === 'auto_confirmed') {
        throw new Error('Cannot reject a confirmed match. Unmatch it first.');
    }

    this.status = 'rejected';
    this.rejectedBy = userId;
    this.rejectedAt = new Date();
    this.rejectionReason = reason;

    // Update rule statistics if rule-based
    if (this.ruleId) {
        const BankMatchRule = mongoose.model('BankMatchRule');
        const rule = await BankMatchRule.findById(this.ruleId);
        if (rule) {
            rule.recordMatch(false);
            await rule.save();
        }
    }

    return await this.save();
};

// Instance method: Unmatch (reverse a confirmed match)
bankTransactionMatchSchema.methods.unmatch = async function(userId) {
    if (this.status !== 'confirmed' && this.status !== 'auto_confirmed') {
        throw new Error('Can only unmatch confirmed matches');
    }

    // Update the bank transaction
    const BankTransaction = mongoose.model('BankTransaction');
    await BankTransaction.findByIdAndUpdate(this.bankTransactionId, {
        matched: false,
        matchedType: null,
        matchedTransactionId: null
    });

    // Delete the match record
    await this.deleteOne();
};

// Static method: Get matches for transaction
bankTransactionMatchSchema.statics.getMatchesForTransaction = async function(bankTransactionId, includeRejected = false) {
    const query = { bankTransactionId };
    if (!includeRejected) {
        query.status = { $ne: 'rejected' };
    }
    return await this.find(query).sort({ matchScore: -1 });
};

// Static method: Get confirmed match for transaction
bankTransactionMatchSchema.statics.getConfirmedMatch = async function(bankTransactionId) {
    return await this.findOne({
        bankTransactionId,
        status: { $in: ['confirmed', 'auto_confirmed'] }
    });
};

// Static method: Get suggestions for review
bankTransactionMatchSchema.statics.getSuggestionsForReview = async function(firmId, options = {}) {
    const query = {
        firmId,
        status: 'suggested'
    };

    if (options.minScore) {
        query.matchScore = { $gte: options.minScore };
    }

    if (options.confidence) {
        query.confidence = options.confidence;
    }

    const limit = options.limit || 50;
    const skip = options.skip || 0;

    return await this.find(query)
        .sort({ matchScore: -1, createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('bankTransactionId')
        .populate('matchedBy', 'firstName lastName email');
};

// Static method: Get match statistics
bankTransactionMatchSchema.statics.getStatistics = async function(lawyerId, firmId, dateRange) {
    const match = { lawyerId };
    if (firmId) match.firmId = firmId;
    if (dateRange) {
        match.createdAt = {
            $gte: new Date(dateRange.start),
            $lte: new Date(dateRange.end)
        };
    }

    return await this.aggregate([
        { $match: match },
        {
            $facet: {
                overview: [
                    {
                        $group: {
                            _id: null,
                            totalMatches: { $sum: 1 },
                            confirmed: {
                                $sum: { $cond: [{ $in: ['$status', ['confirmed', 'auto_confirmed']] }, 1, 0] }
                            },
                            suggested: {
                                $sum: { $cond: [{ $eq: ['$status', 'suggested'] }, 1, 0] }
                            },
                            rejected: {
                                $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
                            },
                            avgScore: { $avg: '$matchScore' },
                            splitMatches: {
                                $sum: { $cond: ['$isSplit', 1, 0] }
                            }
                        }
                    }
                ],
                byMethod: [
                    {
                        $group: {
                            _id: '$matchMethod',
                            count: { $sum: 1 },
                            avgScore: { $avg: '$matchScore' }
                        }
                    }
                ],
                byType: [
                    {
                        $group: {
                            _id: '$matchType',
                            count: { $sum: 1 },
                            confirmed: {
                                $sum: { $cond: [{ $in: ['$status', ['confirmed', 'auto_confirmed']] }, 1, 0] }
                            }
                        }
                    }
                ],
                byConfidence: [
                    {
                        $group: {
                            _id: '$confidence',
                            count: { $sum: 1 }
                        }
                    }
                ]
            }
        }
    ]);
};

// Static method: Create split match
bankTransactionMatchSchema.statics.createSplitMatch = async function(data) {
    const { bankTransactionId, splits, userId, firmId, lawyerId } = data;

    // Validate splits
    if (!splits || splits.length < 2) {
        throw new Error('Split match requires at least 2 splits');
    }

    const BankTransaction = mongoose.model('BankTransaction');
    const transaction = await BankTransaction.findById(bankTransactionId);
    if (!transaction) {
        throw new Error('Bank transaction not found');
    }

    const totalSplit = splits.reduce((sum, split) => sum + split.amount, 0);
    if (Math.abs(totalSplit - transaction.amount) > 0.01) {
        throw new Error(`Split amounts (${totalSplit}) must equal transaction amount (${transaction.amount})`);
    }

    const match = new this({
        firmId,
        lawyerId,
        bankTransactionId,
        matchType: 'other',
        matchMethod: 'manual',
        matchScore: 100,
        status: 'confirmed',
        isSplit: true,
        splits,
        matchedBy: userId,
        matchedAt: new Date(),
        confidence: 'exact',
        matchReasons: ['Manual split match'],
        metadata: {
            transactionAmount: transaction.amount
        }
    });

    await match.save();

    // Update the bank transaction
    await BankTransaction.findByIdAndUpdate(bankTransactionId, {
        matched: true,
        matchedType: 'split'
    });

    return match;
};

// Static method: Bulk confirm suggestions
bankTransactionMatchSchema.statics.bulkConfirm = async function(matchIds, userId) {
    const results = {
        confirmed: 0,
        errors: []
    };

    for (const matchId of matchIds) {
        try {
            const match = await this.findById(matchId);
            if (match) {
                await match.confirm(userId);
                results.confirmed++;
            }
        } catch (error) {
            results.errors.push({
                matchId,
                error: error.message
            });
        }
    }

    return results;
};

module.exports = mongoose.model('BankTransactionMatch', bankTransactionMatchSchema);
