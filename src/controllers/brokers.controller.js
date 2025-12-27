const { Broker, TradingAccount, Trade } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

/**
 * Escape special regex characters to prevent regex injection
 */
const escapeRegex = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// ═══════════════════════════════════════════════════════════════
// CREATE BROKER
// ═══════════════════════════════════════════════════════════════
const createBroker = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to create brokers', 403);
    }

    // ─────────────────────────────────────────────────────────────
    // MASS ASSIGNMENT PROTECTION
    // ─────────────────────────────────────────────────────────────
    const allowedFields = [
        'name',
        'displayName',
        'type',
        'apiSupported',
        'timezone',
        'defaultCurrency',
        'commissionStructure',
        'isDefault',
        'website',
        'supportEmail',
        'supportPhone',
        'notes'
    ];

    const brokerData = pickAllowedFields(req.body, allowedFields);

    // ─────────────────────────────────────────────────────────────
    // VALIDATION
    // ─────────────────────────────────────────────────────────────
    if (!brokerData.name || brokerData.name.trim().length === 0) {
        throw CustomException('Broker name is required', 400);
    }

    if (brokerData.name.trim().length > 100) {
        throw CustomException('Broker name must not exceed 100 characters', 400);
    }

    if (!brokerData.type) {
        throw CustomException('Broker type is required', 400);
    }

    const validTypes = ['stock', 'forex', 'crypto', 'futures', 'options', 'other'];
    if (brokerData.type && !validTypes.includes(brokerData.type.toLowerCase())) {
        throw CustomException(`Broker type must be one of: ${validTypes.join(', ')}`, 400);
    }

    if (brokerData.displayName && brokerData.displayName.trim().length > 100) {
        throw CustomException('Display name must not exceed 100 characters', 400);
    }

    if (brokerData.website) {
        const urlRegex = /^https?:\/\/.+/i;
        if (!urlRegex.test(brokerData.website)) {
            throw CustomException('Website must be a valid URL starting with http:// or https://', 400);
        }
    }

    if (brokerData.supportEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(brokerData.supportEmail)) {
            throw CustomException('Support email must be a valid email address', 400);
        }
    }

    // Validate commission structure
    if (brokerData.commissionStructure) {
        if (typeof brokerData.commissionStructure !== 'object') {
            throw CustomException('Commission structure must be an object', 400);
        }

        const { type: commType, rate, fixedAmount, minCommission, maxCommission } = brokerData.commissionStructure;

        if (commType && !['percentage', 'fixed', 'per_share', 'tiered'].includes(commType)) {
            throw CustomException('Commission type must be one of: percentage, fixed, per_share, tiered', 400);
        }

        if (rate !== undefined && rate !== null) {
            const numRate = Number(rate);
            if (isNaN(numRate) || numRate < 0 || numRate > 100) {
                throw CustomException('Commission rate must be a number between 0 and 100', 400);
            }
        }

        if (fixedAmount !== undefined && fixedAmount !== null) {
            const numFixed = Number(fixedAmount);
            if (isNaN(numFixed) || numFixed < 0) {
                throw CustomException('Fixed commission amount must be a non-negative number', 400);
            }
        }

        if (minCommission !== undefined && minCommission !== null) {
            const numMin = Number(minCommission);
            if (isNaN(numMin) || numMin < 0) {
                throw CustomException('Minimum commission must be a non-negative number', 400);
            }
        }

        if (maxCommission !== undefined && maxCommission !== null) {
            const numMax = Number(maxCommission);
            if (isNaN(numMax) || numMax < 0) {
                throw CustomException('Maximum commission must be a non-negative number', 400);
            }
        }

        if (minCommission !== undefined && maxCommission !== undefined &&
            minCommission !== null && maxCommission !== null) {
            if (Number(minCommission) > Number(maxCommission)) {
                throw CustomException('Minimum commission cannot be greater than maximum commission', 400);
            }
        }
    }

    // Check for duplicate broker name for this user
    const existingBroker = await Broker.findOne({
        userId,
        name: { $regex: new RegExp(`^${escapeRegex(brokerData.name.trim())}$`, 'i') }
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
        name: brokerData.name.trim(),
        displayName: brokerData.displayName?.trim(),
        type: brokerData.type,
        apiSupported: brokerData.apiSupported,
        timezone: brokerData.timezone,
        defaultCurrency: brokerData.defaultCurrency,
        commissionStructure: brokerData.commissionStructure,
        isDefault: brokerData.isDefault,
        website: brokerData.website,
        supportEmail: brokerData.supportEmail,
        supportPhone: brokerData.supportPhone,
        notes: brokerData.notes,
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

    // ─────────────────────────────────────────────────────────────
    // IDOR PROTECTION - Sanitize and verify ownership
    // ─────────────────────────────────────────────────────────────
    const brokerId = sanitizeObjectId(id);

    const query = firmId
        ? { _id: brokerId, firmId }
        : { _id: brokerId, userId };

    const broker = await Broker.findOne(query);

    if (!broker) {
        throw CustomException('Broker not found', 404);
    }

    // Get related accounts with firm context
    const accountsQuery = { brokerId: broker._id };
    if (firmId) {
        accountsQuery.firmId = firmId;
    }
    const accounts = await TradingAccount.find(accountsQuery)
        .select('name type status currency currentBalance');

    // Get trade stats for this broker
    // SECURITY: Add firmId to $match for defense in depth
    const tradeMatch = { brokerId: broker._id, status: 'closed' };
    if (firmId) {
        const mongoose = require('mongoose');
        tradeMatch.firmId = new mongoose.Types.ObjectId(firmId);
    }

    const tradeStats = await Trade.aggregate([
        { $match: tradeMatch },
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

    if (req.isDeparted) {
        throw CustomException('You do not have permission to update brokers', 403);
    }

    // ─────────────────────────────────────────────────────────────
    // IDOR PROTECTION - Sanitize and verify ownership
    // ─────────────────────────────────────────────────────────────
    const brokerId = sanitizeObjectId(id);

    const query = firmId
        ? { _id: brokerId, firmId }
        : { _id: brokerId, userId };

    const existingBroker = await Broker.findOne(query);
    if (!existingBroker) {
        throw CustomException('Broker not found', 404);
    }

    // ─────────────────────────────────────────────────────────────
    // MASS ASSIGNMENT PROTECTION
    // ─────────────────────────────────────────────────────────────
    const allowedFields = [
        'name',
        'displayName',
        'type',
        'apiSupported',
        'timezone',
        'defaultCurrency',
        'commissionStructure',
        'isDefault',
        'website',
        'supportEmail',
        'supportPhone',
        'notes',
        'status'
    ];

    const updateData = pickAllowedFields(req.body, allowedFields);

    // ─────────────────────────────────────────────────────────────
    // VALIDATION
    // ─────────────────────────────────────────────────────────────
    if (updateData.name !== undefined) {
        if (!updateData.name || updateData.name.trim().length === 0) {
            throw CustomException('Broker name cannot be empty', 400);
        }

        if (updateData.name.trim().length > 100) {
            throw CustomException('Broker name must not exceed 100 characters', 400);
        }
    }

    if (updateData.type !== undefined) {
        const validTypes = ['stock', 'forex', 'crypto', 'futures', 'options', 'other'];
        if (!validTypes.includes(updateData.type.toLowerCase())) {
            throw CustomException(`Broker type must be one of: ${validTypes.join(', ')}`, 400);
        }
    }

    if (updateData.displayName !== undefined && updateData.displayName && updateData.displayName.trim().length > 100) {
        throw CustomException('Display name must not exceed 100 characters', 400);
    }

    if (updateData.website !== undefined && updateData.website) {
        const urlRegex = /^https?:\/\/.+/i;
        if (!urlRegex.test(updateData.website)) {
            throw CustomException('Website must be a valid URL starting with http:// or https://', 400);
        }
    }

    if (updateData.supportEmail !== undefined && updateData.supportEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updateData.supportEmail)) {
            throw CustomException('Support email must be a valid email address', 400);
        }
    }

    // Validate commission structure
    if (updateData.commissionStructure !== undefined) {
        if (updateData.commissionStructure !== null && typeof updateData.commissionStructure !== 'object') {
            throw CustomException('Commission structure must be an object', 400);
        }

        if (updateData.commissionStructure) {
            const { type: commType, rate, fixedAmount, minCommission, maxCommission } = updateData.commissionStructure;

            if (commType && !['percentage', 'fixed', 'per_share', 'tiered'].includes(commType)) {
                throw CustomException('Commission type must be one of: percentage, fixed, per_share, tiered', 400);
            }

            if (rate !== undefined && rate !== null) {
                const numRate = Number(rate);
                if (isNaN(numRate) || numRate < 0 || numRate > 100) {
                    throw CustomException('Commission rate must be a number between 0 and 100', 400);
                }
            }

            if (fixedAmount !== undefined && fixedAmount !== null) {
                const numFixed = Number(fixedAmount);
                if (isNaN(numFixed) || numFixed < 0) {
                    throw CustomException('Fixed commission amount must be a non-negative number', 400);
                }
            }

            if (minCommission !== undefined && minCommission !== null) {
                const numMin = Number(minCommission);
                if (isNaN(numMin) || numMin < 0) {
                    throw CustomException('Minimum commission must be a non-negative number', 400);
                }
            }

            if (maxCommission !== undefined && maxCommission !== null) {
                const numMax = Number(maxCommission);
                if (isNaN(numMax) || numMax < 0) {
                    throw CustomException('Maximum commission must be a non-negative number', 400);
                }
            }

            if (minCommission !== undefined && maxCommission !== undefined &&
                minCommission !== null && maxCommission !== null) {
                if (Number(minCommission) > Number(maxCommission)) {
                    throw CustomException('Minimum commission cannot be greater than maximum commission', 400);
                }
            }
        }
    }

    // Check for duplicate name if name is being changed
    if (updateData.name && updateData.name !== existingBroker.name) {
        const duplicateBroker = await Broker.findOne({
            userId,
            _id: { $ne: brokerId },
            name: { $regex: new RegExp(`^${escapeRegex(updateData.name.trim())}$`, 'i') }
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

    // ─────────────────────────────────────────────────────────────
    // IDOR PROTECTION - Sanitize and verify ownership
    // ─────────────────────────────────────────────────────────────
    const brokerId = sanitizeObjectId(id);

    const query = firmId
        ? { _id: brokerId, firmId }
        : { _id: brokerId, userId };

    const broker = await Broker.findOne(query);
    if (!broker) {
        throw CustomException('Broker not found', 404);
    }

    // Check if broker has accounts
    const accountCount = await TradingAccount.countDocuments({ brokerId: brokerId });
    if (accountCount > 0) {
        throw CustomException(
            `Cannot delete broker with ${accountCount} linked account(s). Delete or reassign accounts first.`,
            400
        );
    }

    // Check if broker has trades
    const tradeCount = await Trade.countDocuments({ brokerId: brokerId });
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

    // ─────────────────────────────────────────────────────────────
    // IDOR PROTECTION - Sanitize and verify ownership
    // ─────────────────────────────────────────────────────────────
    const brokerId = sanitizeObjectId(id);

    const query = firmId
        ? { _id: brokerId, firmId }
        : { _id: brokerId, userId };

    const broker = await Broker.findOne(query);
    if (!broker) {
        throw CustomException('Broker not found', 404);
    }

    // Unset all other defaults
    await Broker.updateMany(
        { userId, _id: { $ne: brokerId } },
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
