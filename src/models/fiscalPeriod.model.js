/**
 * Fiscal Period Model
 *
 * Manages fiscal years and periods for financial reporting
 * Handles year-end closing and retained earnings
 */

const mongoose = require('mongoose');

const fiscalPeriodSchema = new mongoose.Schema({
    // Period identification
    periodNumber: {
        type: Number,
        required: true,
        min: 1,
        max: 13 // 12 months + optional 13th adjustment period
    },
    fiscalYear: {
        type: Number,
        required: true,
        min: 2020
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    nameAr: {
        type: String,
        trim: true
    },

    // Period dates
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },

    // Period type
    periodType: {
        type: String,
        enum: ['monthly', 'quarterly', 'annual', 'adjustment'],
        default: 'monthly'
    },

    // Status
    status: {
        type: String,
        enum: ['future', 'open', 'closed', 'locked'],
        default: 'future',
        index: true
    },

    // Year-end closing tracking
    closingEntry: {
        journalEntryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'JournalEntry'
        },
        closedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        closedAt: Date,
        retainedEarningsAmount: Number // In halalas
    },

    // Summary balances (cached for performance)
    periodBalances: {
        totalRevenue: { type: Number, default: 0 },      // In halalas
        totalExpenses: { type: Number, default: 0 },     // In halalas
        netIncome: { type: Number, default: 0 },         // In halalas
        totalAssets: { type: Number, default: 0 },       // In halalas
        totalLiabilities: { type: Number, default: 0 },  // In halalas
        totalEquity: { type: Number, default: 0 },       // In halalas
        calculatedAt: Date
    },

    // Lock tracking
    lockedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lockedAt: Date,
    lockReason: String,

    // Ownership
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
fiscalPeriodSchema.index({ lawyerId: 1, fiscalYear: 1, periodNumber: 1 }, { unique: true });
fiscalPeriodSchema.index({ lawyerId: 1, status: 1 });
fiscalPeriodSchema.index({ startDate: 1, endDate: 1 });

/**
 * Check if a date falls within this period
 */
fiscalPeriodSchema.methods.containsDate = function(date) {
    const d = new Date(date);
    return d >= this.startDate && d <= this.endDate;
};

/**
 * Open the period for transactions
 */
fiscalPeriodSchema.methods.open = async function(userId, session = null) {
    if (this.status === 'locked') {
        throw new Error('Cannot open a locked period');
    }
    if (this.status === 'closed') {
        throw new Error('Cannot open a closed period. Use reopen method.');
    }

    this.status = 'open';
    const options = session ? { session } : {};
    await this.save(options);
    return this;
};

/**
 * Close the period (prevents new transactions)
 */
fiscalPeriodSchema.methods.close = async function(userId, session = null) {
    if (this.status === 'locked') {
        throw new Error('Cannot close a locked period');
    }
    if (this.status !== 'open') {
        throw new Error('Period must be open to close');
    }

    // Calculate period balances before closing
    await this.calculateBalances(session);

    this.status = 'closed';
    this.closingEntry = {
        ...this.closingEntry,
        closedBy: userId,
        closedAt: new Date()
    };

    const options = session ? { session } : {};
    await this.save(options);
    return this;
};

/**
 * Lock the period (permanent, cannot be undone without admin)
 */
fiscalPeriodSchema.methods.lock = async function(userId, reason = '', session = null) {
    if (this.status !== 'closed') {
        throw new Error('Period must be closed before locking');
    }

    this.status = 'locked';
    this.lockedBy = userId;
    this.lockedAt = new Date();
    this.lockReason = reason;

    const options = session ? { session } : {};
    await this.save(options);
    return this;
};

/**
 * Reopen a closed period (not locked)
 */
fiscalPeriodSchema.methods.reopen = async function(userId, session = null) {
    if (this.status === 'locked') {
        throw new Error('Cannot reopen a locked period');
    }
    if (this.status !== 'closed') {
        throw new Error('Period must be closed to reopen');
    }

    this.status = 'open';
    const options = session ? { session } : {};
    await this.save(options);
    return this;
};

/**
 * Calculate and cache period balances
 */
fiscalPeriodSchema.methods.calculateBalances = async function(session = null) {
    const GeneralLedger = mongoose.model('GeneralLedger');
    const Account = mongoose.model('Account');

    // Get all accounts
    const accounts = await Account.find({ lawyerId: this.lawyerId, isActive: true });

    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    for (const account of accounts) {
        const balance = await GeneralLedger.getAccountBalance(account._id, {
            startDate: this.startDate,
            endDate: this.endDate
        });

        switch (account.type) {
            case 'income':
                totalRevenue += balance;
                break;
            case 'expense':
                totalExpenses += balance;
                break;
            case 'asset':
                totalAssets += balance;
                break;
            case 'liability':
                totalLiabilities += balance;
                break;
            case 'equity':
                totalEquity += balance;
                break;
        }
    }

    this.periodBalances = {
        totalRevenue,
        totalExpenses,
        netIncome: totalRevenue - totalExpenses,
        totalAssets,
        totalLiabilities,
        totalEquity,
        calculatedAt: new Date()
    };

    const options = session ? { session } : {};
    await this.save(options);
    return this.periodBalances;
};

/**
 * Perform year-end closing
 * Closes all income/expense accounts to Retained Earnings
 */
fiscalPeriodSchema.methods.performYearEndClosing = async function(userId, session = null) {
    if (this.periodType !== 'annual' && this.periodNumber !== 12) {
        throw new Error('Year-end closing can only be performed on annual or month 12 periods');
    }
    if (this.status !== 'open') {
        throw new Error('Period must be open to perform year-end closing');
    }

    const GeneralLedger = mongoose.model('GeneralLedger');
    const JournalEntry = mongoose.model('JournalEntry');
    const Account = mongoose.model('Account');

    // Get Retained Earnings account
    const retainedEarningsAccount = await Account.findOne({
        lawyerId: this.lawyerId,
        code: '3200'
    });

    if (!retainedEarningsAccount) {
        throw new Error('Retained Earnings account (3200) not found');
    }

    // Get all income and expense accounts with balances
    const incomeAccounts = await Account.find({
        lawyerId: this.lawyerId,
        type: 'income',
        isActive: true
    });

    const expenseAccounts = await Account.find({
        lawyerId: this.lawyerId,
        type: 'expense',
        isActive: true
    });

    const closingLines = [];
    let netIncome = 0;

    // Close income accounts (DR Income, CR Retained Earnings)
    for (const account of incomeAccounts) {
        const balance = await GeneralLedger.getAccountBalance(account._id, {
            startDate: this.startDate,
            endDate: this.endDate
        });

        if (balance !== 0) {
            closingLines.push({
                accountId: account._id,
                debit: balance > 0 ? balance : 0,
                credit: balance < 0 ? Math.abs(balance) : 0,
                description: `Close ${account.name} to Retained Earnings`
            });
            netIncome += balance;
        }
    }

    // Close expense accounts (DR Retained Earnings, CR Expense)
    for (const account of expenseAccounts) {
        const balance = await GeneralLedger.getAccountBalance(account._id, {
            startDate: this.startDate,
            endDate: this.endDate
        });

        if (balance !== 0) {
            closingLines.push({
                accountId: account._id,
                debit: balance < 0 ? Math.abs(balance) : 0,
                credit: balance > 0 ? balance : 0,
                description: `Close ${account.name} to Retained Earnings`
            });
            netIncome -= balance;
        }
    }

    if (closingLines.length === 0) {
        throw new Error('No accounts to close - no income or expense activity in period');
    }

    // Add Retained Earnings line to balance
    closingLines.push({
        accountId: retainedEarningsAccount._id,
        debit: netIncome < 0 ? Math.abs(netIncome) : 0,
        credit: netIncome > 0 ? netIncome : 0,
        description: `Net income for fiscal year ${this.fiscalYear}`
    });

    // Create closing journal entry
    const closingEntry = new JournalEntry({
        description: `Year-end closing entry for fiscal year ${this.fiscalYear}`,
        descriptionAr: `قيد إقفال نهاية العام للسنة المالية ${this.fiscalYear}`,
        transactionDate: this.endDate,
        lines: closingLines,
        status: 'posted',
        entryType: 'closing',
        lawyerId: this.lawyerId,
        createdBy: userId,
        notes: `Automatically generated year-end closing entry. Net income: ${netIncome} halalas`
    });

    const options = session ? { session } : {};
    await closingEntry.save(options);

    // Post the closing entry to GL
    await closingEntry.post(session);

    // Update period with closing info
    this.closingEntry = {
        journalEntryId: closingEntry._id,
        closedBy: userId,
        closedAt: new Date(),
        retainedEarningsAmount: netIncome
    };

    // Close the period
    this.status = 'closed';
    await this.save(options);

    return {
        closingEntry,
        netIncome,
        accountsClosed: closingLines.length - 1 // Exclude retained earnings line
    };
};

/**
 * Static: Create fiscal year periods
 */
fiscalPeriodSchema.statics.createFiscalYear = async function(lawyerId, fiscalYear, userId, startMonth = 1) {
    const periods = [];

    for (let month = 0; month < 12; month++) {
        const periodMonth = ((startMonth - 1 + month) % 12) + 1;
        const yearOffset = Math.floor((startMonth - 1 + month) / 12);
        const actualYear = periodMonth < startMonth ? fiscalYear + 1 : fiscalYear;

        const startDate = new Date(actualYear, periodMonth - 1, 1);
        const endDate = new Date(actualYear, periodMonth, 0); // Last day of month

        const period = new this({
            periodNumber: month + 1,
            fiscalYear,
            name: `${startDate.toLocaleString('en', { month: 'long' })} ${actualYear}`,
            nameAr: `${startDate.toLocaleString('ar', { month: 'long' })} ${actualYear}`,
            startDate,
            endDate,
            periodType: 'monthly',
            status: month === 0 ? 'open' : 'future',
            lawyerId,
            createdBy: userId
        });

        periods.push(period);
    }

    // Create annual summary period (period 13)
    const yearStart = periods[0].startDate;
    const yearEnd = periods[11].endDate;

    const annualPeriod = new this({
        periodNumber: 13,
        fiscalYear,
        name: `Fiscal Year ${fiscalYear}`,
        nameAr: `السنة المالية ${fiscalYear}`,
        startDate: yearStart,
        endDate: yearEnd,
        periodType: 'annual',
        status: 'future',
        lawyerId,
        createdBy: userId
    });

    periods.push(annualPeriod);

    // Save all periods
    await this.insertMany(periods);

    return periods;
};

/**
 * Static: Get current open period
 */
fiscalPeriodSchema.statics.getCurrentPeriod = async function(lawyerId, date = new Date()) {
    return this.findOne({
        lawyerId,
        startDate: { $lte: date },
        endDate: { $gte: date },
        periodType: { $ne: 'annual' }, // Exclude annual summary
        status: 'open'
    });
};

/**
 * Static: Get period for a date
 */
fiscalPeriodSchema.statics.getPeriodForDate = async function(lawyerId, date) {
    return this.findOne({
        lawyerId,
        startDate: { $lte: date },
        endDate: { $gte: date },
        periodType: { $ne: 'annual' }
    });
};

/**
 * Static: Can post to date
 */
fiscalPeriodSchema.statics.canPostToDate = async function(lawyerId, date) {
    const period = await this.getPeriodForDate(lawyerId, date);
    if (!period) return true; // No fiscal periods defined
    return period.status === 'open';
};

module.exports = mongoose.model('FiscalPeriod', fiscalPeriodSchema);
