const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// PERIOD TYPES
// ═══════════════════════════════════════════════════════════════
const PERIOD_TYPES = [
    'daily',
    'weekly',
    'monthly',
    'yearly',
    'all_time'
];

// ═══════════════════════════════════════════════════════════════
// BREAKDOWN SCHEMA (for grouping stats)
// ═══════════════════════════════════════════════════════════════
const BreakdownSchema = new mongoose.Schema({
    trades: {
        type: Number,
        default: 0
    },
    netPnl: {
        type: Number,
        default: 0
    },
    winRate: {
        type: Number,
        default: 0
    }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// TRADE STATS SCHEMA
// ═══════════════════════════════════════════════════════════════
const tradeStatsSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // OWNERSHIP
    // ═══════════════════════════════════════════════════════════════
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },

    // Optional: Stats for specific account
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TradingAccount',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // TIME PERIOD
    // ═══════════════════════════════════════════════════════════════
    periodType: {
        type: String,
        enum: PERIOD_TYPES,
        required: true,
        index: true
    },

    periodStart: {
        type: Date,
        required: true,
        index: true
    },

    periodEnd: {
        type: Date,
        required: true
    },

    // ═══════════════════════════════════════════════════════════════
    // TRADE COUNTS
    // ═══════════════════════════════════════════════════════════════
    totalTrades: {
        type: Number,
        default: 0
    },

    winningTrades: {
        type: Number,
        default: 0
    },

    losingTrades: {
        type: Number,
        default: 0
    },

    breakEvenTrades: {
        type: Number,
        default: 0
    },

    openTrades: {
        type: Number,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // P&L METRICS (all in halalas)
    // ═══════════════════════════════════════════════════════════════
    grossProfit: {
        type: Number,
        default: 0
    },

    grossLoss: {
        type: Number,
        default: 0
    },

    netPnl: {
        type: Number,
        default: 0
    },

    totalCommissions: {
        type: Number,
        default: 0
    },

    totalFees: {
        type: Number,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // PERFORMANCE RATIOS
    // ═══════════════════════════════════════════════════════════════
    winRate: {
        type: Number,
        default: 0
    },

    lossRate: {
        type: Number,
        default: 0
    },

    profitFactor: {
        type: Number,
        default: 0
    },

    averageWin: {
        type: Number,
        default: 0
    },

    averageLoss: {
        type: Number,
        default: 0
    },

    averageRMultiple: {
        type: Number,
        default: 0
    },

    expectancy: {
        type: Number,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // RISK METRICS
    // ═══════════════════════════════════════════════════════════════
    largestWin: {
        type: Number,
        default: 0
    },

    largestLoss: {
        type: Number,
        default: 0
    },

    maxConsecutiveWins: {
        type: Number,
        default: 0
    },

    maxConsecutiveLosses: {
        type: Number,
        default: 0
    },

    currentStreak: {
        type: Number,
        default: 0  // +ve for wins, -ve for losses
    },

    maxDrawdown: {
        type: Number,
        default: 0
    },

    maxDrawdownPercent: {
        type: Number,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // TIME METRICS
    // ═══════════════════════════════════════════════════════════════
    averageHoldingTime: {
        type: Number,
        default: 0  // In minutes
    },

    shortestTrade: {
        type: Number,
        default: 0  // In minutes
    },

    longestTrade: {
        type: Number,
        default: 0  // In minutes
    },

    // ═══════════════════════════════════════════════════════════════
    // BREAKDOWN BY ASSET TYPE
    // ═══════════════════════════════════════════════════════════════
    byAssetType: {
        type: Map,
        of: BreakdownSchema
    },

    // ═══════════════════════════════════════════════════════════════
    // BREAKDOWN BY SETUP
    // ═══════════════════════════════════════════════════════════════
    bySetup: {
        type: Map,
        of: BreakdownSchema
    },

    // ═══════════════════════════════════════════════════════════════
    // BREAKDOWN BY DAY OF WEEK (0 = Sunday, 6 = Saturday)
    // ═══════════════════════════════════════════════════════════════
    byDayOfWeek: {
        type: Map,
        of: BreakdownSchema
    },

    // ═══════════════════════════════════════════════════════════════
    // BREAKDOWN BY HOUR (0-23)
    // ═══════════════════════════════════════════════════════════════
    byHour: {
        type: Map,
        of: BreakdownSchema
    },

    // ═══════════════════════════════════════════════════════════════
    // BREAKDOWN BY DIRECTION
    // ═══════════════════════════════════════════════════════════════
    byDirection: {
        type: Map,
        of: BreakdownSchema
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT
    // ═══════════════════════════════════════════════════════════════
    calculatedAt: {
        type: Date,
        default: Date.now
    }

}, { timestamps: true });

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
tradeStatsSchema.index({ userId: 1, periodType: 1, periodStart: -1 });
tradeStatsSchema.index({ firmId: 1, periodType: 1, periodStart: -1 });
tradeStatsSchema.index({ userId: 1, accountId: 1, periodType: 1 });
tradeStatsSchema.index({ calculatedAt: -1 });

// Compound unique index to prevent duplicate stats entries
tradeStatsSchema.index(
    { userId: 1, periodType: 1, periodStart: 1, accountId: 1 },
    { unique: true, sparse: true }
);

// ═══════════════════════════════════════════════════════════════
// STATICS
// ═══════════════════════════════════════════════════════════════
tradeStatsSchema.statics.calculateFromTrades = async function(trades) {
    if (!trades || trades.length === 0) {
        return null;
    }

    const closedTrades = trades.filter(t => t.status === 'closed');
    const openTrades = trades.filter(t => t.status === 'open');

    const winningTrades = closedTrades.filter(t => t.netPnl > 0);
    const losingTrades = closedTrades.filter(t => t.netPnl < 0);
    const breakEvenTrades = closedTrades.filter(t => t.netPnl === 0);

    const grossProfit = winningTrades.reduce((sum, t) => sum + t.netPnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.netPnl, 0));
    const netPnl = closedTrades.reduce((sum, t) => sum + t.netPnl, 0);

    const totalCommissions = closedTrades.reduce((sum, t) =>
        sum + (t.entryCommission || 0) + (t.exitCommission || 0), 0);
    const totalFees = closedTrades.reduce((sum, t) =>
        sum + (t.entryFees || 0) + (t.exitFees || 0), 0);

    const decidedTrades = winningTrades.length + losingTrades.length;
    const winRate = decidedTrades > 0 ? (winningTrades.length / decidedTrades) * 100 : 0;
    const lossRate = 100 - winRate;

    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);

    const averageWin = winningTrades.length > 0
        ? Math.round(grossProfit / winningTrades.length)
        : 0;
    const averageLoss = losingTrades.length > 0
        ? Math.round(grossLoss / losingTrades.length)
        : 0;

    const tradesWithR = closedTrades.filter(t => t.rMultiple !== null && t.rMultiple !== undefined);
    const averageRMultiple = tradesWithR.length > 0
        ? tradesWithR.reduce((sum, t) => sum + t.rMultiple, 0) / tradesWithR.length
        : 0;

    const expectancy = decidedTrades > 0
        ? ((winRate / 100) * averageWin) - ((lossRate / 100) * averageLoss)
        : 0;

    const largestWin = winningTrades.length > 0
        ? Math.max(...winningTrades.map(t => t.netPnl))
        : 0;
    const largestLoss = losingTrades.length > 0
        ? Math.min(...losingTrades.map(t => t.netPnl))
        : 0;

    // Calculate consecutive wins/losses
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let currentWins = 0;
    let currentLosses = 0;

    const sortedTrades = closedTrades.sort((a, b) =>
        new Date(a.exitDate) - new Date(b.exitDate));

    for (const trade of sortedTrades) {
        if (trade.netPnl > 0) {
            currentWins++;
            currentLosses = 0;
            maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWins);
        } else if (trade.netPnl < 0) {
            currentLosses++;
            currentWins = 0;
            maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLosses);
        }
    }

    // Current streak
    let currentStreak = 0;
    if (sortedTrades.length > 0) {
        const lastTrade = sortedTrades[sortedTrades.length - 1];
        if (lastTrade.netPnl > 0) {
            currentStreak = currentWins;
        } else if (lastTrade.netPnl < 0) {
            currentStreak = -currentLosses;
        }
    }

    // Holding time stats
    const tradesWithHolding = closedTrades.filter(t => t.holdingPeriod !== null && t.holdingPeriod !== undefined);
    const averageHoldingTime = tradesWithHolding.length > 0
        ? Math.round(tradesWithHolding.reduce((sum, t) => sum + t.holdingPeriod, 0) / tradesWithHolding.length)
        : 0;
    const shortestTrade = tradesWithHolding.length > 0
        ? Math.min(...tradesWithHolding.map(t => t.holdingPeriod))
        : 0;
    const longestTrade = tradesWithHolding.length > 0
        ? Math.max(...tradesWithHolding.map(t => t.holdingPeriod))
        : 0;

    // Breakdowns
    const byAssetType = {};
    const bySetup = {};
    const byDayOfWeek = {};
    const byHour = {};
    const byDirection = {};

    for (const trade of closedTrades) {
        // By asset type
        if (trade.assetType) {
            if (!byAssetType[trade.assetType]) {
                byAssetType[trade.assetType] = { trades: 0, netPnl: 0, winCount: 0 };
            }
            byAssetType[trade.assetType].trades++;
            byAssetType[trade.assetType].netPnl += trade.netPnl;
            if (trade.netPnl > 0) byAssetType[trade.assetType].winCount++;
        }

        // By setup
        if (trade.setup) {
            if (!bySetup[trade.setup]) {
                bySetup[trade.setup] = { trades: 0, netPnl: 0, winCount: 0 };
            }
            bySetup[trade.setup].trades++;
            bySetup[trade.setup].netPnl += trade.netPnl;
            if (trade.netPnl > 0) bySetup[trade.setup].winCount++;
        }

        // By day of week
        if (trade.entryDate) {
            const day = new Date(trade.entryDate).getDay();
            if (!byDayOfWeek[day]) {
                byDayOfWeek[day] = { trades: 0, netPnl: 0, winCount: 0 };
            }
            byDayOfWeek[day].trades++;
            byDayOfWeek[day].netPnl += trade.netPnl;
            if (trade.netPnl > 0) byDayOfWeek[day].winCount++;
        }

        // By hour
        if (trade.entryDate) {
            const hour = new Date(trade.entryDate).getHours();
            if (!byHour[hour]) {
                byHour[hour] = { trades: 0, netPnl: 0, winCount: 0 };
            }
            byHour[hour].trades++;
            byHour[hour].netPnl += trade.netPnl;
            if (trade.netPnl > 0) byHour[hour].winCount++;
        }

        // By direction
        if (trade.direction) {
            if (!byDirection[trade.direction]) {
                byDirection[trade.direction] = { trades: 0, netPnl: 0, winCount: 0 };
            }
            byDirection[trade.direction].trades++;
            byDirection[trade.direction].netPnl += trade.netPnl;
            if (trade.netPnl > 0) byDirection[trade.direction].winCount++;
        }
    }

    // Calculate win rates for breakdowns
    const finalizeBreakdown = (breakdown) => {
        const result = {};
        for (const [key, data] of Object.entries(breakdown)) {
            const decidedCount = data.trades; // All closed trades count
            result[key] = {
                trades: data.trades,
                netPnl: data.netPnl,
                winRate: decidedCount > 0 ? Math.round((data.winCount / decidedCount) * 100) : 0
            };
        }
        return result;
    };

    return {
        totalTrades: trades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        breakEvenTrades: breakEvenTrades.length,
        openTrades: openTrades.length,
        grossProfit,
        grossLoss,
        netPnl,
        totalCommissions,
        totalFees,
        winRate: Math.round(winRate * 100) / 100,
        lossRate: Math.round(lossRate * 100) / 100,
        profitFactor: Math.round(profitFactor * 100) / 100,
        averageWin,
        averageLoss,
        averageRMultiple: Math.round(averageRMultiple * 100) / 100,
        expectancy: Math.round(expectancy),
        largestWin,
        largestLoss,
        maxConsecutiveWins,
        maxConsecutiveLosses,
        currentStreak,
        averageHoldingTime,
        shortestTrade,
        longestTrade,
        byAssetType: finalizeBreakdown(byAssetType),
        bySetup: finalizeBreakdown(bySetup),
        byDayOfWeek: finalizeBreakdown(byDayOfWeek),
        byHour: finalizeBreakdown(byHour),
        byDirection: finalizeBreakdown(byDirection)
    };
};

// Export enums
tradeStatsSchema.statics.PERIOD_TYPES = PERIOD_TYPES;

module.exports = mongoose.model('TradeStats', tradeStatsSchema);
