const mongoose = require('mongoose');

const reconciliationTransactionSchema = new mongoose.Schema({
    transactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankTransaction',
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
    type: {
        type: String,
        enum: ['credit', 'debit'],
        required: true
    },
    description: String,
    isCleared: {
        type: Boolean,
        default: false
    },
    clearedAt: Date,
    clearedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { _id: true });

const bankReconciliationSchema = new mongoose.Schema({
    reconciliationNumber: {
        type: String,
        unique: true,
        index: true
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankAccount',
        required: true,
        index: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    openingBalance: {
        type: Number,
        required: true
    },
    closingBalance: {
        type: Number,
        default: 0
    },
    statementBalance: {
        type: Number,
        required: true
    },
    difference: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'cancelled'],
        default: 'in_progress',
        index: true
    },
    transactions: [reconciliationTransactionSchema],
    totalCredits: {
        type: Number,
        default: 0
    },
    totalDebits: {
        type: Number,
        default: 0
    },
    clearedCredits: {
        type: Number,
        default: 0
    },
    clearedDebits: {
        type: Number,
        default: 0
    },
    startedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    completedAt: Date,
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    cancelledAt: Date,
    notes: {
        type: String,
        trim: true,
        maxlength: 2000
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
bankReconciliationSchema.index({ lawyerId: 1, accountId: 1 });
bankReconciliationSchema.index({ lawyerId: 1, status: 1 });
bankReconciliationSchema.index({ accountId: 1, endDate: -1 });

// Pre-save hook to generate reconciliation number
bankReconciliationSchema.pre('save', async function(next) {
    if (!this.reconciliationNumber) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const count = await this.constructor.countDocuments({
            createdAt: {
                $gte: new Date(year, date.getMonth(), 1),
                $lt: new Date(year, date.getMonth() + 1, 1)
            }
        });
        this.reconciliationNumber = `REC-${year}${month}-${String(count + 1).padStart(4, '0')}`;
    }

    // Calculate totals and difference
    this.calculateTotals();

    next();
});

// Instance method: Calculate totals
bankReconciliationSchema.methods.calculateTotals = function() {
    let totalCredits = 0;
    let totalDebits = 0;
    let clearedCredits = 0;
    let clearedDebits = 0;

    for (const txn of this.transactions) {
        if (txn.type === 'credit') {
            totalCredits += txn.amount;
            if (txn.isCleared) clearedCredits += txn.amount;
        } else {
            totalDebits += txn.amount;
            if (txn.isCleared) clearedDebits += txn.amount;
        }
    }

    this.totalCredits = totalCredits;
    this.totalDebits = totalDebits;
    this.clearedCredits = clearedCredits;
    this.clearedDebits = clearedDebits;

    // Calculate closing balance and difference
    this.closingBalance = this.openingBalance + clearedCredits - clearedDebits;
    this.difference = this.closingBalance - this.statementBalance;
};

// Instance method: Clear a transaction
bankReconciliationSchema.methods.clearTransaction = function(transactionId, userId) {
    const txn = this.transactions.find(t => t.transactionId.toString() === transactionId.toString());
    if (!txn) {
        throw new Error('Transaction not found in reconciliation');
    }

    txn.isCleared = true;
    txn.clearedAt = new Date();
    txn.clearedBy = userId;

    this.calculateTotals();
    return txn;
};

// Instance method: Unclear a transaction
bankReconciliationSchema.methods.unclearTransaction = function(transactionId) {
    const txn = this.transactions.find(t => t.transactionId.toString() === transactionId.toString());
    if (!txn) {
        throw new Error('Transaction not found in reconciliation');
    }

    txn.isCleared = false;
    txn.clearedAt = null;
    txn.clearedBy = null;

    this.calculateTotals();
    return txn;
};

// Static method: Start new reconciliation
bankReconciliationSchema.statics.startReconciliation = async function(data) {
    const { accountId, endDate, statementBalance, lawyerId, userId } = data;

    // Get the last reconciliation for this account to determine opening balance
    const lastReconciliation = await this.findOne({
        accountId,
        status: 'completed'
    }).sort({ endDate: -1 });

    const BankAccount = mongoose.model('BankAccount');
    const BankTransaction = mongoose.model('BankTransaction');
    const account = await BankAccount.findById(accountId);

    if (!account) {
        throw new Error('Bank account not found');
    }

    const openingBalance = lastReconciliation
        ? lastReconciliation.closingBalance
        : account.openingBalance;

    const startDate = lastReconciliation
        ? new Date(lastReconciliation.endDate.getTime() + 86400000) // Day after last reconciliation
        : account.createdAt;

    // Get unreconciled transactions for this period
    const transactions = await BankTransaction.find({
        accountId,
        isReconciled: false,
        date: { $gte: startDate, $lte: new Date(endDate) }
    }).sort({ date: 1 });

    const reconciliation = new this({
        accountId,
        startDate,
        endDate: new Date(endDate),
        openingBalance,
        statementBalance,
        status: 'in_progress',
        startedBy: userId,
        lawyerId,
        transactions: transactions.map(txn => ({
            transactionId: txn._id,
            amount: txn.amount,
            date: txn.date,
            type: txn.type,
            description: txn.description,
            isCleared: false
        }))
    });

    await reconciliation.save();
    return reconciliation;
};

// Static method: Complete reconciliation
bankReconciliationSchema.statics.completeReconciliation = async function(reconciliationId, userId) {
    const reconciliation = await this.findById(reconciliationId);
    if (!reconciliation) {
        throw new Error('Reconciliation not found');
    }

    if (reconciliation.status !== 'in_progress') {
        throw new Error('Reconciliation is not in progress');
    }

    reconciliation.calculateTotals();

    if (Math.abs(reconciliation.difference) > 0.01) {
        throw new Error(`Cannot complete reconciliation. Difference of ${reconciliation.difference} exists.`);
    }

    const BankTransaction = mongoose.model('BankTransaction');

    // Mark all cleared transactions as reconciled
    const clearedTxnIds = reconciliation.transactions
        .filter(t => t.isCleared)
        .map(t => t.transactionId);

    await BankTransaction.updateMany(
        { _id: { $in: clearedTxnIds } },
        {
            isReconciled: true,
            reconciledAt: new Date(),
            reconciliationId: reconciliation._id
        }
    );

    reconciliation.status = 'completed';
    reconciliation.completedBy = userId;
    reconciliation.completedAt = new Date();
    await reconciliation.save();

    return reconciliation;
};

// Static method: Cancel reconciliation
bankReconciliationSchema.statics.cancelReconciliation = async function(reconciliationId, userId) {
    const reconciliation = await this.findById(reconciliationId);
    if (!reconciliation) {
        throw new Error('Reconciliation not found');
    }

    if (reconciliation.status === 'completed') {
        throw new Error('Cannot cancel a completed reconciliation');
    }

    reconciliation.status = 'cancelled';
    reconciliation.cancelledBy = userId;
    reconciliation.cancelledAt = new Date();
    await reconciliation.save();

    return reconciliation;
};

module.exports = mongoose.model('BankReconciliation', bankReconciliationSchema);
