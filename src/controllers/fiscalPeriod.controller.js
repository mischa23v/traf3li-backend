/**
 * Fiscal Period Controller
 */

const mongoose = require('mongoose');
const FiscalPeriod = require('../models/fiscalPeriod.model');
const { toSAR } = require('../utils/currency');

/**
 * Get all fiscal periods
 */
const getFiscalPeriods = async (req, res) => {
    try {
        const { year, status } = req.query;
        const lawyerId = req.user._id;

        const query = { lawyerId };
        if (year) query.fiscalYear = parseInt(year);
        if (status) query.status = status;

        const periods = await FiscalPeriod.find(query)
            .sort({ fiscalYear: -1, periodNumber: 1 });

        res.json({ success: true, data: periods });
    } catch (error) {
        console.error('Error fetching fiscal periods:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get single fiscal period
 */
const getFiscalPeriod = async (req, res) => {
    try {
        const period = await FiscalPeriod.findOne({
            _id: req.params.id,
            lawyerId: req.user._id
        })
            .populate('closingEntry.journalEntryId')
            .populate('closingEntry.closedBy', 'name')
            .populate('lockedBy', 'name');

        if (!period) {
            return res.status(404).json({ success: false, message: 'Fiscal period not found' });
        }

        res.json({ success: true, data: period });
    } catch (error) {
        console.error('Error fetching fiscal period:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Create fiscal year (creates all 12 months + annual period)
 */
const createFiscalYear = async (req, res) => {
    try {
        const { fiscalYear, startMonth } = req.body;
        const lawyerId = req.user._id;

        if (!fiscalYear) {
            return res.status(400).json({
                success: false,
                message: 'fiscalYear is required'
            });
        }

        // Check if fiscal year already exists
        const existing = await FiscalPeriod.findOne({
            lawyerId,
            fiscalYear: parseInt(fiscalYear)
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: `Fiscal year ${fiscalYear} already exists`
            });
        }

        const periods = await FiscalPeriod.createFiscalYear(
            lawyerId,
            parseInt(fiscalYear),
            req.user._id,
            startMonth || 1
        );

        res.status(201).json({
            success: true,
            message: `Created ${periods.length} periods for fiscal year ${fiscalYear}`,
            data: periods
        });
    } catch (error) {
        console.error('Error creating fiscal year:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get current period
 */
const getCurrentPeriod = async (req, res) => {
    try {
        const period = await FiscalPeriod.getCurrentPeriod(req.user._id);

        if (!period) {
            return res.status(404).json({
                success: false,
                message: 'No open fiscal period found for current date'
            });
        }

        res.json({ success: true, data: period });
    } catch (error) {
        console.error('Error getting current period:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Open period
 */
const openPeriod = async (req, res) => {
    try {
        const period = await FiscalPeriod.findOne({
            _id: req.params.id,
            lawyerId: req.user._id
        });

        if (!period) {
            return res.status(404).json({ success: false, message: 'Fiscal period not found' });
        }

        await period.open(req.user._id);

        res.json({ success: true, data: period });
    } catch (error) {
        console.error('Error opening period:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Close period
 */
const closePeriod = async (req, res) => {
    try {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const period = await FiscalPeriod.findOne({
                _id: req.params.id,
                lawyerId: req.user._id
            }).session(session);

            if (!period) {
                await session.abortTransaction();
                return res.status(404).json({ success: false, message: 'Fiscal period not found' });
            }

            await period.close(req.user._id, session);

            await session.commitTransaction();

            res.json({ success: true, data: period });
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    } catch (error) {
        console.error('Error closing period:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Reopen period
 */
const reopenPeriod = async (req, res) => {
    try {
        const period = await FiscalPeriod.findOne({
            _id: req.params.id,
            lawyerId: req.user._id
        });

        if (!period) {
            return res.status(404).json({ success: false, message: 'Fiscal period not found' });
        }

        await period.reopen(req.user._id);

        res.json({ success: true, data: period });
    } catch (error) {
        console.error('Error reopening period:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Lock period (permanent)
 */
const lockPeriod = async (req, res) => {
    try {
        const { reason } = req.body;

        const period = await FiscalPeriod.findOne({
            _id: req.params.id,
            lawyerId: req.user._id
        });

        if (!period) {
            return res.status(404).json({ success: false, message: 'Fiscal period not found' });
        }

        await period.lock(req.user._id, reason);

        res.json({ success: true, data: period });
    } catch (error) {
        console.error('Error locking period:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Calculate period balances
 */
const calculateBalances = async (req, res) => {
    try {
        const period = await FiscalPeriod.findOne({
            _id: req.params.id,
            lawyerId: req.user._id
        });

        if (!period) {
            return res.status(404).json({ success: false, message: 'Fiscal period not found' });
        }

        const balances = await period.calculateBalances();

        res.json({
            success: true,
            data: {
                period: period.name,
                balances: {
                    totalRevenue: toSAR(balances.totalRevenue),
                    totalExpenses: toSAR(balances.totalExpenses),
                    netIncome: toSAR(balances.netIncome),
                    totalAssets: toSAR(balances.totalAssets),
                    totalLiabilities: toSAR(balances.totalLiabilities),
                    totalEquity: toSAR(balances.totalEquity),
                    calculatedAt: balances.calculatedAt
                }
            }
        });
    } catch (error) {
        console.error('Error calculating balances:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Perform year-end closing
 */
const yearEndClosing = async (req, res) => {
    try {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const period = await FiscalPeriod.findOne({
                _id: req.params.id,
                lawyerId: req.user._id
            }).session(session);

            if (!period) {
                await session.abortTransaction();
                return res.status(404).json({ success: false, message: 'Fiscal period not found' });
            }

            const result = await period.performYearEndClosing(req.user._id, session);

            await session.commitTransaction();

            res.json({
                success: true,
                message: `Year-end closing completed for fiscal year ${period.fiscalYear}`,
                data: {
                    netIncome: toSAR(result.netIncome),
                    accountsClosed: result.accountsClosed,
                    closingEntryId: result.closingEntry._id
                }
            });
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    } catch (error) {
        console.error('Error performing year-end closing:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Check if can post to date
 */
const canPostToDate = async (req, res) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'date query parameter is required'
            });
        }

        const canPost = await FiscalPeriod.canPostToDate(req.user._id, new Date(date));
        const period = await FiscalPeriod.getPeriodForDate(req.user._id, new Date(date));

        res.json({
            success: true,
            data: {
                canPost,
                period: period ? {
                    id: period._id,
                    name: period.name,
                    status: period.status
                } : null
            }
        });
    } catch (error) {
        console.error('Error checking post date:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get fiscal years summary
 */
const getFiscalYearsSummary = async (req, res) => {
    try {
        const lawyerId = req.user._id;

        const years = await FiscalPeriod.aggregate([
            { $match: { lawyerId: new mongoose.Types.ObjectId(lawyerId), periodType: 'annual' } },
            {
                $project: {
                    fiscalYear: 1,
                    name: 1,
                    status: 1,
                    startDate: 1,
                    endDate: 1,
                    periodBalances: 1,
                    closingEntry: 1
                }
            },
            { $sort: { fiscalYear: -1 } }
        ]);

        res.json({ success: true, data: years });
    } catch (error) {
        console.error('Error getting fiscal years summary:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getFiscalPeriods,
    getFiscalPeriod,
    createFiscalYear,
    getCurrentPeriod,
    openPeriod,
    closePeriod,
    reopenPeriod,
    lockPeriod,
    calculateBalances,
    yearEndClosing,
    canPostToDate,
    getFiscalYearsSummary
};
