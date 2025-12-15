/**
 * Corporate Card Model
 *
 * Manages corporate credit/debit cards and their transactions.
 * Supports transaction import, categorization, and reconciliation.
 */

const mongoose = require('mongoose');

const cardTransactionSchema = new mongoose.Schema({
    transactionId: { type: String, required: true }, // External transaction ID
    transactionDate: { type: Date, required: true },
    postingDate: { type: Date },
    merchantName: { type: String, required: true },
    merchantCategory: { type: String },
    merchantCategoryCode: { type: String }, // MCC code
    description: { type: String },
    amount: { type: Number, required: true }, // In halalas (positive = charge, negative = credit)
    currency: { type: String, default: 'SAR' },
    originalAmount: { type: Number }, // If foreign currency
    originalCurrency: { type: String },
    exchangeRate: { type: Number },

    // Reconciliation
    status: {
        type: String,
        enum: ['pending', 'matched', 'reconciled', 'disputed', 'ignored'],
        default: 'pending'
    },
    matchedExpenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense' },
    matchedBillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' },
    reconciledAt: { type: Date },
    reconciledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Categorization
    category: { type: String },
    categoryAr: { type: String },
    autoCategoirzed: { type: Boolean, default: false },
    categoryConfidence: { type: Number }, // AI categorization confidence

    // Billable
    isBillable: { type: Boolean, default: false },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },

    // Dispute
    disputeReason: { type: String },
    disputeStatus: {
        type: String,
        enum: ['pending', 'resolved', 'won', 'lost']
    },
    disputeReference: { type: String },
    disputedAt: { type: Date },
    disputeResolvedAt: { type: Date },

    // Notes
    notes: { type: String },

    importedAt: { type: Date, default: Date.now }
}, { _id: true });

const corporateCardSchema = new mongoose.Schema({
    // Multi-tenancy
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // Card Information
    cardName: { type: String, required: true, trim: true },
    cardNameAr: { type: String, trim: true },
    cardType: {
        type: String,
        enum: ['credit', 'debit', 'prepaid', 'corporate', 'virtual'],
        required: true
    },
    cardBrand: {
        type: String,
        enum: ['visa', 'mastercard', 'amex', 'mada', 'other'],
        required: true
    },
    cardNumber: {
        type: String,
        required: true
    }, // Stored as last 4 digits only
    issuingBank: { type: String, trim: true },
    issuingBankAr: { type: String, trim: true },

    // Card Holder
    cardHolderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    cardHolderName: { type: String, trim: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },

    // Limits
    creditLimit: { type: Number }, // In halalas
    dailyLimit: { type: Number },
    monthlyLimit: { type: Number },
    singleTransactionLimit: { type: Number },

    // Current Balance
    currentBalance: { type: Number, default: 0 }, // In halalas
    availableCredit: { type: Number, default: 0 },
    pendingAmount: { type: Number, default: 0 },

    // Billing
    billingCycle: {
        startDay: { type: Number, min: 1, max: 28 },
        dueDay: { type: Number, min: 1, max: 28 }
    },
    statementClosingDay: { type: Number, min: 1, max: 28 },

    // Linked Bank Account
    linkedBankAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankAccount'
    },
    linkedGLAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    },

    // Expense Policy
    expensePolicyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExpensePolicy'
    },

    // Status
    status: {
        type: String,
        enum: ['active', 'blocked', 'expired', 'cancelled', 'pending_activation'],
        default: 'active',
        index: true
    },
    expiryDate: { type: Date },
    activatedAt: { type: Date },
    blockedAt: { type: Date },
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    blockReason: { type: String },

    // Transactions
    transactions: [cardTransactionSchema],
    lastSyncAt: { type: Date },
    syncStatus: {
        type: String,
        enum: ['idle', 'syncing', 'error'],
        default: 'idle'
    },
    syncError: { type: String },

    // Auto-categorization settings
    autoCategorization: {
        enabled: { type: Boolean, default: true },
        rules: [{
            merchantPattern: { type: String }, // Regex pattern
            category: { type: String },
            isBillable: { type: Boolean }
        }]
    },

    // Alerts
    alerts: {
        lowBalanceThreshold: { type: Number },
        highSpendingThreshold: { type: Number },
        unusualActivityEnabled: { type: Boolean, default: true }
    },

    // Statistics
    stats: {
        totalSpent: { type: Number, default: 0 }, // All time
        monthlySpent: { type: Number, default: 0 }, // Current month
        transactionCount: { type: Number, default: 0 },
        pendingTransactions: { type: Number, default: 0 },
        disputedTransactions: { type: Number, default: 0 },
        lastStatUpdate: { type: Date }
    },

    // Notes
    notes: { type: String },
    internalNotes: { type: String },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true,
    versionKey: false
});

// Indexes
corporateCardSchema.index({ firmId: 1, status: 1 });
corporateCardSchema.index({ firmId: 1, cardHolderId: 1 });
corporateCardSchema.index({ firmId: 1, cardNumber: 1 }, { unique: true });
corporateCardSchema.index({ lawyerId: 1, status: 1 });
corporateCardSchema.index({ 'transactions.transactionId': 1 });
corporateCardSchema.index({ 'transactions.status': 1 });

/**
 * Add transaction to card
 */
corporateCardSchema.methods.addTransaction = async function(transaction) {
    // Check for duplicate
    const exists = this.transactions.some(t => t.transactionId === transaction.transactionId);
    if (exists) {
        throw new Error('Transaction already exists');
    }

    // Auto-categorize if enabled
    if (this.autoCategorization?.enabled) {
        const category = this.autoCategorizeMerchant(transaction.merchantName);
        if (category) {
            transaction.category = category.category;
            transaction.isBillable = category.isBillable || false;
            transaction.autoCategoirzed = true;
        }
    }

    this.transactions.push(transaction);

    // Update stats
    this.stats.transactionCount++;
    this.stats.pendingTransactions++;
    this.currentBalance += transaction.amount;

    await this.save();
    return this;
};

/**
 * Import transactions from statement
 */
corporateCardSchema.methods.importTransactions = async function(transactions, userId) {
    const imported = [];
    const duplicates = [];
    const errors = [];

    for (const tx of transactions) {
        try {
            const exists = this.transactions.some(t => t.transactionId === tx.transactionId);
            if (exists) {
                duplicates.push(tx.transactionId);
                continue;
            }

            // Auto-categorize
            if (this.autoCategorization?.enabled) {
                const category = this.autoCategorizeMerchant(tx.merchantName);
                if (category) {
                    tx.category = category.category;
                    tx.isBillable = category.isBillable || false;
                    tx.autoCategoirzed = true;
                }
            }

            tx.importedAt = new Date();
            this.transactions.push(tx);
            imported.push(tx.transactionId);

            // Update balance
            this.currentBalance += tx.amount;
        } catch (error) {
            errors.push({ transactionId: tx.transactionId, error: error.message });
        }
    }

    // Update stats
    this.stats.transactionCount += imported.length;
    this.stats.pendingTransactions += imported.length;
    this.lastSyncAt = new Date();
    this.updatedBy = userId;

    await this.save();

    return {
        imported: imported.length,
        duplicates: duplicates.length,
        errors: errors.length,
        importedIds: imported,
        duplicateIds: duplicates,
        errorDetails: errors
    };
};

/**
 * Auto-categorize merchant
 */
corporateCardSchema.methods.autoCategorizeMerchant = function(merchantName) {
    if (!this.autoCategorization?.rules?.length) return null;

    for (const rule of this.autoCategorization.rules) {
        try {
            const regex = new RegExp(rule.merchantPattern, 'i');
            if (regex.test(merchantName)) {
                return rule;
            }
        } catch (e) {
            // Invalid regex, skip
        }
    }

    return null;
};

/**
 * Reconcile transaction
 */
corporateCardSchema.methods.reconcileTransaction = async function(transactionId, expenseId, userId) {
    const transaction = this.transactions.find(t => t.transactionId === transactionId);
    if (!transaction) {
        throw new Error('Transaction not found');
    }

    if (transaction.status === 'reconciled') {
        throw new Error('Transaction already reconciled');
    }

    transaction.status = 'reconciled';
    transaction.matchedExpenseId = expenseId;
    transaction.reconciledAt = new Date();
    transaction.reconciledBy = userId;

    this.stats.pendingTransactions--;
    this.updatedBy = userId;

    await this.save();
    return transaction;
};

/**
 * Dispute transaction
 */
corporateCardSchema.methods.disputeTransaction = async function(transactionId, reason, userId) {
    const transaction = this.transactions.find(t => t.transactionId === transactionId);
    if (!transaction) {
        throw new Error('Transaction not found');
    }

    transaction.status = 'disputed';
    transaction.disputeReason = reason;
    transaction.disputeStatus = 'pending';
    transaction.disputedAt = new Date();

    this.stats.disputedTransactions++;
    this.stats.pendingTransactions--;
    this.updatedBy = userId;

    await this.save();
    return transaction;
};

/**
 * Block card
 */
corporateCardSchema.methods.block = async function(userId, reason) {
    if (this.status === 'blocked') {
        throw new Error('Card is already blocked');
    }

    this.status = 'blocked';
    this.blockedAt = new Date();
    this.blockedBy = userId;
    this.blockReason = reason;
    this.updatedBy = userId;

    await this.save();
    return this;
};

/**
 * Unblock card
 */
corporateCardSchema.methods.unblock = async function(userId) {
    if (this.status !== 'blocked') {
        throw new Error('Card is not blocked');
    }

    this.status = 'active';
    this.blockedAt = null;
    this.blockedBy = null;
    this.blockReason = null;
    this.updatedBy = userId;

    await this.save();
    return this;
};

/**
 * Get unmatched transactions
 */
corporateCardSchema.methods.getUnmatchedTransactions = function() {
    return this.transactions.filter(t => t.status === 'pending');
};

/**
 * Update monthly stats
 */
corporateCardSchema.methods.updateMonthlyStats = function() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    this.stats.monthlySpent = this.transactions
        .filter(t => new Date(t.transactionDate) >= startOfMonth && t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);

    this.stats.totalSpent = this.transactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);

    this.stats.lastStatUpdate = now;
};

/**
 * Static: Get summary for firm
 */
corporateCardSchema.statics.getSummary = async function(firmId, lawyerId) {
    const query = firmId ? { firmId } : { lawyerId };

    const cards = await this.find({ ...query, status: { $in: ['active', 'blocked'] } });

    return {
        totalCards: cards.length,
        activeCards: cards.filter(c => c.status === 'active').length,
        blockedCards: cards.filter(c => c.status === 'blocked').length,
        totalBalance: cards.reduce((sum, c) => sum + c.currentBalance, 0),
        totalCreditLimit: cards.reduce((sum, c) => sum + (c.creditLimit || 0), 0),
        pendingTransactions: cards.reduce((sum, c) => sum + (c.stats?.pendingTransactions || 0), 0),
        monthlySpending: cards.reduce((sum, c) => sum + (c.stats?.monthlySpent || 0), 0)
    };
};

/**
 * Static: Get spending by category
 */
corporateCardSchema.statics.getSpendingByCategory = async function(firmId, lawyerId, startDate, endDate) {
    const query = firmId ? { firmId } : { lawyerId };

    const result = await this.aggregate([
        { $match: { ...query, status: { $in: ['active', 'blocked'] } } },
        { $unwind: '$transactions' },
        {
            $match: {
                'transactions.transactionDate': {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                },
                'transactions.amount': { $gt: 0 }
            }
        },
        {
            $group: {
                _id: '$transactions.category',
                total: { $sum: '$transactions.amount' },
                count: { $sum: 1 }
            }
        },
        { $sort: { total: -1 } }
    ]);

    return result.map(r => ({
        category: r._id || 'Uncategorized',
        total: r.total,
        count: r.count
    }));
};

module.exports = mongoose.model('CorporateCard', corporateCardSchema);
