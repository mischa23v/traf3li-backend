/**
 * Lock Date Middleware
 *
 * Enforces lock date restrictions on financial transactions following Odoo-style
 * fiscal period controls. Prevents creation/modification of records before
 * configured lock dates for different transaction types.
 *
 * Usage:
 *   router.post('/invoices', authenticate, checkInvoiceLockDate, createInvoice);
 *   router.post('/payments', authenticate, checkPaymentLockDate, createPayment);
 *   router.post('/expenses', authenticate, checkExpenseLockDate, createExpense);
 */

const logger = require('../utils/logger');
const LockDate = require('../models/lockDate.model');

/**
 * Extract transaction date from various possible fields in request
 * @param {object} req - Express request object
 * @returns {Date|null} Extracted date or null
 */
const extractTransactionDate = (req) => {
    // Check common date fields in order of priority
    const dateFields = [
        'date',
        'transactionDate',
        'invoiceDate',
        'issueDate',
        'paymentDate',
        'expenseDate',
        'entryDate'
    ];

    for (const field of dateFields) {
        if (req.body[field]) {
            return new Date(req.body[field]);
        }
    }

    return null;
};

/**
 * Extract firm ID from request context
 * @param {object} req - Express request object
 * @returns {string|null} Firm ID or null
 */
const extractFirmId = (req) => {
    return req.firmId || req.user?.firmId || null;
};

/**
 * Format lock date for error message
 * @param {Date} lockDate - Lock date
 * @returns {string} Formatted date string
 */
const formatLockDate = (lockDate) => {
    if (!lockDate) return '';
    return lockDate.toISOString().split('T')[0];
};

/**
 * Factory function that returns middleware to check lock date
 * @param {string} lockType - Type of lock to check ('all', 'sale', 'purchase', 'bank', 'expense', 'journal')
 * @returns {Function} Express middleware
 */
const checkLockDate = (lockType = 'all') => {
    return async (req, res, next) => {
        try {
            // Extract date from request body
            const date = extractTransactionDate(req);

            // If no date provided, skip lock date check (validation will catch it)
            if (!date) {
                return next();
            }

            // Extract firm ID
            const firmId = extractFirmId(req);

            // If no firm ID, skip check (solo lawyers or system operations)
            if (!firmId) {
                return next();
            }

            // Check if date is locked
            const lockCheck = await LockDate.checkDateLocked(firmId, date, lockType);

            if (lockCheck.isLocked) {
                const formattedLockDate = formatLockDate(lockCheck.lockDate);
                return res.status(403).json({
                    success: false,
                    error: 'Date locked',
                    message: `لا يمكن إنشاء/تعديل السجلات قبل تاريخ القفل (${formattedLockDate}). تواصل مع المسؤول.`,
                    messageEn: `Cannot create/modify records before the lock date (${formattedLockDate}). Contact your administrator.`,
                    lockDate: formattedLockDate,
                    lockType: lockCheck.lockType,
                    lockReason: lockCheck.message,
                    code: 'DATE_LOCKED'
                });
            }

            next();
        } catch (error) {
            logger.error('Lock date check error:', error);
            // Don't block on error, log and continue
            next();
        }
    };
};

/**
 * Middleware for invoice operations
 * Automatically determines lock type based on invoice type
 */
const checkInvoiceLockDate = async (req, res, next) => {
    try {
        // Extract date
        const date = extractTransactionDate(req);

        if (!date) {
            return next();
        }

        // Extract firm ID
        const firmId = extractFirmId(req);

        if (!firmId) {
            return next();
        }

        // Determine lock type based on invoice type
        const invoiceType = req.body.invoiceType || req.body.type;
        let lockType = 'all';

        if (invoiceType === 'sale' || invoiceType === 'sales' || invoiceType === 'income') {
            lockType = 'sale';
        } else if (invoiceType === 'purchase' || invoiceType === 'expense') {
            lockType = 'purchase';
        }

        // Check lock date
        const lockCheck = await LockDate.checkDateLocked(firmId, date, lockType);

        if (lockCheck.isLocked) {
            const formattedLockDate = formatLockDate(lockCheck.lockDate);
            return res.status(403).json({
                success: false,
                error: 'Date locked',
                message: `لا يمكن إنشاء/تعديل الفواتير قبل تاريخ القفل (${formattedLockDate}). تواصل مع المسؤول.`,
                messageEn: `Cannot create/modify invoices before the lock date (${formattedLockDate}). Contact your administrator.`,
                lockDate: formattedLockDate,
                lockType: lockCheck.lockType,
                lockReason: lockCheck.message,
                code: 'INVOICE_DATE_LOCKED'
            });
        }

        next();
    } catch (error) {
        logger.error('Invoice lock date check error:', error);
        next();
    }
};

/**
 * Middleware for payment operations
 * Determines lock type based on payment context
 */
const checkPaymentLockDate = async (req, res, next) => {
    try {
        // Extract date
        const date = extractTransactionDate(req);

        if (!date) {
            return next();
        }

        // Extract firm ID
        const firmId = extractFirmId(req);

        if (!firmId) {
            return next();
        }

        // Determine lock type based on payment type or related invoice
        const paymentType = req.body.paymentType || req.body.type;
        let lockType = 'all';

        if (paymentType === 'received' || paymentType === 'income' || paymentType === 'sale') {
            lockType = 'sale';
        } else if (paymentType === 'made' || paymentType === 'expense' || paymentType === 'purchase') {
            lockType = 'purchase';
        } else if (paymentType === 'bank' || req.body.bankAccountId) {
            lockType = 'bank';
        }

        // Check lock date
        const lockCheck = await LockDate.checkDateLocked(firmId, date, lockType);

        if (lockCheck.isLocked) {
            const formattedLockDate = formatLockDate(lockCheck.lockDate);
            return res.status(403).json({
                success: false,
                error: 'Date locked',
                message: `لا يمكن إنشاء/تعديل المدفوعات قبل تاريخ القفل (${formattedLockDate}). تواصل مع المسؤول.`,
                messageEn: `Cannot create/modify payments before the lock date (${formattedLockDate}). Contact your administrator.`,
                lockDate: formattedLockDate,
                lockType: lockCheck.lockType,
                lockReason: lockCheck.message,
                code: 'PAYMENT_DATE_LOCKED'
            });
        }

        next();
    } catch (error) {
        logger.error('Payment lock date check error:', error);
        next();
    }
};

/**
 * Middleware for expense operations
 * Uses 'expense' or 'purchase' lock type
 */
const checkExpenseLockDate = async (req, res, next) => {
    try {
        // Extract date
        const date = extractTransactionDate(req);

        if (!date) {
            return next();
        }

        // Extract firm ID
        const firmId = extractFirmId(req);

        if (!firmId) {
            return next();
        }

        // Expenses typically use purchase lock type
        const lockType = 'purchase';

        // Check lock date
        const lockCheck = await LockDate.checkDateLocked(firmId, date, lockType);

        if (lockCheck.isLocked) {
            const formattedLockDate = formatLockDate(lockCheck.lockDate);
            return res.status(403).json({
                success: false,
                error: 'Date locked',
                message: `لا يمكن إنشاء/تعديل المصروفات قبل تاريخ القفل (${formattedLockDate}). تواصل مع المسؤول.`,
                messageEn: `Cannot create/modify expenses before the lock date (${formattedLockDate}). Contact your administrator.`,
                lockDate: formattedLockDate,
                lockType: lockCheck.lockType,
                lockReason: lockCheck.message,
                code: 'EXPENSE_DATE_LOCKED'
            });
        }

        next();
    } catch (error) {
        logger.error('Expense lock date check error:', error);
        next();
    }
};

/**
 * Middleware for bank transaction operations
 * Uses 'bank' lock type
 */
const checkBankLockDate = async (req, res, next) => {
    try {
        // Extract date
        const date = extractTransactionDate(req);

        if (!date) {
            return next();
        }

        // Extract firm ID
        const firmId = extractFirmId(req);

        if (!firmId) {
            return next();
        }

        // Bank transactions use bank lock type
        const lockType = 'bank';

        // Check lock date
        const lockCheck = await LockDate.checkDateLocked(firmId, date, lockType);

        if (lockCheck.isLocked) {
            const formattedLockDate = formatLockDate(lockCheck.lockDate);
            return res.status(403).json({
                success: false,
                error: 'Date locked',
                message: `لا يمكن إنشاء/تعديل المعاملات البنكية قبل تاريخ القفل (${formattedLockDate}). تواصل مع المسؤول.`,
                messageEn: `Cannot create/modify bank transactions before the lock date (${formattedLockDate}). Contact your administrator.`,
                lockDate: formattedLockDate,
                lockType: lockCheck.lockType,
                lockReason: lockCheck.message,
                code: 'BANK_DATE_LOCKED'
            });
        }

        next();
    } catch (error) {
        logger.error('Bank lock date check error:', error);
        next();
    }
};

/**
 * Middleware for journal entries
 * Uses 'journal' or 'all' lock type
 */
const checkJournalLockDate = async (req, res, next) => {
    try {
        // Extract date
        const date = extractTransactionDate(req);

        if (!date) {
            return next();
        }

        // Extract firm ID
        const firmId = extractFirmId(req);

        if (!firmId) {
            return next();
        }

        // Journal entries use journal lock type
        const lockType = 'journal';

        // Check lock date
        const lockCheck = await LockDate.checkDateLocked(firmId, date, lockType);

        if (lockCheck.isLocked) {
            const formattedLockDate = formatLockDate(lockCheck.lockDate);
            return res.status(403).json({
                success: false,
                error: 'Date locked',
                message: `لا يمكن إنشاء/تعديل القيود اليومية قبل تاريخ القفل (${formattedLockDate}). تواصل مع المسؤول.`,
                messageEn: `Cannot create/modify journal entries before the lock date (${formattedLockDate}). Contact your administrator.`,
                lockDate: formattedLockDate,
                lockType: lockCheck.lockType,
                lockReason: lockCheck.message,
                code: 'JOURNAL_DATE_LOCKED'
            });
        }

        next();
    } catch (error) {
        logger.error('Journal lock date check error:', error);
        next();
    }
};

/**
 * Generic middleware for checking any financial operation
 * Extracts date from specified field and checks against 'all' lock type
 * @param {string} dateField - Field name containing the date (default: 'date')
 * @returns {Function} Express middleware
 */
const requireUnlockedPeriod = (dateField = 'date') => {
    return async (req, res, next) => {
        try {
            // Extract date from specified field
            const date = req.body[dateField] ? new Date(req.body[dateField]) : extractTransactionDate(req);

            if (!date) {
                return next();
            }

            // Extract firm ID
            const firmId = extractFirmId(req);

            if (!firmId) {
                return next();
            }

            // Check against 'all' lock type
            const lockCheck = await LockDate.checkDateLocked(firmId, date, 'all');

            if (lockCheck.isLocked) {
                const formattedLockDate = formatLockDate(lockCheck.lockDate);
                return res.status(403).json({
                    success: false,
                    error: 'Period locked',
                    message: `لا يمكن إنشاء/تعديل السجلات قبل تاريخ القفل (${formattedLockDate}). تواصل مع المسؤول.`,
                    messageEn: `Cannot create/modify records before the lock date (${formattedLockDate}). Contact your administrator.`,
                    lockDate: formattedLockDate,
                    lockType: lockCheck.lockType,
                    lockReason: lockCheck.message,
                    code: 'PERIOD_LOCKED'
                });
            }

            next();
        } catch (error) {
            logger.error('Period lock check error:', error);
            next();
        }
    };
};

module.exports = {
    checkLockDate,
    checkInvoiceLockDate,
    checkPaymentLockDate,
    checkExpenseLockDate,
    checkBankLockDate,
    checkJournalLockDate,
    requireUnlockedPeriod,
    extractTransactionDate,
    extractFirmId
};
