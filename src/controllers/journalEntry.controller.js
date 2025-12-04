const JournalEntry = require('../models/journalEntry.model');
const Account = require('../models/account.model');
const asyncHandler = require('../utils/asyncHandler');
const mongoose = require('mongoose');

/**
 * Get all journal entries
 * GET /api/journal-entries
 * Query params: status, startDate, endDate, entryType, page, limit
 */
const getEntries = asyncHandler(async (req, res) => {
    const {
        status,
        startDate,
        endDate,
        entryType,
        page = 1,
        limit = 50
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (entryType) query.entryType = entryType;

    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [entries, total] = await Promise.all([
        JournalEntry.find(query)
            .populate('lines.accountId', 'code name')
            .populate('lines.caseId', 'caseNumber title')
            .populate('createdBy', 'name email')
            .populate('postedBy', 'name email')
            .sort({ date: -1, createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        JournalEntry.countDocuments(query)
    ]);

    res.status(200).json({
        success: true,
        count: entries.length,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        data: entries
    });
});

/**
 * Get single journal entry
 * GET /api/journal-entries/:id
 */
const getEntry = asyncHandler(async (req, res) => {
    const entry = await JournalEntry.findById(req.params.id)
        .populate('lines.accountId', 'code name type')
        .populate('lines.caseId', 'caseNumber title')
        .populate('glEntries')
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('postedBy', 'name email')
        .populate('voidedBy', 'name email');

    if (!entry) {
        return res.status(404).json({
            success: false,
            error: 'Journal entry not found'
        });
    }

    res.status(200).json({
        success: true,
        data: {
            ...entry.toObject(),
            totalDebit: entry.totalDebit,
            totalCredit: entry.totalCredit,
            isBalanced: entry.isBalanced,
            difference: entry.difference
        }
    });
});

/**
 * Create draft journal entry
 * POST /api/journal-entries
 */
const createEntry = asyncHandler(async (req, res) => {
    const {
        date,
        description,
        descriptionAr,
        entryType,
        lines,
        notes,
        attachments
    } = req.body;

    // Validate required fields
    if (!date || !description || !lines || lines.length < 2) {
        return res.status(400).json({
            success: false,
            error: 'Date, description, and at least 2 lines are required'
        });
    }

    // Validate each line has account and debit XOR credit
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.accountId) {
            return res.status(400).json({
                success: false,
                error: `Line ${i + 1}: Account is required`
            });
        }

        const hasDebit = line.debit && line.debit > 0;
        const hasCredit = line.credit && line.credit > 0;

        if (hasDebit && hasCredit) {
            return res.status(400).json({
                success: false,
                error: `Line ${i + 1}: Cannot have both debit and credit`
            });
        }

        if (!hasDebit && !hasCredit) {
            return res.status(400).json({
                success: false,
                error: `Line ${i + 1}: Must have either debit or credit`
            });
        }

        // Verify account exists
        const account = await Account.findById(line.accountId);
        if (!account) {
            return res.status(400).json({
                success: false,
                error: `Line ${i + 1}: Account not found`
            });
        }

        if (!account.isActive) {
            return res.status(400).json({
                success: false,
                error: `Line ${i + 1}: Account ${account.code} is inactive`
            });
        }
    }

    const entry = await JournalEntry.create({
        date,
        description,
        descriptionAr,
        entryType: entryType || 'other',
        lines,
        notes,
        attachments,
        status: 'draft',
        createdBy: req.user?._id
    });

    const populatedEntry = await JournalEntry.findById(entry._id)
        .populate('lines.accountId', 'code name');

    res.status(201).json({
        success: true,
        data: {
            ...populatedEntry.toObject(),
            totalDebit: populatedEntry.totalDebit,
            totalCredit: populatedEntry.totalCredit,
            isBalanced: populatedEntry.isBalanced
        }
    });
});

/**
 * Update draft journal entry
 * PATCH /api/journal-entries/:id
 */
const updateEntry = asyncHandler(async (req, res) => {
    const entry = await JournalEntry.findById(req.params.id);

    if (!entry) {
        return res.status(404).json({
            success: false,
            error: 'Journal entry not found'
        });
    }

    if (entry.status !== 'draft') {
        return res.status(400).json({
            success: false,
            error: 'Only draft entries can be updated'
        });
    }

    const allowedFields = [
        'date', 'description', 'descriptionAr', 'entryType',
        'lines', 'notes', 'attachments'
    ];

    // Validate lines if provided
    if (req.body.lines) {
        if (req.body.lines.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Entry must have at least 2 lines'
            });
        }

        for (let i = 0; i < req.body.lines.length; i++) {
            const line = req.body.lines[i];
            const hasDebit = line.debit && line.debit > 0;
            const hasCredit = line.credit && line.credit > 0;

            if (hasDebit && hasCredit) {
                return res.status(400).json({
                    success: false,
                    error: `Line ${i + 1}: Cannot have both debit and credit`
                });
            }
        }
    }

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            entry[field] = req.body[field];
        }
    });

    entry.updatedBy = req.user?._id;
    await entry.save();

    const populatedEntry = await JournalEntry.findById(entry._id)
        .populate('lines.accountId', 'code name');

    res.status(200).json({
        success: true,
        data: {
            ...populatedEntry.toObject(),
            totalDebit: populatedEntry.totalDebit,
            totalCredit: populatedEntry.totalCredit,
            isBalanced: populatedEntry.isBalanced
        }
    });
});

/**
 * Post journal entry to GL
 * POST /api/journal-entries/:id/post
 */
const postEntry = asyncHandler(async (req, res) => {
    const entry = await JournalEntry.findById(req.params.id);

    if (!entry) {
        return res.status(404).json({
            success: false,
            error: 'Journal entry not found'
        });
    }

    if (entry.status !== 'draft') {
        return res.status(400).json({
            success: false,
            error: 'Only draft entries can be posted'
        });
    }

    // Validate entry
    const validation = entry.validate();
    if (!validation.isValid) {
        return res.status(400).json({
            success: false,
            error: 'Entry validation failed',
            details: validation.errors
        });
    }

    // Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        await entry.post(req.user?._id, session);
        await session.commitTransaction();

        const populatedEntry = await JournalEntry.findById(entry._id)
            .populate('lines.accountId', 'code name')
            .populate('glEntries');

        res.status(200).json({
            success: true,
            data: populatedEntry,
            message: 'Journal entry posted successfully'
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * Delete draft journal entry
 * DELETE /api/journal-entries/:id
 */
const deleteEntry = asyncHandler(async (req, res) => {
    const entry = await JournalEntry.findById(req.params.id);

    if (!entry) {
        return res.status(404).json({
            success: false,
            error: 'Journal entry not found'
        });
    }

    if (entry.status !== 'draft') {
        return res.status(400).json({
            success: false,
            error: 'Only draft entries can be deleted'
        });
    }

    await entry.deleteOne();

    res.status(200).json({
        success: true,
        data: {},
        message: 'Journal entry deleted successfully'
    });
});

/**
 * Void posted journal entry
 * POST /api/journal-entries/:id/void
 */
const voidEntry = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    if (!reason) {
        return res.status(400).json({
            success: false,
            error: 'Void reason is required'
        });
    }

    const entry = await JournalEntry.findById(req.params.id);

    if (!entry) {
        return res.status(404).json({
            success: false,
            error: 'Journal entry not found'
        });
    }

    if (entry.status !== 'posted') {
        return res.status(400).json({
            success: false,
            error: 'Only posted entries can be voided'
        });
    }

    // Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        await entry.void(reason, req.user?._id, session);
        await session.commitTransaction();

        const populatedEntry = await JournalEntry.findById(entry._id)
            .populate('lines.accountId', 'code name')
            .populate('voidedBy', 'name email');

        res.status(200).json({
            success: true,
            data: populatedEntry,
            message: 'Journal entry voided successfully'
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * Create simple two-line journal entry
 * POST /api/journal-entries/simple
 */
const createSimpleEntry = asyncHandler(async (req, res) => {
    const {
        date,
        description,
        descriptionAr,
        debitAccountId,
        creditAccountId,
        amount,
        caseId,
        notes,
        entryType
    } = req.body;

    // Validate required fields
    if (!date || !description || !debitAccountId || !creditAccountId || !amount) {
        return res.status(400).json({
            success: false,
            error: 'Date, description, debitAccountId, creditAccountId, and amount are required'
        });
    }

    // Verify accounts exist
    const [debitAccount, creditAccount] = await Promise.all([
        Account.findById(debitAccountId),
        Account.findById(creditAccountId)
    ]);

    if (!debitAccount) {
        return res.status(400).json({
            success: false,
            error: 'Debit account not found'
        });
    }

    if (!creditAccount) {
        return res.status(400).json({
            success: false,
            error: 'Credit account not found'
        });
    }

    const entry = await JournalEntry.createSimpleEntry({
        date,
        description,
        descriptionAr,
        debitAccountId,
        creditAccountId,
        amount,
        caseId,
        notes,
        entryType,
        createdBy: req.user?._id
    });

    const populatedEntry = await JournalEntry.findById(entry._id)
        .populate('lines.accountId', 'code name');

    res.status(201).json({
        success: true,
        data: {
            ...populatedEntry.toObject(),
            totalDebit: populatedEntry.totalDebit,
            totalCredit: populatedEntry.totalCredit,
            isBalanced: populatedEntry.isBalanced
        }
    });
});

module.exports = {
    getEntries,
    getEntry,
    createEntry,
    updateEntry,
    postEntry,
    deleteEntry,
    voidEntry,
    createSimpleEntry
};
