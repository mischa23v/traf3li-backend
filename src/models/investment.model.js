const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// INVESTMENT TYPES
// ═══════════════════════════════════════════════════════════════
const INVESTMENT_TYPES = [
    'stock',        // أسهم
    'mutual_fund',  // صناديق استثمارية
    'etf',          // صناديق المؤشرات
    'reit',         // صناديق الريت
    'sukuk',        // صكوك
    'bond',         // سندات
    'forex',        // عملات
    'crypto',       // عملات رقمية
    'commodity'     // سلع
];

// ═══════════════════════════════════════════════════════════════
// MARKETS
// ═══════════════════════════════════════════════════════════════
const MARKETS = [
    'tadawul',      // السوق السعودي
    'us',           // الأسواق الأمريكية
    'forex',        // سوق العملات
    'crypto',       // العملات الرقمية
    'commodities'   // السلع
];

// ═══════════════════════════════════════════════════════════════
// CATEGORIES (for financial reporting)
// ═══════════════════════════════════════════════════════════════
const CATEGORIES = [
    'equities',       // الأسهم
    'fixed_income',   // الدخل الثابت
    'real_estate',    // العقارات
    'mutual_funds',   // الصناديق
    'alternative',    // بديلة
    'currencies',     // العملات
    'commodities'     // السلع
];

// ═══════════════════════════════════════════════════════════════
// INVESTMENT STATUS
// ═══════════════════════════════════════════════════════════════
const INVESTMENT_STATUSES = [
    'active',       // نشط
    'sold',         // مباع
    'partial_sold'  // مباع جزئياً
];

// ═══════════════════════════════════════════════════════════════
// INVESTMENT SCHEMA
// ═══════════════════════════════════════════════════════════════
const investmentSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // OWNERSHIP (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    companyId: {
        type: String,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    investmentId: {
        type: String,
        unique: true,
        index: true
    },

    symbol: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        index: true
    },

    name: {
        type: String,
        required: true,
        trim: true
    },

    nameEn: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // CLASSIFICATION
    // ═══════════════════════════════════════════════════════════════
    type: {
        type: String,
        enum: INVESTMENT_TYPES,
        required: true,
        index: true
    },

    market: {
        type: String,
        enum: MARKETS,
        required: true,
        index: true
    },

    sector: {
        type: String,
        trim: true
    },

    sectorEn: {
        type: String,
        trim: true
    },

    category: {
        type: String,
        enum: CATEGORIES
    },

    // ═══════════════════════════════════════════════════════════════
    // SYMBOLS FOR PRICE APIs
    // ═══════════════════════════════════════════════════════════════
    tradingViewSymbol: {
        type: String,
        trim: true
    },

    yahooSymbol: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // PURCHASE DETAILS (all monetary values in halalas)
    // ═══════════════════════════════════════════════════════════════
    purchaseDate: {
        type: Date,
        required: true,
        index: true
    },

    purchasePrice: {
        type: Number,
        required: true,
        min: 0
    },

    quantity: {
        type: Number,
        required: true,
        min: 0
    },

    totalCost: {
        type: Number,
        default: 0,
        min: 0
    },

    fees: {
        type: Number,
        default: 0,
        min: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // CURRENT VALUE (Auto-updated by price service)
    // ═══════════════════════════════════════════════════════════════
    currentPrice: {
        type: Number,
        default: 0,
        min: 0
    },

    currentValue: {
        type: Number,
        default: 0,
        min: 0
    },

    previousClose: {
        type: Number,
        default: 0,
        min: 0
    },

    dailyChange: {
        type: Number,
        default: 0
    },

    dailyChangePercent: {
        type: Number,
        default: 0
    },

    lastPriceUpdate: {
        type: Date
    },

    priceSource: {
        type: String,
        enum: ['tradingview', 'yahoo', 'manual', 'tadawul'],
        default: 'manual'
    },

    // ═══════════════════════════════════════════════════════════════
    // PERFORMANCE (calculated fields)
    // ═══════════════════════════════════════════════════════════════
    gainLoss: {
        type: Number,
        default: 0
    },

    gainLossPercent: {
        type: Number,
        default: 0
    },

    dividendsReceived: {
        type: Number,
        default: 0,
        min: 0
    },

    totalReturn: {
        type: Number,
        default: 0
    },

    totalReturnPercent: {
        type: Number,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // ADDITIONAL PRICE DATA
    // ═══════════════════════════════════════════════════════════════
    dayHigh: {
        type: Number,
        default: 0
    },

    dayLow: {
        type: Number,
        default: 0
    },

    weekHigh52: {
        type: Number,
        default: 0
    },

    weekLow52: {
        type: Number,
        default: 0
    },

    volume: {
        type: Number,
        default: 0
    },

    marketCap: {
        type: Number,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS & NOTES
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: INVESTMENT_STATUSES,
        default: 'active',
        index: true
    },

    notes: {
        type: String,
        trim: true
    },

    tags: [{
        type: String,
        trim: true
    }],

    // ═══════════════════════════════════════════════════════════════
    // CURRENCY
    // ═══════════════════════════════════════════════════════════════
    currency: {
        type: String,
        default: 'SAR'
    },

    originalCurrency: {
        type: String,
        default: 'SAR'
    },

    exchangeRate: {
        type: Number,
        default: 1
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }

}, { timestamps: true });

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
investmentSchema.index({ firmId: 1, userId: 1 });
investmentSchema.index({ userId: 1, status: 1 });
investmentSchema.index({ userId: 1, market: 1 });
investmentSchema.index({ userId: 1, type: 1 });
investmentSchema.index({ firmId: 1, status: 1 });
investmentSchema.index({ symbol: 1, market: 1 });
investmentSchema.index({ lastPriceUpdate: 1 });
investmentSchema.index({ createdAt: -1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
investmentSchema.pre('save', async function(next) {
    // Generate investment ID if not present
    if (!this.investmentId) {
        const count = await mongoose.model('Investment').countDocuments();
        this.investmentId = `INV-${Date.now()}-${count + 1}`;
    }

    // Calculate total cost
    if (this.purchasePrice && this.quantity) {
        this.totalCost = this.purchasePrice * this.quantity + (this.fees || 0);
    }

    // Calculate current value
    if (this.currentPrice && this.quantity) {
        this.currentValue = this.currentPrice * this.quantity;
    }

    // Calculate gain/loss
    if (this.currentValue && this.totalCost) {
        this.gainLoss = this.currentValue - this.totalCost;
        this.gainLossPercent = this.totalCost > 0
            ? Math.round((this.gainLoss / this.totalCost) * 10000) / 100
            : 0;
    }

    // Calculate total return (including dividends)
    this.totalReturn = this.gainLoss + (this.dividendsReceived || 0);
    this.totalReturnPercent = this.totalCost > 0
        ? Math.round((this.totalReturn / this.totalCost) * 10000) / 100
        : 0;

    // Set category based on type if not set
    if (!this.category) {
        const categoryMap = {
            'stock': 'equities',
            'etf': 'equities',
            'mutual_fund': 'mutual_funds',
            'reit': 'real_estate',
            'sukuk': 'fixed_income',
            'bond': 'fixed_income',
            'forex': 'currencies',
            'crypto': 'alternative',
            'commodity': 'commodities'
        };
        this.category = categoryMap[this.type] || 'equities';
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// METHODS
// ═══════════════════════════════════════════════════════════════
investmentSchema.methods.updatePrice = function(priceData) {
    this.currentPrice = priceData.price;
    this.previousClose = priceData.previousClose || this.previousClose;
    this.dailyChange = priceData.change || 0;
    this.dailyChangePercent = priceData.changePercent || 0;
    this.dayHigh = priceData.high || this.dayHigh;
    this.dayLow = priceData.low || this.dayLow;
    this.volume = priceData.volume || this.volume;
    this.lastPriceUpdate = new Date();
    this.priceSource = priceData.source || 'manual';

    // Recalculate values
    this.currentValue = this.currentPrice * this.quantity;
    this.gainLoss = this.currentValue - this.totalCost;
    this.gainLossPercent = this.totalCost > 0
        ? Math.round((this.gainLoss / this.totalCost) * 10000) / 100
        : 0;
    this.totalReturn = this.gainLoss + (this.dividendsReceived || 0);
    this.totalReturnPercent = this.totalCost > 0
        ? Math.round((this.totalReturn / this.totalCost) * 10000) / 100
        : 0;
};

investmentSchema.methods.addDividend = function(amount) {
    this.dividendsReceived = (this.dividendsReceived || 0) + amount;
    this.totalReturn = this.gainLoss + this.dividendsReceived;
    this.totalReturnPercent = this.totalCost > 0
        ? Math.round((this.totalReturn / this.totalCost) * 10000) / 100
        : 0;
};

// ═══════════════════════════════════════════════════════════════
// STATICS
// ═══════════════════════════════════════════════════════════════
investmentSchema.statics.getByUser = async function(userId, filters = {}) {
    return this.find({ userId, ...filters })
        .sort({ purchaseDate: -1 });
};

investmentSchema.statics.getByFirm = async function(firmId, filters = {}) {
    return this.find({ firmId, ...filters })
        .populate('userId', 'firstName lastName email')
        .sort({ purchaseDate: -1 });
};

investmentSchema.statics.getActiveByMarket = async function(market) {
    return this.find({ market, status: 'active' });
};

investmentSchema.statics.getPortfolioSummary = async function(userId) {
    const result = await this.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'active' } },
        {
            $group: {
                _id: null,
                totalCost: { $sum: '$totalCost' },
                totalValue: { $sum: '$currentValue' },
                totalDividends: { $sum: '$dividendsReceived' },
                count: { $sum: 1 }
            }
        }
    ]);

    if (result.length === 0) {
        return {
            totalCost: 0,
            totalValue: 0,
            totalDividends: 0,
            totalGainLoss: 0,
            totalGainLossPercent: 0,
            totalReturn: 0,
            totalReturnPercent: 0,
            count: 0
        };
    }

    const summary = result[0];
    const totalGainLoss = summary.totalValue - summary.totalCost;
    const totalReturn = totalGainLoss + summary.totalDividends;

    return {
        totalCost: summary.totalCost,
        totalValue: summary.totalValue,
        totalDividends: summary.totalDividends,
        totalGainLoss,
        totalGainLossPercent: summary.totalCost > 0
            ? Math.round((totalGainLoss / summary.totalCost) * 10000) / 100
            : 0,
        totalReturn,
        totalReturnPercent: summary.totalCost > 0
            ? Math.round((totalReturn / summary.totalCost) * 10000) / 100
            : 0,
        count: summary.count
    };
};

// Export enums
investmentSchema.statics.INVESTMENT_TYPES = INVESTMENT_TYPES;
investmentSchema.statics.MARKETS = MARKETS;
investmentSchema.statics.CATEGORIES = CATEGORIES;
investmentSchema.statics.INVESTMENT_STATUSES = INVESTMENT_STATUSES;

module.exports = mongoose.model('Investment', investmentSchema);
