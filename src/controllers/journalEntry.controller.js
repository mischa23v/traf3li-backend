const JournalEntry = require('../models/journalEntry.model');
const Account = require('../models/account.model');
const asyncHandler = require('../utils/asyncHandler');
const mongoose = require('mongoose');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

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

    // IDOR Protection: Filter by firmId
    if (req.user?.firmId) {
        query.firmId = req.user.firmId;
    }

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
    // IDOR Protection: Filter by firmId in query
    const query = { _id: req.params.id };
    if (req.user?.firmId) {
        query.firmId = req.user.firmId;
    }

    const entry = await JournalEntry.findOne(query)
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
    // Mass Assignment Protection: Only allow specific fields
    const allowedFields = ['date', 'description', 'descriptionAr', 'entryType', 'lines', 'notes', 'attachments'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const {
        date,
        description,
        descriptionAr,
        entryType,
        lines,
        notes,
        attachments
    } = safeData;

    // Validate required fields
    if (!date || !description || !lines || lines.length < 2) {
        return res.status(400).json({
            success: false,
            error: 'Date, description, and at least 2 lines are required'
        });
    }

    // Input Validation: Validate amounts and calculate totals
    let totalDebit = 0;
    let totalCredit = 0;

    // Validate each line has account and debit XOR credit
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.accountId) {
            return res.status(400).json({
                success: false,
                error: `Line ${i + 1}: Account is required`
            });
        }

        // Input Validation: Validate amounts are valid numbers
        if (line.debit !== undefined && line.debit !== null) {
            const debit = Number(line.debit);
            if (isNaN(debit) || debit < 0) {
                return res.status(400).json({
                    success: false,
                    error: `Line ${i + 1}: Debit must be a non-negative number`
                });
            }
            line.debit = debit;
            totalDebit += debit;
        }

        if (line.credit !== undefined && line.credit !== null) {
            const credit = Number(line.credit);
            if (isNaN(credit) || credit < 0) {
                return res.status(400).json({
                    success: false,
                    error: `Line ${i + 1}: Credit must be a non-negative number`
                });
            }
            line.credit = credit;
            totalCredit += credit;
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

        // Verify account exists and belongs to user's firm
        const accountQuery = { _id: line.accountId };
        if (req.user?.firmId) {
            accountQuery.firmId = req.user.firmId;
        }
        const account = await Account.findOne(accountQuery);
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

    // Validate Debit/Credit Balance
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return res.status(400).json({
            success: false,
            error: `Entry is not balanced. Total Debits: ${totalDebit}, Total Credits: ${totalCredit}, Difference: ${Math.abs(totalDebit - totalCredit)}`
        });
    }

    // MongoDB Transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const entry = await JournalEntry.create([{
            firmId: req.user?.firmId,
            date,
            description,
            descriptionAr,
            entryType: entryType || 'other',
            lines,
            notes,
            attachments,
            status: 'draft',
            createdBy: req.user?._id
        }], { session });

        const populatedEntry = await JournalEntry.findOne({ _id: entry[0]._id, ...req.firmQuery })
            .populate('lines.accountId', 'code name')
            .session(session);

        await session.commitTransaction();

        res.status(201).json({
            success: true,
            data: {
                ...populatedEntry.toObject(),
                totalDebit: populatedEntry.totalDebit,
                totalCredit: populatedEntry.totalCredit,
                isBalanced: populatedEntry.isBalanced
            }
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * Update draft journal entry
 * PATCH /api/journal-entries/:id
 */
const updateEntry = asyncHandler(async (req, res) => {
    // IDOR Protection: Filter by firmId in query
    const query = { _id: req.params.id };
    if (req.user?.firmId) {
        query.firmId = req.user.firmId;
    }

    const entry = await JournalEntry.findOne(query);

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

    // Mass Assignment Protection: Only allow specific fields
    const allowedFields = [
        'date', 'description', 'descriptionAr', 'entryType',
        'lines', 'notes', 'attachments'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Validate lines if provided
    if (safeData.lines) {
        if (safeData.lines.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Entry must have at least 2 lines'
            });
        }

        // Input Validation: Validate amounts and calculate totals
        let totalDebit = 0;
        let totalCredit = 0;

        for (let i = 0; i < safeData.lines.length; i++) {
            const line = safeData.lines[i];

            // Input Validation: Validate amounts are valid numbers
            if (line.debit !== undefined && line.debit !== null) {
                const debit = Number(line.debit);
                if (isNaN(debit) || debit < 0) {
                    return res.status(400).json({
                        success: false,
                        error: `Line ${i + 1}: Debit must be a non-negative number`
                    });
                }
                line.debit = debit;
                totalDebit += debit;
            }

            if (line.credit !== undefined && line.credit !== null) {
                const credit = Number(line.credit);
                if (isNaN(credit) || credit < 0) {
                    return res.status(400).json({
                        success: false,
                        error: `Line ${i + 1}: Credit must be a non-negative number`
                    });
                }
                line.credit = credit;
                totalCredit += credit;
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

            // Verify account exists and belongs to user's firm
            if (line.accountId) {
                const accountQuery = { _id: line.accountId };
                if (req.user?.firmId) {
                    accountQuery.firmId = req.user.firmId;
                }
                const account = await Account.findOne(accountQuery);
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
        }

        // Validate Debit/Credit Balance
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            return res.status(400).json({
                success: false,
                error: `Entry is not balanced. Total Debits: ${totalDebit}, Total Credits: ${totalCredit}, Difference: ${Math.abs(totalDebit - totalCredit)}`
            });
        }
    }

    // MongoDB Transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        allowedFields.forEach(field => {
            if (safeData[field] !== undefined) {
                entry[field] = safeData[field];
            }
        });

        entry.updatedBy = req.user?._id;
        await entry.save({ session });

        const populatedEntry = await JournalEntry.findOne({ _id: entry._id, ...req.firmQuery })
            .populate('lines.accountId', 'code name')
            .session(session);

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            data: {
                ...populatedEntry.toObject(),
                totalDebit: populatedEntry.totalDebit,
                totalCredit: populatedEntry.totalCredit,
                isBalanced: populatedEntry.isBalanced
            }
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * Post journal entry to GL
 * POST /api/journal-entries/:id/post
 */
const postEntry = asyncHandler(async (req, res) => {
    // IDOR Protection: Filter by firmId in query
    const query = { _id: req.params.id };
    if (req.user?.firmId) {
        query.firmId = req.user.firmId;
    }

    const entry = await JournalEntry.findOne(query);

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
    const validation = entry.validateEntry();
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

        const populatedEntry = await JournalEntry.findOne({ _id: entry._id, ...req.firmQuery })
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
    // IDOR Protection: Filter by firmId in query
    const query = { _id: req.params.id };
    if (req.user?.firmId) {
        query.firmId = req.user.firmId;
    }

    const entry = await JournalEntry.findOne(query);

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
    // Mass Assignment Protection: Only allow reason field
    const safeData = pickAllowedFields(req.body, ['reason']);
    const { reason } = safeData;

    if (!reason) {
        return res.status(400).json({
            success: false,
            error: 'Void reason is required'
        });
    }

    // IDOR Protection: Filter by firmId in query
    const query = { _id: req.params.id };
    if (req.user?.firmId) {
        query.firmId = req.user.firmId;
    }

    const entry = await JournalEntry.findOne(query);

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
    // Mass Assignment Protection: Only allow specific fields
    const allowedFields = ['date', 'description', 'descriptionAr', 'debitAccountId', 'creditAccountId', 'amount', 'caseId', 'notes', 'entryType'];
    const safeData = pickAllowedFields(req.body, allowedFields);

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
    } = safeData;

    // Validate required fields
    if (!date || !description || !debitAccountId || !creditAccountId || !amount) {
        return res.status(400).json({
            success: false,
            error: 'Date, description, debitAccountId, creditAccountId, and amount are required'
        });
    }

    // Input Validation: Validate amount is a positive number
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({
            success: false,
            error: 'Amount must be a positive number'
        });
    }

    // Verify accounts exist and belong to user's firm/lawyer (using req.firmQuery for tenant isolation)
    const [debitAccount, creditAccount] = await Promise.all([
        Account.findOne({ _id: debitAccountId, ...req.firmQuery }),
        Account.findOne({ _id: creditAccountId, ...req.firmQuery })
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

    if (!debitAccount.isActive) {
        return res.status(400).json({
            success: false,
            error: `Debit account ${debitAccount.code} is inactive`
        });
    }

    if (!creditAccount.isActive) {
        return res.status(400).json({
            success: false,
            error: `Credit account ${creditAccount.code} is inactive`
        });
    }

    // MongoDB Transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const entry = await JournalEntry.createSimpleEntry({
            firmId: req.user?.firmId,
            date,
            description,
            descriptionAr,
            debitAccountId,
            creditAccountId,
            amount: parsedAmount,
            caseId,
            notes,
            entryType,
            createdBy: req.user?._id
        }, session);

        const populatedEntry = await JournalEntry.findById(entry._id)
            .populate('lines.accountId', 'code name')
            .session(session);

        await session.commitTransaction();

        res.status(201).json({
            success: true,
            data: {
                ...populatedEntry.toObject(),
                totalDebit: populatedEntry.totalDebit,
                totalCredit: populatedEntry.totalCredit,
                isBalanced: populatedEntry.isBalanced
            }
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
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
