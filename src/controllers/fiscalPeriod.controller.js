/**
 * Fiscal Period Controller
 */

const mongoose = require('mongoose');
const FiscalPeriod = require('../models/fiscalPeriod.model');
const { toSAR } = require('../utils/currency');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

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
        logger.error('Error fetching fiscal periods', { error: error.message });
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get single fiscal period
 */
const getFiscalPeriod = async (req, res) => {
    try {
        // Sanitize and validate ID parameter
        const periodId = sanitizeObjectId(req.params.id);
        if (!periodId) {
            return res.status(400).json({ success: false, message: 'Invalid period ID' });
        }

        // IDOR protection: verify ownership
        const period = await FiscalPeriod.findOne({
            _id: periodId,
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
        logger.error('Error fetching fiscal period', { error: error.message });
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Create fiscal year (creates all 12 months + annual period)
 */
const createFiscalYear = async (req, res) => {
    try {
        // Mass assignment protection
        const allowedFields = pickAllowedFields(req.body, ['fiscalYear', 'startMonth']);
        const { fiscalYear, startMonth } = allowedFields;
        const lawyerId = req.user._id;

        // Input validation
        if (!fiscalYear) {
            return res.status(400).json({
                success: false,
                message: 'fiscalYear is required'
            });
        }

        const yearNum = parseInt(fiscalYear);
        if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
            return res.status(400).json({
                success: false,
                message: 'Invalid fiscal year. Must be between 1900 and 2100'
            });
        }

        const monthNum = startMonth ? parseInt(startMonth) : 1;
        if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            return res.status(400).json({
                success: false,
                message: 'Invalid start month. Must be between 1 and 12'
            });
        }

        // Check if fiscal year already exists
        const existing = await FiscalPeriod.findOne({
            lawyerId,
            fiscalYear: yearNum
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: `Fiscal year ${yearNum} already exists`
            });
        }

        const periods = await FiscalPeriod.createFiscalYear(
            lawyerId,
            yearNum,
            req.user._id,
            monthNum
        );

        res.status(201).json({
            success: true,
            message: `Created ${periods.length} periods for fiscal year ${yearNum}`,
            data: periods
        });
    } catch (error) {
        logger.error('Error creating fiscal year', { error: error.message });
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
        logger.error('Error getting current period', { error: error.message });
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Open period
 */
const openPeriod = async (req, res) => {
    try {
        // Sanitize and validate ID parameter
        const periodId = sanitizeObjectId(req.params.id);
        if (!periodId) {
            return res.status(400).json({ success: false, message: 'Invalid period ID' });
        }

        // IDOR protection: verify ownership
        const period = await FiscalPeriod.findOne({
            _id: periodId,
            lawyerId: req.user._id
        });

        if (!period) {
            return res.status(404).json({ success: false, message: 'Fiscal period not found' });
        }

        // Prevent unauthorized modifications on locked periods
        if (period.isLocked) {
            return res.status(403).json({
                success: false,
                message: 'Cannot open a locked period'
            });
        }

        await period.open(req.user._id);

        res.json({ success: true, data: period });
    } catch (error) {
        logger.error('Error opening period', { error: error.message });
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Close period
 */
const closePeriod = async (req, res) => {
    try {
        // Sanitize and validate ID parameter
        const periodId = sanitizeObjectId(req.params.id);
        if (!periodId) {
            return res.status(400).json({ success: false, message: 'Invalid period ID' });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // IDOR protection: verify ownership
            const period = await FiscalPeriod.findOne({
                _id: periodId,
                lawyerId: req.user._id
            }).session(session);

            if (!period) {
                await session.abortTransaction();
                return res.status(404).json({ success: false, message: 'Fiscal period not found' });
            }

            // Prevent unauthorized modifications on locked periods
            if (period.isLocked) {
                await session.abortTransaction();
                return res.status(403).json({
                    success: false,
                    message: 'Cannot close a locked period'
                });
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
        logger.error('Error closing period', { error: error.message });
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Reopen period
 */
const reopenPeriod = async (req, res) => {
    try {
        // Sanitize and validate ID parameter
        const periodId = sanitizeObjectId(req.params.id);
        if (!periodId) {
            return res.status(400).json({ success: false, message: 'Invalid period ID' });
        }

        // IDOR protection: verify ownership
        const period = await FiscalPeriod.findOne({
            _id: periodId,
            lawyerId: req.user._id
        });

        if (!period) {
            return res.status(404).json({ success: false, message: 'Fiscal period not found' });
        }

        // Prevent unauthorized modifications on locked periods
        if (period.isLocked) {
            return res.status(403).json({
                success: false,
                message: 'Cannot reopen a locked period'
            });
        }

        await period.reopen(req.user._id);

        res.json({ success: true, data: period });
    } catch (error) {
        logger.error('Error reopening period', { error: error.message });
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Lock period (permanent)
 */
const lockPeriod = async (req, res) => {
    try {
        // Sanitize and validate ID parameter
        const periodId = sanitizeObjectId(req.params.id);
        if (!periodId) {
            return res.status(400).json({ success: false, message: 'Invalid period ID' });
        }

        // Mass assignment protection
        const allowedFields = pickAllowedFields(req.body, ['reason']);
        const { reason } = allowedFields;

        // IDOR protection: verify ownership
        const period = await FiscalPeriod.findOne({
            _id: periodId,
            lawyerId: req.user._id
        });

        if (!period) {
            return res.status(404).json({ success: false, message: 'Fiscal period not found' });
        }

        // Prevent locking already locked periods
        if (period.isLocked) {
            return res.status(400).json({
                success: false,
                message: 'Period is already locked'
            });
        }

        await period.lock(req.user._id, reason);

        res.json({ success: true, data: period });
    } catch (error) {
        logger.error('Error locking period', { error: error.message });
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Calculate period balances
 */
const calculateBalances = async (req, res) => {
    try {
        // Sanitize and validate ID parameter
        const periodId = sanitizeObjectId(req.params.id);
        if (!periodId) {
            return res.status(400).json({ success: false, message: 'Invalid period ID' });
        }

        // IDOR protection: verify ownership
        const period = await FiscalPeriod.findOne({
            _id: periodId,
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
        logger.error('Error calculating balances', { error: error.message });
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Perform year-end closing
 */
const yearEndClosing = async (req, res) => {
    try {
        // Sanitize and validate ID parameter
        const periodId = sanitizeObjectId(req.params.id);
        if (!periodId) {
            return res.status(400).json({ success: false, message: 'Invalid period ID' });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // IDOR protection: verify ownership
            const period = await FiscalPeriod.findOne({
                _id: periodId,
                lawyerId: req.user._id
            }).session(session);

            if (!period) {
                await session.abortTransaction();
                return res.status(404).json({ success: false, message: 'Fiscal period not found' });
            }

            // Prevent unauthorized modifications on locked periods
            if (period.isLocked) {
                await session.abortTransaction();
                return res.status(403).json({
                    success: false,
                    message: 'Cannot perform year-end closing on a locked period'
                });
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
        logger.error('Error performing year-end closing', { error: error.message });
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Check if can post to date
 */
const canPostToDate = async (req, res) => {
    try {
        const { date } = req.query;

        // Input validation for date
        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'date query parameter is required'
            });
        }

        // Validate date format and ensure it's a valid date
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Please provide a valid date'
            });
        }

        // Prevent dates too far in the past or future
        const minDate = new Date('1900-01-01');
        const maxDate = new Date('2100-12-31');
        if (parsedDate < minDate || parsedDate > maxDate) {
            return res.status(400).json({
                success: false,
                message: 'Date must be between 1900-01-01 and 2100-12-31'
            });
        }

        const canPost = await FiscalPeriod.canPostToDate(req.user._id, parsedDate);
        const period = await FiscalPeriod.getPeriodForDate(req.user._id, parsedDate);

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
        logger.error('Error checking post date', { error: error.message });
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
        logger.error('Error getting fiscal years summary', { error: error.message });
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
