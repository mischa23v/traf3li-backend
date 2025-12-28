const { Trade, Broker, TradingAccount, TradeStats } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const mongoose = require('mongoose');

// Helper function to escape regex special characters (ReDoS protection)
const escapeRegex = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// ═══════════════════════════════════════════════════════════════
// CREATE TRADE
// ═══════════════════════════════════════════════════════════════
const createTrade = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to create trades', 403);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'symbol', 'symbolName', 'assetType', 'direction', 'status',
        'entryDate', 'entryPrice', 'quantity', 'entryCommission', 'entryFees', 'slippage',
        'exitDate', 'exitPrice', 'exitCommission', 'exitFees',
        'stopLoss', 'takeProfit', 'riskAmount', 'riskPercent',
        'trailingStopEnabled', 'trailingStopDistance', 'trailingStopActivation',
        'scaledIn', 'scaledOut', 'averageEntryPrice',
        'setup', 'timeframe', 'strategy', 'marketCondition', 'marketSession',
        'technicalIndicators', 'entryReason', 'exitReason', 'fundamentalFactors', 'newsEvent',
        'emotionEntry', 'emotionDuring', 'emotionExit', 'confidenceLevel',
        'executionQuality', 'followedPlan',
        'preTradeNotes', 'duringTradeNotes', 'postTradeNotes',
        'lessonsLearned', 'mistakes', 'improvements',
        'tags', 'labels', 'category',
        'entryScreenshot', 'exitScreenshot', 'attachments',
        'brokerId', 'accountId', 'linkedTrades', 'parentTradeId'
    ];

    const filteredData = pickAllowedFields(req.body, allowedFields);

    const {
        symbol,
        symbolName,
        assetType,
        direction,
        status = 'open',
        entryDate,
        entryPrice,
        quantity,
        entryCommission,
        entryFees,
        slippage,
        exitDate,
        exitPrice,
        exitCommission,
        exitFees,
        stopLoss,
        takeProfit,
        riskAmount,
        riskPercent,
        trailingStopEnabled,
        trailingStopDistance,
        trailingStopActivation,
        scaledIn,
        scaledOut,
        averageEntryPrice,
        setup,
        timeframe,
        strategy,
        marketCondition,
        marketSession,
        technicalIndicators,
        entryReason,
        exitReason,
        fundamentalFactors,
        newsEvent,
        emotionEntry,
        emotionDuring,
        emotionExit,
        confidenceLevel,
        executionQuality,
        followedPlan,
        preTradeNotes,
        duringTradeNotes,
        postTradeNotes,
        lessonsLearned,
        mistakes,
        improvements,
        tags,
        labels,
        category,
        entryScreenshot,
        exitScreenshot,
        attachments,
        brokerId,
        accountId,
        linkedTrades,
        parentTradeId
    } = filteredData;

    // ─────────────────────────────────────────────────────────────
    // VALIDATION
    // ─────────────────────────────────────────────────────────────
    if (!symbol || symbol.trim().length === 0) {
        throw CustomException('Symbol is required', 400);
    }

    if (!assetType) {
        throw CustomException('Asset type is required', 400);
    }

    if (!direction) {
        throw CustomException('Direction is required (long or short)', 400);
    }

    if (!entryDate) {
        throw CustomException('Entry date is required', 400);
    }

    const entryDateObj = new Date(entryDate);
    if (entryDateObj > new Date()) {
        throw CustomException('Entry date cannot be in the future', 400);
    }

    // Enhanced input validation for trade amounts
    if (!entryPrice || typeof entryPrice !== 'number' || !isFinite(entryPrice) || entryPrice <= 0) {
        throw CustomException('Entry price must be a valid positive number', 400);
    }

    if (!quantity || typeof quantity !== 'number' || !isFinite(quantity) || quantity <= 0) {
        throw CustomException('Quantity must be a valid positive number', 400);
    }

    // Validate optional numeric fields
    const numericFields = {
        entryCommission, entryFees, slippage, exitPrice, exitCommission, exitFees,
        stopLoss, takeProfit, riskAmount, riskPercent, trailingStopDistance,
        trailingStopActivation, averageEntryPrice
    };

    for (const [key, value] of Object.entries(numericFields)) {
        if (value !== undefined && value !== null) {
            if (typeof value !== 'number' || !isFinite(value) || value < 0) {
                throw CustomException(`${key} must be a valid non-negative number`, 400);
            }
        }
    }

    // Validate exit date if provided
    if (exitDate) {
        const exitDateObj = new Date(exitDate);
        if (exitDateObj < entryDateObj) {
            throw CustomException('Exit date must be after entry date', 400);
        }
    }

    // Validate stop loss
    if (stopLoss) {
        if (direction === 'long' && stopLoss >= entryPrice) {
            throw CustomException('Stop loss must be below entry price for long trades', 400);
        }
        if (direction === 'short' && stopLoss <= entryPrice) {
            throw CustomException('Stop loss must be above entry price for short trades', 400);
        }
    }

    // Validate take profit
    if (takeProfit) {
        if (direction === 'long' && takeProfit <= entryPrice) {
            throw CustomException('Take profit must be above entry price for long trades', 400);
        }
        if (direction === 'short' && takeProfit >= entryPrice) {
            throw CustomException('Take profit must be below entry price for short trades', 400);
        }
    }

    // Validate broker exists if provided (IDOR protection)
    let brokerName = null;
    let sanitizedBrokerId = null;
    if (brokerId) {
        sanitizedBrokerId = sanitizeObjectId(brokerId);
        const broker = await Broker.findOne({
            _id: sanitizedBrokerId,
            ...req.firmQuery
        });
        if (!broker) {
            throw CustomException('Broker not found or access denied', 404);
        }
        brokerName = broker.name;
    }

    // Validate account exists if provided (IDOR protection)
    let accountName = null;
    let accountCurrency = 'SAR';
    let sanitizedAccountId = null;
    if (accountId) {
        sanitizedAccountId = sanitizeObjectId(accountId);
        const account = await TradingAccount.findOne({
            _id: sanitizedAccountId,
            ...req.firmQuery
        });
        if (!account) {
            throw CustomException('Trading account not found or access denied', 404);
        }
        accountName = account.name;
        accountCurrency = account.currency;

        // Check max open trades limit
        if (status === 'open' && account.maxOpenTrades) {
            const openTradesCount = await Trade.countDocuments({
                userId,
                accountId: sanitizedAccountId,
                status: 'open'
            });
            if (openTradesCount >= account.maxOpenTrades) {
                throw CustomException('Maximum open trades limit reached for this account', 400);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // CREATE TRADE
    // ─────────────────────────────────────────────────────────────
    const trade = await Trade.create({
        userId,
        firmId,
        lawyerId: !firmId ? userId : undefined, // Solo lawyers get lawyerId for isolation
        symbol: symbol.toUpperCase(),
        symbolName,
        assetType,
        direction,
        status,
        entryDate: entryDateObj,
        entryPrice,
        quantity,
        entryCommission,
        entryFees,
        slippage,
        exitDate: exitDate ? new Date(exitDate) : undefined,
        exitPrice,
        exitCommission,
        exitFees,
        stopLoss,
        takeProfit,
        riskAmount,
        riskPercent,
        trailingStopEnabled,
        trailingStopDistance,
        trailingStopActivation,
        scaledIn,
        scaledOut,
        averageEntryPrice,
        setup,
        timeframe,
        strategy,
        marketCondition,
        marketSession,
        technicalIndicators,
        entryReason,
        exitReason,
        fundamentalFactors,
        newsEvent,
        emotionEntry,
        emotionDuring,
        emotionExit,
        confidenceLevel,
        executionQuality,
        followedPlan,
        preTradeNotes,
        duringTradeNotes,
        postTradeNotes,
        lessonsLearned,
        mistakes,
        improvements,
        tags,
        labels,
        category,
        entryScreenshot,
        exitScreenshot,
        attachments,
        brokerId: sanitizedBrokerId,
        brokerName,
        accountId: sanitizedAccountId,
        accountName,
        accountCurrency,
        linkedTrades,
        parentTradeId,
        createdBy: userId
    });

    return res.status(201).json({
        success: true,
        message: 'Trade created successfully',
        data: trade
    });
});

// ═══════════════════════════════════════════════════════════════
// GET TRADES
// ═══════════════════════════════════════════════════════════════
const getTrades = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to access trades', 403);
    }

    const {
        page = 1,
        limit = 20,
        status,
        assetType,
        direction,
        setup,
        symbol,
        startDate,
        endDate,
        minPnl,
        maxPnl,
        tags,
        brokerId,
        accountId,
        sortBy = 'entryDate',
        sortOrder = 'desc',
        search
    } = req.query;

    // ─────────────────────────────────────────────────────────────
    // BUILD FILTERS - Use req.firmQuery for proper tenant isolation
    // ─────────────────────────────────────────────────────────────
    const filters = { ...req.firmQuery };

    if (status) filters.status = status;
    if (assetType) filters.assetType = assetType;
    if (direction) filters.direction = direction;
    if (setup) filters.setup = setup;
    if (brokerId) filters.brokerId = brokerId;
    if (accountId) filters.accountId = accountId;

    // Symbol search (partial match)
    if (symbol) {
        filters.symbol = { $regex: symbol.toUpperCase(), $options: 'i' };
    }

    // Date range
    if (startDate || endDate) {
        filters.entryDate = {};
        if (startDate) filters.entryDate.$gte = new Date(startDate);
        if (endDate) filters.entryDate.$lte = new Date(endDate);
    }

    // P&L range
    if (minPnl !== undefined || maxPnl !== undefined) {
        filters.netPnl = {};
        if (minPnl !== undefined) filters.netPnl.$gte = parseInt(minPnl);
        if (maxPnl !== undefined) filters.netPnl.$lte = parseInt(maxPnl);
    }

    // Tags filter
    if (tags) {
        const tagList = tags.split(',').map(t => t.trim());
        filters.tags = { $in: tagList };
    }

    // General search
    if (search) {
        filters.$or = [
            { symbol: { $regex: escapeRegex(search), $options: 'i' } },
            { symbolName: { $regex: escapeRegex(search), $options: 'i' } },
            { tradeId: { $regex: escapeRegex(search), $options: 'i' } },
            { strategy: { $regex: escapeRegex(search), $options: 'i' } }
        ];
    }

    // ─────────────────────────────────────────────────────────────
    // PAGINATION & SORTING
    // ─────────────────────────────────────────────────────────────
    const parsedLimit = Math.min(parseInt(limit), 100);
    const parsedPage = parseInt(page);
    const skip = (parsedPage - 1) * parsedLimit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const trades = await Trade.find(filters)
        .populate('brokerId', 'name type displayName')
        .populate('accountId', 'name type currency')
        .sort(sort)
        .skip(skip)
        .limit(parsedLimit);

    const total = await Trade.countDocuments(filters);

    // ─────────────────────────────────────────────────────────────
    // CALCULATE SUMMARY
    // ─────────────────────────────────────────────────────────────
    const summaryAgg = await Trade.aggregate([
        { $match: filters },
        {
            $group: {
                _id: null,
                totalTrades: { $sum: 1 },
                openTrades: {
                    $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] }
                },
                closedTrades: {
                    $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] }
                },
                totalNetPnl: { $sum: '$netPnl' },
                winningTrades: {
                    $sum: { $cond: [{ $gt: ['$netPnl', 0] }, 1, 0] }
                }
            }
        }
    ]);

    const summary = summaryAgg[0] || {
        totalTrades: 0,
        openTrades: 0,
        closedTrades: 0,
        totalNetPnl: 0,
        winningTrades: 0
    };

    const decidedTrades = summary.closedTrades;
    summary.winRate = decidedTrades > 0
        ? Math.round((summary.winningTrades / decidedTrades) * 10000) / 100
        : 0;

    return res.json({
        success: true,
        data: {
            trades,
            pagination: {
                page: parsedPage,
                limit: parsedLimit,
                total,
                pages: Math.ceil(total / parsedLimit)
            },
            summary
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET SINGLE TRADE
// ═══════════════════════════════════════════════════════════════
const getTrade = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to access trades', 403);
    }

    // Sanitize the trade ID (IDOR protection)
    const sanitizedId = sanitizeObjectId(id);

    const trade = await Trade.findOne({ _id: sanitizedId, ...req.firmQuery })
        .populate('brokerId', 'name type displayName commissionStructure')
        .populate('accountId', 'name type currency initialBalance currentBalance')
        .populate('linkedTrades', 'symbol direction entryDate status netPnl')
        .populate('parentTradeId', 'symbol direction entryDate status netPnl');

    if (!trade) {
        throw CustomException('Trade not found or access denied', 404);
    }

    return res.json({
        success: true,
        data: trade
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE TRADE
// ═══════════════════════════════════════════════════════════════
const updateTrade = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to update trades', 403);
    }

    // Sanitize the trade ID (IDOR protection)
    const sanitizedId = sanitizeObjectId(id);

    // Mass assignment protection - only allow specific fields to be updated
    const allowedFields = [
        'symbol', 'symbolName', 'assetType', 'direction', 'status',
        'entryDate', 'entryPrice', 'quantity', 'entryCommission', 'entryFees', 'slippage',
        'exitDate', 'exitPrice', 'exitCommission', 'exitFees',
        'stopLoss', 'takeProfit', 'riskAmount', 'riskPercent',
        'trailingStopEnabled', 'trailingStopDistance', 'trailingStopActivation',
        'scaledIn', 'scaledOut', 'averageEntryPrice',
        'setup', 'timeframe', 'strategy', 'marketCondition', 'marketSession',
        'technicalIndicators', 'entryReason', 'exitReason', 'fundamentalFactors', 'newsEvent',
        'emotionEntry', 'emotionDuring', 'emotionExit', 'confidenceLevel',
        'executionQuality', 'followedPlan',
        'preTradeNotes', 'duringTradeNotes', 'postTradeNotes',
        'lessonsLearned', 'mistakes', 'improvements',
        'tags', 'labels', 'category',
        'entryScreenshot', 'exitScreenshot', 'attachments',
        'brokerId', 'accountId', 'linkedTrades', 'parentTradeId'
    ];

    const updateData = pickAllowedFields(req.body, allowedFields);

    const existingTrade = await Trade.findOne({ _id: sanitizedId, ...req.firmQuery });
    if (!existingTrade) {
        throw CustomException('Trade not found or access denied', 404);
    }

    // Validate numeric fields if provided
    const numericFields = ['entryPrice', 'quantity', 'entryCommission', 'entryFees', 'slippage',
        'exitPrice', 'exitCommission', 'exitFees', 'stopLoss', 'takeProfit', 'riskAmount',
        'riskPercent', 'trailingStopDistance', 'trailingStopActivation', 'averageEntryPrice'];

    for (const field of numericFields) {
        if (updateData[field] !== undefined && updateData[field] !== null) {
            const value = updateData[field];
            if (typeof value !== 'number' || !isFinite(value) || value < 0) {
                throw CustomException(`${field} must be a valid non-negative number`, 400);
            }
        }
    }

    // Validate exit date if updating
    if (updateData.exitDate && updateData.exitDate !== existingTrade.exitDate) {
        const entryDate = updateData.entryDate
            ? new Date(updateData.entryDate)
            : existingTrade.entryDate;
        const exitDate = new Date(updateData.exitDate);
        if (exitDate < entryDate) {
            throw CustomException('Exit date must be after entry date', 400);
        }
    }

    // Validate stop loss if updating
    if (updateData.stopLoss !== undefined) {
        const direction = updateData.direction || existingTrade.direction;
        const entryPrice = updateData.entryPrice || existingTrade.entryPrice;
        if (updateData.stopLoss) {
            if (direction === 'long' && updateData.stopLoss >= entryPrice) {
                throw CustomException('Stop loss must be below entry price for long trades', 400);
            }
            if (direction === 'short' && updateData.stopLoss <= entryPrice) {
                throw CustomException('Stop loss must be above entry price for short trades', 400);
            }
        }
    }

    // Validate take profit if updating
    if (updateData.takeProfit !== undefined) {
        const direction = updateData.direction || existingTrade.direction;
        const entryPrice = updateData.entryPrice || existingTrade.entryPrice;
        if (updateData.takeProfit) {
            if (direction === 'long' && updateData.takeProfit <= entryPrice) {
                throw CustomException('Take profit must be above entry price for long trades', 400);
            }
            if (direction === 'short' && updateData.takeProfit >= entryPrice) {
                throw CustomException('Take profit must be below entry price for short trades', 400);
            }
        }
    }

    // Update broker name if broker changed (IDOR protection)
    if (updateData.brokerId && updateData.brokerId !== existingTrade.brokerId?.toString()) {
        const sanitizedBrokerId = sanitizeObjectId(updateData.brokerId);
        const broker = await Broker.findOne({
            _id: sanitizedBrokerId,
            ...req.firmQuery
        });
        if (!broker) {
            throw CustomException('Broker not found or access denied', 404);
        }
        updateData.brokerId = sanitizedBrokerId;
        updateData.brokerName = broker.name;
    }

    // Update account name if account changed (IDOR protection)
    if (updateData.accountId && updateData.accountId !== existingTrade.accountId?.toString()) {
        const sanitizedAccountId = sanitizeObjectId(updateData.accountId);
        const account = await TradingAccount.findOne({
            _id: sanitizedAccountId,
            ...req.firmQuery
        });
        if (!account) {
            throw CustomException('Trading account not found or access denied', 404);
        }
        updateData.accountId = sanitizedAccountId;
        updateData.accountName = account.name;
        updateData.accountCurrency = account.currency;
    }

    // Add audit
    updateData.updatedBy = userId;

    const trade = await Trade.findOneAndUpdate(
        { _id: sanitizedId, ...req.firmQuery },
        updateData,
        { new: true, runValidators: true }
    )
        .populate('brokerId', 'name type displayName')
        .populate('accountId', 'name type currency');

    return res.json({
        success: true,
        message: 'Trade updated successfully',
        data: trade
    });
});

// ═══════════════════════════════════════════════════════════════
// CLOSE TRADE
// ═══════════════════════════════════════════════════════════════
const closeTrade = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to close trades', 403);
    }

    // Sanitize the trade ID (IDOR protection)
    const sanitizedId = sanitizeObjectId(id);

    // Mass assignment protection
    const allowedFields = [
        'exitDate', 'exitPrice', 'exitCommission', 'exitFees', 'exitReason',
        'emotionExit', 'postTradeNotes', 'lessonsLearned', 'mistakes',
        'improvements', 'executionQuality', 'exitScreenshot'
    ];

    const filteredData = pickAllowedFields(req.body, allowedFields);

    const {
        exitDate,
        exitPrice,
        exitCommission,
        exitFees,
        exitReason,
        emotionExit,
        postTradeNotes,
        lessonsLearned,
        mistakes,
        improvements,
        executionQuality,
        exitScreenshot
    } = filteredData;

    // Input validation for trade amounts
    if (!exitPrice || typeof exitPrice !== 'number' || !isFinite(exitPrice) || exitPrice <= 0) {
        throw CustomException('Exit price must be a valid positive number', 400);
    }

    if (exitCommission !== undefined && exitCommission !== null) {
        if (typeof exitCommission !== 'number' || !isFinite(exitCommission) || exitCommission < 0) {
            throw CustomException('Exit commission must be a valid non-negative number', 400);
        }
    }

    if (exitFees !== undefined && exitFees !== null) {
        if (typeof exitFees !== 'number' || !isFinite(exitFees) || exitFees < 0) {
            throw CustomException('Exit fees must be a valid non-negative number', 400);
        }
    }

    // Use MongoDB transaction for trade closure
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const trade = await Trade.findOne({ _id: sanitizedId, ...req.firmQuery }).session(session);
        if (!trade) {
            await session.abortTransaction();
            throw CustomException('Trade not found or access denied', 404);
        }

        if (trade.status === 'closed') {
            await session.abortTransaction();
            throw CustomException('Trade is already closed', 400);
        }

        // Validate exit date
        const exitDateObj = exitDate ? new Date(exitDate) : new Date();
        if (exitDateObj < trade.entryDate) {
            await session.abortTransaction();
            throw CustomException('Exit date must be after entry date', 400);
        }

        // Update trade with exit details
        trade.status = 'closed';
        trade.exitDate = exitDateObj;
        trade.exitPrice = exitPrice;
        trade.exitCommission = exitCommission || 0;
        trade.exitFees = exitFees || 0;
        trade.exitReason = exitReason;
        trade.emotionExit = emotionExit;
        trade.postTradeNotes = postTradeNotes;
        trade.lessonsLearned = lessonsLearned;
        trade.mistakes = mistakes;
        trade.improvements = improvements;
        trade.executionQuality = executionQuality;
        trade.exitScreenshot = exitScreenshot;
        trade.updatedBy = userId;

        // Save will trigger pre-save hook to calculate P&L
        await trade.save({ session });

        // Update trading account if linked (within transaction)
        if (trade.accountId) {
            const account = await TradingAccount.findOne({
                _id: trade.accountId,
                ...req.firmQuery
            }).session(session);

            if (account) {
                // Update realized P&L
                account.realizedPnl = (account.realizedPnl || 0) + trade.netPnl;
                account.currentBalance = (account.currentBalance || account.initialBalance) + trade.netPnl;

                // Update daily stats
                account.resetDailyStats();
                account.todayPnl = (account.todayPnl || 0) + trade.netPnl;
                if (trade.netPnl < 0) {
                    account.todayLossUsed = (account.todayLossUsed || 0) + Math.abs(trade.netPnl);
                }
                account.todayTradesCount = (account.todayTradesCount || 0) + 1;

                await account.save({ session });
            }
        }

        // Commit transaction
        await session.commitTransaction();

        const populatedTrade = await Trade.findById(trade._id)
            .populate('brokerId', 'name type displayName')
            .populate('accountId', 'name type currency currentBalance');

        return res.json({
            success: true,
            message: 'Trade closed successfully',
            data: populatedTrade
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

// ═══════════════════════════════════════════════════════════════
// DELETE TRADE
// ═══════════════════════════════════════════════════════════════
const deleteTrade = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to delete trades', 403);
    }

    // Sanitize the trade ID (IDOR protection)
    const sanitizedId = sanitizeObjectId(id);

    const trade = await Trade.findOneAndDelete({ _id: sanitizedId, ...req.firmQuery });

    if (!trade) {
        throw CustomException('Trade not found or access denied', 404);
    }

    return res.json({
        success: true,
        message: 'Trade deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// BULK DELETE TRADES
// ═══════════════════════════════════════════════════════════════
const bulkDeleteTrades = asyncHandler(async (req, res) => {
    const userId = req.userID;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to delete trades', 403);
    }

    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw CustomException('Trade IDs array is required', 400);
    }

    // Sanitize all IDs (IDOR protection)
    const sanitizedIds = ids.map(id => sanitizeObjectId(id));

    const result = await Trade.deleteMany({ _id: { $in: sanitizedIds }, ...req.firmQuery });

    return res.json({
        success: true,
        message: `${result.deletedCount} trades deleted successfully`
    });
});

// ═══════════════════════════════════════════════════════════════
// GET TRADE STATISTICS
// ═══════════════════════════════════════════════════════════════
const getTradeStats = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to access trade statistics', 403);
    }

    const {
        period = 'all',
        startDate,
        endDate,
        assetType,
        accountId
    } = req.query;

    // ─────────────────────────────────────────────────────────────
    // BUILD DATE RANGE
    // ─────────────────────────────────────────────────────────────
    let dateStart, dateEnd;
    const now = new Date();

    switch (period) {
        case 'today':
            dateStart = new Date(now.setHours(0, 0, 0, 0));
            dateEnd = new Date();
            break;
        case 'week':
            dateStart = new Date(now);
            dateStart.setDate(dateStart.getDate() - 7);
            dateEnd = new Date();
            break;
        case 'month':
            dateStart = new Date(now);
            dateStart.setMonth(dateStart.getMonth() - 1);
            dateEnd = new Date();
            break;
        case 'year':
            dateStart = new Date(now);
            dateStart.setFullYear(dateStart.getFullYear() - 1);
            dateEnd = new Date();
            break;
        case 'all':
        default:
            if (startDate) dateStart = new Date(startDate);
            if (endDate) dateEnd = new Date(endDate);
            break;
    }

    // ─────────────────────────────────────────────────────────────
    // BUILD FILTERS - Use req.firmQuery for proper tenant isolation
    // ─────────────────────────────────────────────────────────────
    const filters = { ...req.firmQuery };

    if (dateStart || dateEnd) {
        filters.entryDate = {};
        if (dateStart) filters.entryDate.$gte = dateStart;
        if (dateEnd) filters.entryDate.$lte = dateEnd;
    }

    if (assetType) filters.assetType = assetType;
    if (accountId) filters.accountId = accountId;

    // ─────────────────────────────────────────────────────────────
    // GET TRADES AND CALCULATE STATS
    // ─────────────────────────────────────────────────────────────
    const trades = await Trade.find(filters).lean();
    const stats = await TradeStats.calculateFromTrades(trades);

    if (!stats) {
        return res.json({
            success: true,
            data: {
                period: {
                    start: dateStart?.toISOString().split('T')[0] || null,
                    end: dateEnd?.toISOString().split('T')[0] || null
                },
                overview: {
                    totalTrades: 0,
                    winningTrades: 0,
                    losingTrades: 0,
                    breakEvenTrades: 0,
                    openTrades: 0
                },
                pnl: {
                    grossProfit: 0,
                    grossLoss: 0,
                    netPnl: 0,
                    totalCommissions: 0
                },
                ratios: {
                    winRate: 0,
                    profitFactor: 0,
                    averageWin: 0,
                    averageLoss: 0,
                    averageRMultiple: 0,
                    expectancy: 0
                },
                risk: {
                    largestWin: 0,
                    largestLoss: 0,
                    maxConsecutiveWins: 0,
                    maxConsecutiveLosses: 0,
                    maxDrawdown: 0,
                    maxDrawdownPercent: 0
                },
                byAssetType: {},
                bySetup: {}
            }
        });
    }

    return res.json({
        success: true,
        data: {
            period: {
                start: dateStart?.toISOString().split('T')[0] || null,
                end: dateEnd?.toISOString().split('T')[0] || null
            },
            overview: {
                totalTrades: stats.totalTrades,
                winningTrades: stats.winningTrades,
                losingTrades: stats.losingTrades,
                breakEvenTrades: stats.breakEvenTrades,
                openTrades: stats.openTrades
            },
            pnl: {
                grossProfit: stats.grossProfit,
                grossLoss: stats.grossLoss,
                netPnl: stats.netPnl,
                totalCommissions: stats.totalCommissions
            },
            ratios: {
                winRate: stats.winRate,
                profitFactor: stats.profitFactor,
                averageWin: stats.averageWin,
                averageLoss: stats.averageLoss,
                averageRMultiple: stats.averageRMultiple,
                expectancy: stats.expectancy
            },
            risk: {
                largestWin: stats.largestWin,
                largestLoss: stats.largestLoss,
                maxConsecutiveWins: stats.maxConsecutiveWins,
                maxConsecutiveLosses: stats.maxConsecutiveLosses,
                maxDrawdown: stats.maxDrawdown,
                maxDrawdownPercent: stats.maxDrawdownPercent
            },
            byAssetType: stats.byAssetType,
            bySetup: stats.bySetup,
            byDayOfWeek: stats.byDayOfWeek,
            byHour: stats.byHour,
            byDirection: stats.byDirection
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET PERFORMANCE CHART DATA
// ═══════════════════════════════════════════════════════════════
const getChartData = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to access chart data', 403);
    }

    const {
        period = 'month',
        metric = 'cumulative_pnl',
        groupBy = 'day'
    } = req.query;

    // ─────────────────────────────────────────────────────────────
    // BUILD DATE RANGE
    // ─────────────────────────────────────────────────────────────
    const now = new Date();
    let dateStart;

    switch (period) {
        case 'week':
            dateStart = new Date(now);
            dateStart.setDate(dateStart.getDate() - 7);
            break;
        case '3months':
            dateStart = new Date(now);
            dateStart.setMonth(dateStart.getMonth() - 3);
            break;
        case '6months':
            dateStart = new Date(now);
            dateStart.setMonth(dateStart.getMonth() - 6);
            break;
        case 'year':
            dateStart = new Date(now);
            dateStart.setFullYear(dateStart.getFullYear() - 1);
            break;
        case 'month':
        default:
            dateStart = new Date(now);
            dateStart.setMonth(dateStart.getMonth() - 1);
            break;
    }

    // ─────────────────────────────────────────────────────────────
    // BUILD AGGREGATION - Use req.firmQuery for proper tenant isolation
    // ─────────────────────────────────────────────────────────────
    const matchStage = { ...req.firmQuery, status: 'closed', exitDate: { $gte: dateStart, $lte: now } };
    // Convert to ObjectId for aggregation if needed
    if (matchStage.firmId) {
        matchStage.firmId = new mongoose.Types.ObjectId(matchStage.firmId);
    }
    if (matchStage.lawyerId) {
        matchStage.lawyerId = new mongoose.Types.ObjectId(matchStage.lawyerId);
    }

    let dateFormat;
    switch (groupBy) {
        case 'week':
            dateFormat = { $dateToString: { format: '%Y-W%V', date: '$exitDate' } };
            break;
        case 'month':
            dateFormat = { $dateToString: { format: '%Y-%m', date: '$exitDate' } };
            break;
        case 'day':
        default:
            dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$exitDate' } };
            break;
    }

    const aggregation = await Trade.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: dateFormat,
                dailyPnl: { $sum: '$netPnl' },
                trades: { $sum: 1 },
                wins: { $sum: { $cond: [{ $gt: ['$netPnl', 0] }, 1, 0] } }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    // ─────────────────────────────────────────────────────────────
    // BUILD CHART DATA
    // ─────────────────────────────────────────────────────────────
    const labels = [];
    const data = [];
    let cumulativePnl = 0;

    for (const point of aggregation) {
        labels.push(point._id);

        switch (metric) {
            case 'daily_pnl':
                data.push(point.dailyPnl);
                break;
            case 'win_rate':
                data.push(point.trades > 0
                    ? Math.round((point.wins / point.trades) * 100)
                    : 0);
                break;
            case 'trades':
                data.push(point.trades);
                break;
            case 'cumulative_pnl':
            default:
                cumulativePnl += point.dailyPnl;
                data.push(cumulativePnl);
                break;
        }
    }

    const metricLabels = {
        cumulative_pnl: 'Cumulative P&L',
        daily_pnl: 'Daily P&L',
        win_rate: 'Win Rate (%)',
        trades: 'Number of Trades'
    };

    return res.json({
        success: true,
        data: {
            labels,
            datasets: [
                {
                    label: metricLabels[metric] || metric,
                    data
                }
            ]
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// IMPORT TRADES FROM CSV
// ═══════════════════════════════════════════════════════════════
const importFromCsv = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to import trades', 403);
    }

    // Note: This is a placeholder - actual CSV parsing would require
    // a multipart form handler like multer and a CSV parsing library
    throw CustomException('CSV import not implemented yet', 501);
});

module.exports = {
    createTrade,
    getTrades,
    getTrade,
    updateTrade,
    closeTrade,
    deleteTrade,
    bulkDeleteTrades,
    getTradeStats,
    getChartData,
    importFromCsv
};
