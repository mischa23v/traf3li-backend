const GeneralLedger = require('../models/generalLedger.model');
const Account = require('../models/account.model');
const Invoice = require('../models/invoice.model');
const asyncHandler = require('../utils/asyncHandler');
const mongoose = require('mongoose');
const { toSAR, formatSAR } = require('../utils/currency');

/**
 * Get Profit & Loss Report
 * GET /api/reports/profit-loss
 * Query params: startDate, endDate, caseId
 */
const getProfitLossReport = asyncHandler(async (req, res) => {
    const { startDate, endDate, caseId } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({
            success: false,
            error: 'Start date and end date are required'
        });
    }

    const matchStage = {
        status: 'posted',
        transactionDate: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        }
    };

    if (caseId) {
        matchStage.caseId = mongoose.Types.ObjectId.createFromHexString(caseId);
    }

    // Get all accounts by type
    const incomeAccounts = await Account.find({ type: 'Income', isActive: true });
    const expenseAccounts = await Account.find({ type: 'Expense', isActive: true });

    // Calculate income totals
    const incomeDetails = [];
    let totalIncome = 0;

    for (const account of incomeAccounts) {
        const result = await GeneralLedger.aggregate([
            {
                $match: {
                    ...matchStage,
                    $or: [
                        { creditAccountId: account._id },
                        { debitAccountId: account._id }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    credits: {
                        $sum: {
                            $cond: [{ $eq: ['$creditAccountId', account._id] }, '$amount', 0]
                        }
                    },
                    debits: {
                        $sum: {
                            $cond: [{ $eq: ['$debitAccountId', account._id] }, '$amount', 0]
                        }
                    }
                }
            }
        ]);

        const credits = result[0]?.credits || 0;
        const debits = result[0]?.debits || 0;
        const balance = credits - debits; // Income has credit normal balance

        if (balance !== 0) {
            incomeDetails.push({
                accountCode: account.code,
                accountName: account.name,
                accountNameAr: account.nameAr,
                balance,
                balanceSAR: toSAR(balance)
            });
            totalIncome += balance;
        }
    }

    // Calculate expense totals
    const expenseDetails = [];
    let totalExpenses = 0;

    for (const account of expenseAccounts) {
        const result = await GeneralLedger.aggregate([
            {
                $match: {
                    ...matchStage,
                    $or: [
                        { creditAccountId: account._id },
                        { debitAccountId: account._id }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    credits: {
                        $sum: {
                            $cond: [{ $eq: ['$creditAccountId', account._id] }, '$amount', 0]
                        }
                    },
                    debits: {
                        $sum: {
                            $cond: [{ $eq: ['$debitAccountId', account._id] }, '$amount', 0]
                        }
                    }
                }
            }
        ]);

        const credits = result[0]?.credits || 0;
        const debits = result[0]?.debits || 0;
        const balance = debits - credits; // Expense has debit normal balance

        if (balance !== 0) {
            expenseDetails.push({
                accountCode: account.code,
                accountName: account.name,
                accountNameAr: account.nameAr,
                balance,
                balanceSAR: toSAR(balance)
            });
            totalExpenses += balance;
        }
    }

    // Calculate net profit/loss
    const netProfit = totalIncome - totalExpenses;

    res.status(200).json({
        success: true,
        report: 'profit-loss',
        period: { startDate, endDate },
        caseId: caseId || null,
        generatedAt: new Date(),
        data: {
            income: {
                accounts: incomeDetails.sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
                total: totalIncome,
                totalSAR: toSAR(totalIncome)
            },
            expenses: {
                accounts: expenseDetails.sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
                total: totalExpenses,
                totalSAR: toSAR(totalExpenses)
            },
            summary: {
                totalIncome,
                totalIncomeSAR: toSAR(totalIncome),
                totalExpenses,
                totalExpensesSAR: toSAR(totalExpenses),
                netProfit,
                netProfitSAR: toSAR(netProfit),
                profitMargin: totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(2) + '%' : '0%'
            }
        }
    });
});

/**
 * Get Balance Sheet Report
 * GET /api/reports/balance-sheet
 * Query params: asOfDate
 */
const getBalanceSheetReport = asyncHandler(async (req, res) => {
    const { asOfDate } = req.query;

    const upToDate = asOfDate ? new Date(asOfDate) : new Date();

    const matchStage = {
        status: 'posted',
        transactionDate: { $lte: upToDate }
    };

    // Get accounts by type
    const assetAccounts = await Account.find({ type: 'Asset', isActive: true });
    const liabilityAccounts = await Account.find({ type: 'Liability', isActive: true });
    const equityAccounts = await Account.find({ type: 'Equity', isActive: true });

    // Calculate asset balances
    const assetDetails = [];
    let totalAssets = 0;

    for (const account of assetAccounts) {
        const result = await GeneralLedger.aggregate([
            {
                $match: {
                    ...matchStage,
                    $or: [
                        { creditAccountId: account._id },
                        { debitAccountId: account._id }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    credits: {
                        $sum: {
                            $cond: [{ $eq: ['$creditAccountId', account._id] }, '$amount', 0]
                        }
                    },
                    debits: {
                        $sum: {
                            $cond: [{ $eq: ['$debitAccountId', account._id] }, '$amount', 0]
                        }
                    }
                }
            }
        ]);

        const credits = result[0]?.credits || 0;
        const debits = result[0]?.debits || 0;
        const balance = debits - credits; // Assets have debit normal balance

        if (balance !== 0) {
            assetDetails.push({
                accountCode: account.code,
                accountName: account.name,
                accountNameAr: account.nameAr,
                subType: account.subType,
                balance,
                balanceSAR: toSAR(balance)
            });
            totalAssets += balance;
        }
    }

    // Calculate liability balances
    const liabilityDetails = [];
    let totalLiabilities = 0;

    for (const account of liabilityAccounts) {
        const result = await GeneralLedger.aggregate([
            {
                $match: {
                    ...matchStage,
                    $or: [
                        { creditAccountId: account._id },
                        { debitAccountId: account._id }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    credits: {
                        $sum: {
                            $cond: [{ $eq: ['$creditAccountId', account._id] }, '$amount', 0]
                        }
                    },
                    debits: {
                        $sum: {
                            $cond: [{ $eq: ['$debitAccountId', account._id] }, '$amount', 0]
                        }
                    }
                }
            }
        ]);

        const credits = result[0]?.credits || 0;
        const debits = result[0]?.debits || 0;
        const balance = credits - debits; // Liabilities have credit normal balance

        if (balance !== 0) {
            liabilityDetails.push({
                accountCode: account.code,
                accountName: account.name,
                accountNameAr: account.nameAr,
                subType: account.subType,
                balance,
                balanceSAR: toSAR(balance)
            });
            totalLiabilities += balance;
        }
    }

    // Calculate equity balances
    const equityDetails = [];
    let totalEquity = 0;

    for (const account of equityAccounts) {
        const result = await GeneralLedger.aggregate([
            {
                $match: {
                    ...matchStage,
                    $or: [
                        { creditAccountId: account._id },
                        { debitAccountId: account._id }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    credits: {
                        $sum: {
                            $cond: [{ $eq: ['$creditAccountId', account._id] }, '$amount', 0]
                        }
                    },
                    debits: {
                        $sum: {
                            $cond: [{ $eq: ['$debitAccountId', account._id] }, '$amount', 0]
                        }
                    }
                }
            }
        ]);

        const credits = result[0]?.credits || 0;
        const debits = result[0]?.debits || 0;
        const balance = credits - debits; // Equity has credit normal balance

        if (balance !== 0) {
            equityDetails.push({
                accountCode: account.code,
                accountName: account.name,
                accountNameAr: account.nameAr,
                subType: account.subType,
                balance,
                balanceSAR: toSAR(balance)
            });
            totalEquity += balance;
        }
    }

    // Verify: Assets = Liabilities + Equity
    const isBalanced = totalAssets === (totalLiabilities + totalEquity);

    res.status(200).json({
        success: true,
        report: 'balance-sheet',
        asOfDate: upToDate,
        generatedAt: new Date(),
        data: {
            assets: {
                accounts: assetDetails.sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
                total: totalAssets,
                totalSAR: toSAR(totalAssets)
            },
            liabilities: {
                accounts: liabilityDetails.sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
                total: totalLiabilities,
                totalSAR: toSAR(totalLiabilities)
            },
            equity: {
                accounts: equityDetails.sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
                total: totalEquity,
                totalSAR: toSAR(totalEquity)
            },
            summary: {
                totalAssets,
                totalAssetsSAR: toSAR(totalAssets),
                totalLiabilities,
                totalLiabilitiesSAR: toSAR(totalLiabilities),
                totalEquity,
                totalEquitySAR: toSAR(totalEquity),
                totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
                totalLiabilitiesAndEquitySAR: toSAR(totalLiabilities + totalEquity),
                isBalanced
            }
        }
    });
});

/**
 * Get Case Profitability Report
 * GET /api/reports/case-profitability
 * Query params: startDate, endDate, caseId
 */
const getCaseProfitabilityReport = asyncHandler(async (req, res) => {
    const { startDate, endDate, caseId } = req.query;

    const matchStage = {
        status: 'posted',
        caseId: { $ne: null }
    };

    if (startDate && endDate) {
        matchStage.transactionDate = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    if (caseId) {
        matchStage.caseId = mongoose.Types.ObjectId.createFromHexString(caseId);
    }

    // Get income and expense account IDs
    const incomeAccounts = await Account.find({ type: 'Income' }).select('_id');
    const expenseAccounts = await Account.find({ type: 'Expense' }).select('_id');

    const incomeAccountIds = incomeAccounts.map(a => a._id);
    const expenseAccountIds = expenseAccounts.map(a => a._id);

    // Aggregate by case
    const caseData = await GeneralLedger.aggregate([
        { $match: matchStage },
        {
            $lookup: {
                from: 'cases',
                localField: 'caseId',
                foreignField: '_id',
                as: 'case'
            }
        },
        { $unwind: '$case' },
        {
            $lookup: {
                from: 'users',
                localField: 'case.clientId',
                foreignField: '_id',
                as: 'client'
            }
        },
        {
            $group: {
                _id: '$caseId',
                caseNumber: { $first: '$case.caseNumber' },
                caseTitle: { $first: '$case.title' },
                clientName: { $first: { $arrayElemAt: ['$client.name', 0] } },
                revenue: {
                    $sum: {
                        $cond: [
                            { $in: ['$creditAccountId', incomeAccountIds] },
                            '$amount',
                            0
                        ]
                    }
                },
                revenueReversals: {
                    $sum: {
                        $cond: [
                            { $in: ['$debitAccountId', incomeAccountIds] },
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
                },
                expenseReversals: {
                    $sum: {
                        $cond: [
                            { $in: ['$creditAccountId', expenseAccountIds] },
                            '$amount',
                            0
                        ]
                    }
                }
            }
        },
        {
            $project: {
                caseId: '$_id',
                caseNumber: 1,
                caseTitle: 1,
                clientName: 1,
                revenue: { $subtract: ['$revenue', '$revenueReversals'] },
                expenses: { $subtract: ['$expenses', '$expenseReversals'] }
            }
        },
        {
            $addFields: {
                profit: { $subtract: ['$revenue', '$expenses'] },
                profitMargin: {
                    $cond: [
                        { $eq: ['$revenue', 0] },
                        0,
                        { $multiply: [{ $divide: [{ $subtract: ['$revenue', '$expenses'] }, '$revenue'] }, 100] }
                    ]
                }
            }
        },
        { $sort: { profit: -1 } }
    ]);

    // Format results
    const cases = caseData.map(c => ({
        caseId: c.caseId,
        caseNumber: c.caseNumber,
        caseTitle: c.caseTitle,
        clientName: c.clientName,
        revenue: c.revenue,
        revenueSAR: toSAR(c.revenue),
        expenses: c.expenses,
        expensesSAR: toSAR(c.expenses),
        profit: c.profit,
        profitSAR: toSAR(c.profit),
        profitMargin: c.profitMargin.toFixed(2) + '%'
    }));

    // Calculate totals
    const totalRevenue = cases.reduce((sum, c) => sum + c.revenue, 0);
    const totalExpenses = cases.reduce((sum, c) => sum + c.expenses, 0);
    const totalProfit = totalRevenue - totalExpenses;

    res.status(200).json({
        success: true,
        report: 'case-profitability',
        period: { startDate, endDate },
        generatedAt: new Date(),
        data: {
            cases,
            summary: {
                caseCount: cases.length,
                totalRevenue,
                totalRevenueSAR: toSAR(totalRevenue),
                totalExpenses,
                totalExpensesSAR: toSAR(totalExpenses),
                totalProfit,
                totalProfitSAR: toSAR(totalProfit),
                averageProfitMargin: totalRevenue > 0
                    ? ((totalProfit / totalRevenue) * 100).toFixed(2) + '%'
                    : '0%'
            }
        }
    });
});

/**
 * Get Accounts Receivable Aging Report
 * GET /api/reports/ar-aging
 * Query params: asOfDate
 */
const getARAgingReport = asyncHandler(async (req, res) => {
    const { asOfDate } = req.query;

    const now = asOfDate ? new Date(asOfDate) : new Date();

    // Get all invoices with outstanding balance
    const invoices = await Invoice.find({
        status: { $in: ['sent', 'pending', 'partial', 'overdue'] }
    })
        .populate('clientId', 'name email firstName lastName username')
        .lean();

    // Categorize by aging buckets
    const aging = {
        current: { count: 0, amount: 0, invoices: [] },
        days1to30: { count: 0, amount: 0, invoices: [] },
        days31to60: { count: 0, amount: 0, invoices: [] },
        days61to90: { count: 0, amount: 0, invoices: [] },
        days90Plus: { count: 0, amount: 0, invoices: [] }
    };

    // Group by client
    const byClient = {};

    invoices.forEach(inv => {
        const balanceDue = (inv.totalAmount || 0) - (inv.amountPaid || 0);
        if (balanceDue <= 0) return;

        const dueDate = new Date(inv.dueDate);
        const daysPastDue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));

        const clientId = inv.clientId?._id?.toString() || 'unknown';
        const clientName = inv.clientId
            ? (inv.clientId.name || `${inv.clientId.firstName || ''} ${inv.clientId.lastName || inv.clientId.username}`.trim())
            : 'Unknown Client';

        if (!byClient[clientId]) {
            byClient[clientId] = {
                clientId,
                clientName,
                email: inv.clientId?.email,
                current: 0,
                days1to30: 0,
                days31to60: 0,
                days61to90: 0,
                days90Plus: 0,
                total: 0
            };
        }

        const invoiceData = {
            invoiceNumber: inv.invoiceNumber,
            client: clientName,
            totalAmount: inv.totalAmount,
            amountPaid: inv.amountPaid || 0,
            balanceDue,
            dueDate: inv.dueDate,
            daysPastDue: Math.max(0, daysPastDue)
        };

        if (daysPastDue <= 0) {
            aging.current.count++;
            aging.current.amount += balanceDue;
            aging.current.invoices.push(invoiceData);
            byClient[clientId].current += balanceDue;
        } else if (daysPastDue <= 30) {
            aging.days1to30.count++;
            aging.days1to30.amount += balanceDue;
            aging.days1to30.invoices.push(invoiceData);
            byClient[clientId].days1to30 += balanceDue;
        } else if (daysPastDue <= 60) {
            aging.days31to60.count++;
            aging.days31to60.amount += balanceDue;
            aging.days31to60.invoices.push(invoiceData);
            byClient[clientId].days31to60 += balanceDue;
        } else if (daysPastDue <= 90) {
            aging.days61to90.count++;
            aging.days61to90.amount += balanceDue;
            aging.days61to90.invoices.push(invoiceData);
            byClient[clientId].days61to90 += balanceDue;
        } else {
            aging.days90Plus.count++;
            aging.days90Plus.amount += balanceDue;
            aging.days90Plus.invoices.push(invoiceData);
            byClient[clientId].days90Plus += balanceDue;
        }

        byClient[clientId].total += balanceDue;
    });

    // Format client data
    const clients = Object.values(byClient)
        .map(c => ({
            ...c,
            currentSAR: toSAR(c.current),
            days1to30SAR: toSAR(c.days1to30),
            days31to60SAR: toSAR(c.days31to60),
            days61to90SAR: toSAR(c.days61to90),
            days90PlusSAR: toSAR(c.days90Plus),
            totalSAR: toSAR(c.total)
        }))
        .sort((a, b) => b.total - a.total);

    const totalAR = aging.current.amount + aging.days1to30.amount +
        aging.days31to60.amount + aging.days61to90.amount + aging.days90Plus.amount;

    res.status(200).json({
        success: true,
        report: 'ar-aging',
        asOfDate: now,
        generatedAt: new Date(),
        data: {
            summary: {
                current: { count: aging.current.count, amount: aging.current.amount, amountSAR: toSAR(aging.current.amount) },
                days1to30: { count: aging.days1to30.count, amount: aging.days1to30.amount, amountSAR: toSAR(aging.days1to30.amount) },
                days31to60: { count: aging.days31to60.count, amount: aging.days31to60.amount, amountSAR: toSAR(aging.days31to60.amount) },
                days61to90: { count: aging.days61to90.count, amount: aging.days61to90.amount, amountSAR: toSAR(aging.days61to90.amount) },
                days90Plus: { count: aging.days90Plus.count, amount: aging.days90Plus.amount, amountSAR: toSAR(aging.days90Plus.amount) },
                total: { amount: totalAR, amountSAR: toSAR(totalAR) }
            },
            byClient: clients,
            details: aging
        }
    });
});

/**
 * Get Trial Balance Report
 * GET /api/reports/trial-balance
 * Query params: asOfDate
 */
const getTrialBalanceReport = asyncHandler(async (req, res) => {
    const { asOfDate } = req.query;

    const trialBalance = await GeneralLedger.getTrialBalance(
        asOfDate ? new Date(asOfDate) : null
    );

    // Convert amounts to SAR
    const balances = trialBalance.balances.map(b => ({
        ...b,
        debitSAR: toSAR(b.debit),
        creditSAR: toSAR(b.credit)
    }));

    res.status(200).json({
        success: true,
        report: 'trial-balance',
        asOfDate: trialBalance.asOfDate,
        generatedAt: new Date(),
        data: {
            balances,
            totals: {
                totalDebits: trialBalance.totalDebits,
                totalDebitsSAR: toSAR(trialBalance.totalDebits),
                totalCredits: trialBalance.totalCredits,
                totalCreditsSAR: toSAR(trialBalance.totalCredits),
                isBalanced: trialBalance.isBalanced,
                difference: Math.abs(trialBalance.totalDebits - trialBalance.totalCredits),
                differenceSAR: toSAR(Math.abs(trialBalance.totalDebits - trialBalance.totalCredits))
            }
        }
    });
});

/**
 * Get Budget Variance Report
 * GET /api/reports/budget-variance
 * Query params: fiscalYear, period (month-X/quarter-X/year), departmentId
 */
const getBudgetVarianceReport = asyncHandler(async (req, res) => {
    const { fiscalYear, period, departmentId } = req.query;

    if (!fiscalYear) {
        return res.status(400).json({ success: false, error: 'Fiscal year is required' });
    }

    if (!period) {
        return res.status(400).json({ success: false, error: 'Period is required (month-1 to month-12, quarter-1 to quarter-4, or year)' });
    }

    // Calculate date range based on period
    const year = parseInt(fiscalYear);
    let startDate, endDate;

    if (period === 'year') {
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    } else if (period.startsWith('quarter-')) {
        const quarter = parseInt(period.split('-')[1]);
        const startMonth = (quarter - 1) * 3;
        startDate = new Date(year, startMonth, 1);
        endDate = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
    } else if (period.startsWith('month-')) {
        const month = parseInt(period.split('-')[1]) - 1;
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    } else {
        return res.status(400).json({ success: false, error: 'Invalid period format' });
    }

    const matchStage = {
        status: 'posted',
        transactionDate: { $gte: startDate, $lte: endDate }
    };

    // Get all Income and Expense accounts
    const incomeAccounts = await Account.find({ type: 'Income', isActive: true });
    const expenseAccounts = await Account.find({ type: 'Expense', isActive: true });

    const incomeDetails = [];
    let totalIncomeActual = 0;
    let totalIncomeBudget = 0;

    for (const account of incomeAccounts) {
        const result = await GeneralLedger.aggregate([
            { $match: { ...matchStage, $or: [{ creditAccountId: account._id }, { debitAccountId: account._id }] } },
            { $group: { _id: null, credits: { $sum: { $cond: [{ $eq: ['$creditAccountId', account._id] }, '$amount', 0] } }, debits: { $sum: { $cond: [{ $eq: ['$debitAccountId', account._id] }, '$amount', 0] } } } }
        ]);

        const actualAmount = (result[0]?.credits || 0) - (result[0]?.debits || 0);
        const budgetedAmount = 0; // TODO: Fetch from Budget model when available

        if (actualAmount !== 0 || budgetedAmount !== 0) {
            const variance = actualAmount - budgetedAmount;
            const variancePercent = budgetedAmount !== 0 ? ((variance / Math.abs(budgetedAmount)) * 100).toFixed(2) : (actualAmount !== 0 ? '100.00' : '0.00');

            incomeDetails.push({
                accountCode: account.code, accountName: account.name, accountNameAr: account.nameAr,
                budgetedAmount, budgetedAmountSAR: toSAR(budgetedAmount),
                actualAmount, actualAmountSAR: toSAR(actualAmount),
                variance, varianceSAR: toSAR(variance),
                variancePercent: variancePercent + '%',
                status: Math.abs(parseFloat(variancePercent)) <= 5 ? 'on-track' : (parseFloat(variancePercent) > 0 ? 'over' : 'under'),
                favorability: variance >= 0 ? 'favorable' : 'unfavorable'
            });
            totalIncomeActual += actualAmount;
            totalIncomeBudget += budgetedAmount;
        }
    }

    const expenseDetails = [];
    let totalExpenseActual = 0;
    let totalExpenseBudget = 0;

    for (const account of expenseAccounts) {
        const result = await GeneralLedger.aggregate([
            { $match: { ...matchStage, $or: [{ creditAccountId: account._id }, { debitAccountId: account._id }] } },
            { $group: { _id: null, credits: { $sum: { $cond: [{ $eq: ['$creditAccountId', account._id] }, '$amount', 0] } }, debits: { $sum: { $cond: [{ $eq: ['$debitAccountId', account._id] }, '$amount', 0] } } } }
        ]);

        const actualAmount = (result[0]?.debits || 0) - (result[0]?.credits || 0);
        const budgetedAmount = 0;

        if (actualAmount !== 0 || budgetedAmount !== 0) {
            const variance = actualAmount - budgetedAmount;
            const variancePercent = budgetedAmount !== 0 ? ((variance / Math.abs(budgetedAmount)) * 100).toFixed(2) : (actualAmount !== 0 ? '100.00' : '0.00');

            expenseDetails.push({
                accountCode: account.code, accountName: account.name, accountNameAr: account.nameAr,
                budgetedAmount, budgetedAmountSAR: toSAR(budgetedAmount),
                actualAmount, actualAmountSAR: toSAR(actualAmount),
                variance, varianceSAR: toSAR(variance),
                variancePercent: variancePercent + '%',
                status: Math.abs(parseFloat(variancePercent)) <= 5 ? 'on-track' : (parseFloat(variancePercent) > 0 ? 'over' : 'under'),
                favorability: variance <= 0 ? 'favorable' : 'unfavorable'
            });
            totalExpenseActual += actualAmount;
            totalExpenseBudget += budgetedAmount;
        }
    }

    const budgetedNetProfit = totalIncomeBudget - totalExpenseBudget;
    const actualNetProfit = totalIncomeActual - totalExpenseActual;
    const netProfitVariance = actualNetProfit - budgetedNetProfit;

    res.status(200).json({
        success: true,
        report: 'budget-variance',
        fiscalYear: parseInt(fiscalYear),
        period,
        periodDates: { startDate, endDate },
        generatedAt: new Date(),
        data: {
            income: { accounts: incomeDetails.sort((a, b) => a.accountCode.localeCompare(b.accountCode)), totalBudgeted: totalIncomeBudget, totalActual: totalIncomeActual, totalVariance: totalIncomeActual - totalIncomeBudget },
            expenses: { accounts: expenseDetails.sort((a, b) => a.accountCode.localeCompare(b.accountCode)), totalBudgeted: totalExpenseBudget, totalActual: totalExpenseActual, totalVariance: totalExpenseActual - totalExpenseBudget },
            summary: { budgetedNetProfit, budgetedNetProfitSAR: toSAR(budgetedNetProfit), actualNetProfit, actualNetProfitSAR: toSAR(actualNetProfit), netProfitVariance, netProfitVarianceSAR: toSAR(netProfitVariance), favorability: netProfitVariance >= 0 ? 'favorable' : 'unfavorable' }
        }
    });
});

/**
 * Get AP Aging Report
 * GET /api/reports/ap-aging
 * Query params: asOfDate, vendorId
 */
const getAPAgingReport = asyncHandler(async (req, res) => {
    const { asOfDate, vendorId } = req.query;
    const now = asOfDate ? new Date(asOfDate) : new Date();

    let Bill;
    try { Bill = require('../models/bill.model'); } catch (e) { Bill = null; }

    if (!Bill) {
        return res.status(200).json({
            success: true,
            report: 'ap-aging',
            asOfDate: now,
            generatedAt: new Date(),
            data: { summary: {}, byVendor: [], message: 'Bill model not found - AP Aging requires vendor bills' }
        });
    }

    const matchCriteria = { status: { $in: ['received', 'pending', 'partial', 'overdue'] } };
    if (vendorId) matchCriteria.vendorId = mongoose.Types.ObjectId.createFromHexString(vendorId);

    const bills = await Bill.find(matchCriteria).populate('vendorId', 'name nameAr email vendorId').lean();

    const aging = { current: { count: 0, amount: 0 }, days1to30: { count: 0, amount: 0 }, days31to60: { count: 0, amount: 0 }, days61to90: { count: 0, amount: 0 }, days90Plus: { count: 0, amount: 0 } };
    const byVendor = {};

    bills.forEach(bill => {
        const balanceDue = (bill.totalAmount || 0) - (bill.amountPaid || 0);
        if (balanceDue <= 0) return;

        const dueDate = new Date(bill.dueDate);
        const daysPastDue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
        const vendorIdStr = bill.vendorId?._id?.toString() || 'unknown';
        const vendorName = bill.vendorId?.name || 'Unknown Vendor';

        if (!byVendor[vendorIdStr]) {
            byVendor[vendorIdStr] = { vendorId: vendorIdStr, vendorName, vendorNameAr: bill.vendorId?.nameAr, current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days90Plus: 0, total: 0 };
        }

        if (daysPastDue <= 0) { aging.current.count++; aging.current.amount += balanceDue; byVendor[vendorIdStr].current += balanceDue; }
        else if (daysPastDue <= 30) { aging.days1to30.count++; aging.days1to30.amount += balanceDue; byVendor[vendorIdStr].days1to30 += balanceDue; }
        else if (daysPastDue <= 60) { aging.days31to60.count++; aging.days31to60.amount += balanceDue; byVendor[vendorIdStr].days31to60 += balanceDue; }
        else if (daysPastDue <= 90) { aging.days61to90.count++; aging.days61to90.amount += balanceDue; byVendor[vendorIdStr].days61to90 += balanceDue; }
        else { aging.days90Plus.count++; aging.days90Plus.amount += balanceDue; byVendor[vendorIdStr].days90Plus += balanceDue; }

        byVendor[vendorIdStr].total += balanceDue;
    });

    const vendors = Object.values(byVendor).map(v => ({ ...v, currentSAR: toSAR(v.current), days1to30SAR: toSAR(v.days1to30), days31to60SAR: toSAR(v.days31to60), days61to90SAR: toSAR(v.days61to90), days90PlusSAR: toSAR(v.days90Plus), totalSAR: toSAR(v.total) })).sort((a, b) => b.total - a.total);
    const totalAP = aging.current.amount + aging.days1to30.amount + aging.days31to60.amount + aging.days61to90.amount + aging.days90Plus.amount;

    res.status(200).json({
        success: true,
        report: 'ap-aging',
        asOfDate: now,
        generatedAt: new Date(),
        data: {
            summary: { current: { count: aging.current.count, amount: aging.current.amount, amountSAR: toSAR(aging.current.amount) }, days1to30: { count: aging.days1to30.count, amount: aging.days1to30.amount, amountSAR: toSAR(aging.days1to30.amount) }, days31to60: { count: aging.days31to60.count, amount: aging.days31to60.amount, amountSAR: toSAR(aging.days31to60.amount) }, days61to90: { count: aging.days61to90.count, amount: aging.days61to90.amount, amountSAR: toSAR(aging.days61to90.amount) }, days90Plus: { count: aging.days90Plus.count, amount: aging.days90Plus.amount, amountSAR: toSAR(aging.days90Plus.amount) }, total: { amount: totalAP, amountSAR: toSAR(totalAP) } },
            byVendor: vendors
        }
    });
});

/**
 * Get Client Statement of Account
 * GET /api/reports/client-statement
 * Query params: clientId, startDate, endDate
 */
const getClientStatement = asyncHandler(async (req, res) => {
    const { clientId, startDate, endDate } = req.query;

    if (!clientId) return res.status(400).json({ success: false, error: 'Client ID is required' });
    if (!startDate || !endDate) return res.status(400).json({ success: false, error: 'Start date and end date are required' });

    let Client, Payment;
    try { Client = require('../models/client.model'); } catch (e) { Client = require('../models/user.model'); }
    try { Payment = require('../models/payment.model'); } catch (e) { Payment = null; }

    const client = await Client.findById(clientId);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    const periodStart = new Date(startDate);
    const periodEnd = new Date(endDate);

    // Get opening balance
    const openingInvoices = await Invoice.aggregate([
        { $match: { clientId: mongoose.Types.ObjectId.createFromHexString(clientId), status: { $nin: ['void', 'cancelled', 'draft'] }, issueDate: { $lt: periodStart } } },
        { $group: { _id: null, totalInvoiced: { $sum: '$totalAmount' }, totalPaid: { $sum: '$amountPaid' } } }
    ]);
    const openingBalance = openingInvoices[0] ? (openingInvoices[0].totalInvoiced - openingInvoices[0].totalPaid) : 0;

    // Get invoices in period
    const invoices = await Invoice.find({ clientId: mongoose.Types.ObjectId.createFromHexString(clientId), status: { $nin: ['void', 'cancelled', 'draft'] }, issueDate: { $gte: periodStart, $lte: periodEnd } }).populate('caseId', 'caseNumber title').sort({ issueDate: 1 }).lean();

    // Get payments in period
    let payments = [];
    if (Payment) {
        payments = await Payment.find({ $or: [{ clientId: mongoose.Types.ObjectId.createFromHexString(clientId) }, { customerId: mongoose.Types.ObjectId.createFromHexString(clientId) }], status: { $in: ['completed', 'reconciled'] }, paymentDate: { $gte: periodStart, $lte: periodEnd } }).populate('invoiceId', 'invoiceNumber').sort({ paymentDate: 1 }).lean();
    }

    // Build transaction list
    const transactions = [];
    let runningBalance = openingBalance;

    invoices.forEach(inv => {
        const debit = inv.totalAmount;
        runningBalance += debit;
        transactions.push({ date: inv.issueDate, type: 'invoice', reference: inv.invoiceNumber, description: inv.caseId ? `Invoice for ${inv.caseId.caseNumber}` : `Invoice ${inv.invoiceNumber}`, debit, credit: 0, balance: runningBalance });
    });

    payments.forEach(pay => {
        const credit = pay.amount;
        runningBalance -= credit;
        transactions.push({ date: pay.paymentDate, type: 'payment', reference: pay.paymentNumber, description: `Payment ${pay.paymentNumber}`, debit: 0, credit, balance: runningBalance });
    });

    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Recalculate running balance
    runningBalance = openingBalance;
    transactions.forEach(txn => { runningBalance += (txn.debit - txn.credit); txn.balance = runningBalance; txn.balanceSAR = toSAR(runningBalance); txn.debitSAR = toSAR(txn.debit); txn.creditSAR = toSAR(txn.credit); });

    const closingBalance = runningBalance;
    const totalInvoiced = transactions.filter(t => t.type === 'invoice').reduce((sum, t) => sum + t.debit, 0);
    const totalPayments = transactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.credit, 0);

    res.status(200).json({
        success: true,
        report: 'client-statement',
        period: { startDate: periodStart, endDate: periodEnd },
        generatedAt: new Date(),
        clientInfo: { clientId: client._id, name: client.displayName || client.name || `${client.firstName || ''} ${client.lastName || ''}`.trim(), email: client.email },
        openingBalance: { amount: openingBalance, amountSAR: toSAR(openingBalance) },
        transactions,
        closingBalance: { amount: closingBalance, amountSAR: toSAR(closingBalance) },
        summary: { totalInvoiced, totalInvoicedSAR: toSAR(totalInvoiced), totalPayments, totalPaymentsSAR: toSAR(totalPayments), netChange: closingBalance - openingBalance, netChangeSAR: toSAR(closingBalance - openingBalance), transactionCount: transactions.length }
    });
});

/**
 * Get Vendor Ledger Report
 * GET /api/reports/vendor-ledger
 * Query params: vendorId, startDate, endDate
 */
const getVendorLedger = asyncHandler(async (req, res) => {
    const { vendorId, startDate, endDate } = req.query;

    if (!vendorId) return res.status(400).json({ success: false, error: 'Vendor ID is required' });

    let Vendor, Bill, BillPayment;
    try { Vendor = require('../models/vendor.model'); } catch (e) { Vendor = null; }
    try { Bill = require('../models/bill.model'); } catch (e) { Bill = null; }
    try { BillPayment = require('../models/billPayment.model'); } catch (e) { BillPayment = null; }

    if (!Vendor) return res.status(200).json({ success: true, report: 'vendor-ledger', message: 'Vendor model not found' });

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });

    const periodStart = startDate ? new Date(startDate) : new Date(0);
    const periodEnd = endDate ? new Date(endDate) : new Date();

    const transactions = [];
    let openingBalance = vendor.openingBalance || 0;

    // Get bills
    if (Bill) {
        const bills = await Bill.find({ vendorId: mongoose.Types.ObjectId.createFromHexString(vendorId), billDate: { $gte: periodStart, $lte: periodEnd } }).sort({ billDate: 1 }).lean();
        bills.forEach(bill => {
            transactions.push({ date: bill.billDate, type: 'bill', reference: bill.billNumber, description: bill.description || `Bill ${bill.billNumber}`, debit: 0, credit: bill.totalAmount, dueDate: bill.dueDate, status: bill.status });
        });
    }

    // Get payments
    if (BillPayment) {
        const payments = await BillPayment.find({ vendorId: mongoose.Types.ObjectId.createFromHexString(vendorId), paymentDate: { $gte: periodStart, $lte: periodEnd } }).sort({ paymentDate: 1 }).lean();
        payments.forEach(pay => {
            transactions.push({ date: pay.paymentDate, type: 'payment', reference: pay.paymentNumber, description: `Payment ${pay.paymentNumber}`, debit: pay.amount, credit: 0, paymentMethod: pay.paymentMethod });
        });
    }

    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBalance = openingBalance;
    transactions.forEach(txn => { runningBalance += (txn.credit - txn.debit); txn.balance = runningBalance; txn.balanceSAR = toSAR(runningBalance); txn.debitSAR = toSAR(txn.debit); txn.creditSAR = toSAR(txn.credit); });

    const closingBalance = runningBalance;
    const totalBilled = transactions.filter(t => t.type === 'bill').reduce((sum, t) => sum + t.credit, 0);
    const totalPayments = transactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.debit, 0);

    res.status(200).json({
        success: true,
        report: 'vendor-ledger',
        vendorId,
        period: { startDate: periodStart, endDate: periodEnd },
        generatedAt: new Date(),
        vendorInfo: { vendorId: vendor._id, name: vendor.name, nameAr: vendor.nameAr, email: vendor.email, paymentTerms: vendor.paymentTerms },
        ledger: { openingBalance, openingBalanceSAR: toSAR(openingBalance), transactions, closingBalance, closingBalanceSAR: toSAR(closingBalance) },
        summary: { totalBilled, totalBilledSAR: toSAR(totalBilled), totalPayments, totalPaymentsSAR: toSAR(totalPayments), outstandingBalance: closingBalance, outstandingBalanceSAR: toSAR(closingBalance) }
    });
});

/**
 * Get Gross Profit Report
 * GET /api/reports/gross-profit
 * Query params: startDate, endDate, groupBy (client/service/case/month)
 */
const getGrossProfitReport = asyncHandler(async (req, res) => {
    const { startDate, endDate, groupBy = 'client', marginThreshold = 0 } = req.query;

    if (!startDate || !endDate) return res.status(400).json({ success: false, error: 'Start date and end date are required' });

    let Expense;
    try { Expense = require('../models/expense.model'); } catch (e) { Expense = null; }

    const invoices = await Invoice.find({ status: { $nin: ['draft', 'void', 'cancelled'] }, issueDate: { $gte: new Date(startDate), $lte: new Date(endDate) } }).populate('clientId', 'name firstName lastName').populate('caseId', 'caseNumber title').lean();

    const items = {};

    for (const inv of invoices) {
        let key, name;

        if (groupBy === 'client') {
            key = inv.clientId?._id?.toString() || 'unknown';
            name = inv.clientId?.name || `${inv.clientId?.firstName || ''} ${inv.clientId?.lastName || ''}`.trim() || 'Unknown Client';
        } else if (groupBy === 'case') {
            key = inv.caseId?._id?.toString() || 'unknown';
            name = inv.caseId ? `${inv.caseId.caseNumber} - ${inv.caseId.title}` : 'No Case';
        } else if (groupBy === 'month') {
            const d = new Date(inv.issueDate);
            key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            name = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
        } else {
            key = 'all';
            name = 'All';
        }

        if (!items[key]) items[key] = { itemId: key, itemName: name, revenue: 0, directCosts: 0, invoiceCount: 0 };
        items[key].revenue += inv.totalAmount || 0;
        items[key].invoiceCount++;

        // Get direct costs from expenses
        if (Expense && inv.caseId) {
            const expenses = await Expense.find({ caseId: inv.caseId._id, isBillable: true, date: { $gte: new Date(startDate), $lte: new Date(endDate) } }).lean();
            for (const exp of expenses) items[key].directCosts += exp.totalAmount || 0;
        }
    }

    const itemsList = Object.values(items).map(item => {
        const grossProfit = item.revenue - item.directCosts;
        const grossMargin = item.revenue > 0 ? (grossProfit / item.revenue) * 100 : 0;
        return { ...item, grossProfit, grossProfitSAR: toSAR(grossProfit), revenueSAR: toSAR(item.revenue), directCostsSAR: toSAR(item.directCosts), grossMarginPercent: grossMargin.toFixed(2) + '%', grossMarginValue: parseFloat(grossMargin.toFixed(2)), belowThreshold: grossMargin < parseFloat(marginThreshold) };
    }).sort((a, b) => b.grossMarginValue - a.grossMarginValue);

    const totalRevenue = itemsList.reduce((sum, i) => sum + i.revenue, 0);
    const totalDirectCosts = itemsList.reduce((sum, i) => sum + i.directCosts, 0);
    const totalGrossProfit = totalRevenue - totalDirectCosts;
    const overallMargin = totalRevenue > 0 ? ((totalGrossProfit / totalRevenue) * 100).toFixed(2) : '0.00';

    res.status(200).json({
        success: true,
        report: 'gross-profit',
        period: { startDate, endDate },
        groupBy,
        generatedAt: new Date(),
        data: {
            items: itemsList,
            summary: { totalRevenue, totalRevenueSAR: toSAR(totalRevenue), totalDirectCosts, totalDirectCostsSAR: toSAR(totalDirectCosts), totalGrossProfit, totalGrossProfitSAR: toSAR(totalGrossProfit), overallGrossMarginPercent: overallMargin + '%', itemCount: itemsList.length },
            analysis: { targetMargin: marginThreshold + '%', itemsBelowTarget: { count: itemsList.filter(i => i.belowThreshold).length, items: itemsList.filter(i => i.belowThreshold).map(i => i.itemName) }, topPerformers: itemsList.slice(0, 5), bottomPerformers: itemsList.slice(-5).reverse() }
        }
    });
});

/**
 * Get Cost Center Report
 * GET /api/reports/cost-center
 * Query params: startDate, endDate, costCenterId
 */
const getCostCenterReport = asyncHandler(async (req, res) => {
    const { startDate, endDate, costCenterId } = req.query;

    if (!startDate || !endDate) return res.status(400).json({ success: false, error: 'Start date and end date are required' });

    // Use caseId as cost center proxy (law firm cases = cost centers)
    const matchStage = { status: 'posted', caseId: { $ne: null }, transactionDate: { $gte: new Date(startDate), $lte: new Date(endDate) } };
    if (costCenterId) matchStage.caseId = mongoose.Types.ObjectId.createFromHexString(costCenterId);

    const incomeAccounts = await Account.find({ type: 'Income' }).select('_id');
    const expenseAccounts = await Account.find({ type: 'Expense' }).select('_id');
    const incomeAccountIds = incomeAccounts.map(a => a._id);
    const expenseAccountIds = expenseAccounts.map(a => a._id);

    const caseData = await GeneralLedger.aggregate([
        { $match: matchStage },
        { $lookup: { from: 'cases', localField: 'caseId', foreignField: '_id', as: 'case' } },
        { $unwind: '$case' },
        { $group: { _id: '$caseId', caseNumber: { $first: '$case.caseNumber' }, caseTitle: { $first: '$case.title' }, income: { $sum: { $cond: [{ $in: ['$creditAccountId', incomeAccountIds] }, '$amount', 0] } }, expenses: { $sum: { $cond: [{ $in: ['$debitAccountId', expenseAccountIds] }, '$amount', 0] } }, transactionCount: { $sum: 1 } } },
        { $addFields: { netProfit: { $subtract: ['$income', '$expenses'] }, profitMargin: { $cond: [{ $eq: ['$income', 0] }, 0, { $multiply: [{ $divide: [{ $subtract: ['$income', '$expenses'] }, '$income'] }, 100] }] } } },
        { $sort: { netProfit: -1 } }
    ]);

    const costCenters = caseData.map(c => ({ costCenterId: c._id, costCenterName: `${c.caseNumber} - ${c.caseTitle}`, income: c.income, incomeSAR: toSAR(c.income), expenses: c.expenses, expensesSAR: toSAR(c.expenses), netProfit: c.netProfit, netProfitSAR: toSAR(c.netProfit), profitMargin: c.profitMargin.toFixed(2) + '%', transactionCount: c.transactionCount }));

    const totalIncome = costCenters.reduce((sum, c) => sum + c.income, 0);
    const totalExpenses = costCenters.reduce((sum, c) => sum + c.expenses, 0);
    const totalNetProfit = totalIncome - totalExpenses;

    res.status(200).json({
        success: true,
        report: 'cost-center',
        period: { startDate, endDate },
        generatedAt: new Date(),
        data: {
            costCenters,
            summary: { totalCostCenters: costCenters.length, totalIncome, totalIncomeSAR: toSAR(totalIncome), totalExpenses, totalExpensesSAR: toSAR(totalExpenses), totalNetProfit, totalNetProfitSAR: toSAR(totalNetProfit), overallProfitMargin: totalIncome > 0 ? ((totalNetProfit / totalIncome) * 100).toFixed(2) + '%' : '0%' }
        }
    });
});

module.exports = {
    getProfitLossReport,
    getBalanceSheetReport,
    getCaseProfitabilityReport,
    getARAgingReport,
    getTrialBalanceReport,
    getBudgetVarianceReport,
    getAPAgingReport,
    getClientStatement,
    getVendorLedger,
    getGrossProfitReport,
    getCostCenterReport
};
