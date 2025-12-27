const Firm = require('../models/firm.model');
const Invoice = require('../models/invoice.model');
const Expense = require('../models/expense.model');
const InterCompanyTransaction = require('../models/interCompanyTransaction.model');
const Account = require('../models/account.model');
const GeneralLedger = require('../models/generalLedger.model');
const asyncHandler = require('../utils/asyncHandler');
const mongoose = require('mongoose');
const { toSAR } = require('../utils/currency');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

/**
 * Validate and sanitize date parameters
 * @param {string} dateStr - Date string
 * @returns {Date|null} Valid Date object or null
 */
const validateDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date;
};

/**
 * Validate currency code
 * @param {string} currency - Currency code
 * @returns {string} Valid currency code
 */
const validateCurrency = (currency) => {
    const validCurrencies = ['SAR', 'USD', 'EUR', 'GBP', 'AED'];
    return validCurrencies.includes(currency) ? currency : 'SAR';
};

/**
 * Sanitize and validate firm IDs array
 * @param {Array} firmIds - Array of firm IDs
 * @param {Array} allowedFirmIds - Array of allowed firm IDs
 * @returns {Array} Sanitized and validated firm IDs
 */
const sanitizeFirmIds = (firmIds, allowedFirmIds) => {
    if (!firmIds || !Array.isArray(firmIds)) {
        return allowedFirmIds;
    }

    const sanitized = firmIds
        .map(id => sanitizeObjectId(id))
        .filter(id => id && allowedFirmIds.includes(id.toString()));

    return sanitized.length > 0 ? sanitized : allowedFirmIds;
};

/**
 * Get firms user has access to
 * @param {string} userId - User ID
 * @returns {Array} Array of firm IDs user can access
 */
const getUserFirms = async (userId) => {
    const sanitizedUserId = sanitizeObjectId(userId);
    if (!sanitizedUserId) {
        return [];
    }

    const firms = await Firm.find({
        $or: [
            { ownerId: sanitizedUserId },
            { 'members.userId': sanitizedUserId }
        ],
        status: 'active'
    }).select('_id name').lean();

    return firms;
};

/**
 * Apply currency conversion if needed
 * @param {number} amount - Amount in source currency
 * @param {string} sourceCurrency - Source currency code
 * @param {string} targetCurrency - Target currency code
 * @param {Object} exchangeRates - Exchange rates object
 * @returns {number} Converted amount
 */
const convertCurrency = (amount, sourceCurrency, targetCurrency, exchangeRates = {}) => {
    if (sourceCurrency === targetCurrency) return amount;

    // Default exchange rates (SAR base)
    const rates = {
        SAR: 1,
        USD: 0.27,
        EUR: 0.25,
        ...exchangeRates
    };

    // Convert to SAR first, then to target
    const amountInSAR = amount / (rates[sourceCurrency] || 1);
    return amountInSAR * (rates[targetCurrency] || 1);
};

/**
 * Get Consolidated Profit & Loss Report
 * GET /api/reports/consolidated/profit-loss
 * Query params: firmIds[], startDate, endDate, includeEliminations, currency
 */
exports.getConsolidatedProfitLoss = asyncHandler(async (req, res) => {
    const { firmIds, startDate, endDate, includeEliminations, currency = 'SAR' } = req.query;
    const userId = req.userId || req.userID;

    // Validate date parameters
    const validStartDate = validateDate(startDate);
    const validEndDate = validateDate(endDate);

    if (!validStartDate || !validEndDate) {
        return res.status(400).json({
            success: false,
            error: 'Valid start date and end date are required'
        });
    }

    // Validate currency
    const validCurrency = validateCurrency(currency);

    // Get firms user has access to
    const userFirms = await getUserFirms(userId);
    const userFirmIds = userFirms.map(f => f._id.toString());

    // Sanitize and validate firm IDs with IDOR protection
    const selectedFirmIds = sanitizeFirmIds(firmIds, userFirmIds);

    if (selectedFirmIds.length === 0) {
        return res.status(403).json({
            success: false,
            error: 'No accessible firms found'
        });
    }

    const selectedObjectIds = selectedFirmIds.map(id => mongoose.Types.ObjectId.createFromHexString(id));

    const matchStage = {
        status: 'posted',
        firmId: { $in: selectedObjectIds },
        transactionDate: {
            $gte: validStartDate,
            $lte: validEndDate
        }
    };

    // Get all income and expense accounts
    const [incomeAccounts, expenseAccounts] = await Promise.all([
        Account.find({ type: 'Income', isActive: true }).lean(),
        Account.find({ type: 'Expense', isActive: true }).lean()
    ]);

    const incomeAccountIds = incomeAccounts.map(a => a._id);
    const expenseAccountIds = expenseAccounts.map(a => a._id);
    const allAccountIds = [...incomeAccountIds, ...expenseAccountIds];

    // Aggregate by firm
    const firmResults = await GeneralLedger.aggregate([
        {
            $match: {
                ...matchStage,
                $or: [
                    { creditAccountId: { $in: allAccountIds } },
                    { debitAccountId: { $in: allAccountIds } }
                ]
            }
        },
        {
            $group: {
                _id: '$firmId',
                transactions: { $push: '$$ROOT' }
            }
        }
    ]);

    // Build lookup maps
    const firmData = {};

    for (const result of firmResults) {
        const firmId = result._id.toString();
        const creditMap = new Map();
        const debitMap = new Map();

        result.transactions.forEach(txn => {
            if (txn.creditAccountId) {
                const id = txn.creditAccountId.toString();
                creditMap.set(id, (creditMap.get(id) || 0) + txn.amount);
            }
            if (txn.debitAccountId) {
                const id = txn.debitAccountId.toString();
                debitMap.set(id, (debitMap.get(id) || 0) + txn.amount);
            }
        });

        // Calculate income
        let income = 0;
        for (const account of incomeAccounts) {
            const accountIdStr = account._id.toString();
            const credits = creditMap.get(accountIdStr) || 0;
            const debits = debitMap.get(accountIdStr) || 0;
            income += (credits - debits);
        }

        // Calculate expenses
        let expenses = 0;
        for (const account of expenseAccounts) {
            const accountIdStr = account._id.toString();
            const credits = creditMap.get(accountIdStr) || 0;
            const debits = debitMap.get(accountIdStr) || 0;
            expenses += (debits - credits);
        }

        firmData[firmId] = { income, expenses };
    }

    // Calculate totals
    let totalIncome = 0;
    let totalExpenses = 0;

    Object.values(firmData).forEach(data => {
        totalIncome += data.income;
        totalExpenses += data.expenses;
    });

    // Apply intercompany eliminations if requested
    let eliminationAdjustments = { income: 0, expenses: 0 };

    if (includeEliminations === 'true' || includeEliminations === true) {
        const eliminations = await InterCompanyTransaction.find({
            $or: [
                { sourceFirmId: { $in: selectedObjectIds } },
                { targetFirmId: { $in: selectedObjectIds } }
            ],
            transactionDate: {
                $gte: validStartDate,
                $lte: validEndDate
            },
            status: { $in: ['confirmed', 'reconciled'] }
        }).lean();

        eliminations.forEach(elim => {
            // For P&L, we eliminate intercompany revenue and expenses
            if (elim.transactionType === 'sale') {
                eliminationAdjustments.income += elim.amount;
                eliminationAdjustments.expenses += elim.amount;
            }
        });

        totalIncome -= eliminationAdjustments.income;
        totalExpenses -= eliminationAdjustments.expenses;
    }

    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(2) : '0.00';

    // Get firm details for response
    const firms = await Firm.find({ _id: { $in: selectedObjectIds } })
        .select('_id name')
        .lean();

    const firmBreakdown = firms.map(firm => {
        const data = firmData[firm._id.toString()] || { income: 0, expenses: 0 };
        return {
            firmId: firm._id,
            firmName: firm.name,
            income: data.income,
            incomeSAR: toSAR(data.income),
            expenses: data.expenses,
            expensesSAR: toSAR(data.expenses),
            netProfit: data.income - data.expenses,
            netProfitSAR: toSAR(data.income - data.expenses),
            profitMargin: data.income > 0
                ? ((data.income - data.expenses) / data.income * 100).toFixed(2) + '%'
                : '0%'
        };
    });

    res.status(200).json({
        success: true,
        report: 'consolidated-profit-loss',
        period: { startDate: validStartDate, endDate: validEndDate },
        currency: validCurrency,
        includeEliminations: includeEliminations === 'true' || includeEliminations === true,
        generatedAt: new Date(),
        firms: firmBreakdown,
        eliminations: includeEliminations === 'true' || includeEliminations === true ? {
            incomeEliminations: eliminationAdjustments.income,
            incomeEliminationsSAR: toSAR(eliminationAdjustments.income),
            expenseEliminations: eliminationAdjustments.expenses,
            expenseEliminationsSAR: toSAR(eliminationAdjustments.expenses)
        } : null,
        summary: {
            totalIncome,
            totalIncomeSAR: toSAR(totalIncome),
            totalExpenses,
            totalExpensesSAR: toSAR(totalExpenses),
            netProfit,
            netProfitSAR: toSAR(netProfit),
            profitMargin: profitMargin + '%',
            firmCount: firms.length
        }
    });
});

/**
 * Get Consolidated Balance Sheet Report
 * GET /api/reports/consolidated/balance-sheet
 * Query params: firmIds[], asOfDate, includeEliminations, currency
 */
exports.getConsolidatedBalanceSheet = asyncHandler(async (req, res) => {
    const { firmIds, asOfDate, includeEliminations, currency = 'SAR' } = req.query;
    const userId = req.userId || req.userID;

    // Validate date parameter
    const upToDate = asOfDate ? validateDate(asOfDate) : new Date();
    if (!upToDate) {
        return res.status(400).json({
            success: false,
            error: 'Invalid date format'
        });
    }

    // Validate currency
    const validCurrency = validateCurrency(currency);

    // Get firms user has access to
    const userFirms = await getUserFirms(userId);
    const userFirmIds = userFirms.map(f => f._id.toString());

    // Sanitize and validate firm IDs with IDOR protection
    const selectedFirmIds = sanitizeFirmIds(firmIds, userFirmIds);

    if (selectedFirmIds.length === 0) {
        return res.status(403).json({
            success: false,
            error: 'No accessible firms found'
        });
    }

    const selectedObjectIds = selectedFirmIds.map(id => mongoose.Types.ObjectId.createFromHexString(id));

    const matchStage = {
        status: 'posted',
        firmId: { $in: selectedObjectIds },
        transactionDate: { $lte: upToDate }
    };

    // Get all balance sheet accounts
    const [assetAccounts, liabilityAccounts, equityAccounts] = await Promise.all([
        Account.find({ type: 'Asset', isActive: true }).lean(),
        Account.find({ type: 'Liability', isActive: true }).lean(),
        Account.find({ type: 'Equity', isActive: true }).lean()
    ]);

    const assetAccountIds = assetAccounts.map(a => a._id);
    const liabilityAccountIds = liabilityAccounts.map(a => a._id);
    const equityAccountIds = equityAccounts.map(a => a._id);
    const allAccountIds = [...assetAccountIds, ...liabilityAccountIds, ...equityAccountIds];

    // Aggregate by firm
    const firmResults = await GeneralLedger.aggregate([
        {
            $match: {
                ...matchStage,
                $or: [
                    { creditAccountId: { $in: allAccountIds } },
                    { debitAccountId: { $in: allAccountIds } }
                ]
            }
        },
        {
            $group: {
                _id: '$firmId',
                transactions: { $push: '$$ROOT' }
            }
        }
    ]);

    const firmData = {};

    for (const result of firmResults) {
        const firmId = result._id.toString();
        const creditMap = new Map();
        const debitMap = new Map();

        result.transactions.forEach(txn => {
            if (txn.creditAccountId) {
                const id = txn.creditAccountId.toString();
                creditMap.set(id, (creditMap.get(id) || 0) + txn.amount);
            }
            if (txn.debitAccountId) {
                const id = txn.debitAccountId.toString();
                debitMap.set(id, (debitMap.get(id) || 0) + txn.amount);
            }
        });

        // Calculate assets
        let assets = 0;
        for (const account of assetAccounts) {
            const accountIdStr = account._id.toString();
            const credits = creditMap.get(accountIdStr) || 0;
            const debits = debitMap.get(accountIdStr) || 0;
            assets += (debits - credits);
        }

        // Calculate liabilities
        let liabilities = 0;
        for (const account of liabilityAccounts) {
            const accountIdStr = account._id.toString();
            const credits = creditMap.get(accountIdStr) || 0;
            const debits = debitMap.get(accountIdStr) || 0;
            liabilities += (credits - debits);
        }

        // Calculate equity
        let equity = 0;
        for (const account of equityAccounts) {
            const accountIdStr = account._id.toString();
            const credits = creditMap.get(accountIdStr) || 0;
            const debits = debitMap.get(accountIdStr) || 0;
            equity += (credits - debits);
        }

        firmData[firmId] = { assets, liabilities, equity };
    }

    // Calculate totals
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    Object.values(firmData).forEach(data => {
        totalAssets += data.assets;
        totalLiabilities += data.liabilities;
        totalEquity += data.equity;
    });

    // Apply intercompany eliminations if requested
    let eliminationAdjustments = { assets: 0, liabilities: 0 };

    if (includeEliminations === 'true' || includeEliminations === true) {
        const eliminations = await InterCompanyTransaction.find({
            $or: [
                { sourceFirmId: { $in: selectedObjectIds } },
                { targetFirmId: { $in: selectedObjectIds } }
            ],
            transactionDate: { $lte: upToDate },
            status: { $in: ['confirmed', 'reconciled'] }
        }).lean();

        // Eliminate intercompany receivables/payables
        eliminations.forEach(elim => {
            if (elim.transactionType === 'loan') {
                eliminationAdjustments.assets += elim.amount;
                eliminationAdjustments.liabilities += elim.amount;
            }
        });

        totalAssets -= eliminationAdjustments.assets;
        totalLiabilities -= eliminationAdjustments.liabilities;
    }

    const isBalanced = totalAssets === (totalLiabilities + totalEquity);

    // Get firm details
    const firms = await Firm.find({ _id: { $in: selectedObjectIds } })
        .select('_id name')
        .lean();

    const firmBreakdown = firms.map(firm => {
        const data = firmData[firm._id.toString()] || { assets: 0, liabilities: 0, equity: 0 };
        return {
            firmId: firm._id,
            firmName: firm.name,
            assets: data.assets,
            assetsSAR: toSAR(data.assets),
            liabilities: data.liabilities,
            liabilitiesSAR: toSAR(data.liabilities),
            equity: data.equity,
            equitySAR: toSAR(data.equity),
            isBalanced: data.assets === (data.liabilities + data.equity)
        };
    });

    res.status(200).json({
        success: true,
        report: 'consolidated-balance-sheet',
        asOfDate: upToDate,
        currency: validCurrency,
        includeEliminations: includeEliminations === 'true' || includeEliminations === true,
        generatedAt: new Date(),
        firms: firmBreakdown,
        eliminations: includeEliminations === 'true' || includeEliminations === true ? {
            assetEliminations: eliminationAdjustments.assets,
            assetEliminationsSAR: toSAR(eliminationAdjustments.assets),
            liabilityEliminations: eliminationAdjustments.liabilities,
            liabilityEliminationsSAR: toSAR(eliminationAdjustments.liabilities)
        } : null,
        summary: {
            totalAssets,
            totalAssetsSAR: toSAR(totalAssets),
            totalLiabilities,
            totalLiabilitiesSAR: toSAR(totalLiabilities),
            totalEquity,
            totalEquitySAR: toSAR(totalEquity),
            totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
            totalLiabilitiesAndEquitySAR: toSAR(totalLiabilities + totalEquity),
            isBalanced,
            firmCount: firms.length
        }
    });
});

/**
 * Get Consolidated Cash Flow Report
 * GET /api/reports/consolidated/cash-flow
 * Query params: firmIds[], startDate, endDate, currency
 */
exports.getConsolidatedCashFlow = asyncHandler(async (req, res) => {
    const { firmIds, startDate, endDate, currency = 'SAR' } = req.query;
    const userId = req.userId || req.userID;

    // Validate date parameters
    const validStartDate = validateDate(startDate);
    const validEndDate = validateDate(endDate);

    if (!validStartDate || !validEndDate) {
        return res.status(400).json({
            success: false,
            error: 'Valid start date and end date are required'
        });
    }

    // Validate currency
    const validCurrency = validateCurrency(currency);

    // Get firms user has access to
    const userFirms = await getUserFirms(userId);
    const userFirmIds = userFirms.map(f => f._id.toString());

    // Sanitize and validate firm IDs with IDOR protection
    const selectedFirmIds = sanitizeFirmIds(firmIds, userFirmIds);

    if (selectedFirmIds.length === 0) {
        return res.status(403).json({
            success: false,
            error: 'No accessible firms found'
        });
    }

    const selectedObjectIds = selectedFirmIds.map(id => mongoose.Types.ObjectId.createFromHexString(id));

    // Get cash accounts
    const cashAccounts = await Account.find({
        subType: { $in: ['Cash', 'Bank', 'Petty Cash'] },
        isActive: true
    }).lean();

    const cashAccountIds = cashAccounts.map(a => a._id);

    // Aggregate cash movements by firm
    const firmCashFlows = await GeneralLedger.aggregate([
        {
            $match: {
                status: 'posted',
                firmId: { $in: selectedObjectIds },
                transactionDate: {
                    $gte: validStartDate,
                    $lte: validEndDate
                },
                $or: [
                    { creditAccountId: { $in: cashAccountIds } },
                    { debitAccountId: { $in: cashAccountIds } }
                ]
            }
        },
        {
            $group: {
                _id: '$firmId',
                cashInflows: {
                    $sum: {
                        $cond: [
                            { $in: ['$debitAccountId', cashAccountIds] },
                            '$amount',
                            0
                        ]
                    }
                },
                cashOutflows: {
                    $sum: {
                        $cond: [
                            { $in: ['$creditAccountId', cashAccountIds] },
                            '$amount',
                            0
                        ]
                    }
                }
            }
        }
    ]);

    const firmData = {};
    firmCashFlows.forEach(flow => {
        firmData[flow._id.toString()] = {
            inflows: flow.cashInflows,
            outflows: flow.cashOutflows,
            netCashFlow: flow.cashInflows - flow.cashOutflows
        };
    });

    // Calculate totals
    let totalInflows = 0;
    let totalOutflows = 0;

    Object.values(firmData).forEach(data => {
        totalInflows += data.inflows;
        totalOutflows += data.outflows;
    });

    const netCashFlow = totalInflows - totalOutflows;

    // Get firm details
    const firms = await Firm.find({ _id: { $in: selectedObjectIds } })
        .select('_id name')
        .lean();

    const firmBreakdown = firms.map(firm => {
        const data = firmData[firm._id.toString()] || { inflows: 0, outflows: 0, netCashFlow: 0 };
        return {
            firmId: firm._id,
            firmName: firm.name,
            cashInflows: data.inflows,
            cashInflowsSAR: toSAR(data.inflows),
            cashOutflows: data.outflows,
            cashOutflowsSAR: toSAR(data.outflows),
            netCashFlow: data.netCashFlow,
            netCashFlowSAR: toSAR(data.netCashFlow)
        };
    });

    res.status(200).json({
        success: true,
        report: 'consolidated-cash-flow',
        period: { startDate: validStartDate, endDate: validEndDate },
        currency: validCurrency,
        generatedAt: new Date(),
        firms: firmBreakdown,
        summary: {
            totalCashInflows: totalInflows,
            totalCashInflowsSAR: toSAR(totalInflows),
            totalCashOutflows: totalOutflows,
            totalCashOutflowsSAR: toSAR(totalOutflows),
            netCashFlow,
            netCashFlowSAR: toSAR(netCashFlow),
            firmCount: firms.length
        }
    });
});

/**
 * Get Company Comparison Report
 * GET /api/reports/consolidated/comparison
 * Query params: firmIds[], startDate, endDate, metrics[]
 */
exports.getCompanyComparison = asyncHandler(async (req, res) => {
    const { firmIds, startDate, endDate, metrics } = req.query;
    const userId = req.userId || req.userID;

    // Validate date parameters
    const validStartDate = validateDate(startDate);
    const validEndDate = validateDate(endDate);

    if (!validStartDate || !validEndDate) {
        return res.status(400).json({
            success: false,
            error: 'Valid start date and end date are required'
        });
    }

    // Get firms user has access to
    const userFirms = await getUserFirms(userId);
    const userFirmIds = userFirms.map(f => f._id.toString());

    // Sanitize and validate firm IDs with IDOR protection
    const selectedFirmIds = sanitizeFirmIds(firmIds, userFirmIds);

    if (selectedFirmIds.length === 0) {
        return res.status(403).json({
            success: false,
            error: 'No accessible firms found'
        });
    }

    const selectedObjectIds = selectedFirmIds.map(id => mongoose.Types.ObjectId.createFromHexString(id));

    // Validate and sanitize metrics
    const allowedMetrics = ['revenue', 'expenses', 'profit', 'profitMargin', 'clientCount', 'invoiceCount'];
    const requestedMetrics = metrics && Array.isArray(metrics)
        ? metrics.filter(m => allowedMetrics.includes(m))
        : allowedMetrics;

    // Get account types
    const [incomeAccounts, expenseAccounts] = await Promise.all([
        Account.find({ type: 'Income', isActive: true }).lean(),
        Account.find({ type: 'Expense', isActive: true }).lean()
    ]);

    const incomeAccountIds = incomeAccounts.map(a => a._id);
    const expenseAccountIds = expenseAccounts.map(a => a._id);

    // Aggregate financial data by firm
    const financialData = await GeneralLedger.aggregate([
        {
            $match: {
                status: 'posted',
                firmId: { $in: selectedObjectIds },
                transactionDate: {
                    $gte: validStartDate,
                    $lte: validEndDate
                }
            }
        },
        {
            $group: {
                _id: '$firmId',
                revenue: {
                    $sum: {
                        $cond: [
                            { $in: ['$creditAccountId', incomeAccountIds] },
                            '$amount',
                            0
                        ]
                    }
                },
                expenses: {
                    $sum: {
                        $cond: [
                            { $in: ['$debitAccountId', expenseAccountIds] },
                            '$amount',
                            0
                        ]
                    }
                }
            }
        }
    ]);

    // Get invoice and client counts
    const invoiceCounts = await Invoice.aggregate([
        {
            $match: {
                firmId: { $in: selectedObjectIds },
                issueDate: {
                    $gte: validStartDate,
                    $lte: validEndDate
                },
                status: { $nin: ['draft', 'cancelled', 'void'] }
            }
        },
        {
            $group: {
                _id: '$firmId',
                invoiceCount: { $sum: 1 },
                totalRevenue: { $sum: '$totalAmount' },
                clientIds: { $addToSet: '$clientId' }
            }
        }
    ]);

    // Build comparison data
    const firmMetrics = {};

    financialData.forEach(data => {
        const firmId = data._id.toString();
        firmMetrics[firmId] = {
            revenue: data.revenue,
            expenses: data.expenses,
            profit: data.revenue - data.expenses,
            profitMargin: data.revenue > 0
                ? ((data.revenue - data.expenses) / data.revenue * 100)
                : 0
        };
    });

    invoiceCounts.forEach(data => {
        const firmId = data._id.toString();
        if (!firmMetrics[firmId]) {
            firmMetrics[firmId] = { revenue: 0, expenses: 0, profit: 0, profitMargin: 0 };
        }
        firmMetrics[firmId].invoiceCount = data.invoiceCount;
        firmMetrics[firmId].clientCount = data.clientIds.length;
    });

    // Get firm details
    const firms = await Firm.find({ _id: { $in: selectedObjectIds } })
        .select('_id name')
        .lean();

    const comparison = firms.map(firm => {
        const metrics = firmMetrics[firm._id.toString()] || {
            revenue: 0,
            expenses: 0,
            profit: 0,
            profitMargin: 0,
            invoiceCount: 0,
            clientCount: 0
        };

        return {
            firmId: firm._id,
            firmName: firm.name,
            revenue: metrics.revenue,
            revenueSAR: toSAR(metrics.revenue),
            expenses: metrics.expenses,
            expensesSAR: toSAR(metrics.expenses),
            profit: metrics.profit,
            profitSAR: toSAR(metrics.profit),
            profitMargin: metrics.profitMargin.toFixed(2) + '%',
            invoiceCount: metrics.invoiceCount || 0,
            clientCount: metrics.clientCount || 0
        };
    });

    // Calculate rankings
    const rankings = {
        byRevenue: [...comparison].sort((a, b) => b.revenue - a.revenue),
        byProfit: [...comparison].sort((a, b) => b.profit - a.profit),
        byProfitMargin: [...comparison].sort((a, b) =>
            parseFloat(b.profitMargin) - parseFloat(a.profitMargin)
        )
    };

    res.status(200).json({
        success: true,
        report: 'consolidated-comparison',
        period: { startDate: validStartDate, endDate: validEndDate },
        generatedAt: new Date(),
        metrics: requestedMetrics,
        comparison,
        rankings: {
            topByRevenue: rankings.byRevenue.slice(0, 5).map(f => ({
                firmId: f.firmId,
                firmName: f.firmName,
                revenue: f.revenue,
                revenueSAR: f.revenueSAR
            })),
            topByProfit: rankings.byProfit.slice(0, 5).map(f => ({
                firmId: f.firmId,
                firmName: f.firmName,
                profit: f.profit,
                profitSAR: f.profitSAR
            })),
            topByProfitMargin: rankings.byProfitMargin.slice(0, 5).map(f => ({
                firmId: f.firmId,
                firmName: f.firmName,
                profitMargin: f.profitMargin
            }))
        },
        summary: {
            firmCount: firms.length
        }
    });
});

/**
 * Get Elimination Entries
 * GET /api/reports/consolidated/eliminations
 * Query params: firmIds[], startDate, endDate
 */
exports.getEliminationEntries = asyncHandler(async (req, res) => {
    const { firmIds, startDate, endDate } = req.query;
    const userId = req.userId || req.userID;

    // Get firms user has access to
    const userFirms = await getUserFirms(userId);
    const userFirmIds = userFirms.map(f => f._id.toString());

    // Sanitize and validate firm IDs with IDOR protection
    const selectedFirmIds = sanitizeFirmIds(firmIds, userFirmIds);

    if (selectedFirmIds.length === 0) {
        return res.status(403).json({
            success: false,
            error: 'No accessible firms found'
        });
    }

    const selectedObjectIds = selectedFirmIds.map(id => mongoose.Types.ObjectId.createFromHexString(id));

    const query = {
        $or: [
            { sourceFirmId: { $in: selectedObjectIds } },
            { targetFirmId: { $in: selectedObjectIds } }
        ],
        status: { $in: ['confirmed', 'reconciled'] }
    };

    // Validate and add date range if provided
    if (startDate && endDate) {
        const validStartDate = validateDate(startDate);
        const validEndDate = validateDate(endDate);

        if (validStartDate && validEndDate) {
            query.transactionDate = {
                $gte: validStartDate,
                $lte: validEndDate
            };
        }
    }

    const eliminations = await InterCompanyTransaction.find(query)
        .populate('sourceFirmId', 'name')
        .populate('targetFirmId', 'name')
        .populate('createdBy', 'name email')
        .populate('reconciledBy', 'name email')
        .sort({ transactionDate: -1 })
        .lean();

    // Calculate summary by transaction type
    const summary = {
        byType: {},
        totalAmount: 0,
        count: eliminations.length
    };

    eliminations.forEach(elim => {
        if (!summary.byType[elim.transactionType]) {
            summary.byType[elim.transactionType] = {
                count: 0,
                amount: 0
            };
        }
        summary.byType[elim.transactionType].count++;
        summary.byType[elim.transactionType].amount += elim.amount;
        summary.totalAmount += elim.amount;
    });

    // Format entries
    const entries = eliminations.map(elim => ({
        id: elim._id,
        transactionDate: elim.transactionDate,
        transactionType: elim.transactionType,
        sourceFirm: {
            id: elim.sourceFirmId._id,
            name: elim.sourceFirmId.name
        },
        targetFirm: {
            id: elim.targetFirmId._id,
            name: elim.targetFirmId.name
        },
        amount: elim.amount,
        amountSAR: toSAR(elim.amount),
        currency: elim.currency,
        reference: elim.reference,
        description: elim.description,
        status: elim.status,
        sourceDocument: elim.sourceDocumentType ? {
            type: elim.sourceDocumentType,
            id: elim.sourceDocumentId
        } : null,
        reconciledAt: elim.reconciledAt,
        reconciledBy: elim.reconciledBy ? {
            id: elim.reconciledBy._id,
            name: elim.reconciledBy.name
        } : null
    }));

    res.status(200).json({
        success: true,
        report: 'elimination-entries',
        period: startDate && endDate ? { startDate, endDate } : null,
        generatedAt: new Date(),
        entries,
        summary: {
            totalCount: summary.count,
            totalAmount: summary.totalAmount,
            totalAmountSAR: toSAR(summary.totalAmount),
            byType: Object.entries(summary.byType).map(([type, data]) => ({
                type,
                count: data.count,
                amount: data.amount,
                amountSAR: toSAR(data.amount)
            }))
        }
    });
});

/**
 * Create Manual Elimination Entry
 * POST /api/reports/consolidated/eliminations
 * Body: { sourceFirmId, targetFirmId, transactionType, amount, currency, transactionDate, reference, description }
 */
exports.createManualElimination = asyncHandler(async (req, res) => {
    const userId = req.userId || req.userID;

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'sourceFirmId',
        'targetFirmId',
        'transactionType',
        'amount',
        'currency',
        'transactionDate',
        'reference',
        'description'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    const {
        sourceFirmId,
        targetFirmId,
        transactionType,
        amount,
        currency,
        transactionDate,
        reference,
        description
    } = sanitizedData;

    // Validate required fields
    if (!sourceFirmId || !targetFirmId || !transactionType || !amount || !transactionDate) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: sourceFirmId, targetFirmId, transactionType, amount, transactionDate'
        });
    }

    // Sanitize ObjectIds to prevent injection
    const sanitizedSourceFirmId = sanitizeObjectId(sourceFirmId);
    const sanitizedTargetFirmId = sanitizeObjectId(targetFirmId);

    if (!sanitizedSourceFirmId || !sanitizedTargetFirmId) {
        return res.status(400).json({
            success: false,
            error: 'Invalid firm ID format'
        });
    }

    // Validate transactionType
    const validTransactionTypes = ['sale', 'loan', 'transfer', 'service', 'other'];
    if (!validTransactionTypes.includes(transactionType)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid transaction type'
        });
    }

    // Validate amount
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
            success: false,
            error: 'Amount must be a positive number'
        });
    }

    // Validate date
    const validTransactionDate = validateDate(transactionDate);
    if (!validTransactionDate) {
        return res.status(400).json({
            success: false,
            error: 'Invalid transaction date format'
        });
    }

    // Validate currency
    const validCurrency = validateCurrency(currency);

    // IDOR Protection - Verify user has access to both firms
    const userFirms = await getUserFirms(userId);
    const userFirmIds = userFirms.map(f => f._id.toString());

    if (!userFirmIds.includes(sanitizedSourceFirmId.toString()) ||
        !userFirmIds.includes(sanitizedTargetFirmId.toString())) {
        return res.status(403).json({
            success: false,
            error: 'You do not have access to one or both of the specified firms'
        });
    }

    // Validate firms exist and user has access
    const [sourceFirm, targetFirm] = await Promise.all([
        Firm.findOne({ _id: sanitizedSourceFirmId }).select('name'),
        Firm.findOne({ _id: sanitizedTargetFirmId }).select('name')
    ]);

    if (!sourceFirm || !targetFirm) {
        return res.status(404).json({
            success: false,
            error: 'One or both firms not found'
        });
    }

    // Sanitize string inputs to prevent injection
    const sanitizedReference = reference ? String(reference).substring(0, 100) : undefined;
    const sanitizedDescription = description ? String(description).substring(0, 500) : undefined;

    // Create elimination entry with sanitized and validated data
    const elimination = new InterCompanyTransaction({
        sourceFirmId: sanitizedSourceFirmId,
        targetFirmId: sanitizedTargetFirmId,
        transactionType,
        amount: numericAmount,
        currency: validCurrency,
        exchangeRate: 1,
        transactionDate: validTransactionDate,
        reference: sanitizedReference,
        description: sanitizedDescription,
        status: 'confirmed',
        createdBy: sanitizeObjectId(userId),
        confirmedBy: sanitizeObjectId(userId),
        confirmedAt: new Date()
    });

    await elimination.save();

    res.status(201).json({
        success: true,
        message: 'Manual elimination entry created successfully',
        data: {
            id: elimination._id,
            sourceFirm: {
                id: sanitizedSourceFirmId,
                name: sourceFirm.name
            },
            targetFirm: {
                id: sanitizedTargetFirmId,
                name: targetFirm.name
            },
            transactionType: elimination.transactionType,
            amount: elimination.amount,
            amountSAR: toSAR(elimination.amount),
            currency: elimination.currency,
            transactionDate: elimination.transactionDate,
            reference: elimination.reference,
            description: elimination.description,
            status: elimination.status,
            createdAt: elimination.createdAt
        }
    });
});

/**
 * Get Auto-Calculated Intercompany Eliminations
 * GET /api/reports/consolidated/auto-eliminations
 * Query params: firmIds[], asOfDate
 *
 * This automatically identifies and calculates intercompany balances that should
 * be eliminated in consolidated financial statements.
 */
exports.getAutoEliminations = asyncHandler(async (req, res) => {
    const { firmIds, asOfDate } = req.query;
    const userId = req.userId || req.userID;

    // Validate date
    const upToDate = asOfDate ? validateDate(asOfDate) : new Date();
    if (!upToDate) {
        return res.status(400).json({
            success: false,
            error: 'Invalid date format | تنسيق التاريخ غير صالح'
        });
    }

    // Get firms user has access to
    const userFirms = await getUserFirms(userId);
    const userFirmIds = userFirms.map(f => f._id.toString());

    // Sanitize and validate firm IDs
    const selectedFirmIds = sanitizeFirmIds(firmIds, userFirmIds);

    if (selectedFirmIds.length < 2) {
        return res.status(400).json({
            success: false,
            error: 'At least 2 firms are required for consolidation | مطلوب شركتين على الأقل للتوحيد'
        });
    }

    const selectedObjectIds = selectedFirmIds.map(id =>
        mongoose.Types.ObjectId.createFromHexString(id)
    );

    // Get all intercompany transactions between selected firms
    const balances = await InterCompanyTransaction.find({
        $or: [
            { sourceFirmId: { $in: selectedObjectIds }, targetFirmId: { $in: selectedObjectIds } },
            { targetFirmId: { $in: selectedObjectIds }, sourceFirmId: { $in: selectedObjectIds } }
        ],
        status: { $in: ['confirmed', 'reconciled'] },
        transactionDate: { $lte: upToDate }
    })
        .populate('sourceFirmId', 'name')
        .populate('targetFirmId', 'name')
        .lean();

    // Group by firm pairs and calculate net positions
    const pairBalances = new Map();

    for (const balance of balances) {
        // Create consistent key (smaller ID first)
        const ids = [balance.sourceFirmId._id.toString(), balance.targetFirmId._id.toString()].sort();
        const key = ids.join('-');

        if (!pairBalances.has(key)) {
            pairBalances.set(key, {
                firm1: ids[0] === balance.sourceFirmId._id.toString() ? balance.sourceFirmId : balance.targetFirmId,
                firm2: ids[1] === balance.sourceFirmId._id.toString() ? balance.sourceFirmId : balance.targetFirmId,
                receivables: 0,
                payables: 0,
                transactions: []
            });
        }

        const pair = pairBalances.get(key);

        // Determine if this is a receivable or payable from firm1's perspective
        if (balance.sourceFirmId._id.toString() === ids[0]) {
            pair.receivables += balance.amount;
        } else {
            pair.payables += balance.amount;
        }

        pair.transactions.push({
            id: balance._id,
            type: balance.transactionType,
            amount: balance.amount,
            currency: balance.currency,
            description: balance.description
        });
    }

    // Calculate eliminations
    const eliminations = [];
    let totalEliminationAmount = 0;

    for (const [, pair] of pairBalances) {
        const netBalance = pair.receivables - pair.payables;
        const eliminationAmount = Math.min(pair.receivables, pair.payables);

        if (eliminationAmount > 0) {
            eliminations.push({
                firm1: { id: pair.firm1._id, name: pair.firm1.name },
                firm2: { id: pair.firm2._id, name: pair.firm2.name },
                firm1Receivables: pair.receivables,
                firm1ReceivablesSAR: toSAR(pair.receivables),
                firm2Receivables: pair.payables,
                firm2ReceivablesSAR: toSAR(pair.payables),
                eliminationAmount,
                eliminationAmountSAR: toSAR(eliminationAmount),
                netBalance,
                netBalanceSAR: toSAR(netBalance),
                netBalanceOwedTo: netBalance > 0 ? pair.firm1.name : netBalance < 0 ? pair.firm2.name : 'None',
                transactionCount: pair.transactions.length
            });

            totalEliminationAmount += eliminationAmount;
        }
    }

    // Get firm names for response
    const firms = await Firm.find({ _id: { $in: selectedObjectIds } })
        .select('_id name')
        .lean();

    res.status(200).json({
        success: true,
        report: 'auto-eliminations',
        asOfDate: upToDate,
        generatedAt: new Date(),
        consolidatedFirms: firms.map(f => ({ id: f._id, name: f.name })),
        eliminations,
        summary: {
            totalPairs: eliminations.length,
            totalEliminationAmount,
            totalEliminationAmountSAR: toSAR(totalEliminationAmount),
            description: 'These amounts should be eliminated when preparing consolidated financial statements | يجب حذف هذه المبالغ عند إعداد القوائم المالية الموحدة'
        }
    });
});

/**
 * Generate Full Consolidated Financial Statement Package
 * GET /api/reports/consolidated/full-statement
 * Query params: firmIds[], startDate, endDate, currency
 *
 * Generates a complete consolidated financial statement package including:
 * - Consolidated Balance Sheet
 * - Consolidated Profit & Loss
 * - Intercompany Eliminations Schedule
 */
exports.getFullConsolidatedStatement = asyncHandler(async (req, res) => {
    const { firmIds, startDate, endDate, currency = 'SAR' } = req.query;
    const userId = req.userId || req.userID;

    // Validate dates
    const validStartDate = validateDate(startDate);
    const validEndDate = validateDate(endDate);

    if (!validStartDate || !validEndDate) {
        return res.status(400).json({
            success: false,
            error: 'Valid start date and end date are required | تاريخ البداية والنهاية مطلوبان'
        });
    }

    // Validate currency
    const validCurrency = validateCurrency(currency);

    // Get firms user has access to
    const userFirms = await getUserFirms(userId);
    const userFirmIds = userFirms.map(f => f._id.toString());

    // Sanitize and validate firm IDs
    const selectedFirmIds = sanitizeFirmIds(firmIds, userFirmIds);

    if (selectedFirmIds.length === 0) {
        return res.status(403).json({
            success: false,
            error: 'No accessible firms found | لم يتم العثور على شركات متاحة'
        });
    }

    const selectedObjectIds = selectedFirmIds.map(id =>
        mongoose.Types.ObjectId.createFromHexString(id)
    );

    // Get all accounts by type
    const accounts = await Account.find({ isActive: true }).lean();
    const accountsByType = {
        Asset: accounts.filter(a => a.type === 'Asset'),
        Liability: accounts.filter(a => a.type === 'Liability'),
        Equity: accounts.filter(a => a.type === 'Equity'),
        Income: accounts.filter(a => a.type === 'Income'),
        Expense: accounts.filter(a => a.type === 'Expense')
    };

    // Aggregate all GL entries for the period
    const allEntries = await GeneralLedger.aggregate([
        {
            $match: {
                status: 'posted',
                firmId: { $in: selectedObjectIds },
                transactionDate: { $lte: validEndDate }
            }
        },
        {
            $group: {
                _id: null,
                debitsByAccount: {
                    $push: {
                        accountId: '$debitAccountId',
                        amount: '$amount',
                        date: '$transactionDate'
                    }
                },
                creditsByAccount: {
                    $push: {
                        accountId: '$creditAccountId',
                        amount: '$amount',
                        date: '$transactionDate'
                    }
                }
            }
        }
    ]);

    // Build account balances
    const balances = {};
    if (allEntries.length > 0) {
        const { debitsByAccount, creditsByAccount } = allEntries[0];

        // Process debits
        for (const entry of debitsByAccount) {
            const accountId = entry.accountId?.toString();
            if (!accountId) continue;

            if (!balances[accountId]) {
                balances[accountId] = { debits: 0, credits: 0, periodDebits: 0, periodCredits: 0 };
            }
            balances[accountId].debits += entry.amount;

            if (entry.date >= validStartDate && entry.date <= validEndDate) {
                balances[accountId].periodDebits += entry.amount;
            }
        }

        // Process credits
        for (const entry of creditsByAccount) {
            const accountId = entry.accountId?.toString();
            if (!accountId) continue;

            if (!balances[accountId]) {
                balances[accountId] = { debits: 0, credits: 0, periodDebits: 0, periodCredits: 0 };
            }
            balances[accountId].credits += entry.amount;

            if (entry.date >= validStartDate && entry.date <= validEndDate) {
                balances[accountId].periodCredits += entry.amount;
            }
        }
    }

    // Calculate balances by account type
    const calculateTypeBalance = (typeAccounts, isNormalDebit = true) => {
        let total = 0;
        const details = [];

        for (const account of typeAccounts) {
            const accountId = account._id.toString();
            const balance = balances[accountId] || { debits: 0, credits: 0 };
            const netBalance = isNormalDebit
                ? balance.debits - balance.credits
                : balance.credits - balance.debits;

            if (netBalance !== 0) {
                total += netBalance;
                details.push({
                    accountCode: account.code,
                    accountName: account.name,
                    accountNameAr: account.nameAr,
                    subType: account.subType,
                    balance: netBalance,
                    balanceSAR: toSAR(netBalance)
                });
            }
        }

        return { total, totalSAR: toSAR(total), details };
    };

    // Calculate period P&L
    const calculatePeriodPL = (typeAccounts, isNormalDebit = true) => {
        let total = 0;
        for (const account of typeAccounts) {
            const accountId = account._id.toString();
            const balance = balances[accountId] || { periodDebits: 0, periodCredits: 0 };
            const netBalance = isNormalDebit
                ? balance.periodDebits - balance.periodCredits
                : balance.periodCredits - balance.periodDebits;
            total += netBalance;
        }
        return total;
    };

    // Build financial statements
    const assets = calculateTypeBalance(accountsByType.Asset, true);
    const liabilities = calculateTypeBalance(accountsByType.Liability, false);
    const equity = calculateTypeBalance(accountsByType.Equity, false);
    const income = calculatePeriodPL(accountsByType.Income, false);
    const expenses = calculatePeriodPL(accountsByType.Expense, true);

    // Get intercompany eliminations
    const icEliminations = await InterCompanyTransaction.aggregate([
        {
            $match: {
                $or: [
                    { sourceFirmId: { $in: selectedObjectIds } },
                    { targetFirmId: { $in: selectedObjectIds } }
                ],
                transactionDate: { $lte: validEndDate },
                status: { $in: ['confirmed', 'reconciled'] }
            }
        },
        {
            $group: {
                _id: '$transactionType',
                totalAmount: { $sum: '$amount' },
                count: { $sum: 1 }
            }
        }
    ]);

    // Calculate elimination adjustments
    let assetEliminations = 0;
    let liabilityEliminations = 0;
    let incomeEliminations = 0;
    let expenseEliminations = 0;

    for (const elim of icEliminations) {
        if (elim._id === 'loan') {
            assetEliminations += elim.totalAmount;
            liabilityEliminations += elim.totalAmount;
        } else if (elim._id === 'sale' || elim._id === 'service') {
            incomeEliminations += elim.totalAmount;
            expenseEliminations += elim.totalAmount;
        }
    }

    // Calculate consolidated figures
    const consolidatedAssets = assets.total - assetEliminations;
    const consolidatedLiabilities = liabilities.total - liabilityEliminations;
    const consolidatedIncome = income - incomeEliminations;
    const consolidatedExpenses = expenses - expenseEliminations;
    const consolidatedNetIncome = consolidatedIncome - consolidatedExpenses;
    const consolidatedEquity = equity.total + consolidatedNetIncome;

    // Get firms for response
    const firms = await Firm.find({ _id: { $in: selectedObjectIds } })
        .select('_id name')
        .lean();

    res.status(200).json({
        success: true,
        report: 'full-consolidated-statement',
        period: { startDate: validStartDate, endDate: validEndDate },
        currency: validCurrency,
        generatedAt: new Date(),
        consolidatedFirms: firms.map(f => ({ id: f._id, name: f.name })),

        // Consolidated Balance Sheet
        balanceSheet: {
            asOfDate: validEndDate,
            assets: {
                preElimination: assets.total,
                preEliminationSAR: assets.totalSAR,
                eliminations: assetEliminations,
                eliminationsSAR: toSAR(assetEliminations),
                consolidated: consolidatedAssets,
                consolidatedSAR: toSAR(consolidatedAssets),
                details: assets.details
            },
            liabilities: {
                preElimination: liabilities.total,
                preEliminationSAR: liabilities.totalSAR,
                eliminations: liabilityEliminations,
                eliminationsSAR: toSAR(liabilityEliminations),
                consolidated: consolidatedLiabilities,
                consolidatedSAR: toSAR(consolidatedLiabilities),
                details: liabilities.details
            },
            equity: {
                preElimination: equity.total,
                preEliminationSAR: equity.totalSAR,
                retainedEarnings: consolidatedNetIncome,
                retainedEarningsSAR: toSAR(consolidatedNetIncome),
                consolidated: consolidatedEquity,
                consolidatedSAR: toSAR(consolidatedEquity),
                details: equity.details
            },
            isBalanced: Math.abs(consolidatedAssets - (consolidatedLiabilities + consolidatedEquity)) < 1
        },

        // Consolidated Profit & Loss
        profitLoss: {
            income: {
                preElimination: income,
                preEliminationSAR: toSAR(income),
                eliminations: incomeEliminations,
                eliminationsSAR: toSAR(incomeEliminations),
                consolidated: consolidatedIncome,
                consolidatedSAR: toSAR(consolidatedIncome)
            },
            expenses: {
                preElimination: expenses,
                preEliminationSAR: toSAR(expenses),
                eliminations: expenseEliminations,
                eliminationsSAR: toSAR(expenseEliminations),
                consolidated: consolidatedExpenses,
                consolidatedSAR: toSAR(consolidatedExpenses)
            },
            netIncome: {
                preElimination: income - expenses,
                preEliminationSAR: toSAR(income - expenses),
                consolidated: consolidatedNetIncome,
                consolidatedSAR: toSAR(consolidatedNetIncome)
            },
            profitMargin: consolidatedIncome > 0
                ? ((consolidatedNetIncome / consolidatedIncome) * 100).toFixed(2) + '%'
                : '0%'
        },

        // Elimination Schedule
        eliminationSchedule: {
            summary: icEliminations.map(e => ({
                type: e._id,
                count: e.count,
                totalAmount: e.totalAmount,
                totalAmountSAR: toSAR(e.totalAmount)
            })),
            balanceSheetImpact: {
                assetReduction: assetEliminations,
                assetReductionSAR: toSAR(assetEliminations),
                liabilityReduction: liabilityEliminations,
                liabilityReductionSAR: toSAR(liabilityEliminations)
            },
            profitLossImpact: {
                incomeReduction: incomeEliminations,
                incomeReductionSAR: toSAR(incomeEliminations),
                expenseReduction: expenseEliminations,
                expenseReductionSAR: toSAR(expenseEliminations)
            }
        },

        // Summary metrics
        summary: {
            firmCount: firms.length,
            totalConsolidatedAssets: consolidatedAssets,
            totalConsolidatedAssetsSAR: toSAR(consolidatedAssets),
            totalConsolidatedLiabilities: consolidatedLiabilities,
            totalConsolidatedLiabilitiesSAR: toSAR(consolidatedLiabilities),
            totalConsolidatedEquity: consolidatedEquity,
            totalConsolidatedEquitySAR: toSAR(consolidatedEquity),
            consolidatedNetIncome,
            consolidatedNetIncomeSAR: toSAR(consolidatedNetIncome),
            returnOnEquity: consolidatedEquity > 0
                ? ((consolidatedNetIncome / consolidatedEquity) * 100).toFixed(2) + '%'
                : '0%',
            debtToEquityRatio: consolidatedEquity > 0
                ? (consolidatedLiabilities / consolidatedEquity).toFixed(2)
                : 'N/A'
        }
    });
});
