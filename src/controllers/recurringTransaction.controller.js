/**
 * Recurring Transaction Controller
 */

const RecurringTransaction = require('../models/recurringTransaction.model');
const { toHalalas, toSAR } = require('../utils/currency');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const mongoose = require('mongoose');

/**
 * Get all recurring transactions
 */
const getRecurringTransactions = async (req, res) => {
    try {
        let { type, status, page = 1, limit = 20 } = req.query;
        const lawyerId = req.user._id;

        // Validate pagination parameters
        page = parseInt(page);
        limit = parseInt(limit);

        if (isNaN(page) || page < 1) {
            return res.status(400).json({
                success: false,
                message: 'Page must be a positive number'
            });
        }

        if (isNaN(limit) || limit < 1 || limit > 100) {
            return res.status(400).json({
                success: false,
                message: 'Limit must be a positive number between 1 and 100'
            });
        }

        const query = { lawyerId };

        // Validate type if provided
        if (type) {
            const validTypes = ['invoice', 'expense', 'bill'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid type. Must be one of: invoice, expense, bill'
                });
            }
            query.transactionType = type;
        }

        // Validate status if provided
        if (status) {
            const validStatuses = ['active', 'paused', 'completed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status. Must be one of: active, paused, completed, cancelled'
                });
            }
            query.status = status;
        }

        const skip = (page - 1) * limit;

        const [transactions, total] = await Promise.all([
            RecurringTransaction.find(query)
                .populate('clientId', 'name email')
                .populate('vendorId', 'name')
                .populate('caseId', 'caseNumber title')
                .sort({ nextDueDate: 1 })
                .skip(skip)
                .limit(limit),
            RecurringTransaction.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: transactions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching recurring transactions:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get single recurring transaction
 */
const getRecurringTransaction = async (req, res) => {
    try {
        const transactionId = sanitizeObjectId(req.params.id);
        if (!transactionId) {
            return res.status(400).json({ success: false, message: 'Invalid transaction ID' });
        }

        const transaction = await RecurringTransaction.findOne({
            _id: transactionId,
            lawyerId: req.user._id
        })
            .populate('clientId', 'name email phone')
            .populate('vendorId', 'name email')
            .populate('caseId', 'caseNumber title')
            .populate('generatedTransactions.transactionId');

        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Recurring transaction not found' });
        }

        res.json({ success: true, data: transaction });
    } catch (error) {
        console.error('Error fetching recurring transaction:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Create recurring transaction
 */
const createRecurringTransaction = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Mass assignment protection
        const allowedFields = [
            'name', 'nameAr', 'transactionType', 'frequency', 'dayOfMonth', 'dayOfWeek',
            'startDate', 'endDate', 'maxOccurrences', 'clientId', 'caseId', 'vendorId',
            'items', 'vatRate', 'paymentTerms', 'notes', 'autoSend', 'autoApprove',
            'notifyDaysBefore', 'notifyOnCreation'
        ];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // Input validation - required fields
        if (!sanitizedData.name || !sanitizedData.transactionType || !sanitizedData.frequency ||
            !sanitizedData.startDate || !sanitizedData.items) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: name, transactionType, frequency, startDate, items'
            });
        }

        // Validate transaction type
        const validTypes = ['invoice', 'expense', 'bill'];
        if (!validTypes.includes(sanitizedData.transactionType)) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Invalid transaction type. Must be one of: invoice, expense, bill'
            });
        }

        // Validate frequency
        const validFrequencies = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
        if (!validFrequencies.includes(sanitizedData.frequency)) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Invalid frequency. Must be one of: daily, weekly, monthly, quarterly, yearly'
            });
        }

        // Validate frequency-specific fields
        if (sanitizedData.frequency === 'monthly' && !sanitizedData.dayOfMonth) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'dayOfMonth is required for monthly frequency'
            });
        }

        if (sanitizedData.frequency === 'weekly' && !sanitizedData.dayOfWeek) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'dayOfWeek is required for weekly frequency'
            });
        }

        // Validate dayOfMonth range
        if (sanitizedData.dayOfMonth && (sanitizedData.dayOfMonth < 1 || sanitizedData.dayOfMonth > 31)) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'dayOfMonth must be between 1 and 31'
            });
        }

        // Validate dayOfWeek range
        if (sanitizedData.dayOfWeek !== undefined && (sanitizedData.dayOfWeek < 0 || sanitizedData.dayOfWeek > 6)) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'dayOfWeek must be between 0 (Sunday) and 6 (Saturday)'
            });
        }

        // Validate dates
        const startDate = new Date(sanitizedData.startDate);
        if (isNaN(startDate.getTime())) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Invalid startDate format'
            });
        }

        let endDate;
        if (sanitizedData.endDate) {
            endDate = new Date(sanitizedData.endDate);
            if (isNaN(endDate.getTime())) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: 'Invalid endDate format'
                });
            }
            if (endDate <= startDate) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: 'endDate must be after startDate'
                });
            }
        }

        // Validate items array
        if (!Array.isArray(sanitizedData.items) || sanitizedData.items.length === 0) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Items must be a non-empty array'
            });
        }

        // Validate and sanitize object IDs
        if (sanitizedData.clientId) {
            sanitizedData.clientId = sanitizeObjectId(sanitizedData.clientId);
            if (!sanitizedData.clientId) {
                await session.abortTransaction();
                return res.status(400).json({ success: false, message: 'Invalid clientId' });
            }
        }

        if (sanitizedData.caseId) {
            sanitizedData.caseId = sanitizeObjectId(sanitizedData.caseId);
            if (!sanitizedData.caseId) {
                await session.abortTransaction();
                return res.status(400).json({ success: false, message: 'Invalid caseId' });
            }
        }

        if (sanitizedData.vendorId) {
            sanitizedData.vendorId = sanitizeObjectId(sanitizedData.vendorId);
            if (!sanitizedData.vendorId) {
                await session.abortTransaction();
                return res.status(400).json({ success: false, message: 'Invalid vendorId' });
            }
        }

        // Calculate totals from items
        let subtotal = 0;
        const processedItems = sanitizedData.items.map((item, index) => {
            // Validate item fields
            if (!item.description) {
                throw new Error(`Item ${index + 1}: description is required`);
            }

            if (item.unitPrice === undefined || item.unitPrice === null) {
                throw new Error(`Item ${index + 1}: unitPrice is required`);
            }

            const unitPrice = typeof item.unitPrice === 'number' && item.unitPrice > 1000 ?
                item.unitPrice : toHalalas(item.unitPrice);

            // Validate positive amounts
            if (unitPrice <= 0) {
                throw new Error(`Item ${index + 1}: unitPrice must be a positive number`);
            }

            const quantity = item.quantity || 1;
            if (quantity <= 0) {
                throw new Error(`Item ${index + 1}: quantity must be a positive number`);
            }

            subtotal += unitPrice * quantity;
            return { ...item, unitPrice, quantity };
        });

        // Validate vatRate
        const vat = sanitizedData.vatRate !== undefined ? sanitizedData.vatRate : 15;
        if (vat < 0 || vat > 100) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'vatRate must be between 0 and 100'
            });
        }

        // Validate paymentTerms
        if (sanitizedData.paymentTerms !== undefined && sanitizedData.paymentTerms < 0) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'paymentTerms must be a non-negative number'
            });
        }

        // Validate maxOccurrences
        if (sanitizedData.maxOccurrences !== undefined && sanitizedData.maxOccurrences <= 0) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'maxOccurrences must be a positive number'
            });
        }

        const vatAmount = Math.round(subtotal * (vat / 100));
        const totalAmount = subtotal + vatAmount;

        const transaction = new RecurringTransaction({
            name: sanitizedData.name,
            nameAr: sanitizedData.nameAr,
            transactionType: sanitizedData.transactionType,
            frequency: sanitizedData.frequency,
            dayOfMonth: sanitizedData.dayOfMonth,
            dayOfWeek: sanitizedData.dayOfWeek,
            startDate,
            endDate,
            nextDueDate: startDate,
            maxOccurrences: sanitizedData.maxOccurrences,
            clientId: sanitizedData.clientId,
            caseId: sanitizedData.caseId,
            vendorId: sanitizedData.vendorId,
            items: processedItems,
            subtotal,
            vatRate: vat,
            vatAmount,
            totalAmount,
            paymentTerms: sanitizedData.paymentTerms || 30,
            notes: sanitizedData.notes,
            autoSend: sanitizedData.autoSend,
            autoApprove: sanitizedData.autoApprove,
            notifyDaysBefore: sanitizedData.notifyDaysBefore,
            notifyOnCreation: sanitizedData.notifyOnCreation,
            lawyerId: req.user._id,
            createdBy: req.user._id
        });

        await transaction.save({ session });
        await session.commitTransaction();

        res.status(201).json({ success: true, data: transaction });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error creating recurring transaction:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

/**
 * Update recurring transaction
 */
const updateRecurringTransaction = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const transactionId = sanitizeObjectId(req.params.id);
        if (!transactionId) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Invalid transaction ID' });
        }

        const transaction = await RecurringTransaction.findOne({
            _id: transactionId,
            lawyerId: req.user._id
        }).session(session);

        if (!transaction) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Recurring transaction not found' });
        }

        if (transaction.status === 'completed' || transaction.status === 'cancelled') {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Cannot update completed or cancelled recurring transactions'
            });
        }

        // Mass assignment protection
        const allowedFields = [
            'name', 'nameAr', 'frequency', 'dayOfMonth', 'dayOfWeek',
            'endDate', 'maxOccurrences', 'items', 'vatRate', 'paymentTerms',
            'notes', 'autoSend', 'autoApprove', 'notifyDaysBefore', 'notifyOnCreation'
        ];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // Validate frequency if provided
        if (sanitizedData.frequency) {
            const validFrequencies = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
            if (!validFrequencies.includes(sanitizedData.frequency)) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: 'Invalid frequency. Must be one of: daily, weekly, monthly, quarterly, yearly'
                });
            }
        }

        // Validate dayOfMonth if provided
        if (sanitizedData.dayOfMonth && (sanitizedData.dayOfMonth < 1 || sanitizedData.dayOfMonth > 31)) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'dayOfMonth must be between 1 and 31'
            });
        }

        // Validate dayOfWeek if provided
        if (sanitizedData.dayOfWeek !== undefined && (sanitizedData.dayOfWeek < 0 || sanitizedData.dayOfWeek > 6)) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'dayOfWeek must be between 0 (Sunday) and 6 (Saturday)'
            });
        }

        // Validate endDate if provided
        if (sanitizedData.endDate) {
            const endDate = new Date(sanitizedData.endDate);
            if (isNaN(endDate.getTime())) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: 'Invalid endDate format'
                });
            }
            if (endDate <= transaction.startDate) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: 'endDate must be after startDate'
                });
            }
        }

        // Validate vatRate if provided
        if (sanitizedData.vatRate !== undefined && (sanitizedData.vatRate < 0 || sanitizedData.vatRate > 100)) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'vatRate must be between 0 and 100'
            });
        }

        // Validate paymentTerms if provided
        if (sanitizedData.paymentTerms !== undefined && sanitizedData.paymentTerms < 0) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'paymentTerms must be a non-negative number'
            });
        }

        // Validate maxOccurrences if provided
        if (sanitizedData.maxOccurrences !== undefined && sanitizedData.maxOccurrences <= 0) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'maxOccurrences must be a positive number'
            });
        }

        // Apply allowed updates
        allowedFields.forEach(field => {
            if (sanitizedData[field] !== undefined) {
                transaction[field] = sanitizedData[field];
            }
        });

        // Recalculate totals if items changed
        if (sanitizedData.items) {
            // Validate items array
            if (!Array.isArray(sanitizedData.items) || sanitizedData.items.length === 0) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: 'Items must be a non-empty array'
                });
            }

            let subtotal = 0;
            transaction.items = sanitizedData.items.map((item, index) => {
                // Validate item fields
                if (!item.description) {
                    throw new Error(`Item ${index + 1}: description is required`);
                }

                if (item.unitPrice === undefined || item.unitPrice === null) {
                    throw new Error(`Item ${index + 1}: unitPrice is required`);
                }

                const unitPrice = typeof item.unitPrice === 'number' && item.unitPrice > 1000 ?
                    item.unitPrice : toHalalas(item.unitPrice);

                // Validate positive amounts
                if (unitPrice <= 0) {
                    throw new Error(`Item ${index + 1}: unitPrice must be a positive number`);
                }

                const quantity = item.quantity || 1;
                if (quantity <= 0) {
                    throw new Error(`Item ${index + 1}: quantity must be a positive number`);
                }

                subtotal += unitPrice * quantity;
                return { ...item, unitPrice, quantity };
            });

            transaction.subtotal = subtotal;
            transaction.vatAmount = Math.round(subtotal * (transaction.vatRate / 100));
            transaction.totalAmount = subtotal + transaction.vatAmount;
        }

        await transaction.save({ session });
        await session.commitTransaction();

        res.json({ success: true, data: transaction });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error updating recurring transaction:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

/**
 * Pause recurring transaction
 */
const pauseRecurringTransaction = async (req, res) => {
    try {
        const transactionId = sanitizeObjectId(req.params.id);
        if (!transactionId) {
            return res.status(400).json({ success: false, message: 'Invalid transaction ID' });
        }

        const transaction = await RecurringTransaction.findOne({
            _id: transactionId,
            lawyerId: req.user._id
        });

        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Recurring transaction not found' });
        }

        if (transaction.status !== 'active') {
            return res.status(400).json({ success: false, message: 'Only active transactions can be paused' });
        }

        transaction.status = 'paused';
        await transaction.save();

        res.json({ success: true, data: transaction });
    } catch (error) {
        console.error('Error pausing recurring transaction:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Resume recurring transaction
 */
const resumeRecurringTransaction = async (req, res) => {
    try {
        const transactionId = sanitizeObjectId(req.params.id);
        if (!transactionId) {
            return res.status(400).json({ success: false, message: 'Invalid transaction ID' });
        }

        const transaction = await RecurringTransaction.findOne({
            _id: transactionId,
            lawyerId: req.user._id
        });

        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Recurring transaction not found' });
        }

        if (transaction.status !== 'paused') {
            return res.status(400).json({ success: false, message: 'Only paused transactions can be resumed' });
        }

        // Update next due date if it's in the past
        if (transaction.nextDueDate < new Date()) {
            transaction.nextDueDate = transaction.calculateNextDueDate(new Date());
        }

        transaction.status = 'active';
        await transaction.save();

        res.json({ success: true, data: transaction });
    } catch (error) {
        console.error('Error resuming recurring transaction:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Cancel recurring transaction
 */
const cancelRecurringTransaction = async (req, res) => {
    try {
        const transactionId = sanitizeObjectId(req.params.id);
        if (!transactionId) {
            return res.status(400).json({ success: false, message: 'Invalid transaction ID' });
        }

        const transaction = await RecurringTransaction.findOne({
            _id: transactionId,
            lawyerId: req.user._id
        });

        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Recurring transaction not found' });
        }

        if (transaction.status === 'cancelled' || transaction.status === 'completed') {
            return res.status(400).json({ success: false, message: 'Transaction already cancelled or completed' });
        }

        transaction.status = 'cancelled';
        await transaction.save();

        res.json({ success: true, data: transaction });
    } catch (error) {
        console.error('Error cancelling recurring transaction:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Generate next transaction manually
 */
const generateTransaction = async (req, res) => {
    try {
        const transactionId = sanitizeObjectId(req.params.id);
        if (!transactionId) {
            return res.status(400).json({ success: false, message: 'Invalid transaction ID' });
        }

        const transaction = await RecurringTransaction.findOne({
            _id: transactionId,
            lawyerId: req.user._id
        });

        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Recurring transaction not found' });
        }

        const generated = await transaction.generate();

        res.json({
            success: true,
            message: 'Transaction generated successfully',
            data: generated
        });
    } catch (error) {
        console.error('Error generating transaction:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Process all due recurring transactions
 */
const processDueTransactions = async (req, res) => {
    try {
        const result = await RecurringTransaction.processAllDue();

        res.json({
            success: true,
            message: `Processed ${result.processed} transactions with ${result.errors} errors`,
            data: result
        });
    } catch (error) {
        console.error('Error processing due transactions:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get upcoming recurring transactions
 */
const getUpcomingTransactions = async (req, res) => {
    try {
        let { days = 30 } = req.query;
        const lawyerId = req.user._id;

        // Validate days parameter
        days = parseInt(days);
        if (isNaN(days) || days <= 0 || days > 365) {
            return res.status(400).json({
                success: false,
                message: 'Days parameter must be a positive number between 1 and 365'
            });
        }

        const endDate = new Date();
        endDate.setDate(endDate.getDate() + days);

        const transactions = await RecurringTransaction.find({
            lawyerId,
            status: 'active',
            nextDueDate: { $lte: endDate }
        })
            .populate('clientId', 'name')
            .populate('vendorId', 'name')
            .sort({ nextDueDate: 1 });

        res.json({ success: true, data: transactions });
    } catch (error) {
        console.error('Error fetching upcoming transactions:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getRecurringTransactions,
    getRecurringTransaction,
    createRecurringTransaction,
    updateRecurringTransaction,
    pauseRecurringTransaction,
    resumeRecurringTransaction,
    cancelRecurringTransaction,
    generateTransaction,
    processDueTransactions,
    getUpcomingTransactions
};
