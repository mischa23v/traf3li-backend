const { Broker, TradingAccount, Trade } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');

// ═══════════════════════════════════════════════════════════════
// CREATE BROKER
// ═══════════════════════════════════════════════════════════════
const createBroker = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to create brokers', 403);
    }

    const {
        name,
        displayName,
        type,
        apiSupported,
        timezone,
        defaultCurrency,
        commissionStructure,
        isDefault,
        website,
        supportEmail,
        supportPhone,
        notes
    } = req.body;

    // ─────────────────────────────────────────────────────────────
    // VALIDATION
    // ─────────────────────────────────────────────────────────────
    if (!name || name.trim().length === 0) {
        throw CustomException('Broker name is required', 400);
    }

    if (!type) {
        throw CustomException('Broker type is required', 400);
    }

    // Check for duplicate broker name for this user
    const existingBroker = await Broker.findOne({
        userId,
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });

    if (existingBroker) {
        throw CustomException('A broker with this name already exists', 400);
    }

    // ─────────────────────────────────────────────────────────────
    // CREATE BROKER
    // ─────────────────────────────────────────────────────────────
    const broker = await Broker.create({
        userId,
        firmId,
        name: name.trim(),
        displayName: displayName?.trim(),
        type,
        apiSupported,
        timezone,
        defaultCurrency,
        commissionStructure,
        isDefault,
        website,
        supportEmail,
        supportPhone,
        notes,
        createdBy: userId
    });

    return res.status(201).json({
        success: true,
        message: 'Broker created successfully',
        data: broker
    });
});

// ═══════════════════════════════════════════════════════════════
// GET BROKERS
// ═══════════════════════════════════════════════════════════════
const getBrokers = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to access brokers', 403);
    }

    const {
        page = 1,
        limit = 20,
        status,
        type,
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

    if (search) {
        filters.$or = [
            { name: { $regex: search, $options: 'i' } },
            { displayName: { $regex: search, $options: 'i' } }
        ];
    }

    // ─────────────────────────────────────────────────────────────
    // PAGINATION & SORTING
    // ─────────────────────────────────────────────────────────────
    const parsedLimit = Math.min(parseInt(limit), 100);
    const parsedPage = parseInt(page);
    const skip = (parsedPage - 1) * parsedLimit;
    const sort = { isDefault: -1, [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const brokers = await Broker.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(parsedLimit);

    const total = await Broker.countDocuments(filters);

    // Get account counts for each broker
    const brokersWithCounts = await Promise.all(
        brokers.map(async (broker) => {
            const accountCount = await TradingAccount.countDocuments({
                brokerId: broker._id
            });
            return {
                ...broker.toObject(),
                accountCount
            };
        })
    );

    return res.json({
        success: true,
        data: {
            brokers: brokersWithCounts,
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
// GET SINGLE BROKER
// ═══════════════════════════════════════════════════════════════
const getBroker = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to access brokers', 403);
    }

    const query = firmId
        ? { _id: id, firmId }
        : { _id: id, userId };

    const broker = await Broker.findOne(query);

    if (!broker) {
        throw CustomException('Broker not found', 404);
    }

    // Get related accounts
    const accounts = await TradingAccount.find({ brokerId: broker._id })
        .select('name type status currency currentBalance');

    // Get trade stats for this broker
    const tradeStats = await Trade.aggregate([
        { $match: { brokerId: broker._id, status: 'closed' } },
        {
            $group: {
                _id: null,
                totalTrades: { $sum: 1 },
                totalPnl: { $sum: '$netPnl' },
                totalCommissions: {
                    $sum: { $add: ['$entryCommission', '$exitCommission'] }
                }
            }
        }
    ]);

    return res.json({
        success: true,
        data: {
            ...broker.toObject(),
            accounts,
            stats: tradeStats[0] || {
                totalTrades: 0,
                totalPnl: 0,
                totalCommissions: 0
            }
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE BROKER
// ═══════════════════════════════════════════════════════════════
const updateBroker = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;
    const updateData = req.body;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to update brokers', 403);
    }

    const query = firmId
        ? { _id: id, firmId }
        : { _id: id, userId };

    const existingBroker = await Broker.findOne(query);
    if (!existingBroker) {
        throw CustomException('Broker not found', 404);
    }

    // Check for duplicate name if name is being changed
    if (updateData.name && updateData.name !== existingBroker.name) {
        const duplicateBroker = await Broker.findOne({
            userId,
            _id: { $ne: id },
            name: { $regex: new RegExp(`^${updateData.name.trim()}$`, 'i') }
        });

        if (duplicateBroker) {
            throw CustomException('A broker with this name already exists', 400);
        }
    }

    // Add audit
    updateData.updatedBy = userId;

    const broker = await Broker.findOneAndUpdate(
        query,
        updateData,
        { new: true, runValidators: true }
    );

    return res.json({
        success: true,
        message: 'Broker updated successfully',
        data: broker
    });
});

// ═══════════════════════════════════════════════════════════════
// DELETE BROKER
// ═══════════════════════════════════════════════════════════════
const deleteBroker = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to delete brokers', 403);
    }

    const query = firmId
        ? { _id: id, firmId }
        : { _id: id, userId };

    const broker = await Broker.findOne(query);
    if (!broker) {
        throw CustomException('Broker not found', 404);
    }

    // Check if broker has accounts
    const accountCount = await TradingAccount.countDocuments({ brokerId: id });
    if (accountCount > 0) {
        throw CustomException(
            `Cannot delete broker with ${accountCount} linked account(s). Delete or reassign accounts first.`,
            400
        );
    }

    // Check if broker has trades
    const tradeCount = await Trade.countDocuments({ brokerId: id });
    if (tradeCount > 0) {
        throw CustomException(
            `Cannot delete broker with ${tradeCount} linked trade(s). Delete or reassign trades first.`,
            400
        );
    }

    await Broker.findOneAndDelete(query);

    return res.json({
        success: true,
        message: 'Broker deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// SET DEFAULT BROKER
// ═══════════════════════════════════════════════════════════════
const setDefaultBroker = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to update brokers', 403);
    }

    const query = firmId
        ? { _id: id, firmId }
        : { _id: id, userId };

    const broker = await Broker.findOne(query);
    if (!broker) {
        throw CustomException('Broker not found', 404);
    }

    // Unset all other defaults
    await Broker.updateMany(
        { userId, _id: { $ne: id } },
        { isDefault: false }
    );

    // Set this one as default
    broker.isDefault = true;
    broker.updatedBy = userId;
    await broker.save();

    return res.json({
        success: true,
        message: 'Default broker set successfully',
        data: broker
    });
});

module.exports = {
    createBroker,
    getBrokers,
    getBroker,
    updateBroker,
    deleteBroker,
    setDefaultBroker
};
