/**
 * Recurring Transaction Controller
 */

const RecurringTransaction = require('../models/recurringTransaction.model');
const { toHalalas, toSAR } = require('../utils/currency');

/**
 * Get all recurring transactions
 */
const getRecurringTransactions = async (req, res) => {
    try {
        const { type, status, page = 1, limit = 20 } = req.query;
        const lawyerId = req.user._id;

        const query = { lawyerId };
        if (type) query.transactionType = type;
        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [transactions, total] = await Promise.all([
            RecurringTransaction.find(query)
                .populate('clientId', 'name email')
                .populate('vendorId', 'name')
                .populate('caseId', 'caseNumber title')
                .sort({ nextDueDate: 1 })
                .skip(skip)
                .limit(parseInt(limit)),
            RecurringTransaction.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: transactions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
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
        const transaction = await RecurringTransaction.findOne({
            _id: req.params.id,
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
    try {
        const {
            name,
            nameAr,
            transactionType,
            frequency,
            dayOfMonth,
            dayOfWeek,
            startDate,
            endDate,
            maxOccurrences,
            clientId,
            caseId,
            vendorId,
            items,
            vatRate,
            paymentTerms,
            notes,
            autoSend,
            autoApprove
        } = req.body;

        // Calculate totals from items
        let subtotal = 0;
        const processedItems = items.map(item => {
            const unitPrice = typeof item.unitPrice === 'number' && item.unitPrice > 1000 ?
                item.unitPrice : toHalalas(item.unitPrice);
            const quantity = item.quantity || 1;
            subtotal += unitPrice * quantity;
            return { ...item, unitPrice };
        });

        const vat = vatRate || 15;
        const vatAmount = Math.round(subtotal * (vat / 100));
        const totalAmount = subtotal + vatAmount;

        const transaction = new RecurringTransaction({
            name,
            nameAr,
            transactionType,
            frequency,
            dayOfMonth,
            dayOfWeek,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : undefined,
            nextDueDate: new Date(startDate),
            maxOccurrences,
            clientId,
            caseId,
            vendorId,
            items: processedItems,
            subtotal,
            vatRate: vat,
            vatAmount,
            totalAmount,
            paymentTerms: paymentTerms || 30,
            notes,
            autoSend,
            autoApprove,
            lawyerId: req.user._id,
            createdBy: req.user._id
        });

        await transaction.save();

        res.status(201).json({ success: true, data: transaction });
    } catch (error) {
        console.error('Error creating recurring transaction:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update recurring transaction
 */
const updateRecurringTransaction = async (req, res) => {
    try {
        const transaction = await RecurringTransaction.findOne({
            _id: req.params.id,
            lawyerId: req.user._id
        });

        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Recurring transaction not found' });
        }

        if (transaction.status === 'completed' || transaction.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Cannot update completed or cancelled recurring transactions'
            });
        }

        const allowedUpdates = [
            'name', 'nameAr', 'frequency', 'dayOfMonth', 'dayOfWeek',
            'endDate', 'maxOccurrences', 'items', 'vatRate', 'paymentTerms',
            'notes', 'autoSend', 'autoApprove', 'notifyDaysBefore', 'notifyOnCreation'
        ];

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                transaction[field] = req.body[field];
            }
        });

        // Recalculate totals if items changed
        if (req.body.items) {
            let subtotal = 0;
            transaction.items = req.body.items.map(item => {
                const unitPrice = typeof item.unitPrice === 'number' && item.unitPrice > 1000 ?
                    item.unitPrice : toHalalas(item.unitPrice);
                const quantity = item.quantity || 1;
                subtotal += unitPrice * quantity;
                return { ...item, unitPrice };
            });
            transaction.subtotal = subtotal;
            transaction.vatAmount = Math.round(subtotal * (transaction.vatRate / 100));
            transaction.totalAmount = subtotal + transaction.vatAmount;
        }

        await transaction.save();

        res.json({ success: true, data: transaction });
    } catch (error) {
        console.error('Error updating recurring transaction:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Pause recurring transaction
 */
const pauseRecurringTransaction = async (req, res) => {
    try {
        const transaction = await RecurringTransaction.findOne({
            _id: req.params.id,
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
        const transaction = await RecurringTransaction.findOne({
            _id: req.params.id,
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
        const transaction = await RecurringTransaction.findOne({
            _id: req.params.id,
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
        const transaction = await RecurringTransaction.findOne({
            _id: req.params.id,
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
        const { days = 30 } = req.query;
        const lawyerId = req.user._id;

        const endDate = new Date();
        endDate.setDate(endDate.getDate() + parseInt(days));

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
