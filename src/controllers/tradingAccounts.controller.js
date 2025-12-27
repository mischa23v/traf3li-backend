const { TradingAccount, Broker, Trade } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const mongoose = require('mongoose');

/**
 * Escape special regex characters to prevent regex injection
 */
const escapeRegex = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// ═══════════════════════════════════════════════════════════════
// CREATE TRADING ACCOUNT
// ═══════════════════════════════════════════════════════════════
const createTradingAccount = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('Resource not found', 404);
    }

    // ─────────────────────────────────────────────────────────────
    // MASS ASSIGNMENT PROTECTION
    // ─────────────────────────────────────────────────────────────
    const allowedFields = [
        'name',
        'accountNumber',
        'brokerId',
        'type',
        'currency',
        'initialBalance',
        'maxDailyLoss',
        'maxDailyLossPercent',
        'maxPositionSize',
        'maxOpenTrades',
        'defaultRiskPercent',
        'status',
        'isDemo',
        'isDefault',
        'description',
        'notes'
    ];

    const data = pickAllowedFields(req.body, allowedFields);

    const {
        name,
        accountNumber,
        brokerId,
        type,
        currency,
        initialBalance,
        maxDailyLoss,
        maxDailyLossPercent,
        maxPositionSize,
        maxOpenTrades,
        defaultRiskPercent,
        status,
        isDemo,
        isDefault,
        description,
        notes
    } = data;

    // ─────────────────────────────────────────────────────────────
    // VALIDATION
    // ─────────────────────────────────────────────────────────────
    if (!name || name.trim().length === 0) {
        throw CustomException('Account name is required', 400);
    }

    if (!brokerId) {
        throw CustomException('Broker ID is required', 400);
    }

    // Sanitize brokerId
    const sanitizedBrokerId = sanitizeObjectId(brokerId, 'Broker ID');

    if (!type) {
        throw CustomException('Account type is required', 400);
    }

    // Validate account type
    const validTypes = ['live', 'demo', 'paper'];
    if (!validTypes.includes(type)) {
        throw CustomException(`Account type must be one of: ${validTypes.join(', ')}`, 400);
    }

    if (initialBalance === undefined || initialBalance === null) {
        throw CustomException('Initial balance is required', 400);
    }

    if (typeof initialBalance !== 'number' || initialBalance < 0) {
        throw CustomException('Initial balance must be a non-negative number', 400);
    }

    // Validate optional numeric fields
    if (maxDailyLoss !== undefined && (typeof maxDailyLoss !== 'number' || maxDailyLoss < 0)) {
        throw CustomException('Max daily loss must be a non-negative number', 400);
    }

    if (maxDailyLossPercent !== undefined && (typeof maxDailyLossPercent !== 'number' || maxDailyLossPercent < 0 || maxDailyLossPercent > 100)) {
        throw CustomException('Max daily loss percent must be between 0 and 100', 400);
    }

    if (maxPositionSize !== undefined && (typeof maxPositionSize !== 'number' || maxPositionSize <= 0)) {
        throw CustomException('Max position size must be a positive number', 400);
    }

    if (maxOpenTrades !== undefined && (typeof maxOpenTrades !== 'number' || maxOpenTrades <= 0 || !Number.isInteger(maxOpenTrades))) {
        throw CustomException('Max open trades must be a positive integer', 400);
    }

    if (defaultRiskPercent !== undefined && (typeof defaultRiskPercent !== 'number' || defaultRiskPercent < 0 || defaultRiskPercent > 100)) {
        throw CustomException('Default risk percent must be between 0 and 100', 400);
    }

    // Verify broker exists and belongs to user
    const broker = await Broker.findOne({
        _id: sanitizedBrokerId,
        $or: [{ userId }, { firmId }]
    });

    if (!broker) {
        throw CustomException('Broker not found', 404);
    }

    // Check for duplicate account name for this broker
    const duplicateQuery = firmId
        ? { firmId, brokerId: sanitizedBrokerId, name: { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, 'i') } }
        : { userId, brokerId: sanitizedBrokerId, name: { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, 'i') } };
    const existingAccount = await TradingAccount.findOne(duplicateQuery);

    if (existingAccount) {
        throw CustomException('An account with this name already exists for this broker', 400);
    }

    // ─────────────────────────────────────────────────────────────
    // CREATE ACCOUNT
    // ─────────────────────────────────────────────────────────────
    const account = await TradingAccount.create({
        userId,
        firmId,
        name: name.trim(),
        accountNumber,
        brokerId: sanitizedBrokerId,
        type,
        currency: currency || broker.defaultCurrency || 'SAR',
        initialBalance,
        currentBalance: initialBalance,
        maxDailyLoss,
        maxDailyLossPercent,
        maxPositionSize,
        maxOpenTrades,
        defaultRiskPercent,
        status: status || (type === 'demo' ? 'demo' : 'active'),
        isDemo: isDemo || type === 'demo',
        isDefault,
        description,
        notes,
        createdBy: userId
    });

    const query = firmId ? { _id: account._id, firmId } : { _id: account._id, userId };
    const populatedAccount = await TradingAccount.findOne(query)
        .populate('brokerId', 'name type displayName');

    return res.status(201).json({
        success: true,
        message: 'Trading account created successfully',
        data: populatedAccount
    });
});

// ═══════════════════════════════════════════════════════════════
// GET TRADING ACCOUNTS
// ═══════════════════════════════════════════════════════════════
const getTradingAccounts = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('Resource not found', 404);
    }

    const {
        page = 1,
        limit = 20,
        status,
        type,
        brokerId,
        isDemo,
        search,
        sortBy = 'name',
        sortOrder = 'asc'
    } = req.query;

    // ─────────────────────────────────────────────────────────────
    // BUILD FILTERS
    // ─────────────────────────────────────────────────────────────
    const filters = firmId ? { firmId } : { userId };

    if (status) filters.status = status;
    if (type) filters.type = type;
    if (brokerId) {
        // Sanitize brokerId from query parameter
        filters.brokerId = sanitizeObjectId(brokerId, 'Broker ID');
    }
    if (isDemo !== undefined) filters.isDemo = isDemo === 'true';

    if (search) {
        filters.$or = [
            { name: { $regex: escapeRegex(search), $options: 'i' } },
            { accountNumber: { $regex: escapeRegex(search), $options: 'i' } }
        ];
    }

    // ─────────────────────────────────────────────────────────────
    // PAGINATION & SORTING
    // ─────────────────────────────────────────────────────────────
    const parsedLimit = Math.min(parseInt(limit), 100);
    const parsedPage = parseInt(page);
    const skip = (parsedPage - 1) * parsedLimit;
    const sort = { isDefault: -1, [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const accounts = await TradingAccount.find(filters)
        .populate('brokerId', 'name type displayName')
        .sort(sort)
        .skip(skip)
        .limit(parsedLimit);

    const total = await TradingAccount.countDocuments(filters);

    // Get trade counts for each account
    const accountsWithStats = await Promise.all(
        accounts.map(async (account) => {
            const stats = await Trade.aggregate([
                { $match: { accountId: account._id } },
                {
                    $group: {
                        _id: null,
                        totalTrades: { $sum: 1 },
                        openTrades: {
                            $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] }
                        }
                    }
                }
            ]);

            return {
                ...account.toObject(),
                tradeStats: stats[0] || { totalTrades: 0, openTrades: 0 }
            };
        })
    );

    return res.json({
        success: true,
        data: {
            accounts: accountsWithStats,
            pagination: {
                page: parsedPage,
                limit: parsedLimit,
                total,
                pages: Math.ceil(total / parsedLimit)
            }
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET SINGLE TRADING ACCOUNT
// ═══════════════════════════════════════════════════════════════
const getTradingAccount = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('Resource not found', 404);
    }

    // ─────────────────────────────────────────────────────────────
    // IDOR PROTECTION
    // ─────────────────────────────────────────────────────────────
    const sanitizedId = sanitizeObjectId(id, 'Trading account ID');

    const query = firmId
        ? { _id: sanitizedId, firmId }
        : { _id: sanitizedId, userId };

    const account = await TradingAccount.findOne(query)
        .populate('brokerId', 'name type displayName commissionStructure');

    if (!account) {
        throw CustomException('Trading account not found', 404);
    }

    // Get trade stats for this account
    const tradeStats = await Trade.aggregate([
        { $match: { accountId: account._id } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalPnl: { $sum: '$netPnl' }
            }
        }
    ]);

    const statsMap = {};
    for (const stat of tradeStats) {
        statsMap[stat._id] = { count: stat.count, totalPnl: stat.totalPnl };
    }

    return res.json({
        success: true,
        data: {
            ...account.toObject(),
            tradeStats: {
                open: statsMap.open || { count: 0, totalPnl: 0 },
                closed: statsMap.closed || { count: 0, totalPnl: 0 },
                pending: statsMap.pending || { count: 0, totalPnl: 0 }
            }
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET ACCOUNT BALANCE
// ═══════════════════════════════════════════════════════════════
const getAccountBalance = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('Resource not found', 404);
    }

    // ─────────────────────────────────────────────────────────────
    // IDOR PROTECTION
    // ─────────────────────────────────────────────────────────────
    const sanitizedId = sanitizeObjectId(id, 'Trading account ID');

    const query = firmId
        ? { _id: sanitizedId, firmId }
        : { _id: sanitizedId, userId };

    const account = await TradingAccount.findOne(query);

    if (!account) {
        throw CustomException('Trading account not found', 404);
    }

    // Reset daily stats if needed
    account.resetDailyStats();
    await account.save();

    // Get unrealized P&L from open trades
    const openTradesAgg = await Trade.aggregate([
        { $match: { accountId: account._id, status: 'open' } },
        {
            $group: {
                _id: null,
                count: { $sum: 1 }
            }
        }
    ]);

    const openTradesCount = openTradesAgg[0]?.count || 0;

    return res.json({
        success: true,
        data: {
            ...account.getBalanceInfo(),
            openTradesCount,
            currency: account.currency
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE TRADING ACCOUNT
// ═══════════════════════════════════════════════════════════════
const updateTradingAccount = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('Resource not found', 404);
    }

    // ─────────────────────────────────────────────────────────────
    // IDOR PROTECTION
    // ─────────────────────────────────────────────────────────────
    const sanitizedId = sanitizeObjectId(id, 'Trading account ID');

    // ─────────────────────────────────────────────────────────────
    // MASS ASSIGNMENT PROTECTION
    // ─────────────────────────────────────────────────────────────
    const allowedFields = [
        'name',
        'accountNumber',
        'brokerId',
        'type',
        'currency',
        'maxDailyLoss',
        'maxDailyLossPercent',
        'maxPositionSize',
        'maxOpenTrades',
        'defaultRiskPercent',
        'status',
        'isDemo',
        'isDefault',
        'description',
        'notes'
    ];

    const updateData = pickAllowedFields(req.body, allowedFields);

    // ─────────────────────────────────────────────────────────────
    // INPUT VALIDATION
    // ─────────────────────────────────────────────────────────────
    if (updateData.type) {
        const validTypes = ['live', 'demo', 'paper'];
        if (!validTypes.includes(updateData.type)) {
            throw CustomException(`Account type must be one of: ${validTypes.join(', ')}`, 400);
        }
    }

    if (updateData.maxDailyLoss !== undefined && (typeof updateData.maxDailyLoss !== 'number' || updateData.maxDailyLoss < 0)) {
        throw CustomException('Max daily loss must be a non-negative number', 400);
    }

    if (updateData.maxDailyLossPercent !== undefined && (typeof updateData.maxDailyLossPercent !== 'number' || updateData.maxDailyLossPercent < 0 || updateData.maxDailyLossPercent > 100)) {
        throw CustomException('Max daily loss percent must be between 0 and 100', 400);
    }

    if (updateData.maxPositionSize !== undefined && (typeof updateData.maxPositionSize !== 'number' || updateData.maxPositionSize <= 0)) {
        throw CustomException('Max position size must be a positive number', 400);
    }

    if (updateData.maxOpenTrades !== undefined && (typeof updateData.maxOpenTrades !== 'number' || updateData.maxOpenTrades <= 0 || !Number.isInteger(updateData.maxOpenTrades))) {
        throw CustomException('Max open trades must be a positive integer', 400);
    }

    if (updateData.defaultRiskPercent !== undefined && (typeof updateData.defaultRiskPercent !== 'number' || updateData.defaultRiskPercent < 0 || updateData.defaultRiskPercent > 100)) {
        throw CustomException('Default risk percent must be between 0 and 100', 400);
    }

    const query = firmId
        ? { _id: sanitizedId, firmId }
        : { _id: sanitizedId, userId };

    const existingAccount = await TradingAccount.findOne(query);
    if (!existingAccount) {
        throw CustomException('Trading account not found', 404);
    }

    // Check for duplicate name if name is being changed
    if (updateData.name && updateData.name !== existingAccount.name) {
        const duplicateCheckQuery = firmId
            ? { firmId, brokerId: existingAccount.brokerId, _id: { $ne: sanitizedId }, name: { $regex: new RegExp(`^${escapeRegex(updateData.name.trim())}$`, 'i') } }
            : { userId, brokerId: existingAccount.brokerId, _id: { $ne: sanitizedId }, name: { $regex: new RegExp(`^${escapeRegex(updateData.name.trim())}$`, 'i') } };
        const duplicateAccount = await TradingAccount.findOne(duplicateCheckQuery);

        if (duplicateAccount) {
            throw CustomException('An account with this name already exists for this broker', 400);
        }
    }

    // Don't allow changing broker if trades exist
    if (updateData.brokerId && updateData.brokerId !== existingAccount.brokerId?.toString()) {
        const sanitizedBrokerId = sanitizeObjectId(updateData.brokerId, 'Broker ID');

        const tradeCount = await Trade.countDocuments({ accountId: sanitizedId });
        if (tradeCount > 0) {
            throw CustomException('Cannot change broker for account with existing trades', 400);
        }

        // Verify new broker exists
        const broker = await Broker.findOne({
            _id: sanitizedBrokerId,
            $or: [{ userId }, { firmId }]
        });
        if (!broker) {
            throw CustomException('Broker not found', 404);
        }

        updateData.brokerId = sanitizedBrokerId;
    }

    // Add audit
    updateData.updatedBy = userId;

    const account = await TradingAccount.findOneAndUpdate(
        query,
        updateData,
        { new: true, runValidators: true }
    ).populate('brokerId', 'name type displayName');

    return res.json({
        success: true,
        message: 'Trading account updated successfully',
        data: account
    });
});

// ═══════════════════════════════════════════════════════════════
// DELETE TRADING ACCOUNT
// ═══════════════════════════════════════════════════════════════
const deleteTradingAccount = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('Resource not found', 404);
    }

    // ─────────────────────────────────────────────────────────────
    // IDOR PROTECTION
    // ─────────────────────────────────────────────────────────────
    const sanitizedId = sanitizeObjectId(id, 'Trading account ID');

    const query = firmId
        ? { _id: sanitizedId, firmId }
        : { _id: sanitizedId, userId };

    const account = await TradingAccount.findOne(query);
    if (!account) {
        throw CustomException('Trading account not found', 404);
    }

    // Check if account has trades
    const tradeCount = await Trade.countDocuments({ accountId: sanitizedId });
    if (tradeCount > 0) {
        throw CustomException(
            `Cannot delete account with ${tradeCount} linked trade(s). Delete or reassign trades first.`,
            400
        );
    }

    await TradingAccount.findOneAndDelete(query);

    return res.json({
        success: true,
        message: 'Trading account deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// SET DEFAULT ACCOUNT
// ═══════════════════════════════════════════════════════════════
const setDefaultAccount = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('Resource not found', 404);
    }

    // ─────────────────────────────────────────────────────────────
    // IDOR PROTECTION
    // ─────────────────────────────────────────────────────────────
    const sanitizedId = sanitizeObjectId(id, 'Trading account ID');

    const query = firmId
        ? { _id: sanitizedId, firmId }
        : { _id: sanitizedId, userId };

    const account = await TradingAccount.findOne(query);
    if (!account) {
        throw CustomException('Trading account not found', 404);
    }

    // ─────────────────────────────────────────────────────────────
    // MONGODB TRANSACTION
    // ─────────────────────────────────────────────────────────────
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            // Unset all other defaults
            const updateManyQuery = firmId
                ? { firmId, _id: { $ne: sanitizedId } }
                : { userId, _id: { $ne: sanitizedId } };
            await TradingAccount.updateMany(
                updateManyQuery,
                { isDefault: false },
                { session }
            );

            // Set this one as default
            account.isDefault = true;
            account.updatedBy = userId;
            await account.save({ session });
        });
    } finally {
        await session.endSession();
    }

    const repopulateQuery = firmId ? { _id: account._id, firmId } : { _id: account._id, userId };
    const populatedAccount = await TradingAccount.findOne(repopulateQuery)
        .populate('brokerId', 'name type displayName');

    return res.json({
        success: true,
        message: 'Default account set successfully',
        data: populatedAccount
    });
});

// ═══════════════════════════════════════════════════════════════
// ADD DEPOSIT/WITHDRAWAL
// ═══════════════════════════════════════════════════════════════
const addTransaction = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('Resource not found', 404);
    }

    // ─────────────────────────────────────────────────────────────
    // IDOR PROTECTION
    // ─────────────────────────────────────────────────────────────
    const sanitizedId = sanitizeObjectId(id, 'Trading account ID');

    // ─────────────────────────────────────────────────────────────
    // MASS ASSIGNMENT PROTECTION
    // ─────────────────────────────────────────────────────────────
    const allowedFields = ['type', 'amount', 'description', 'notes'];
    const data = pickAllowedFields(req.body, allowedFields);

    const { type, amount, description, notes } = data;

    // ─────────────────────────────────────────────────────────────
    // INPUT VALIDATION
    // ─────────────────────────────────────────────────────────────
    if (!type || !['deposit', 'withdrawal'].includes(type)) {
        throw CustomException('Transaction type must be "deposit" or "withdrawal"', 400);
    }

    if (amount === undefined || amount === null) {
        throw CustomException('Amount is required', 400);
    }

    if (typeof amount !== 'number' || amount <= 0) {
        throw CustomException('Amount must be a positive number', 400);
    }

    // Prevent excessively large transactions (potential fraud/error)
    if (amount > 10000000000) {
        throw CustomException('Transaction amount exceeds maximum allowed limit', 400);
    }

    const query = firmId
        ? { _id: sanitizedId, firmId }
        : { _id: sanitizedId, userId };

    const account = await TradingAccount.findOne(query);
    if (!account) {
        throw CustomException('Trading account not found', 404);
    }

    // ─────────────────────────────────────────────────────────────
    // MONGODB TRANSACTION (for financial operation)
    // ─────────────────────────────────────────────────────────────
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            if (type === 'deposit') {
                account.totalDeposits = (account.totalDeposits || 0) + amount;
                account.currentBalance = (account.currentBalance || account.initialBalance) + amount;
            } else {
                if (account.currentBalance < amount) {
                    throw CustomException('Insufficient balance for withdrawal', 400);
                }
                account.totalWithdrawals = (account.totalWithdrawals || 0) + amount;
                account.currentBalance = (account.currentBalance || account.initialBalance) - amount;
            }

            account.updatedBy = userId;
            await account.save({ session });
        });
    } finally {
        await session.endSession();
    }

    return res.json({
        success: true,
        message: `${type === 'deposit' ? 'Deposit' : 'Withdrawal'} recorded successfully`,
        data: account.getBalanceInfo()
    });
});

module.exports = {
    createTradingAccount,
    getTradingAccounts,
    getTradingAccount,
    getAccountBalance,
    updateTradingAccount,
    deleteTradingAccount,
    setDefaultAccount,
    addTransaction
};
