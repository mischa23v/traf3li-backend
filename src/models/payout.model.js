const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// PAYOUT ENUMS
// ═══════════════════════════════════════════════════════════════
const PAYOUT_STATUSES = [
    'pending',      // Payout request created but not yet processed
    'processing',   // Being processed by Stripe
    'paid',         // Successfully paid
    'failed',       // Failed to process
    'cancelled'     // Cancelled by admin or lawyer
];

const PAYOUT_TYPES = [
    'earnings',     // Regular earnings payout
    'bonus',        // Bonus payout
    'commission',   // Commission payout
    'refund',       // Refund to lawyer
    'adjustment'    // Manual adjustment
];

const payoutSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },

    // ═══════════════════════════════════════════════════════════════
    // BASIC INFO
    // ═══════════════════════════════════════════════════════════════
    payoutNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    payoutType: {
        type: String,
        enum: PAYOUT_TYPES,
        default: 'earnings',
        index: true
    },
    status: {
        type: String,
        enum: PAYOUT_STATUSES,
        default: 'pending',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // AMOUNT DETAILS
    // ═══════════════════════════════════════════════════════════════
    // Gross amount (before platform commission)
    grossAmount: {
        type: Number,
        required: true,
        min: 0
    },
    // Platform commission amount
    platformCommission: {
        type: Number,
        default: 0,
        min: 0
    },
    // Commission rate used
    commissionRate: {
        type: Number,
        default: 10,
        min: 0,
        max: 100
    },
    // Net amount (after commission, what lawyer receives)
    netAmount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'SAR',
        uppercase: true
    },

    // ═══════════════════════════════════════════════════════════════
    // STRIPE CONNECT DETAILS
    // ═══════════════════════════════════════════════════════════════
    stripeConnectAccountId: {
        type: String,
        required: false,
        index: true
    },
    stripePayoutId: {
        type: String,
        required: false,
        index: true,
        sparse: true
    },
    stripeTransferId: {
        type: String,
        required: false,
        index: true,
        sparse: true
    },
    stripeBalanceTransactionId: {
        type: String,
        required: false
    },

    // ═══════════════════════════════════════════════════════════════
    // DATES
    // ═══════════════════════════════════════════════════════════════
    requestedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    processedAt: {
        type: Date,
        required: false
    },
    paidAt: {
        type: Date,
        required: false,
        index: true
    },
    expectedArrivalDate: {
        type: Date,
        required: false
    },

    // ═══════════════════════════════════════════════════════════════
    // PAYMENT REFERENCES
    // ═══════════════════════════════════════════════════════════════
    // Link to specific payments this payout is for
    paymentIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment'
    }],
    // Link to specific cases
    caseIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case'
    }],
    // Link to specific invoices
    invoiceIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice'
    }],
    // Period covered by this payout
    periodStart: {
        type: Date,
        required: false
    },
    periodEnd: {
        type: Date,
        required: false
    },

    // ═══════════════════════════════════════════════════════════════
    // FAILURE TRACKING
    // ═══════════════════════════════════════════════════════════════
    failureReason: {
        type: String,
        required: false
    },
    failureCode: {
        type: String,
        required: false
    },
    failureDate: {
        type: Date,
        required: false
    },
    retryCount: {
        type: Number,
        default: 0
    },
    lastRetryAt: {
        type: Date,
        required: false
    },

    // ═══════════════════════════════════════════════════════════════
    // CANCELLATION
    // ═══════════════════════════════════════════════════════════════
    cancelledAt: {
        type: Date,
        required: false
    },
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    cancellationReason: {
        type: String,
        required: false
    },

    // ═══════════════════════════════════════════════════════════════
    // NOTES & METADATA
    // ═══════════════════════════════════════════════════════════════
    description: {
        type: String,
        required: false,
        maxlength: 500
    },
    internalNotes: {
        type: String,
        required: false,
        maxlength: 1000
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    approvedAt: {
        type: Date,
        required: false
    }
}, {
    versionKey: false,
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
payoutSchema.index({ payoutNumber: 1 });
payoutSchema.index({ firmId: 1, requestedAt: -1 });
payoutSchema.index({ lawyerId: 1, status: 1 });
payoutSchema.index({ lawyerId: 1, requestedAt: -1 });
payoutSchema.index({ status: 1, requestedAt: -1 });
payoutSchema.index({ stripePayoutId: 1 }, { sparse: true });
payoutSchema.index({ stripeTransferId: 1 }, { sparse: true });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
payoutSchema.pre('save', async function(next) {
    // Auto-generate payout number
    if (this.isNew && !this.payoutNumber) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const count = await this.constructor.countDocuments({
            payoutNumber: new RegExp(`^PAYOUT-${year}${month}`)
        });
        this.payoutNumber = `PAYOUT-${year}${month}-${String(count + 1).padStart(5, '0')}`;
    }

    // Calculate platform commission and net amount
    if (this.isModified('grossAmount') || this.isModified('commissionRate')) {
        this.platformCommission = (this.grossAmount * this.commissionRate) / 100;
        this.netAmount = this.grossAmount - this.platformCommission;
    }

    // Set processedAt when status changes to processing
    if (this.isModified('status') && this.status === 'processing' && !this.processedAt) {
        this.processedAt = new Date();
    }

    // Set paidAt when status changes to paid
    if (this.isModified('status') && this.status === 'paid' && !this.paidAt) {
        this.paidAt = new Date();
    }

    // Set failureDate when status changes to failed
    if (this.isModified('status') && this.status === 'failed' && !this.failureDate) {
        this.failureDate = new Date();
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get payout statistics for a lawyer
 */
payoutSchema.statics.getLawyerStats = async function(lawyerId, filters = {}) {
    const matchStage = { lawyerId: new mongoose.Types.ObjectId(lawyerId) };

    if (filters.firmId) {
        matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
    }
    if (filters.startDate || filters.endDate) {
        matchStage.requestedAt = {};
        if (filters.startDate) matchStage.requestedAt.$gte = new Date(filters.startDate);
        if (filters.endDate) matchStage.requestedAt.$lte = new Date(filters.endDate);
    }

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalPayouts: { $sum: 1 },
                totalGrossAmount: { $sum: '$grossAmount' },
                totalCommission: { $sum: '$platformCommission' },
                totalNetAmount: { $sum: '$netAmount' },
                paidAmount: {
                    $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$netAmount', 0] }
                },
                pendingAmount: {
                    $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$netAmount', 0] }
                },
                processingAmount: {
                    $sum: { $cond: [{ $eq: ['$status', 'processing'] }, '$netAmount', 0] }
                },
                failedCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                }
            }
        }
    ]);

    return stats[0] || {
        totalPayouts: 0,
        totalGrossAmount: 0,
        totalCommission: 0,
        totalNetAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        processingAmount: 0,
        failedCount: 0
    };
};

/**
 * Get platform commission stats
 */
payoutSchema.statics.getPlatformStats = async function(filters = {}) {
    const matchStage = {};

    if (filters.firmId) {
        matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
    }
    if (filters.startDate || filters.endDate) {
        matchStage.requestedAt = {};
        if (filters.startDate) matchStage.requestedAt.$gte = new Date(filters.startDate);
        if (filters.endDate) matchStage.requestedAt.$lte = new Date(filters.endDate);
    }

    return await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalPayouts: { $sum: 1 },
                totalGrossAmount: { $sum: '$grossAmount' },
                totalCommissionEarned: { $sum: '$platformCommission' },
                totalPaidOut: { $sum: '$netAmount' },
                averageCommissionRate: { $avg: '$commissionRate' }
            }
        }
    ]);
};

/**
 * Get pending payouts
 */
payoutSchema.statics.getPendingPayouts = async function(filters = {}) {
    const matchStage = { status: 'pending' };

    if (filters.firmId) {
        matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
    }
    if (filters.lawyerId) {
        matchStage.lawyerId = new mongoose.Types.ObjectId(filters.lawyerId);
    }

    return await this.find(matchStage)
        .populate('lawyerId', 'firstName lastName email stripeConnectAccountId')
        .populate('createdBy', 'firstName lastName')
        .sort({ requestedAt: 1 });
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Mark payout as paid
 */
payoutSchema.methods.markAsPaid = async function(stripePayoutId, balanceTransactionId = null) {
    this.status = 'paid';
    this.stripePayoutId = stripePayoutId;
    this.paidAt = new Date();

    if (balanceTransactionId) {
        this.stripeBalanceTransactionId = balanceTransactionId;
    }

    await this.save();
    return this;
};

/**
 * Mark payout as failed
 */
payoutSchema.methods.markAsFailed = async function(failureReason, failureCode = null) {
    this.status = 'failed';
    this.failureReason = failureReason;
    this.failureCode = failureCode;
    this.failureDate = new Date();
    this.retryCount += 1;
    this.lastRetryAt = new Date();

    await this.save();
    return this;
};

/**
 * Cancel payout
 */
payoutSchema.methods.cancel = async function(userId, reason) {
    if (this.status === 'paid') {
        throw new Error('Cannot cancel a payout that has already been paid');
    }
    if (this.status === 'processing') {
        throw new Error('Cannot cancel a payout that is being processed');
    }

    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.cancelledBy = userId;
    this.cancellationReason = reason;

    await this.save();
    return this;
};

/**
 * Retry failed payout
 */
payoutSchema.methods.retry = async function() {
    if (this.status !== 'failed') {
        throw new Error('Can only retry failed payouts');
    }

    this.status = 'pending';
    this.failureReason = null;
    this.failureCode = null;
    this.failureDate = null;
    this.lastRetryAt = new Date();

    await this.save();
    return this;
};

// Export constants for use in controllers
payoutSchema.statics.PAYOUT_STATUSES = PAYOUT_STATUSES;
payoutSchema.statics.PAYOUT_TYPES = PAYOUT_TYPES;

module.exports = mongoose.model('Payout', payoutSchema);
