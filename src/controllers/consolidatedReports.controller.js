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

    // Validate firms exist
    const [sourceFirm, targetFirm] = await Promise.all([
        Firm.findById(sanitizedSourceFirmId).select('name'),
        Firm.findById(sanitizedTargetFirmId).select('name')
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
