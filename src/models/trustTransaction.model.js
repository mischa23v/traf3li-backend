const mongoose = require('mongoose');

const trustTransactionSchema = new mongoose.Schema({
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
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case'
    },
    transactionNumber: {
        type: String,
        unique: true
    },
    transactionDate: {
        type: Date,
        required: true
    },
    type: {
        type: String,
        enum: ['deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'fee_disbursement', 'expense_disbursement', 'interest_credit', 'adjustment'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    runningBalance: {
        type: Number,
        required: true
    },
    reference: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    payee: String,
    payor: String,
    checkNumber: String,
    status: {
        type: String,
        enum: ['pending', 'cleared', 'reconciled', 'void'],
        default: 'pending'
    },
    clearedDate: Date,
    reconciledDate: Date,
    relatedInvoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice'
    },
    relatedExpenseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Expense'
    },
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
trustTransactionSchema.index({ firmId: 1, lawyerId: 1, accountId: 1 });
trustTransactionSchema.index({ firmId: 1, clientId: 1 });
trustTransactionSchema.index({ firmId: 1, accountId: 1, transactionDate: -1 });
trustTransactionSchema.index({ transactionNumber: 1 }, { unique: true });
trustTransactionSchema.index({ firmId: 1, status: 1 });

// Pre-save hook to generate transaction number
trustTransactionSchema.pre('save', async function(next) {
    if (!this.transactionNumber) {
        const count = await this.constructor.countDocuments({ lawyerId: this.lawyerId });
        const year = new Date().getFullYear();
        this.transactionNumber = `TT-${year}-${String(count + 1).padStart(6, '0')}`;
    }
    next();
});

// Static method: Create deposit (requires firmId for security)
trustTransactionSchema.statics.createDeposit = async function(data) {
    const TrustAccount = mongoose.model('TrustAccount');
    const ClientTrustBalance = mongoose.model('ClientTrustBalance');

    // SECURITY: firmId is required
    if (!data.firmId) {
        throw new Error('firmId is required for trust transactions');
    }

    // Update account balance atomically and get the new balance
    const updatedAccount = await TrustAccount.findOneAndUpdate(
        {
            _id: data.accountId,
            firmId: data.firmId
        },
        {
            $inc: { balance: data.amount, availableBalance: data.amount }
        },
        { new: true }
    );

    if (!updatedAccount) throw new Error('Trust account not found');

    const runningBalance = updatedAccount.balance;

    // Create transaction with firmId
    const transaction = await this.create({
        ...data,
        type: 'deposit',
        runningBalance
    });

    // Update client balance with firmId atomically
    await ClientTrustBalance.getOrCreate(data.firmId, data.lawyerId, data.accountId, data.clientId, data.caseId);
    await ClientTrustBalance.updateBalance(data.firmId, data.accountId, data.clientId, data.amount, 'add', 'deposit');

    return transaction;
};

// Static method: Create withdrawal (requires firmId for security)
trustTransactionSchema.statics.createWithdrawal = async function(data) {
    const TrustAccount = mongoose.model('TrustAccount');
    const ClientTrustBalance = mongoose.model('ClientTrustBalance');

    // SECURITY: firmId is required
    if (!data.firmId) {
        throw new Error('firmId is required for trust transactions');
    }

    // SECURITY: Check client balance with firm isolation and update atomically with minimum balance check
    const updatedClientBalance = await ClientTrustBalance.findOneAndUpdate(
        {
            accountId: data.accountId,
            clientId: data.clientId,
            firmId: data.firmId,
            availableBalance: { $gte: data.amount } // Ensure sufficient balance
        },
        {
            $inc: { balance: -data.amount, availableBalance: -data.amount },
            lastTransaction: new Date(),
            lastTransactionType: 'withdrawal',
            lastTransactionAmount: -data.amount
        },
        { new: false }
    );

    if (!updatedClientBalance) {
        throw new Error('Insufficient client balance');
    }

    // Update account balance atomically
    const updatedAccount = await TrustAccount.findOneAndUpdate(
        {
            _id: data.accountId,
            firmId: data.firmId
        },
        {
            $inc: { balance: -data.amount, availableBalance: -data.amount }
        },
        { new: true }
    );

    if (!updatedAccount) {
        // Rollback client balance
        await ClientTrustBalance.findOneAndUpdate(
            {
                accountId: data.accountId,
                clientId: data.clientId,
                firmId: data.firmId
            },
            {
                $inc: { balance: data.amount, availableBalance: data.amount }
            }
        );
        throw new Error('Trust account not found');
    }

    const runningBalance = updatedAccount.balance;

    // Create transaction with firmId
    const transaction = await this.create({
        ...data,
        type: 'withdrawal',
        runningBalance
    });

    return transaction;
};

// Static method: Get client ledger (requires firmId for security)
trustTransactionSchema.statics.getClientLedger = async function(firmId, accountId, clientId, dateRange = {}) {
    // SECURITY: firmId is required
    if (!firmId) {
        throw new Error('firmId is required for trust transaction queries');
    }

    const query = { firmId, accountId, clientId };

    if (dateRange.startDate) {
        query.transactionDate = { $gte: new Date(dateRange.startDate) };
    }
    if (dateRange.endDate) {
        query.transactionDate = {
            ...query.transactionDate,
            $lte: new Date(dateRange.endDate)
        };
    }

    return await this.find(query)
        .sort({ transactionDate: 1 })
        .populate('caseId', 'title caseNumber')
        .populate('createdBy', 'firstName lastName');
};

module.exports = mongoose.model('TrustTransaction', trustTransactionSchema);
