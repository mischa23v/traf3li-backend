const mongoose = require('mongoose');

const trustTransactionSchema = new mongoose.Schema({
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
trustTransactionSchema.index({ lawyerId: 1, accountId: 1 });
trustTransactionSchema.index({ lawyerId: 1, clientId: 1 });
trustTransactionSchema.index({ accountId: 1, transactionDate: -1 });
trustTransactionSchema.index({ transactionNumber: 1 }, { unique: true });
trustTransactionSchema.index({ status: 1 });

// Pre-save hook to generate transaction number
trustTransactionSchema.pre('save', async function(next) {
    if (!this.transactionNumber) {
        const count = await this.constructor.countDocuments({ lawyerId: this.lawyerId });
        const year = new Date().getFullYear();
        this.transactionNumber = `TT-${year}-${String(count + 1).padStart(6, '0')}`;
    }
    next();
});

// Static method: Create deposit
trustTransactionSchema.statics.createDeposit = async function(data) {
    const TrustAccount = mongoose.model('TrustAccount');
    const ClientTrustBalance = mongoose.model('ClientTrustBalance');

    // Get current account balance
    const account = await TrustAccount.findById(data.accountId);
    if (!account) throw new Error('Trust account not found');

    const runningBalance = account.balance + data.amount;

    // Create transaction
    const transaction = await this.create({
        ...data,
        type: 'deposit',
        runningBalance
    });

    // Update account balance
    await TrustAccount.updateBalance(data.accountId, data.amount, 'add');

    // Update client balance
    await ClientTrustBalance.getOrCreate(data.lawyerId, data.accountId, data.clientId, data.caseId);
    await ClientTrustBalance.updateBalance(data.accountId, data.clientId, data.amount, 'add', 'deposit');

    return transaction;
};

// Static method: Create withdrawal
trustTransactionSchema.statics.createWithdrawal = async function(data) {
    const TrustAccount = mongoose.model('TrustAccount');
    const ClientTrustBalance = mongoose.model('ClientTrustBalance');

    // Get current balances
    const account = await TrustAccount.findById(data.accountId);
    if (!account) throw new Error('Trust account not found');

    const clientBalance = await ClientTrustBalance.findOne({
        accountId: data.accountId,
        clientId: data.clientId
    });

    if (!clientBalance || clientBalance.availableBalance < data.amount) {
        throw new Error('Insufficient client balance');
    }

    const runningBalance = account.balance - data.amount;

    // Create transaction
    const transaction = await this.create({
        ...data,
        type: 'withdrawal',
        runningBalance
    });

    // Update account balance
    await TrustAccount.updateBalance(data.accountId, data.amount, 'subtract');

    // Update client balance
    await ClientTrustBalance.updateBalance(data.accountId, data.clientId, data.amount, 'subtract', 'withdrawal');

    return transaction;
};

// Static method: Get client ledger
trustTransactionSchema.statics.getClientLedger = async function(accountId, clientId, dateRange = {}) {
    const query = { accountId, clientId };

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
