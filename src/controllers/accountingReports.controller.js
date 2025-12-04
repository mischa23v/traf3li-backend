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

module.exports = {
    getProfitLossReport,
    getBalanceSheetReport,
    getCaseProfitabilityReport,
    getARAgingReport,
    getTrialBalanceReport
};
