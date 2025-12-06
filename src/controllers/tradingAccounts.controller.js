const { TradingAccount, Broker, Trade } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');

// ═══════════════════════════════════════════════════════════════
// CREATE TRADING ACCOUNT
// ═══════════════════════════════════════════════════════════════
const createTradingAccount = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to create trading accounts', 403);
    }

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
    } = req.body;

    // ─────────────────────────────────────────────────────────────
    // VALIDATION
    // ─────────────────────────────────────────────────────────────
    if (!name || name.trim().length === 0) {
        throw CustomException('Account name is required', 400);
    }

    if (!brokerId) {
        throw CustomException('Broker ID is required', 400);
    }

    if (!type) {
        throw CustomException('Account type is required', 400);
    }

    if (!initialBalance || initialBalance < 0) {
        throw CustomException('Initial balance must be a non-negative number', 400);
    }

    // Verify broker exists and belongs to user
    const broker = await Broker.findOne({
        _id: brokerId,
        $or: [{ userId }, { firmId }]
    });

    if (!broker) {
        throw CustomException('Broker not found', 404);
    }

    // Check for duplicate account name for this broker
    const existingAccount = await TradingAccount.findOne({
        userId,
        brokerId,
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });

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
        brokerId,
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

    const populatedAccount = await TradingAccount.findById(account._id)
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
        throw CustomException('You do not have permission to access trading accounts', 403);
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
    if (brokerId) filters.brokerId = brokerId;
    if (isDemo !== undefined) filters.isDemo = isDemo === 'true';

    if (search) {
        filters.$or = [
            { name: { $regex: search, $options: 'i' } },
            { accountNumber: { $regex: search, $options: 'i' } }
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
        throw CustomException('You do not have permission to access trading accounts', 403);
    }

    const query = firmId
        ? { _id: id, firmId }
        : { _id: id, userId };

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
        throw CustomException('You do not have permission to access trading accounts', 403);
    }

    const query = firmId
        ? { _id: id, firmId }
        : { _id: id, userId };

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
    const updateData = req.body;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to update trading accounts', 403);
    }

    const query = firmId
        ? { _id: id, firmId }
        : { _id: id, userId };

    const existingAccount = await TradingAccount.findOne(query);
    if (!existingAccount) {
        throw CustomException('Trading account not found', 404);
    }

    // Check for duplicate name if name is being changed
    if (updateData.name && updateData.name !== existingAccount.name) {
        const duplicateAccount = await TradingAccount.findOne({
            userId,
            brokerId: existingAccount.brokerId,
            _id: { $ne: id },
            name: { $regex: new RegExp(`^${updateData.name.trim()}$`, 'i') }
        });

        if (duplicateAccount) {
            throw CustomException('An account with this name already exists for this broker', 400);
        }
    }

    // Don't allow changing broker if trades exist
    if (updateData.brokerId && updateData.brokerId !== existingAccount.brokerId?.toString()) {
        const tradeCount = await Trade.countDocuments({ accountId: id });
        if (tradeCount > 0) {
            throw CustomException('Cannot change broker for account with existing trades', 400);
        }

        // Verify new broker exists
        const broker = await Broker.findOne({
            _id: updateData.brokerId,
            $or: [{ userId }, { firmId }]
        });
        if (!broker) {
            throw CustomException('Broker not found', 404);
        }
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
        throw CustomException('You do not have permission to delete trading accounts', 403);
    }

    const query = firmId
        ? { _id: id, firmId }
        : { _id: id, userId };

    const account = await TradingAccount.findOne(query);
    if (!account) {
        throw CustomException('Trading account not found', 404);
    }

    // Check if account has trades
    const tradeCount = await Trade.countDocuments({ accountId: id });
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
        throw CustomException('You do not have permission to update trading accounts', 403);
    }

    const query = firmId
        ? { _id: id, firmId }
        : { _id: id, userId };

    const account = await TradingAccount.findOne(query);
    if (!account) {
        throw CustomException('Trading account not found', 404);
    }

    // Unset all other defaults
    await TradingAccount.updateMany(
        { userId, _id: { $ne: id } },
        { isDefault: false }
    );

    // Set this one as default
    account.isDefault = true;
    account.updatedBy = userId;
    await account.save();

    const populatedAccount = await TradingAccount.findById(account._id)
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
        throw CustomException('You do not have permission to update trading accounts', 403);
    }

    const { type, amount } = req.body;

    if (!type || !['deposit', 'withdrawal'].includes(type)) {
        throw CustomException('Transaction type must be "deposit" or "withdrawal"', 400);
    }

    if (!amount || amount <= 0) {
        throw CustomException('Amount must be a positive number', 400);
    }

    const query = firmId
        ? { _id: id, firmId }
        : { _id: id, userId };

    const account = await TradingAccount.findOne(query);
    if (!account) {
        throw CustomException('Trading account not found', 404);
    }

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
    await account.save();

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
