/**
 * Exchange Rate Revaluation Model
 *
 * Tracks period-end revaluation of foreign currency balances to recognize
 * unrealized gains/losses from exchange rate fluctuations.
 *
 * @module models/exchangeRateRevaluation
 */

const mongoose = require('mongoose');

/**
 * Individual account revaluation entry
 */
const revaluationEntrySchema = new mongoose.Schema({
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true
    },
    accountCode: {
        type: String,
        required: true
    },
    accountName: {
        type: String,
        required: true
    },
    currency: {
        type: String,
        required: true,
        uppercase: true
    },
    // Original balance in foreign currency (in smallest unit)
    foreignBalance: {
        type: Number,
        required: true
    },
    // Previous rate used for booking
    previousRate: {
        type: Number,
        required: true
    },
    // Current rate at revaluation date
    currentRate: {
        type: Number,
        required: true
    },
    // Previous book value in base currency (in halalas)
    previousBookValue: {
        type: Number,
        required: true
    },
    // Current value at new rate (in halalas)
    currentValue: {
        type: Number,
        required: true
    },
    // Gain or loss (currentValue - previousBookValue)
    gainLoss: {
        type: Number,
        required: true
    },
    // Is this a gain (positive) or loss (negative)
    type: {
        type: String,
        enum: ['gain', 'loss', 'none'],
        required: true
    },
    // Associated GL entry ID
    glEntryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GeneralLedger'
    }
}, { _id: true });

/**
 * Main revaluation document
 */
const exchangeRateRevaluationSchema = new mongoose.Schema({
    // Multi-tenancy
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    // Auto-generated revaluation number
    revaluationNumber: {
        type: String,
        unique: true,
        required: true
    },
    // Revaluation date (typically period-end date)
    revaluationDate: {
        type: Date,
        required: true,
        index: true
    },
    // Base currency (typically SAR)
    baseCurrency: {
        type: String,
        required: true,
        default: 'SAR',
        uppercase: true
    },
    // Currencies revalued
    targetCurrencies: [{
        type: String,
        uppercase: true
    }],
    // Period being closed
    fiscalYear: {
        type: Number,
        required: true
    },
    fiscalMonth: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    // Revaluation entries by account
    entries: [revaluationEntrySchema],
    // Summary totals
    summary: {
        totalAccounts: {
            type: Number,
            default: 0
        },
        totalUnrealizedGain: {
            type: Number,
            default: 0
        },
        totalUnrealizedLoss: {
            type: Number,
            default: 0
        },
        netGainLoss: {
            type: Number,
            default: 0
        }
    },
    // Exchange rate gain/loss accounts used
    gainAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    },
    lossAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    },
    // Status
    status: {
        type: String,
        enum: ['draft', 'posted', 'reversed'],
        default: 'draft',
        index: true
    },
    // Notes
    notes: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    // Audit trail
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    postedAt: {
        type: Date
    },
    reversedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reversedAt: {
        type: Date
    },
    reversalReason: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Indexes
exchangeRateRevaluationSchema.index({ firmId: 1, revaluationDate: -1 });
exchangeRateRevaluationSchema.index({ firmId: 1, fiscalYear: 1, fiscalMonth: 1 });
exchangeRateRevaluationSchema.index({ firmId: 1, status: 1 });

/**
 * Pre-save: Generate revaluation number
 */
exchangeRateRevaluationSchema.pre('save', async function(next) {
    if (this.isNew && !this.revaluationNumber) {
        const now = new Date();
        const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
        const prefix = `RVL-${yearMonth}-`;

        const lastDoc = await mongoose.model('ExchangeRateRevaluation')
            .findOne({ revaluationNumber: { $regex: `^${prefix}` } })
            .sort({ revaluationNumber: -1 });

        let sequence = 1;
        if (lastDoc && lastDoc.revaluationNumber) {
            const lastSeq = parseInt(lastDoc.revaluationNumber.split('-')[2], 10);
            sequence = lastSeq + 1;
        }

        this.revaluationNumber = `${prefix}${String(sequence).padStart(4, '0')}`;
    }
    next();
});

/**
 * Pre-save: Calculate summary totals
 */
exchangeRateRevaluationSchema.pre('save', function(next) {
    if (this.entries && this.entries.length > 0) {
        let totalGain = 0;
        let totalLoss = 0;

        for (const entry of this.entries) {
            if (entry.gainLoss > 0) {
                totalGain += entry.gainLoss;
            } else if (entry.gainLoss < 0) {
                totalLoss += Math.abs(entry.gainLoss);
            }
        }

        this.summary = {
            totalAccounts: this.entries.length,
            totalUnrealizedGain: totalGain,
            totalUnrealizedLoss: totalLoss,
            netGainLoss: totalGain - totalLoss
        };
    }
    next();
});

/**
 * Static: Run revaluation for a firm
 */
exchangeRateRevaluationSchema.statics.runRevaluation = async function(options) {
    const {
        firmId,
        revaluationDate,
        baseCurrency = 'SAR',
        targetCurrencies,
        gainAccountId,
        lossAccountId,
        createdBy
    } = options;

    const mongoose = require('mongoose');
    const GeneralLedger = mongoose.model('GeneralLedger');
    const ExchangeRate = mongoose.model('ExchangeRate');
    const Account = mongoose.model('Account');

    // Get all accounts with foreign currency transactions
    const foreignCurrencyAccounts = await GeneralLedger.aggregate([
        {
            $match: {
                firmId: mongoose.Types.ObjectId.createFromHexString(firmId.toString()),
                status: 'posted',
                transactionDate: { $lte: new Date(revaluationDate) },
                'meta.currency': { $exists: true, $ne: baseCurrency }
            }
        },
        {
            $group: {
                _id: {
                    accountId: '$debitAccountId',
                    currency: '$meta.currency'
                },
                totalDebit: { $sum: '$amount' },
                avgRate: { $avg: '$meta.exchangeRate' }
            }
        }
    ]);

    // Also get credit side
    const creditAccounts = await GeneralLedger.aggregate([
        {
            $match: {
                firmId: mongoose.Types.ObjectId.createFromHexString(firmId.toString()),
                status: 'posted',
                transactionDate: { $lte: new Date(revaluationDate) },
                'meta.currency': { $exists: true, $ne: baseCurrency }
            }
        },
        {
            $group: {
                _id: {
                    accountId: '$creditAccountId',
                    currency: '$meta.currency'
                },
                totalCredit: { $sum: '$amount' },
                avgRate: { $avg: '$meta.exchangeRate' }
            }
        }
    ]);

    // Merge debit and credit balances
    const balanceMap = new Map();

    for (const item of foreignCurrencyAccounts) {
        const key = `${item._id.accountId}-${item._id.currency}`;
        balanceMap.set(key, {
            accountId: item._id.accountId,
            currency: item._id.currency,
            debit: item.totalDebit,
            credit: 0,
            avgRate: item.avgRate
        });
    }

    for (const item of creditAccounts) {
        const key = `${item._id.accountId}-${item._id.currency}`;
        if (balanceMap.has(key)) {
            const existing = balanceMap.get(key);
            existing.credit = item.totalCredit;
            existing.avgRate = (existing.avgRate + item.avgRate) / 2;
        } else {
            balanceMap.set(key, {
                accountId: item._id.accountId,
                currency: item._id.currency,
                debit: 0,
                credit: item.totalCredit,
                avgRate: item.avgRate
            });
        }
    }

    // Calculate revaluation entries
    const entries = [];
    const currencies = new Set();
    const date = new Date(revaluationDate);

    for (const [, balance] of balanceMap) {
        if (!balance.currency || balance.currency === baseCurrency) continue;

        // Filter by target currencies if specified
        if (targetCurrencies && targetCurrencies.length > 0 &&
            !targetCurrencies.includes(balance.currency)) {
            continue;
        }

        currencies.add(balance.currency);

        // Get account details
        const account = await Account.findById(balance.accountId);
        if (!account) continue;

        // Calculate foreign balance
        const foreignBalance = balance.debit - balance.credit;
        if (foreignBalance === 0) continue;

        // Get current exchange rate
        let currentRate;
        try {
            currentRate = await ExchangeRate.getRate(
                balance.currency,
                baseCurrency,
                revaluationDate,
                firmId
            );
        } catch (e) {
            // Skip if no rate found
            continue;
        }

        const previousRate = balance.avgRate || 1;
        const previousBookValue = foreignBalance;
        const currentValue = Math.round(foreignBalance / previousRate * currentRate);
        const gainLoss = currentValue - previousBookValue;

        if (gainLoss === 0) continue;

        entries.push({
            accountId: balance.accountId,
            accountCode: account.code,
            accountName: account.name,
            currency: balance.currency,
            foreignBalance,
            previousRate,
            currentRate,
            previousBookValue,
            currentValue,
            gainLoss,
            type: gainLoss > 0 ? 'gain' : gainLoss < 0 ? 'loss' : 'none'
        });
    }

    // Create revaluation document
    const revaluation = new this({
        firmId,
        revaluationDate: date,
        baseCurrency,
        targetCurrencies: Array.from(currencies),
        fiscalYear: date.getFullYear(),
        fiscalMonth: date.getMonth() + 1,
        entries,
        gainAccountId,
        lossAccountId,
        createdBy,
        status: 'draft'
    });

    await revaluation.save();
    return revaluation;
};

/**
 * Instance: Post revaluation to GL
 */
exchangeRateRevaluationSchema.methods.postToGL = async function(userId) {
    if (this.status !== 'draft') {
        throw new Error('Only draft revaluations can be posted');
    }

    const mongoose = require('mongoose');
    const GeneralLedger = mongoose.model('GeneralLedger');
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // Group entries by type (gain vs loss)
        let totalGain = 0;
        let totalLoss = 0;

        for (const entry of this.entries) {
            if (entry.gainLoss > 0) {
                totalGain += entry.gainLoss;
            } else if (entry.gainLoss < 0) {
                totalLoss += Math.abs(entry.gainLoss);
            }
        }

        // Post gain entry if any
        if (totalGain > 0 && this.gainAccountId) {
            const gainEntry = await GeneralLedger.postTransaction({
                firmId: this.firmId,
                transactionDate: this.revaluationDate,
                description: `Exchange rate revaluation - Unrealized gain (${this.revaluationNumber})`,
                descriptionAr: `إعادة تقييم سعر الصرف - مكاسب غير محققة (${this.revaluationNumber})`,
                debitAccountId: this.entries.find(e => e.gainLoss > 0)?.accountId,
                creditAccountId: this.gainAccountId,
                amount: totalGain,
                referenceId: this._id,
                referenceModel: 'ExchangeRateRevaluation',
                referenceNumber: this.revaluationNumber,
                meta: {
                    type: 'revaluation_gain',
                    currencies: this.targetCurrencies
                },
                createdBy: userId
            }, session);

            // Update entries with GL reference
            for (const entry of this.entries) {
                if (entry.gainLoss > 0) {
                    entry.glEntryId = gainEntry._id;
                }
            }
        }

        // Post loss entry if any
        if (totalLoss > 0 && this.lossAccountId) {
            const lossEntry = await GeneralLedger.postTransaction({
                firmId: this.firmId,
                transactionDate: this.revaluationDate,
                description: `Exchange rate revaluation - Unrealized loss (${this.revaluationNumber})`,
                descriptionAr: `إعادة تقييم سعر الصرف - خسائر غير محققة (${this.revaluationNumber})`,
                debitAccountId: this.lossAccountId,
                creditAccountId: this.entries.find(e => e.gainLoss < 0)?.accountId,
                amount: totalLoss,
                referenceId: this._id,
                referenceModel: 'ExchangeRateRevaluation',
                referenceNumber: this.revaluationNumber,
                meta: {
                    type: 'revaluation_loss',
                    currencies: this.targetCurrencies
                },
                createdBy: userId
            }, session);

            // Update entries with GL reference
            for (const entry of this.entries) {
                if (entry.gainLoss < 0) {
                    entry.glEntryId = lossEntry._id;
                }
            }
        }

        this.status = 'posted';
        this.postedBy = userId;
        this.postedAt = new Date();
        await this.save({ session });

        await session.commitTransaction();
        return this;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

/**
 * Instance: Reverse revaluation
 */
exchangeRateRevaluationSchema.methods.reverse = async function(userId, reason) {
    if (this.status !== 'posted') {
        throw new Error('Only posted revaluations can be reversed');
    }

    const mongoose = require('mongoose');
    const GeneralLedger = mongoose.model('GeneralLedger');

    // Void all associated GL entries
    for (const entry of this.entries) {
        if (entry.glEntryId) {
            await GeneralLedger.voidTransaction(entry.glEntryId, reason, userId);
        }
    }

    this.status = 'reversed';
    this.reversedBy = userId;
    this.reversedAt = new Date();
    this.reversalReason = reason;
    await this.save();

    return this;
};

/**
 * Static: Check if period already has revaluation
 */
exchangeRateRevaluationSchema.statics.hasRevaluationForPeriod = async function(firmId, year, month) {
    const count = await this.countDocuments({
        firmId,
        fiscalYear: year,
        fiscalMonth: month,
        status: { $ne: 'reversed' }
    });
    return count > 0;
};

/**
 * Static: Get revaluation history
 */
exchangeRateRevaluationSchema.statics.getHistory = async function(firmId, options = {}) {
    const { year, currency, status, page = 1, limit = 20 } = options;

    const query = { firmId };
    if (year) query.fiscalYear = year;
    if (currency) query.targetCurrencies = currency;
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
        this.find(query)
            .sort({ revaluationDate: -1 })
            .skip(skip)
            .limit(limit)
            .populate('createdBy', 'name email')
            .populate('postedBy', 'name email')
            .lean(),
        this.countDocuments(query)
    ]);

    return {
        data: docs,
        meta: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

module.exports = mongoose.model('ExchangeRateRevaluation', exchangeRateRevaluationSchema);
