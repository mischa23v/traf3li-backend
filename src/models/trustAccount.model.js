const mongoose = require('mongoose');

const trustAccountSchema = new mongoose.Schema({
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
    accountNumber: {
        type: String,
        required: true,
        unique: true
    },
    accountName: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['iolta', 'client_trust', 'escrow', 'retainer'],
        required: true
    },
    bankName: {
        type: String,
        required: true,
        trim: true
    },
    bankAccountNumber: {
        type: String,
        required: true
    },
    routingNumber: String,
    swiftCode: String,
    currency: {
        type: String,
        default: 'SAR'
    },
    balance: {
        type: Number,
        default: 0
    },
    availableBalance: {
        type: Number,
        default: 0
    },
    pendingBalance: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'closed'],
        default: 'active'
    },
    interestBearing: {
        type: Boolean,
        default: false
    },
    interestRate: Number,
    lastReconciled: Date,
    reconciledBalance: Number,
    notes: String
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
trustAccountSchema.index({ firmId: 1, lawyerId: 1, status: 1 });
trustAccountSchema.index({ firmId: 1, status: 1 });
trustAccountSchema.index({ accountNumber: 1 }, { unique: true });

// Pre-save hook to generate account number
trustAccountSchema.pre('save', async function(next) {
    if (!this.accountNumber) {
        const count = await this.constructor.countDocuments({ lawyerId: this.lawyerId });
        this.accountNumber = `TA-${Date.now().toString(36).toUpperCase()}-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

// Static method: Update balance (requires firmId for security)
trustAccountSchema.statics.updateBalance = async function(accountId, amount, type = 'add', firmId = null) {
    const update = type === 'add'
        ? { $inc: { balance: amount, availableBalance: amount } }
        : { $inc: { balance: -amount, availableBalance: -amount } };

    // SECURITY: Always filter by firmId when provided
    const filter = { _id: accountId };
    if (firmId) {
        filter.firmId = firmId;
    }

    // For withdrawals, add minimum balance check in the atomic operation
    if (type !== 'add') {
        filter.balance = { $gte: amount };
        filter.availableBalance = { $gte: amount };
    }

    return await this.findOneAndUpdate(filter, update, { new: true });
};

// Static method: Get account with client balances (requires firmId for security)
trustAccountSchema.statics.getWithClientBalances = async function(accountId, firmId = null) {
    const ClientTrustBalance = mongoose.model('ClientTrustBalance');

    // SECURITY: Always filter by firmId when provided
    const filter = { _id: accountId };
    if (firmId) {
        filter.firmId = firmId;
    }

    const account = await this.findOne(filter);
    if (!account) return null;

    // Also filter client balances by firmId
    const clientFilter = { accountId };
    if (firmId) {
        clientFilter.firmId = firmId;
    }

    const clientBalances = await ClientTrustBalance.find(clientFilter)
        .populate('clientId', 'name fullName email')
        .populate('caseId', 'title caseNumber');

    return { account, clientBalances };
};

module.exports = mongoose.model('TrustAccount', trustAccountSchema);
