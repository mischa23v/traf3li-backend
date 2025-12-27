const { Investment, InvestmentTransaction } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const { priceService } = require('../services/priceService');
const { findSymbol, searchSymbols, ALL_SYMBOLS } = require('../data/symbols');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// CREATE INVESTMENT
// ═══════════════════════════════════════════════════════════════
const createInvestment = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to create investments', 403);
    }

    // ─────────────────────────────────────────────────────────────
    // MASS ASSIGNMENT PROTECTION
    // ─────────────────────────────────────────────────────────────
    const allowedFields = [
        'symbol',
        'name',
        'nameEn',
        'type',
        'market',
        'sector',
        'sectorEn',
        'category',
        'tradingViewSymbol',
        'yahooSymbol',
        'purchaseDate',
        'purchasePrice',
        'quantity',
        'fees',
        'notes',
        'tags',
        'currency'
    ];

    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    const {
        symbol,
        name,
        nameEn,
        type,
        market,
        sector,
        sectorEn,
        category,
        tradingViewSymbol,
        yahooSymbol,
        purchaseDate,
        purchasePrice,
        quantity,
        fees,
        notes,
        tags,
        currency
    } = sanitizedData;

    // ─────────────────────────────────────────────────────────────
    // VALIDATION
    // ─────────────────────────────────────────────────────────────
    if (!symbol || symbol.trim().length === 0) {
        throw CustomException('Symbol is required', 400);
    }

    if (!name || name.trim().length === 0) {
        throw CustomException('Name is required', 400);
    }

    if (!type) {
        throw CustomException('Investment type is required', 400);
    }

    if (!market) {
        throw CustomException('Market is required', 400);
    }

    if (!purchaseDate) {
        throw CustomException('Purchase date is required', 400);
    }

    // Enhanced input validation for amounts
    if (!purchasePrice || typeof purchasePrice !== 'number' || purchasePrice <= 0 || !isFinite(purchasePrice)) {
        throw CustomException('Purchase price must be a valid positive number', 400);
    }

    if (purchasePrice > 1000000000) {
        throw CustomException('Purchase price exceeds maximum allowed value', 400);
    }

    if (!quantity || typeof quantity !== 'number' || quantity <= 0 || !isFinite(quantity)) {
        throw CustomException('Quantity must be a valid positive number', 400);
    }

    if (quantity > 1000000000) {
        throw CustomException('Quantity exceeds maximum allowed value', 400);
    }

    if (fees !== undefined && fees !== null) {
        if (typeof fees !== 'number' || fees < 0 || !isFinite(fees)) {
            throw CustomException('Fees must be a valid non-negative number', 400);
        }
        if (fees > 1000000000) {
            throw CustomException('Fees exceed maximum allowed value', 400);
        }
    }

    // Look up symbol info from database
    const symbolInfo = findSymbol(symbol);

    // Calculate total cost in halalas
    const purchasePriceHalalas = Math.round(purchasePrice * 100);
    const feesHalalas = fees ? Math.round(fees * 100) : 0;
    const totalCost = purchasePriceHalalas * quantity + feesHalalas;

    // ─────────────────────────────────────────────────────────────
    // CREATE INVESTMENT WITH TRANSACTION
    // ─────────────────────────────────────────────────────────────
    const session = await mongoose.startSession();
    let investment;

    try {
        await session.startTransaction();

        const [createdInvestment] = await Investment.create([{
            userId,
            firmId,
            symbol: symbol.toUpperCase(),
            name,
            nameEn: nameEn || symbolInfo?.nameEn,
            type,
            market,
            sector: sector || symbolInfo?.sectorAr,
            sectorEn: sectorEn || symbolInfo?.sector,
            category,
            tradingViewSymbol: tradingViewSymbol || symbolInfo?.tv,
            yahooSymbol: yahooSymbol || symbolInfo?.yahoo,
            purchaseDate: new Date(purchaseDate),
            purchasePrice: purchasePriceHalalas,
            quantity,
            totalCost,
            fees: feesHalalas,
            currentPrice: purchasePriceHalalas,
            currentValue: purchasePriceHalalas * quantity,
            notes,
            tags,
            currency: currency || 'SAR',
            createdBy: userId
        }], { session });

        investment = createdInvestment;

        // Create initial purchase transaction
        await InvestmentTransaction.create([{
            userId,
            firmId,
            investmentId: investment._id,
            type: 'purchase',
            date: new Date(purchaseDate),
            quantity,
            pricePerUnit: purchasePriceHalalas,
            amount: totalCost,
            fees: feesHalalas,
            description: `Initial purchase of ${quantity} ${symbol}`,
            createdBy: userId
        }], { session });

        await session.commitTransaction();
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }

    // Try to get current price (outside transaction)
    try {
        if (symbolInfo?.yahoo) {
            const quote = await priceService.getPriceFromYahoo(symbolInfo.yahoo);
            const priceInHalalas = Math.round(quote.price * 100);

            investment.updatePrice({
                price: priceInHalalas,
                previousClose: Math.round(quote.previousClose * 100),
                change: Math.round(quote.change * 100),
                changePercent: quote.changePercent,
                high: Math.round(quote.high * 100),
                low: Math.round(quote.low * 100),
                volume: quote.volume,
                source: 'yahoo'
            });

            await investment.save();
        }
    } catch (error) {
        logger.error('Failed to get initial price', { symbol, error: error.message });
        // Continue without price update
    }

    return res.status(201).json({
        success: true,
        message: 'Investment created successfully',
        data: investment
    });
});

// ═══════════════════════════════════════════════════════════════
// GET INVESTMENTS
// ═══════════════════════════════════════════════════════════════
const getInvestments = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to access investments', 403);
    }

    const {
        page = 1,
        limit = 20,
        status = 'active',
        type,
        market,
        search,
        sortBy = 'purchaseDate',
        sortOrder = 'desc'
    } = req.query;

    // ─────────────────────────────────────────────────────────────
    // BUILD FILTERS
    // ─────────────────────────────────────────────────────────────
    const filters = firmId ? { firmId } : { userId };

    if (status && status !== 'all') {
        filters.status = status;
    }
    if (type) filters.type = type;
    if (market) filters.market = market;

    if (search) {
        filters.$or = [
            { symbol: { $regex: search, $options: 'i' } },
            { name: { $regex: search, $options: 'i' } },
            { nameEn: { $regex: search, $options: 'i' } }
        ];
    }

    // ─────────────────────────────────────────────────────────────
    // PAGINATION & SORTING
    // ─────────────────────────────────────────────────────────────
    const parsedLimit = Math.min(parseInt(limit), 100);
    const parsedPage = parseInt(page);
    const skip = (parsedPage - 1) * parsedLimit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const investments = await Investment.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(parsedLimit);

    const total = await Investment.countDocuments(filters);

    // Get portfolio summary
    const summary = await Investment.getPortfolioSummary(userId);

    return res.json({
        success: true,
        data: {
            investments,
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
// GET SINGLE INVESTMENT
// ═══════════════════════════════════════════════════════════════
const getInvestment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to access investments', 403);
    }

    // IDOR Protection: Sanitize and validate ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid investment ID', 400);
    }

    // IDOR Protection: Verify ownership
    const query = firmId
        ? { _id: sanitizedId, firmId }
        : { _id: sanitizedId, userId };

    const investment = await Investment.findOne(query);

    if (!investment) {
        throw CustomException('Investment not found', 404);
    }

    // Get transactions (also verify ownership)
    const transactionQuery = firmId
        ? { investmentId: sanitizedId, firmId }
        : { investmentId: sanitizedId, userId };

    const transactions = await InvestmentTransaction.find(transactionQuery)
        .sort({ date: -1 });

    return res.json({
        success: true,
        data: {
            investment,
            transactions
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE INVESTMENT
// ═══════════════════════════════════════════════════════════════
const updateInvestment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to update investments', 403);
    }

    // IDOR Protection: Sanitize and validate ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid investment ID', 400);
    }

    // IDOR Protection: Verify ownership
    const query = firmId
        ? { _id: sanitizedId, firmId }
        : { _id: sanitizedId, userId };

    const investment = await Investment.findOne(query);
    if (!investment) {
        throw CustomException('Investment not found', 404);
    }

    // Mass assignment protection
    const allowedFields = [
        'name',
        'nameEn',
        'type',
        'market',
        'sector',
        'sectorEn',
        'category',
        'tradingViewSymbol',
        'yahooSymbol',
        'purchaseDate',
        'purchasePrice',
        'quantity',
        'fees',
        'notes',
        'tags',
        'currency',
        'status'
    ];

    const updateData = pickAllowedFields(req.body, allowedFields);

    // Input validation for amounts if provided
    if (updateData.purchasePrice !== undefined) {
        if (typeof updateData.purchasePrice !== 'number' || updateData.purchasePrice <= 0 || !isFinite(updateData.purchasePrice)) {
            throw CustomException('Purchase price must be a valid positive number', 400);
        }
        if (updateData.purchasePrice > 1000000000) {
            throw CustomException('Purchase price exceeds maximum allowed value', 400);
        }
        updateData.purchasePrice = Math.round(updateData.purchasePrice * 100);
    }

    if (updateData.quantity !== undefined) {
        if (typeof updateData.quantity !== 'number' || updateData.quantity <= 0 || !isFinite(updateData.quantity)) {
            throw CustomException('Quantity must be a valid positive number', 400);
        }
        if (updateData.quantity > 1000000000) {
            throw CustomException('Quantity exceeds maximum allowed value', 400);
        }
    }

    if (updateData.fees !== undefined) {
        if (typeof updateData.fees !== 'number' || updateData.fees < 0 || !isFinite(updateData.fees)) {
            throw CustomException('Fees must be a valid non-negative number', 400);
        }
        if (updateData.fees > 1000000000) {
            throw CustomException('Fees exceed maximum allowed value', 400);
        }
        updateData.fees = Math.round(updateData.fees * 100);
    }

    // Add audit
    updateData.updatedBy = userId;

    const updated = await Investment.findOneAndUpdate(
        query,
        updateData,
        { new: true, runValidators: true }
    );

    return res.json({
        success: true,
        message: 'Investment updated successfully',
        data: updated
    });
});

// ═══════════════════════════════════════════════════════════════
// DELETE INVESTMENT
// ═══════════════════════════════════════════════════════════════
const deleteInvestment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to delete investments', 403);
    }

    // IDOR Protection: Sanitize and validate ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid investment ID', 400);
    }

    // IDOR Protection: Verify ownership
    const query = firmId
        ? { _id: sanitizedId, firmId }
        : { _id: sanitizedId, userId };

    const investment = await Investment.findOne(query);
    if (!investment) {
        throw CustomException('Investment not found', 404);
    }

    // Use transaction to ensure data consistency
    const session = await mongoose.startSession();

    try {
        await session.startTransaction();

        // Delete related transactions
        const transactionQuery = firmId
            ? { investmentId: sanitizedId, firmId }
            : { investmentId: sanitizedId, userId };

        await InvestmentTransaction.deleteMany(transactionQuery, { session });

        // Delete investment
        await Investment.findOneAndDelete(query, { session });

        await session.commitTransaction();
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }

    return res.json({
        success: true,
        message: 'Investment deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// REFRESH PRICE - Single Investment
// ═══════════════════════════════════════════════════════════════
const refreshPrice = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to refresh prices', 403);
    }

    // IDOR Protection: Sanitize and validate ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid investment ID', 400);
    }

    // IDOR Protection: Verify ownership
    const query = firmId
        ? { _id: sanitizedId, firmId }
        : { _id: sanitizedId, userId };

    const investment = await Investment.findOne(query);
    if (!investment) {
        throw CustomException('Investment not found', 404);
    }

    // Get symbol info
    const symbolInfo = findSymbol(investment.symbol);
    const yahooSymbol = investment.yahooSymbol || symbolInfo?.yahoo;

    if (!yahooSymbol) {
        throw CustomException('No price source available for this symbol', 400);
    }

    try {
        const quote = await priceService.getPriceFromYahoo(yahooSymbol);
        const priceInHalalas = Math.round(quote.price * 100);

        investment.updatePrice({
            price: priceInHalalas,
            previousClose: Math.round(quote.previousClose * 100),
            change: Math.round(quote.change * 100),
            changePercent: quote.changePercent,
            high: Math.round(quote.high * 100),
            low: Math.round(quote.low * 100),
            volume: quote.volume,
            source: 'yahoo'
        });

        await investment.save();

        return res.json({
            success: true,
            message: 'Price refreshed successfully',
            data: {
                investment,
                quote: {
                    price: quote.price,
                    priceHalalas: priceInHalalas,
                    change: quote.change,
                    changePercent: quote.changePercent,
                    lastUpdated: quote.lastUpdated
                }
            }
        });
    } catch (error) {
        throw CustomException(`Failed to refresh price: ${error.message}`, 500);
    }
});

// ═══════════════════════════════════════════════════════════════
// REFRESH ALL PRICES
// ═══════════════════════════════════════════════════════════════
const refreshAllPrices = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to refresh prices', 403);
    }

    const { market } = req.query;

    const query = firmId
        ? { firmId, status: 'active' }
        : { userId, status: 'active' };

    if (market) {
        query.market = market;
    }

    const investments = await Investment.find(query);
    const updated = [];
    const failed = [];

    for (const investment of investments) {
        try {
            const symbolInfo = findSymbol(investment.symbol);
            const yahooSymbol = investment.yahooSymbol || symbolInfo?.yahoo;

            if (!yahooSymbol) {
                failed.push({ symbol: investment.symbol, error: 'No price source' });
                continue;
            }

            const quote = await priceService.getPriceFromYahoo(yahooSymbol);
            const priceInHalalas = Math.round(quote.price * 100);

            investment.updatePrice({
                price: priceInHalalas,
                previousClose: Math.round(quote.previousClose * 100),
                change: Math.round(quote.change * 100),
                changePercent: quote.changePercent,
                high: Math.round(quote.high * 100),
                low: Math.round(quote.low * 100),
                volume: quote.volume,
                source: 'yahoo'
            });

            await investment.save();
            updated.push({ symbol: investment.symbol, price: priceInHalalas });

            // Rate limiting
            await new Promise(r => setTimeout(r, 300));
        } catch (error) {
            failed.push({ symbol: investment.symbol, error: error.message });
        }
    }

    return res.json({
        success: true,
        message: `Updated ${updated.length} investments, ${failed.length} failed`,
        data: { updated, failed }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET PORTFOLIO SUMMARY
// ═══════════════════════════════════════════════════════════════
const getPortfolioSummary = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to access portfolio', 403);
    }

    const summary = await Investment.getPortfolioSummary(userId);

    // Get breakdown by type (with firmId isolation)
    const typeMatchQuery = firmId
        ? { firmId, status: 'active' }
        : { userId, status: 'active' };

    const byType = await Investment.aggregate([
        {
            $match: typeMatchQuery
        },
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 },
                totalCost: { $sum: '$totalCost' },
                totalValue: { $sum: '$currentValue' },
                totalDividends: { $sum: '$dividendsReceived' }
            }
        }
    ]);

    // Get breakdown by market (with firmId isolation)
    const marketMatchQuery = firmId
        ? { firmId, status: 'active' }
        : { userId, status: 'active' };

    const byMarket = await Investment.aggregate([
        {
            $match: marketMatchQuery
        },
        {
            $group: {
                _id: '$market',
                count: { $sum: 1 },
                totalCost: { $sum: '$totalCost' },
                totalValue: { $sum: '$currentValue' }
            }
        }
    ]);

    return res.json({
        success: true,
        data: {
            summary,
            byType,
            byMarket
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// ADD TRANSACTION
// ═══════════════════════════════════════════════════════════════
const addTransaction = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to add transactions', 403);
    }

    // IDOR Protection: Sanitize and validate ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid investment ID', 400);
    }

    // IDOR Protection: Verify ownership
    const query = firmId
        ? { _id: sanitizedId, firmId }
        : { _id: sanitizedId, userId };

    const investment = await Investment.findOne(query);
    if (!investment) {
        throw CustomException('Investment not found', 404);
    }

    // Mass assignment protection
    const allowedFields = [
        'type',
        'date',
        'quantity',
        'pricePerUnit',
        'amount',
        'fees',
        'description',
        'notes'
    ];

    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    const {
        type,
        date,
        quantity,
        pricePerUnit,
        amount,
        fees,
        description,
        notes
    } = sanitizedData;

    // Validation
    if (!type) {
        throw CustomException('Transaction type is required', 400);
    }

    if (!date) {
        throw CustomException('Transaction date is required', 400);
    }

    if (amount === undefined || amount === null) {
        throw CustomException('Amount is required', 400);
    }

    // Enhanced input validation for amounts
    if (typeof amount !== 'number' || !isFinite(amount)) {
        throw CustomException('Amount must be a valid number', 400);
    }

    if (Math.abs(amount) > 1000000000) {
        throw CustomException('Amount exceeds maximum allowed value', 400);
    }

    if (pricePerUnit !== undefined && pricePerUnit !== null) {
        if (typeof pricePerUnit !== 'number' || pricePerUnit <= 0 || !isFinite(pricePerUnit)) {
            throw CustomException('Price per unit must be a valid positive number', 400);
        }
        if (pricePerUnit > 1000000000) {
            throw CustomException('Price per unit exceeds maximum allowed value', 400);
        }
    }

    if (fees !== undefined && fees !== null) {
        if (typeof fees !== 'number' || fees < 0 || !isFinite(fees)) {
            throw CustomException('Fees must be a valid non-negative number', 400);
        }
        if (fees > 1000000000) {
            throw CustomException('Fees exceed maximum allowed value', 400);
        }
    }

    if (quantity !== undefined && quantity !== null) {
        if (typeof quantity !== 'number' || quantity <= 0 || !isFinite(quantity)) {
            throw CustomException('Quantity must be a valid positive number', 400);
        }
        if (quantity > 1000000000) {
            throw CustomException('Quantity exceeds maximum allowed value', 400);
        }
    }

    // Convert to halalas
    const amountHalalas = Math.round(Math.abs(amount) * 100);
    const feesHalalas = fees ? Math.round(fees * 100) : 0;
    const pricePerUnitHalalas = pricePerUnit ? Math.round(pricePerUnit * 100) : null;

    // Validate sale quantity
    if (type === 'sale') {
        if (!quantity || quantity <= 0) {
            throw CustomException('Quantity is required for sales', 400);
        }
        if (quantity > investment.quantity) {
            throw CustomException('Cannot sell more than owned quantity', 400);
        }
    }

    // Use transaction to ensure data consistency
    const session = await mongoose.startSession();
    let transaction;
    let updatedInvestment;

    try {
        await session.startTransaction();

        const [createdTransaction] = await InvestmentTransaction.create([{
            userId,
            firmId,
            investmentId: sanitizedId,
            type,
            date: new Date(date),
            quantity,
            pricePerUnit: pricePerUnitHalalas,
            amount: amountHalalas,
            fees: feesHalalas,
            description,
            notes,
            createdBy: userId
        }], { session });

        transaction = createdTransaction;

        // Reload investment after transaction creation (with IDOR protection)
        updatedInvestment = await Investment.findOne(query).session(session);

        await session.commitTransaction();
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }

    // Reload investment one more time to get post-save hook updates (with IDOR protection)
    updatedInvestment = await Investment.findOne(query);

    return res.status(201).json({
        success: true,
        message: 'Transaction added successfully',
        data: {
            transaction,
            investment: updatedInvestment
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET TRANSACTIONS
// ═══════════════════════════════════════════════════════════════
const getTransactions = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to access transactions', 403);
    }

    // IDOR Protection: Sanitize and validate ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid investment ID', 400);
    }

    // IDOR Protection: Verify ownership
    const query = firmId
        ? { _id: sanitizedId, firmId }
        : { _id: sanitizedId, userId };

    const investment = await Investment.findOne(query);
    if (!investment) {
        throw CustomException('Investment not found', 404);
    }

    const {
        page = 1,
        limit = 20,
        type
    } = req.query;

    // Verify ownership on transactions query
    const filters = firmId
        ? { investmentId: sanitizedId, firmId }
        : { investmentId: sanitizedId, userId };

    if (type) filters.type = type;

    const parsedLimit = Math.min(parseInt(limit), 100);
    const parsedPage = parseInt(page);
    const skip = (parsedPage - 1) * parsedLimit;

    const transactions = await InvestmentTransaction.find(filters)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parsedLimit);

    const total = await InvestmentTransaction.countDocuments(filters);

    return res.json({
        success: true,
        data: {
            transactions,
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
// DELETE TRANSACTION
// ═══════════════════════════════════════════════════════════════
const deleteTransaction = asyncHandler(async (req, res) => {
    const { id, transactionId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (req.isDeparted) {
        throw CustomException('You do not have permission to delete transactions', 403);
    }

    // IDOR Protection: Sanitize and validate ObjectIds
    const sanitizedId = sanitizeObjectId(id);
    const sanitizedTransactionId = sanitizeObjectId(transactionId);

    if (!sanitizedId) {
        throw CustomException('Invalid investment ID', 400);
    }

    if (!sanitizedTransactionId) {
        throw CustomException('Invalid transaction ID', 400);
    }

    // IDOR Protection: Verify investment ownership
    const query = firmId
        ? { _id: sanitizedId, firmId }
        : { _id: sanitizedId, userId };

    const investment = await Investment.findOne(query);
    if (!investment) {
        throw CustomException('Investment not found', 404);
    }

    // IDOR Protection: Verify transaction ownership
    const transactionQuery = firmId
        ? { _id: sanitizedTransactionId, investmentId: sanitizedId, firmId }
        : { _id: sanitizedTransactionId, investmentId: sanitizedId, userId };

    const transaction = await InvestmentTransaction.findOne(transactionQuery);

    if (!transaction) {
        throw CustomException('Transaction not found', 404);
    }

    // Don't allow deleting the initial purchase
    const countQuery = firmId
        ? { investmentId: sanitizedId, firmId }
        : { investmentId: sanitizedId, userId };

    const transactionCount = await InvestmentTransaction.countDocuments(countQuery);
    if (transactionCount === 1 && transaction.type === 'purchase') {
        throw CustomException('Cannot delete the initial purchase transaction', 400);
    }

    // IDOR Protection: Delete with ownership verification
    await InvestmentTransaction.findOneAndDelete(transactionQuery);

    return res.json({
        success: true,
        message: 'Transaction deleted successfully'
    });
});

module.exports = {
    createInvestment,
    getInvestments,
    getInvestment,
    updateInvestment,
    deleteInvestment,
    refreshPrice,
    refreshAllPrices,
    getPortfolioSummary,
    addTransaction,
    getTransactions,
    deleteTransaction
};
