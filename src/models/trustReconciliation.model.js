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
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
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
trustReconciliationSchema.index({ firmId: 1, lawyerId: 1, accountId: 1 });
trustReconciliationSchema.index({ firmId: 1, accountId: 1, reconciliationDate: -1 });

// Static method: Start reconciliation (requires firmId for security)
trustReconciliationSchema.statics.startReconciliation = async function(data) {
    const TrustAccount = mongoose.model('TrustAccount');
    const TrustTransaction = mongoose.model('TrustTransaction');

    // SECURITY: firmId is required
    if (!data.firmId) {
        throw new Error('firmId is required for reconciliation');
    }

    // SECURITY: Get account with firm isolation
    const account = await TrustAccount.findOne({
        _id: data.accountId,
        firmId: data.firmId
    });
    if (!account) throw new Error('Trust account not found');

    // SECURITY: Get transactions with firm isolation
    const transactions = await TrustTransaction.find({
        accountId: data.accountId,
        firmId: data.firmId,
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
        firmId: data.firmId,
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

// Static method: Complete reconciliation (requires firmId for security)
trustReconciliationSchema.statics.completeReconciliation = async function(reconciliationId, reconciledBy, firmId = null) {
    // SECURITY: Get reconciliation with firm isolation if firmId provided
    const filter = { _id: reconciliationId };
    if (firmId) {
        filter.firmId = firmId;
    }

    const reconciliation = await this.findOne(filter);
    if (!reconciliation) throw new Error('Reconciliation not found');

    const TrustAccount = mongoose.model('TrustAccount');
    const TrustTransaction = mongoose.model('TrustTransaction');

    // SECURITY: Use firmId from reconciliation for updates
    const txFilter = {
        accountId: reconciliation.accountId,
        firmId: reconciliation.firmId,
        transactionDate: {
            $gte: reconciliation.periodStart,
            $lte: reconciliation.periodEnd
        },
        status: 'cleared'
    };

    // Mark all pending transactions as reconciled
    await TrustTransaction.updateMany(txFilter, {
        status: 'reconciled',
        reconciledDate: new Date()
    });

    // SECURITY: Update account with firm isolation
    await TrustAccount.findOneAndUpdate(
        { _id: reconciliation.accountId, firmId: reconciliation.firmId },
        {
            lastReconciled: new Date(),
            reconciledBalance: reconciliation.bankStatementBalance
        }
    );

    // Update reconciliation status
    reconciliation.status = Math.abs(reconciliation.difference) < 0.01 ? 'completed' : 'exception';
    reconciliation.reconciledBy = reconciledBy;
    reconciliation.reconciledAt = new Date();
    await reconciliation.save();

    return reconciliation;
};

module.exports = mongoose.model('TrustReconciliation', trustReconciliationSchema);
