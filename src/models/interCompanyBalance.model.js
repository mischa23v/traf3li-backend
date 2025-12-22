const mongoose = require('mongoose');

/**
 * InterCompanyBalance Model
 * Tracks running balances between two firms for inter-company transactions
 */
const interCompanyBalanceSchema = new mongoose.Schema({
    // Source and target firms (ordered pair)
    sourceFirmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    targetFirmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },

    // Balance tracking
    // Positive = sourceFirm owes targetFirm
    // Negative = targetFirm owes sourceFirm
    currentBalance: {
        type: Number,
        default: 0,
        required: true
    },
    currency: {
        type: String,
        default: 'SAR'
    },

    // Summary statistics
    totalTransactions: {
        type: Number,
        default: 0
    },
    totalDebits: {
        type: Number,
        default: 0
    },
    totalCredits: {
        type: Number,
        default: 0
    },

    // Last transaction info
    lastTransactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InterCompanyTransaction'
    },
    lastTransactionDate: Date,

    // Reconciliation
    lastReconciledBalance: {
        type: Number,
        default: 0
    },
    lastReconciledAt: Date,
    lastReconciledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reconciledTransactionCount: {
        type: Number,
        default: 0
    },

    // Status
    status: {
        type: String,
        enum: ['active', 'suspended', 'closed'],
        default: 'active',
        index: true
    },

    // Notes and metadata
    notes: String,
    creditLimit: Number, // Optional credit limit between firms
    paymentTerms: {
        type: Number,
        default: 30 // Days
    },

    // Audit
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    versionKey: false
});

// Validation - ensure firms are different
interCompanyBalanceSchema.pre('validate', function(next) {
    if (this.sourceFirmId.toString() === this.targetFirmId.toString()) {
        next(new Error('Source and target firms must be different'));
    }
    next();
});

// Compound indexes
interCompanyBalanceSchema.index({ sourceFirmId: 1, targetFirmId: 1 }, { unique: true });
interCompanyBalanceSchema.index({ targetFirmId: 1, sourceFirmId: 1 });
interCompanyBalanceSchema.index({ status: 1, currentBalance: 1 });
interCompanyBalanceSchema.index({ lastTransactionDate: -1 });

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Update balance based on a new transaction
 * @param {Number} amount - Transaction amount
 * @param {String} type - Transaction type (debit/credit)
 * @param {ObjectId} transactionId - ID of the transaction
 */
interCompanyBalanceSchema.methods.updateBalance = async function(amount, type, transactionId) {
    if (type === 'debit') {
        this.currentBalance += amount;
        this.totalDebits += amount;
    } else if (type === 'credit') {
        this.currentBalance -= amount;
        this.totalCredits += amount;
    }

    this.totalTransactions += 1;
    this.lastTransactionId = transactionId;
    this.lastTransactionDate = new Date();

    await this.save();
    return this;
};

/**
 * Reconcile the balance
 * @param {ObjectId} userId - User performing the reconciliation
 * @param {String} notes - Reconciliation notes
 */
interCompanyBalanceSchema.methods.reconcile = async function(userId, notes = null) {
    this.lastReconciledBalance = this.currentBalance;
    this.lastReconciledAt = new Date();
    this.lastReconciledBy = userId;
    this.reconciledTransactionCount = this.totalTransactions;

    if (notes) {
        this.notes = notes;
    }

    await this.save();
    return this;
};

/**
 * Check if balance exceeds credit limit
 */
interCompanyBalanceSchema.methods.isOverLimit = function() {
    if (!this.creditLimit) return false;
    return Math.abs(this.currentBalance) > this.creditLimit;
};

/**
 * Get the absolute balance amount
 */
interCompanyBalanceSchema.methods.getAbsoluteBalance = function() {
    return Math.abs(this.currentBalance);
};

/**
 * Get balance direction (who owes whom)
 */
interCompanyBalanceSchema.methods.getBalanceDirection = function() {
    if (this.currentBalance > 0) {
        return {
            debtor: this.sourceFirmId,
            creditor: this.targetFirmId,
            amount: this.currentBalance
        };
    } else if (this.currentBalance < 0) {
        return {
            debtor: this.targetFirmId,
            creditor: this.sourceFirmId,
            amount: Math.abs(this.currentBalance)
        };
    }
    return { debtor: null, creditor: null, amount: 0 };
};

/**
 * Check if balance needs reconciliation
 */
interCompanyBalanceSchema.methods.needsReconciliation = function() {
    if (!this.lastReconciledAt) return this.totalTransactions > 0;
    return this.totalTransactions > this.reconciledTransactionCount;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get or create balance record for two firms
 * @param {ObjectId} sourceFirmId - Source firm ID
 * @param {ObjectId} targetFirmId - Target firm ID
 * @param {ObjectId} userId - User creating the record
 */
interCompanyBalanceSchema.statics.getOrCreate = async function(sourceFirmId, targetFirmId, userId = null) {
    // Ensure consistent ordering (smaller ID always as source)
    const [firmA, firmB] = [sourceFirmId.toString(), targetFirmId.toString()].sort();

    let balance = await this.findOne({
        sourceFirmId: firmA,
        targetFirmId: firmB
    });

    if (!balance) {
        balance = await this.create({
            sourceFirmId: firmA,
            targetFirmId: firmB,
            currentBalance: 0,
            createdBy: userId
        });
    }

    return balance;
};

/**
 * Get all balances for a specific firm
 * @param {ObjectId} firmId - Firm ID
 * @param {String} status - Optional status filter
 */
interCompanyBalanceSchema.statics.getBalancesForFirm = async function(firmId, status = 'active') {
    const query = {
        $or: [
            { sourceFirmId: firmId },
            { targetFirmId: firmId }
        ]
    };

    if (status) {
        query.status = status;
    }

    return this.find(query)
        .populate('sourceFirmId', 'name nameArabic')
        .populate('targetFirmId', 'name nameArabic')
        .sort({ lastTransactionDate: -1 });
};

/**
 * Get balances that need reconciliation
 * @param {Number} threshold - Minimum transaction count difference
 */
interCompanyBalanceSchema.statics.getNeedingReconciliation = async function(threshold = 10) {
    return this.find({
        status: 'active',
        $expr: {
            $gte: [
                { $subtract: ['$totalTransactions', '$reconciledTransactionCount'] },
                threshold
            ]
        }
    })
        .populate('sourceFirmId', 'name')
        .populate('targetFirmId', 'name')
        .sort({ lastTransactionDate: -1 });
};

/**
 * Get balances over credit limit
 */
interCompanyBalanceSchema.statics.getOverLimit = async function() {
    return this.find({
        status: 'active',
        creditLimit: { $exists: true, $ne: null },
        $expr: {
            $gt: [{ $abs: '$currentBalance' }, '$creditLimit']
        }
    })
        .populate('sourceFirmId', 'name')
        .populate('targetFirmId', 'name');
};

/**
 * Calculate total inter-company exposure for a firm
 * @param {ObjectId} firmId - Firm ID
 */
interCompanyBalanceSchema.statics.getTotalExposure = async function(firmId) {
    const balances = await this.find({
        $or: [
            { sourceFirmId: firmId },
            { targetFirmId: firmId }
        ],
        status: 'active'
    });

    let totalReceivable = 0;
    let totalPayable = 0;

    balances.forEach(balance => {
        const direction = balance.getBalanceDirection();
        if (direction.debtor && direction.debtor.toString() === firmId.toString()) {
            totalPayable += direction.amount;
        } else if (direction.creditor && direction.creditor.toString() === firmId.toString()) {
            totalReceivable += direction.amount;
        }
    });

    return {
        totalReceivable,
        totalPayable,
        netPosition: totalReceivable - totalPayable
    };
};

module.exports = mongoose.model('InterCompanyBalance', interCompanyBalanceSchema);
