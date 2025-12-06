const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// ACCOUNT TYPES
// ═══════════════════════════════════════════════════════════════
const ACCOUNT_TYPES = [
    'cash',         // Cash account
    'margin',       // Margin account
    'ira',          // Retirement account
    'prop',         // Prop firm account
    'demo',         // Demo/paper account
    'crypto',       // Crypto wallet/exchange
    'other'
];

// ═══════════════════════════════════════════════════════════════
// ACCOUNT STATUSES
// ═══════════════════════════════════════════════════════════════
const ACCOUNT_STATUSES = [
    'active',
    'inactive',
    'closed',
    'demo'
];

// ═══════════════════════════════════════════════════════════════
// TRADING ACCOUNT SCHEMA
// ═══════════════════════════════════════════════════════════════
const tradingAccountSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },

    // Owner
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // BASIC INFO
    // ═══════════════════════════════════════════════════════════════
    tradingAccountId: {
        type: String,
        unique: true,
        index: true
    },

    name: {
        type: String,
        required: true,
        trim: true
    },

    accountNumber: {
        type: String,
        trim: true
    },

    brokerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Broker',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // ACCOUNT TYPE
    // ═══════════════════════════════════════════════════════════════
    type: {
        type: String,
        enum: ACCOUNT_TYPES,
        required: true,
        default: 'cash'
    },

    currency: {
        type: String,
        default: 'SAR'
    },

    // ═══════════════════════════════════════════════════════════════
    // BALANCE TRACKING (all in halalas)
    // ═══════════════════════════════════════════════════════════════
    initialBalance: {
        type: Number,
        required: true,
        min: 0
    },

    currentBalance: {
        type: Number,
        default: 0,
        min: 0
    },

    realizedPnl: {
        type: Number,
        default: 0
    },

    unrealizedPnl: {
        type: Number,
        default: 0
    },

    // Deposits and withdrawals
    totalDeposits: {
        type: Number,
        default: 0,
        min: 0
    },

    totalWithdrawals: {
        type: Number,
        default: 0,
        min: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // RISK SETTINGS
    // ═══════════════════════════════════════════════════════════════
    maxDailyLoss: {
        type: Number,
        min: 0
    },

    maxDailyLossPercent: {
        type: Number,
        min: 0,
        max: 100
    },

    maxPositionSize: {
        type: Number,
        min: 0
    },

    maxOpenTrades: {
        type: Number,
        min: 1
    },

    defaultRiskPercent: {
        type: Number,
        min: 0,
        max: 100,
        default: 1
    },

    // ═══════════════════════════════════════════════════════════════
    // DAILY TRACKING (reset daily)
    // ═══════════════════════════════════════════════════════════════
    todayPnl: {
        type: Number,
        default: 0
    },

    todayLossUsed: {
        type: Number,
        default: 0
    },

    todayTradesCount: {
        type: Number,
        default: 0
    },

    lastTradingDay: {
        type: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ACCOUNT_STATUSES,
        default: 'active',
        index: true
    },

    isDemo: {
        type: Boolean,
        default: false
    },

    isDefault: {
        type: Boolean,
        default: false
    },

    // ═══════════════════════════════════════════════════════════════
    // ADDITIONAL INFO
    // ═══════════════════════════════════════════════════════════════
    description: {
        type: String,
        trim: true
    },

    notes: {
        type: String,
        trim: true
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
tradingAccountSchema.index({ firmId: 1, userId: 1 });
tradingAccountSchema.index({ userId: 1, brokerId: 1 });
tradingAccountSchema.index({ userId: 1, status: 1 });
tradingAccountSchema.index({ firmId: 1, status: 1 });
tradingAccountSchema.index({ userId: 1, isDefault: 1 });
tradingAccountSchema.index({ createdAt: -1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
tradingAccountSchema.pre('save', async function(next) {
    // Generate account ID if not present
    if (!this.tradingAccountId) {
        const count = await mongoose.model('TradingAccount').countDocuments();
        this.tradingAccountId = `ACC-${Date.now()}-${count + 1}`;
    }

    // Initialize current balance from initial balance if new
    if (this.isNew && !this.currentBalance) {
        this.currentBalance = this.initialBalance;
    }

    // Set isDemo based on type or status
    if (this.type === 'demo' || this.status === 'demo') {
        this.isDemo = true;
    }

    // If setting as default, unset other defaults for this user
    if (this.isDefault && this.isModified('isDefault')) {
        await mongoose.model('TradingAccount').updateMany(
            {
                userId: this.userId,
                _id: { $ne: this._id },
                isDefault: true
            },
            { isDefault: false }
        );
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// METHODS
// ═══════════════════════════════════════════════════════════════
tradingAccountSchema.methods.canTrade = function() {
    // Check if trading is allowed based on daily loss limit
    if (this.maxDailyLoss && this.todayLossUsed >= this.maxDailyLoss) {
        return false;
    }

    if (this.maxDailyLossPercent) {
        const maxLoss = (this.currentBalance * this.maxDailyLossPercent) / 100;
        if (this.todayLossUsed >= maxLoss) {
            return false;
        }
    }

    return true;
};

tradingAccountSchema.methods.resetDailyStats = function() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!this.lastTradingDay || this.lastTradingDay < today) {
        this.todayPnl = 0;
        this.todayLossUsed = 0;
        this.todayTradesCount = 0;
        this.lastTradingDay = today;
    }
};

tradingAccountSchema.methods.getBalanceInfo = function() {
    return {
        initialBalance: this.initialBalance,
        deposits: this.totalDeposits,
        withdrawals: this.totalWithdrawals,
        realizedPnl: this.realizedPnl,
        unrealizedPnl: this.unrealizedPnl,
        currentBalance: this.currentBalance,
        todayPnl: this.todayPnl,
        todayLossLimit: this.maxDailyLoss || (this.maxDailyLossPercent
            ? Math.round((this.currentBalance * this.maxDailyLossPercent) / 100)
            : null),
        todayLossUsed: this.todayLossUsed,
        canTrade: this.canTrade()
    };
};

// ═══════════════════════════════════════════════════════════════
// STATICS
// ═══════════════════════════════════════════════════════════════
tradingAccountSchema.statics.getByUser = async function(userId, filters = {}) {
    return this.find({ userId, ...filters })
        .populate('brokerId', 'name type displayName')
        .sort({ isDefault: -1, name: 1 });
};

tradingAccountSchema.statics.getByFirm = async function(firmId, filters = {}) {
    return this.find({ firmId, ...filters })
        .populate('brokerId', 'name type displayName')
        .populate('userId', 'firstName lastName email')
        .sort({ isDefault: -1, name: 1 });
};

tradingAccountSchema.statics.getByBroker = async function(brokerId, filters = {}) {
    return this.find({ brokerId, ...filters }).sort({ name: 1 });
};

tradingAccountSchema.statics.getDefault = async function(userId) {
    return this.findOne({ userId, isDefault: true, status: 'active' })
        .populate('brokerId', 'name type displayName');
};

// Export enums
tradingAccountSchema.statics.ACCOUNT_TYPES = ACCOUNT_TYPES;
tradingAccountSchema.statics.ACCOUNT_STATUSES = ACCOUNT_STATUSES;

module.exports = mongoose.model('TradingAccount', tradingAccountSchema);
