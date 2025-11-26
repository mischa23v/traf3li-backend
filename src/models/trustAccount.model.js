const mongoose = require('mongoose');

const trustAccountSchema = new mongoose.Schema({
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
trustAccountSchema.index({ lawyerId: 1, status: 1 });
trustAccountSchema.index({ accountNumber: 1 }, { unique: true });

// Pre-save hook to generate account number
trustAccountSchema.pre('save', async function(next) {
    if (!this.accountNumber) {
        const count = await this.constructor.countDocuments({ lawyerId: this.lawyerId });
        this.accountNumber = `TA-${Date.now().toString(36).toUpperCase()}-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

// Static method: Update balance
trustAccountSchema.statics.updateBalance = async function(accountId, amount, type = 'add') {
    const update = type === 'add'
        ? { $inc: { balance: amount, availableBalance: amount } }
        : { $inc: { balance: -amount, availableBalance: -amount } };

    return await this.findByIdAndUpdate(accountId, update, { new: true });
};

// Static method: Get account with client balances
trustAccountSchema.statics.getWithClientBalances = async function(accountId) {
    const ClientTrustBalance = mongoose.model('ClientTrustBalance');
    const account = await this.findById(accountId);
    if (!account) return null;

    const clientBalances = await ClientTrustBalance.find({ accountId })
        .populate('clientId', 'name fullName email')
        .populate('caseId', 'title caseNumber');

    return { account, clientBalances };
};

module.exports = mongoose.model('TrustAccount', trustAccountSchema);
