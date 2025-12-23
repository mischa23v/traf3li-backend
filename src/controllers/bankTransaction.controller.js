const { BankTransaction, BankAccount, BillingActivity } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const mongoose = require('mongoose');

// Create manual transaction
const createTransaction = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['accountId', 'date', 'type', 'amount', 'description', 'reference', 'category', 'payee'];
    const data = pickAllowedFields(req.body, allowedFields);

    // Sanitize and validate accountId (IDOR protection)
    const sanitizedAccountId = sanitizeObjectId(data.accountId);
    if (!sanitizedAccountId) {
        throw CustomException('Valid account ID is required', 400);
    }

    // Validate transaction type
    if (!data.type || !['credit', 'debit'].includes(data.type)) {
        throw CustomException('Valid transaction type (credit/debit) is required', 400);
    }

    // Enhanced amount validation
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0 || !isFinite(amount)) {
        throw CustomException('Valid amount is required (must be positive number)', 400);
    }
    if (amount > 999999999.99) {
        throw CustomException('Amount exceeds maximum allowed value', 400);
    }

    // Enhanced date validation
    let transactionDate;
    if (data.date) {
        transactionDate = new Date(data.date);
        if (isNaN(transactionDate.getTime())) {
            throw CustomException('Invalid date format', 400);
        }
        // Prevent future dates beyond reasonable threshold
        const futureLimit = new Date();
        futureLimit.setDate(futureLimit.getDate() + 30);
        if (transactionDate > futureLimit) {
            throw CustomException('Date cannot be more than 30 days in the future', 400);
        }
        // Prevent dates too far in the past
        const pastLimit = new Date();
        pastLimit.setFullYear(pastLimit.getFullYear() - 10);
        if (transactionDate < pastLimit) {
            throw CustomException('Date cannot be more than 10 years in the past', 400);
        }
    } else {
        transactionDate = new Date();
    }

    // IDOR protection: Validate account exists and belongs to user
    const account = await BankAccount.findById(sanitizedAccountId);
    if (!account) {
        throw CustomException('Account not found', 404);
    }
    if (account.lawyerId.toString() !== lawyerId) {
        throw CustomException('Access denied: You do not own this account', 403);
    }

    // Use MongoDB transaction for atomic balance update
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Get current balance for balance tracking
        const currentBalance = account.balance || 0;
        const newBalance = data.type === 'credit'
            ? currentBalance + amount
            : currentBalance - amount;

        // Create transaction record
        const [transaction] = await BankTransaction.create([{
            accountId: sanitizedAccountId,
            date: transactionDate,
            type: data.type,
            amount,
            balance: newBalance,
            description: data.description,
            reference: data.reference,
            category: data.category,
            payee: data.payee,
            importSource: 'manual',
            lawyerId
        }], { session });

        // Update account balance
        await BankAccount.updateBalance(sanitizedAccountId, amount, data.type === 'credit' ? 'add' : 'subtract');

        // Commit the transaction
        await session.commitTransaction();

        // Log activity after successful transaction
        await BillingActivity.logActivity({
            activityType: 'bank_transaction_created',
            userId: lawyerId,
            relatedModel: 'BankTransaction',
            relatedId: transaction._id,
            description: `Transaction ${transaction.transactionId} created: ${data.type} ${amount}`,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        return res.status(201).json({
            success: true,
            message: 'Transaction created successfully',
            transaction
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

// Get transactions
const getTransactions = asyncHandler(async (req, res) => {
    const {
        accountId,
        startDate,
        endDate,
        type,
        matched,
        isReconciled,
        search,
        page = 1,
        limit = 50
    } = req.query;

    const lawyerId = req.userID;
    const filters = { lawyerId };

    // IDOR protection: Sanitize accountId if provided
    if (accountId) {
        const sanitizedAccountId = sanitizeObjectId(accountId);
        if (!sanitizedAccountId) {
            throw CustomException('Invalid account ID format', 400);
        }
        // Verify account ownership
        const account = await BankAccount.findById(sanitizedAccountId);
        if (!account) {
            throw CustomException('Account not found', 404);
        }
        if (account.lawyerId.toString() !== lawyerId) {
            throw CustomException('Access denied: You do not own this account', 403);
        }
        filters.accountId = sanitizedAccountId;
    }

    if (type && ['credit', 'debit'].includes(type)) {
        filters.type = type;
    }
    if (matched !== undefined) filters.matched = matched === 'true';
    if (isReconciled !== undefined) filters.isReconciled = isReconciled === 'true';

    // Enhanced date validation
    if (startDate || endDate) {
        filters.date = {};
        if (startDate) {
            const start = new Date(startDate);
            if (isNaN(start.getTime())) {
                throw CustomException('Invalid start date format', 400);
            }
            filters.date.$gte = start;
        }
        if (endDate) {
            const end = new Date(endDate);
            if (isNaN(end.getTime())) {
                throw CustomException('Invalid end date format', 400);
            }
            filters.date.$lte = end;
        }
    }

    if (search) {
        // Sanitize search input to prevent regex injection
        const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filters.$or = [
            { description: { $regex: sanitizedSearch, $options: 'i' } },
            { payee: { $regex: sanitizedSearch, $options: 'i' } },
            { reference: { $regex: sanitizedSearch, $options: 'i' } }
        ];
    }

    const transactions = await BankTransaction.find(filters)
        .populate('accountId', 'name bankName accountNumber')
        .sort({ date: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await BankTransaction.countDocuments(filters);

    return res.json({
        success: true,
        transactions,
        total
    });
});

// Get single transaction
const getTransaction = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    // IDOR protection: Sanitize transaction ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid transaction ID format', 400);
    }

    const transaction = await BankTransaction.findById(sanitizedId)
        .populate('accountId', 'name bankName accountNumber');

    if (!transaction) {
        throw CustomException('Transaction not found', 404);
    }

    // IDOR protection: Verify ownership
    if (transaction.lawyerId.toString() !== lawyerId) {
        throw CustomException('Access denied: You do not own this transaction', 403);
    }

    return res.json({
        success: true,
        transaction
    });
});

// Import transactions from file
const importTransactions = asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    const lawyerId = req.userID;

    // IDOR protection: Sanitize and validate accountId
    const sanitizedAccountId = sanitizeObjectId(accountId);
    if (!sanitizedAccountId) {
        throw CustomException('Invalid account ID format', 400);
    }

    // Validate account exists and belongs to user
    const account = await BankAccount.findById(sanitizedAccountId);
    if (!account) {
        throw CustomException('Account not found', 404);
    }
    if (account.lawyerId.toString() !== lawyerId) {
        throw CustomException('Access denied: You do not own this account', 403);
    }

    if (!req.file) {
        throw CustomException('File is required', 400);
    }

    // Validate file size (prevent DOS attacks)
    if (req.file.size > 10 * 1024 * 1024) { // 10MB limit
        throw CustomException('File size exceeds 10MB limit', 400);
    }

    // Parse the file based on type
    const fileContent = req.file.buffer.toString('utf-8');
    const fileType = req.file.originalname.split('.').pop().toLowerCase();

    let parsedTransactions = [];
    const batchId = `IMP-${Date.now()}-${lawyerId}`;

    try {
        if (fileType === 'csv') {
            parsedTransactions = parseCSV(fileContent);
        } else if (fileType === 'ofx') {
            parsedTransactions = parseOFX(fileContent);
        } else if (fileType === 'qif') {
            parsedTransactions = parseQIF(fileContent);
        } else {
            throw CustomException('Unsupported file format. Use CSV, OFX, or QIF.', 400);
        }
    } catch (error) {
        throw CustomException(`Error parsing file: ${error.message}`, 400);
    }

    // Validate parsed transactions count
    if (parsedTransactions.length === 0) {
        throw CustomException('No valid transactions found in file', 400);
    }
    if (parsedTransactions.length > 10000) {
        throw CustomException('File contains too many transactions (max 10,000)', 400);
    }

    // Enhanced duplicate detection: Check for duplicates in current batch
    const uniqueTransactions = [];
    const seenKeys = new Set();

    for (const txn of parsedTransactions) {
        // Validate amount
        if (isNaN(txn.amount) || txn.amount <= 0 || !isFinite(txn.amount)) {
            continue; // Skip invalid transactions
        }

        // Validate date
        if (!txn.date || isNaN(txn.date.getTime())) {
            continue; // Skip invalid dates
        }

        // Create unique key for duplicate detection within the batch
        const key = `${txn.date.getTime()}-${txn.amount}-${txn.reference || ''}`;
        if (!seenKeys.has(key)) {
            seenKeys.add(key);
            uniqueTransactions.push(txn);
        }
    }

    // Import transactions (model method also checks DB for duplicates)
    const results = await BankTransaction.importTransactions(
        sanitizedAccountId,
        lawyerId,
        uniqueTransactions,
        fileType,
        batchId
    );

    await BillingActivity.logActivity({
        activityType: 'bank_transactions_imported',
        userId: lawyerId,
        relatedModel: 'BankAccount',
        relatedId: sanitizedAccountId,
        description: `Imported ${results.imported} transactions from ${fileType.toUpperCase()}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    return res.json({
        success: true,
        message: 'Transactions imported',
        imported: results.imported,
        duplicates: results.duplicates,
        errors: results.errors
    });
});

// Match transaction with system record
const matchTransaction = asyncHandler(async (req, res) => {
    const { transactionId } = req.params;
    const lawyerId = req.userID;

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['type', 'recordId'];
    const data = pickAllowedFields(req.body, allowedFields);

    // IDOR protection: Sanitize transaction ID
    const sanitizedTransactionId = sanitizeObjectId(transactionId);
    if (!sanitizedTransactionId) {
        throw CustomException('Invalid transaction ID format', 400);
    }

    const transaction = await BankTransaction.findById(sanitizedTransactionId);

    if (!transaction) {
        throw CustomException('Transaction not found', 404);
    }

    // IDOR protection: Verify ownership
    if (transaction.lawyerId.toString() !== lawyerId) {
        throw CustomException('Access denied: You do not own this transaction', 403);
    }

    if (transaction.matched) {
        throw CustomException('Transaction already matched', 400);
    }

    if (!data.type || !['Invoice', 'Expense', 'Payment', 'BankTransfer'].includes(data.type)) {
        throw CustomException('Valid match type required (Invoice, Expense, Payment, BankTransfer)', 400);
    }

    // IDOR protection: Sanitize record ID
    const sanitizedRecordId = sanitizeObjectId(data.recordId);
    if (!sanitizedRecordId) {
        throw CustomException('Valid record ID is required', 400);
    }

    const updatedTransaction = await BankTransaction.matchTransaction(
        sanitizedTransactionId,
        data.type,
        sanitizedRecordId
    );

    return res.json({
        success: true,
        message: 'Transaction matched successfully',
        transaction: updatedTransaction
    });
});

// Unmatch transaction
const unmatchTransaction = asyncHandler(async (req, res) => {
    const { transactionId } = req.params;
    const lawyerId = req.userID;

    // IDOR protection: Sanitize transaction ID
    const sanitizedTransactionId = sanitizeObjectId(transactionId);
    if (!sanitizedTransactionId) {
        throw CustomException('Invalid transaction ID format', 400);
    }

    const transaction = await BankTransaction.findById(sanitizedTransactionId);

    if (!transaction) {
        throw CustomException('Transaction not found', 404);
    }

    // IDOR protection: Verify ownership
    if (transaction.lawyerId.toString() !== lawyerId) {
        throw CustomException('Access denied: You do not own this transaction', 403);
    }

    if (!transaction.matched) {
        throw CustomException('Transaction is not matched', 400);
    }

    const updatedTransaction = await BankTransaction.unmatchTransaction(sanitizedTransactionId);

    return res.json({
        success: true,
        message: 'Transaction unmatched successfully',
        transaction: updatedTransaction
    });
});

// Helper function to parse CSV
function parseCSV(content) {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    const transactions = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((header, idx) => {
            row[header] = values[idx];
        });

        // Map common header names
        const date = row.date || row.transaction_date || row['transaction date'];
        const amount = parseFloat(row.amount || row.value || '0');
        const description = row.description || row.memo || row.narrative || '';

        if (date && !isNaN(amount)) {
            transactions.push({
                date: new Date(date),
                type: amount >= 0 ? 'credit' : 'debit',
                amount: Math.abs(amount),
                description,
                reference: row.reference || row.ref || '',
                payee: row.payee || row.name || '',
                category: row.category || '',
                rawData: row
            });
        }
    }

    return transactions;
}

// Helper function to parse OFX (simplified)
function parseOFX(content) {
    const transactions = [];
    const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;

    while ((match = stmtTrnRegex.exec(content)) !== null) {
        const block = match[1];

        const getTagValue = (tag) => {
            const regex = new RegExp(`<${tag}>([^<\\n]+)`, 'i');
            const m = block.match(regex);
            return m ? m[1].trim() : '';
        };

        const trnType = getTagValue('TRNTYPE');
        const dtPosted = getTagValue('DTPOSTED');
        const trnAmt = parseFloat(getTagValue('TRNAMT') || '0');
        const name = getTagValue('NAME');
        const memo = getTagValue('MEMO');
        const fitid = getTagValue('FITID');

        if (dtPosted && !isNaN(trnAmt)) {
            // Parse OFX date format YYYYMMDD
            const year = dtPosted.substring(0, 4);
            const month = dtPosted.substring(4, 6);
            const day = dtPosted.substring(6, 8);

            transactions.push({
                date: new Date(`${year}-${month}-${day}`),
                type: trnAmt >= 0 ? 'credit' : 'debit',
                amount: Math.abs(trnAmt),
                description: memo || name,
                reference: fitid,
                payee: name,
                category: trnType,
                rawData: { trnType, dtPosted, trnAmt, name, memo, fitid }
            });
        }
    }

    return transactions;
}

// Helper function to parse QIF (simplified)
function parseQIF(content) {
    const transactions = [];
    const records = content.split('^');

    for (const record of records) {
        const lines = record.trim().split('\n');
        const txn = {};

        for (const line of lines) {
            if (!line.trim()) continue;
            const code = line[0];
            const value = line.substring(1).trim();

            switch (code) {
                case 'D': txn.date = value; break;
                case 'T': txn.amount = parseFloat(value.replace(/[,$]/g, '')); break;
                case 'P': txn.payee = value; break;
                case 'M': txn.memo = value; break;
                case 'N': txn.reference = value; break;
                case 'L': txn.category = value; break;
            }
        }

        if (txn.date && !isNaN(txn.amount)) {
            transactions.push({
                date: new Date(txn.date),
                type: txn.amount >= 0 ? 'credit' : 'debit',
                amount: Math.abs(txn.amount),
                description: txn.memo || '',
                reference: txn.reference || '',
                payee: txn.payee || '',
                category: txn.category || '',
                rawData: txn
            });
        }
    }

    return transactions;
}

module.exports = {
    createTransaction,
    getTransactions,
    getTransaction,
    importTransactions,
    matchTransaction,
    unmatchTransaction
};
