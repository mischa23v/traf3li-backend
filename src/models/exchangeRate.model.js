const mongoose = require('mongoose');

const exchangeRateSchema = new mongoose.Schema({
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
        // null for system-wide rates
    },,

    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    baseCurrency: {
        type: String,
        required: false,
        default: 'SAR',
        uppercase: true,
        trim: true,
        minlength: 3,
        maxlength: 3,
        index: true
    },
    targetCurrency: {
        type: String,
        required: false,
        uppercase: true,
        trim: true,
        minlength: 3,
        maxlength: 3,
        index: true
    },
    rate: {
        type: Number,
        required: false,
        min: 0.0001
    },
    inverseRate: {
        type: Number,
        required: false,
        min: 0.0001
    },
    source: {
        type: String,
        enum: ['manual', 'api', 'bank', 'ecb', 'openexchange', 'currencyapi', 'sama'],
        required: false,
        default: 'manual',
        index: true
    },
    effectiveDate: {
        type: Date,
        required: false,
        default: Date.now,
        index: true
    },
    expiresAt: {
        type: Date,
        index: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    provider: {
        type: String,
        trim: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    lastSyncedAt: {
        type: Date
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 500
    }
}, {
    versionKey: false,
    timestamps: true
});

// Compound indexes
exchangeRateSchema.index({ baseCurrency: 1, targetCurrency: 1, effectiveDate: -1 });
exchangeRateSchema.index({ firmId: 1, baseCurrency: 1, targetCurrency: 1, effectiveDate: -1 });
exchangeRateSchema.index({ isActive: 1, effectiveDate: -1 });
exchangeRateSchema.index({ firmId: 1, isActive: 1, effectiveDate: -1 });

// Pre-save hook to calculate inverse rate
exchangeRateSchema.pre('save', function(next) {
    if (this.isModified('rate')) {
        this.inverseRate = 1 / this.rate;
    }

    // Set expiration for API rates (24 hours)
    if (this.source === 'api' && !this.expiresAt) {
        this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    next();
});

// Prevent same currency pairs
exchangeRateSchema.pre('save', function(next) {
    if (this.baseCurrency === this.targetCurrency) {
        return next(new Error('Base currency and target currency cannot be the same'));
    }
    next();
});

// Static method: Get rate for date
exchangeRateSchema.statics.getRate = async function(baseCurrency, targetCurrency, date = new Date(), firmId = null) {
    baseCurrency = baseCurrency.toUpperCase();
    targetCurrency = targetCurrency.toUpperCase();

    // Same currency
    if (baseCurrency === targetCurrency) {
        return 1;
    }

    const effectiveDate = new Date(date);
    effectiveDate.setHours(23, 59, 59, 999);

    // Try firm-specific rate first
    if (firmId) {
        const firmRate = await this.findOne({
            firmId,
            baseCurrency,
            targetCurrency,
            isActive: true,
            effectiveDate: { $lte: effectiveDate }
        }).sort({ effectiveDate: -1 });

        if (firmRate) {
            return firmRate.rate;
        }
    }

    // Try system-wide rate
    const systemRate = await this.findOne({
        firmId: null,
        baseCurrency,
        targetCurrency,
        isActive: true,
        effectiveDate: { $lte: effectiveDate }
    }).sort({ effectiveDate: -1 });

    if (systemRate) {
        return systemRate.rate;
    }

    // Try inverse rate
    const inverseRate = await this.getRate(targetCurrency, baseCurrency, date, firmId);
    if (inverseRate && inverseRate !== null) {
        return 1 / inverseRate;
    }

    throw new Error(`Exchange rate not found for ${baseCurrency} to ${targetCurrency}`);
};

// Static method: Convert amount
exchangeRateSchema.statics.convertAmount = async function(amount, fromCurrency, toCurrency, date = new Date(), firmId = null) {
    if (fromCurrency === toCurrency) {
        return amount;
    }

    const rate = await this.getRate(fromCurrency, toCurrency, date, firmId);
    return amount * rate;
};

// Static method: Get latest rates for base currency
exchangeRateSchema.statics.getLatestRates = async function(baseCurrency, firmId = null) {
    baseCurrency = baseCurrency.toUpperCase();

    const query = {
        baseCurrency,
        isActive: true
    };

    if (firmId) {
        query.$or = [{ firmId }, { firmId: null }];
    } else {
        query.firmId = null;
    }

    const rates = await this.aggregate([
        { $match: query },
        { $sort: { effectiveDate: -1 } },
        {
            $group: {
                _id: '$targetCurrency',
                rate: { $first: '$rate' },
                inverseRate: { $first: '$inverseRate' },
                source: { $first: '$source' },
                effectiveDate: { $first: '$effectiveDate' },
                expiresAt: { $first: '$expiresAt' }
            }
        },
        {
            $project: {
                _id: 0,
                currency: '$_id',
                rate: 1,
                inverseRate: 1,
                source: 1,
                effectiveDate: 1,
                expiresAt: 1
            }
        },
        { $sort: { currency: 1 } }
    ]);

    return rates;
};

// Static method: Update or create rate
exchangeRateSchema.statics.setRate = async function(data) {
    const {
        baseCurrency,
        targetCurrency,
        rate,
        source,
        firmId,
        effectiveDate,
        createdBy,
        notes
    } = data;

    // Deactivate old rates for the same pair
    await this.updateMany(
        {
            baseCurrency: baseCurrency.toUpperCase(),
            targetCurrency: targetCurrency.toUpperCase(),
            firmId: firmId || null,
            isActive: true
        },
        { isActive: false }
    );

    // Create new rate
    const newRate = new this({
        baseCurrency: baseCurrency.toUpperCase(),
        targetCurrency: targetCurrency.toUpperCase(),
        rate,
        source: source || 'manual',
        firmId: firmId || null,
        effectiveDate: effectiveDate || new Date(),
        createdBy,
        notes,
        isActive: true
    });

    return await newRate.save();
};

// Static method: Bulk update rates
exchangeRateSchema.statics.bulkUpdateRates = async function(baseCurrency, rates, source = 'api') {
    const results = {
        updated: 0,
        errors: []
    };

    for (const [targetCurrency, rate] of Object.entries(rates)) {
        try {
            await this.setRate({
                baseCurrency,
                targetCurrency,
                rate,
                source
            });
            results.updated++;
        } catch (error) {
            results.errors.push({
                currency: targetCurrency,
                error: error.message
            });
        }
    }

    return results;
};

// Static method: Get historical rates
exchangeRateSchema.statics.getHistoricalRates = async function(baseCurrency, targetCurrency, startDate, endDate, firmId = null) {
    const query = {
        baseCurrency: baseCurrency.toUpperCase(),
        targetCurrency: targetCurrency.toUpperCase(),
        effectiveDate: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        }
    };

    if (firmId) {
        query.$or = [{ firmId }, { firmId: null }];
    } else {
        query.firmId = null;
    }

    return await this.find(query)
        .sort({ effectiveDate: 1 })
        .select('rate inverseRate effectiveDate source');
};

// Static method: Get supported currencies
exchangeRateSchema.statics.getSupportedCurrencies = async function(baseCurrency = 'SAR', firmId = null) {
    const query = {
        baseCurrency: baseCurrency.toUpperCase(),
        isActive: true
    };

    if (firmId) {
        query.$or = [{ firmId }, { firmId: null }];
    } else {
        query.firmId = null;
    }

    const currencies = await this.distinct('targetCurrency', query);

    // Add base currency
    currencies.unshift(baseCurrency.toUpperCase());

    return currencies.sort();
};

// Static method: Clean expired rates
exchangeRateSchema.statics.cleanExpiredRates = async function() {
    const now = new Date();
    const result = await this.updateMany(
        {
            expiresAt: { $lte: now },
            isActive: true
        },
        { isActive: false }
    );

    return result.modifiedCount;
};

// Static method: Get exchange rate statistics
exchangeRateSchema.statics.getStatistics = async function(baseCurrency = 'SAR', firmId = null) {
    const match = {
        baseCurrency: baseCurrency.toUpperCase(),
        isActive: true
    };

    if (firmId) {
        match.firmId = firmId;
    } else {
        match.firmId = null;
    }

    return await this.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                totalCurrencies: { $addToSet: '$targetCurrency' },
                avgRate: { $avg: '$rate' },
                minRate: { $min: '$rate' },
                maxRate: { $max: '$rate' },
                sources: { $addToSet: '$source' }
            }
        },
        {
            $project: {
                _id: 0,
                totalCurrencies: { $size: '$totalCurrencies' },
                avgRate: 1,
                minRate: 1,
                maxRate: 1,
                sources: 1
            }
        }
    ]);
};

module.exports = mongoose.model('ExchangeRate', exchangeRateSchema);
