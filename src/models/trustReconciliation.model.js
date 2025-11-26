const mongoose = require('mongoose');

const adjustmentSchema = new mongoose.Schema({
    description: String,
    amount: Number,
    type: {
        type: String,
        enum: ['bank_adjustment', 'book_adjustment']
    },
    reference: String
});

const trustReconciliationSchema = new mongoose.Schema({
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TrustAccount',
        required: true
    },
    reconciliationDate: {
        type: Date,
        required: true
    },
    periodStart: {
        type: Date,
        required: true
    },
    periodEnd: {
        type: Date,
        required: true
    },
    openingBalance: {
        type: Number,
        required: true
    },
    closingBalance: {
        type: Number,
        required: true
    },
    bankStatementBalance: {
        type: Number,
        required: true
    },
    clearedDeposits: {
        type: Number,
        default: 0
    },
    clearedWithdrawals: {
        type: Number,
        default: 0
    },
    outstandingDeposits: {
        type: Number,
        default: 0
    },
    outstandingWithdrawals: {
        type: Number,
        default: 0
    },
    difference: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['in_progress', 'completed', 'exception'],
        default: 'in_progress'
    },
    reconciledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reconciledAt: Date,
    notes: String,
    adjustments: [adjustmentSchema],
    attachments: [String]
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
trustReconciliationSchema.index({ lawyerId: 1, accountId: 1 });
trustReconciliationSchema.index({ accountId: 1, reconciliationDate: -1 });

// Static method: Start reconciliation
trustReconciliationSchema.statics.startReconciliation = async function(data) {
    const TrustAccount = mongoose.model('TrustAccount');
    const TrustTransaction = mongoose.model('TrustTransaction');

    const account = await TrustAccount.findById(data.accountId);
    if (!account) throw new Error('Trust account not found');

    // Get transactions in period
    const transactions = await TrustTransaction.find({
        accountId: data.accountId,
        transactionDate: {
            $gte: data.periodStart,
            $lte: data.periodEnd
        }
    });

    // Calculate balances
    const clearedDeposits = transactions
        .filter(t => ['deposit', 'transfer_in', 'interest_credit'].includes(t.type) && t.status === 'cleared')
        .reduce((sum, t) => sum + t.amount, 0);

    const clearedWithdrawals = transactions
        .filter(t => ['withdrawal', 'transfer_out', 'fee_disbursement', 'expense_disbursement'].includes(t.type) && t.status === 'cleared')
        .reduce((sum, t) => sum + t.amount, 0);

    const outstandingDeposits = transactions
        .filter(t => ['deposit', 'transfer_in', 'interest_credit'].includes(t.type) && t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0);

    const outstandingWithdrawals = transactions
        .filter(t => ['withdrawal', 'transfer_out', 'fee_disbursement', 'expense_disbursement'].includes(t.type) && t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0);

    return await this.create({
        lawyerId: data.lawyerId,
        accountId: data.accountId,
        reconciliationDate: data.reconciliationDate,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        openingBalance: data.openingBalance || 0,
        closingBalance: account.balance,
        bankStatementBalance: data.bankStatementBalance,
        clearedDeposits,
        clearedWithdrawals,
        outstandingDeposits,
        outstandingWithdrawals,
        difference: data.bankStatementBalance - account.balance
    });
};

// Static method: Complete reconciliation
trustReconciliationSchema.statics.completeReconciliation = async function(reconciliationId, reconciledBy) {
    const reconciliation = await this.findById(reconciliationId);
    if (!reconciliation) throw new Error('Reconciliation not found');

    const TrustAccount = mongoose.model('TrustAccount');
    const TrustTransaction = mongoose.model('TrustTransaction');

    // Mark all pending transactions as reconciled
    await TrustTransaction.updateMany(
        {
            accountId: reconciliation.accountId,
            transactionDate: {
                $gte: reconciliation.periodStart,
                $lte: reconciliation.periodEnd
            },
            status: 'cleared'
        },
        {
            status: 'reconciled',
            reconciledDate: new Date()
        }
    );

    // Update account last reconciled
    await TrustAccount.findByIdAndUpdate(reconciliation.accountId, {
        lastReconciled: new Date(),
        reconciledBalance: reconciliation.bankStatementBalance
    });

    // Update reconciliation status
    reconciliation.status = Math.abs(reconciliation.difference) < 0.01 ? 'completed' : 'exception';
    reconciliation.reconciledBy = reconciledBy;
    reconciliation.reconciledAt = new Date();
    await reconciliation.save();

    return reconciliation;
};

module.exports = mongoose.model('TrustReconciliation', trustReconciliationSchema);
