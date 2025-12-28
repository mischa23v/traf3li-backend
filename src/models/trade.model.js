const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// ASSET TYPES
// ═══════════════════════════════════════════════════════════════
const ASSET_TYPES = [
    'stock',        // Equities
    'forex',        // Currency pairs
    'crypto',       // Cryptocurrencies
    'futures',      // Futures contracts
    'options',      // Options contracts
    'cfd',          // Contracts for Difference
    'etf',          // Exchange-traded funds
    'commodity',    // Commodities
    'bond',         // Bonds
    'index',        // Index trading
    'other'
];

// ═══════════════════════════════════════════════════════════════
// TRADE DIRECTIONS
// ═══════════════════════════════════════════════════════════════
const TRADE_DIRECTIONS = ['long', 'short'];

// ═══════════════════════════════════════════════════════════════
// TRADE STATUSES
// ═══════════════════════════════════════════════════════════════
const TRADE_STATUSES = [
    'pending',      // Order placed, not filled
    'open',         // Position is open
    'closed',       // Position closed
    'cancelled',    // Order cancelled
    'expired'       // Order expired
];

// ═══════════════════════════════════════════════════════════════
// TRADE SETUPS
// ═══════════════════════════════════════════════════════════════
const TRADE_SETUPS = [
    'breakout',             // Price breakout above resistance
    'breakdown',            // Price breakdown below support
    'trend_following',      // Following established trend
    'pullback',             // Entry on pullback/retracement
    'reversal',             // Trend reversal pattern
    'support_bounce',       // Bounce from support level
    'resistance_rejection', // Rejection at resistance
    'range_trade',          // Trading within range
    'gap_fill',             // Trading gap fill
    'earnings_play',        // Earnings-based trade
    'news_trade',           // News-driven trade
    'scalp',                // Quick scalp trade
    'swing',                // Multi-day swing trade
    'position',             // Long-term position
    'momentum',             // Momentum trade
    'mean_reversion',       // Mean reversion strategy
    'arbitrage',            // Arbitrage opportunity
    'other'
];

// ═══════════════════════════════════════════════════════════════
// TIMEFRAMES
// ═══════════════════════════════════════════════════════════════
const TIMEFRAMES = [
    '1m', '2m', '3m', '5m', '10m', '15m', '30m',  // Minutes
    '1h', '2h', '4h', '6h', '8h', '12h',          // Hours
    '1d', '2d', '3d',                             // Days
    '1w', '2w',                                   // Weeks
    '1M'                                          // Month
];

// ═══════════════════════════════════════════════════════════════
// MARKET CONDITIONS
// ═══════════════════════════════════════════════════════════════
const MARKET_CONDITIONS = [
    'trending_up',      // Strong uptrend
    'trending_down',    // Strong downtrend
    'ranging',          // Sideways/consolidation
    'volatile',         // High volatility
    'choppy',           // Choppy/uncertain
    'breakout',         // Breaking out of range
    'low_volume'        // Low volume period
];

// ═══════════════════════════════════════════════════════════════
// MARKET SESSIONS
// ═══════════════════════════════════════════════════════════════
const MARKET_SESSIONS = [
    'asian',        // Asian session (Tokyo, HK, Singapore)
    'london',       // London/European session
    'new_york',     // New York session
    'overlap',      // Session overlap
    'off_hours'     // Outside main sessions
];

// ═══════════════════════════════════════════════════════════════
// EMOTION STATES
// ═══════════════════════════════════════════════════════════════
const EMOTION_STATES = [
    // Positive/Neutral
    'confident',        // واثق
    'calm',             // هادئ
    'focused',          // مركز
    'patient',          // صبور
    'neutral',          // محايد
    'disciplined',      // منضبط
    // Negative Entry Emotions
    'anxious',          // قلق
    'fearful',          // خائف
    'greedy',           // طماع
    'excited',          // متحمس (over-excited)
    'revenge',          // انتقامي (revenge trading)
    'fomo',             // خوف من الفوات
    'impatient',        // غير صبور
    'overconfident',    // مفرط الثقة
    'hesitant',         // متردد
    // Exit Emotions
    'satisfied',        // راضي
    'relieved',         // مرتاح
    'proud',            // فخور
    'disappointed',     // محبط
    'frustrated',       // منزعج
    'regretful',        // نادم
    'angry'             // غاضب
];

// ═══════════════════════════════════════════════════════════════
// TRADE LABELS
// ═══════════════════════════════════════════════════════════════
const TRADE_LABELS = [
    'a_plus_setup',     // A+ quality setup
    'textbook',         // Textbook perfect trade
    'impulsive',        // Impulsive entry
    'overtrading',      // Part of overtrading
    'revenge_trade',    // Revenge trade
    'fomo_trade',       // FOMO trade
    'early_exit',       // Exited too early
    'late_exit',        // Exited too late
    'moved_stop',       // Moved stop loss
    'no_stop',          // No stop loss used
    'sized_wrong'       // Wrong position size
];

// ═══════════════════════════════════════════════════════════════
// ATTACHMENT SCHEMA
// ═══════════════════════════════════════════════════════════════
const AttachmentSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['image', 'video', 'document', 'link'],
        required: true
    },
    url: {
        type: String,
        required: true
    },
    filename: {
        type: String
    },
    description: {
        type: String
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

// ═══════════════════════════════════════════════════════════════
// TRADE SCHEMA
// ═══════════════════════════════════════════════════════════════
const tradeSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
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
    // Owner (user who created this trade)
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    tenantId: {
        type: String,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // BASIC TRADE INFO
    // ═══════════════════════════════════════════════════════════════
    tradeId: {
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

    symbolName: {
        type: String,
        trim: true
    },

    assetType: {
        type: String,
        enum: ASSET_TYPES,
        required: true,
        index: true
    },

    direction: {
        type: String,
        enum: TRADE_DIRECTIONS,
        required: true,
        index: true
    },

    status: {
        type: String,
        enum: TRADE_STATUSES,
        required: true,
        default: 'open',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // ENTRY DETAILS
    // ═══════════════════════════════════════════════════════════════
    entryDate: {
        type: Date,
        required: true,
        index: true
    },

    entryPrice: {
        type: Number,
        required: true,
        min: 0
    },

    quantity: {
        type: Number,
        required: true,
        min: 0
    },

    entryCommission: {
        type: Number,
        default: 0,
        min: 0
    },

    entryFees: {
        type: Number,
        default: 0,
        min: 0
    },

    slippage: {
        type: Number,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // EXIT DETAILS
    // ═══════════════════════════════════════════════════════════════
    exitDate: {
        type: Date,
        index: true
    },

    exitPrice: {
        type: Number,
        min: 0
    },

    exitCommission: {
        type: Number,
        default: 0,
        min: 0
    },

    exitFees: {
        type: Number,
        default: 0,
        min: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // CALCULATED FIELDS (computed on save)
    // ═══════════════════════════════════════════════════════════════
    grossPnl: {
        type: Number,
        default: 0
    },

    netPnl: {
        type: Number,
        default: 0,
        index: true
    },

    pnlPercent: {
        type: Number,
        default: 0
    },

    rMultiple: {
        type: Number
    },

    holdingPeriod: {
        type: Number  // Duration in minutes
    },

    holdingDays: {
        type: Number  // Duration in days
    },

    // ═══════════════════════════════════════════════════════════════
    // RISK MANAGEMENT
    // ═══════════════════════════════════════════════════════════════
    stopLoss: {
        type: Number,
        min: 0
    },

    takeProfit: {
        type: Number,
        min: 0
    },

    riskAmount: {
        type: Number,
        min: 0
    },

    riskPercent: {
        type: Number,
        min: 0,
        max: 100
    },

    positionValue: {
        type: Number,
        min: 0
    },

    riskRewardRatio: {
        type: Number
    },

    // Trailing Stop
    trailingStopEnabled: {
        type: Boolean,
        default: false
    },

    trailingStopDistance: {
        type: Number,
        min: 0
    },

    trailingStopActivation: {
        type: Number,
        min: 0
    },

    // Scaling
    scaledIn: {
        type: Boolean,
        default: false
    },

    scaledOut: {
        type: Boolean,
        default: false
    },

    averageEntryPrice: {
        type: Number,
        min: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // TRADE ANALYSIS
    // ═══════════════════════════════════════════════════════════════
    setup: {
        type: String,
        enum: TRADE_SETUPS,
        index: true
    },

    timeframe: {
        type: String,
        enum: TIMEFRAMES
    },

    strategy: {
        type: String,
        trim: true
    },

    marketCondition: {
        type: String,
        enum: MARKET_CONDITIONS
    },

    marketSession: {
        type: String,
        enum: MARKET_SESSIONS
    },

    // Technical Analysis
    technicalIndicators: [{
        type: String,
        trim: true
    }],

    entryReason: {
        type: String,
        trim: true
    },

    exitReason: {
        type: String,
        trim: true
    },

    // Fundamental Analysis
    fundamentalFactors: [{
        type: String,
        trim: true
    }],

    newsEvent: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // PSYCHOLOGY & JOURNAL
    // ═══════════════════════════════════════════════════════════════
    emotionEntry: {
        type: String,
        enum: EMOTION_STATES
    },

    emotionDuring: {
        type: String,
        enum: EMOTION_STATES
    },

    emotionExit: {
        type: String,
        enum: EMOTION_STATES
    },

    confidenceLevel: {
        type: Number,
        min: 1,
        max: 10
    },

    // Trade Execution Quality
    executionQuality: {
        type: Number,
        min: 1,
        max: 5
    },

    followedPlan: {
        type: Boolean
    },

    // Journal Entries
    preTradeNotes: {
        type: String,
        trim: true
    },

    duringTradeNotes: {
        type: String,
        trim: true
    },

    postTradeNotes: {
        type: String,
        trim: true
    },

    lessonsLearned: {
        type: String,
        trim: true
    },

    mistakes: [{
        type: String,
        trim: true
    }],

    improvements: [{
        type: String,
        trim: true
    }],

    // ═══════════════════════════════════════════════════════════════
    // TAGS & CATEGORIZATION
    // ═══════════════════════════════════════════════════════════════
    tags: [{
        type: String,
        trim: true
    }],

    labels: [{
        type: String,
        enum: TRADE_LABELS
    }],

    category: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // ATTACHMENTS
    // ═══════════════════════════════════════════════════════════════
    entryScreenshot: {
        type: String
    },

    exitScreenshot: {
        type: String
    },

    attachments: [AttachmentSchema],

    // ═══════════════════════════════════════════════════════════════
    // BROKER & ACCOUNT
    // ═══════════════════════════════════════════════════════════════
    brokerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Broker',
        index: true
    },

    brokerName: {
        type: String,
        trim: true
    },

    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TradingAccount',
        index: true
    },

    accountName: {
        type: String,
        trim: true
    },

    accountCurrency: {
        type: String,
        default: 'SAR'
    },

    // ═══════════════════════════════════════════════════════════════
    // LINKING
    // ═══════════════════════════════════════════════════════════════
    linkedTrades: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trade'
    }],

    parentTradeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trade'
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
tradeSchema.index({ firmId: 1, userId: 1 });
tradeSchema.index({ firmId: 1, status: 1 });
tradeSchema.index({ userId: 1, status: 1 });
tradeSchema.index({ userId: 1, entryDate: -1 });
tradeSchema.index({ firmId: 1, entryDate: -1 });
tradeSchema.index({ userId: 1, symbol: 1 });
tradeSchema.index({ userId: 1, assetType: 1 });
tradeSchema.index({ createdAt: -1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
tradeSchema.pre('save', async function(next) {
    // Generate trade ID if not present
    if (!this.tradeId) {
        const count = await mongoose.model('Trade').countDocuments();
        this.tradeId = `TRD-${Date.now()}-${count + 1}`;
    }

    // Calculate position value (entryPrice × quantity × 100 for halalas)
    if (this.entryPrice && this.quantity) {
        this.positionValue = Math.round(this.entryPrice * this.quantity * 100);
    }

    // Calculate risk/reward ratio
    if (this.stopLoss && this.takeProfit && this.entryPrice) {
        let risk, reward;
        if (this.direction === 'long') {
            risk = this.entryPrice - this.stopLoss;
            reward = this.takeProfit - this.entryPrice;
        } else {
            risk = this.stopLoss - this.entryPrice;
            reward = this.entryPrice - this.takeProfit;
        }
        if (risk > 0) {
            this.riskRewardRatio = Math.round((reward / risk) * 100) / 100;
        }
    }

    // Calculate P&L for closed trades
    if (this.status === 'closed' && this.exitPrice) {
        const priceDiff = this.direction === 'long'
            ? this.exitPrice - this.entryPrice
            : this.entryPrice - this.exitPrice;

        // Gross P&L in halalas
        this.grossPnl = Math.round(priceDiff * this.quantity * 100);

        // Total fees
        const totalFees = (this.entryCommission || 0) + (this.exitCommission || 0)
                        + (this.entryFees || 0) + (this.exitFees || 0);

        // Net P&L
        this.netPnl = this.grossPnl - totalFees;

        // P&L percentage
        this.pnlPercent = Math.round((priceDiff / this.entryPrice) * 10000) / 100;

        // R-Multiple
        if (this.riskAmount && this.riskAmount > 0) {
            this.rMultiple = Math.round((this.netPnl / this.riskAmount) * 100) / 100;
        }

        // Holding period
        if (this.exitDate && this.entryDate) {
            const diffMs = new Date(this.exitDate) - new Date(this.entryDate);
            this.holdingPeriod = Math.round(diffMs / 60000); // minutes
            this.holdingDays = Math.round((diffMs / 86400000) * 100) / 100; // days
        }
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATICS
// ═══════════════════════════════════════════════════════════════
tradeSchema.statics.getByUser = async function(userId, filters = {}) {
    return this.find({ userId, ...filters })
        .populate('brokerId', 'name type')
        .populate('accountId', 'name type')
        .sort({ entryDate: -1 });
};

tradeSchema.statics.getByFirm = async function(firmId, filters = {}) {
    return this.find({ firmId, ...filters })
        .populate('brokerId', 'name type')
        .populate('accountId', 'name type')
        .populate('userId', 'firstName lastName email')
        .sort({ entryDate: -1 });
};

// Export enums for use in other files
tradeSchema.statics.ASSET_TYPES = ASSET_TYPES;
tradeSchema.statics.TRADE_DIRECTIONS = TRADE_DIRECTIONS;
tradeSchema.statics.TRADE_STATUSES = TRADE_STATUSES;
tradeSchema.statics.TRADE_SETUPS = TRADE_SETUPS;
tradeSchema.statics.TIMEFRAMES = TIMEFRAMES;
tradeSchema.statics.MARKET_CONDITIONS = MARKET_CONDITIONS;
tradeSchema.statics.MARKET_SESSIONS = MARKET_SESSIONS;
tradeSchema.statics.EMOTION_STATES = EMOTION_STATES;
tradeSchema.statics.TRADE_LABELS = TRADE_LABELS;

module.exports = mongoose.model('Trade', tradeSchema);
