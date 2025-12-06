const mongoose = require('mongoose');

const bankConnectionSchema = new mongoose.Schema({
    provider: {
        type: String,
        enum: ['plaid', 'yodlee', 'saltedge']
    },
    institutionId: String,
    institutionName: String,
    status: {
        type: String,
        enum: ['connected', 'disconnected', 'error', 'expired'],
        default: 'disconnected'
    },
    lastSyncedAt: Date,
    expiresAt: Date,
    error: String,
    accessToken: String,
    refreshToken: String
}, { _id: true });

const bankAccountSchema = new mongoose.Schema({
    accountNumber: {
        type: String,
        trim: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    nameAr: {
        type: String,
        trim: true,
        maxlength: 200
    },
    type: {
        type: String,
        enum: ['checking', 'savings', 'credit_card', 'cash', 'loan', 'other'],
        required: true,
        default: 'checking'
    },
    bankName: {
        type: String,
        trim: true,
        maxlength: 200
    },
    bankCode: {
        type: String,
        trim: true
    },
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
    openingBalance: {
        type: Number,
        default: 0
    },
    isDefault: {
        type: Boolean,
        default: false,
        index: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    iban: {
        type: String,
        trim: true,
        maxlength: 34
    },
    swiftCode: {
        type: String,
        trim: true,
        maxlength: 11
    },
    routingNumber: {
        type: String,
        trim: true
    },
    branchName: {
        type: String,
        trim: true,
        maxlength: 200
    },
    branchCode: {
        type: String,
        trim: true
    },
    accountHolder: {
        type: String,
        trim: true,
        maxlength: 300
    },
    accountHolderAddress: {
        type: String,
        trim: true,
        maxlength: 500
    },
    minBalance: {
        type: Number,
        default: 0
    },
    overdraftLimit: {
        type: Number,
        default: 0
    },
    interestRate: {
        type: Number,
        default: 0
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 2000
    },
    color: {
        type: String,
        default: '#0f766e'
    },
    icon: {
        type: String,
        default: 'bank'
    },
    connection: bankConnectionSchema,
    lastSyncedAt: Date,
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

// Indexes for performance
bankAccountSchema.index({ lawyerId: 1, type: 1 });
bankAccountSchema.index({ lawyerId: 1, isActive: 1 });
bankAccountSchema.index({ lawyerId: 1, currency: 1 });
bankAccountSchema.index({ name: 'text', accountNumber: 'text', bankName: 'text' });

// Pre-save hook to ensure only one default account per user
bankAccountSchema.pre('save', async function(next) {
    if (this.isDefault && this.isModified('isDefault')) {
        await this.constructor.updateMany(
            { lawyerId: this.lawyerId, _id: { $ne: this._id } },
            { isDefault: false }
        );
    }

    // Set balance from opening balance for new accounts
    if (this.isNew && this.openingBalance) {
        this.balance = this.openingBalance;
        this.availableBalance = this.openingBalance;
    }

    next();
});

// Static method: Get account summary
bankAccountSchema.statics.getSummary = async function(lawyerId) {
    const summary = await this.aggregate([
        { $match: { lawyerId: new mongoose.Types.ObjectId(lawyerId), isActive: true } },
        {
            $facet: {
                totals: [
                    {
                        $group: {
                            _id: null,
                            totalBalance: { $sum: '$balance' },
                            totalAccounts: { $sum: 1 }
                        }
                    }
                ],
                byType: [
                    {
                        $group: {
                            _id: '$type',
                            count: { $sum: 1 },
                            balance: { $sum: '$balance' }
                        }
                    },
                    {
                        $project: {
                            type: '$_id',
                            count: 1,
                            balance: 1,
                            _id: 0
                        }
                    }
                ],
                byCurrency: [
                    {
                        $group: {
                            _id: '$currency',
                            balance: { $sum: '$balance' }
                        }
                    },
                    {
                        $project: {
                            currency: '$_id',
                            balance: 1,
                            _id: 0
                        }
                    }
                ]
            }
        }
    ]);

    const result = summary[0];
    return {
        totalBalance: result.totals[0]?.totalBalance || 0,
        totalAccounts: result.totals[0]?.totalAccounts || 0,
        byType: result.byType,
        byCurrency: result.byCurrency
    };
};

// Static method: Update balance
bankAccountSchema.statics.updateBalance = async function(accountId, amount, type = 'add') {
    const update = type === 'add'
        ? { $inc: { balance: amount, availableBalance: amount } }
        : { $inc: { balance: -amount, availableBalance: -amount } };

    return await this.findByIdAndUpdate(accountId, update, { new: true });
};

// Static method: Get balance history (placeholder for aggregated transaction data)
bankAccountSchema.statics.getBalanceHistory = async function(accountId, period = 'month') {
    const BankTransaction = mongoose.model('BankTransaction');

    const periodDays = {
        week: 7,
        month: 30,
        quarter: 90,
        year: 365
    };

    const days = periodDays[period] || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const transactions = await BankTransaction.aggregate([
        {
            $match: {
                accountId: new mongoose.Types.ObjectId(accountId),
                date: { $gte: startDate }
            }
        },
        {
            $sort: { date: 1 }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                lastBalance: { $last: '$balance' }
            }
        },
        {
            $project: {
                date: '$_id',
                balance: '$lastBalance',
                _id: 0
            }
        },
        { $sort: { date: 1 } }
    ]);

    return transactions;
};

module.exports = mongoose.model('BankAccount', bankAccountSchema);
