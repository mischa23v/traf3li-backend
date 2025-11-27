const { BankTransaction, BankAccount, BillingActivity } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');

// Create manual transaction
const createTransaction = asyncHandler(async (req, res) => {
    const {
        accountId,
        date,
        type,
        amount,
        description,
        reference,
        category,
        payee
    } = req.body;

    const lawyerId = req.userID;

    if (!accountId) {
        throw CustomException('Account ID is required', 400);
    }

    if (!type || !['credit', 'debit'].includes(type)) {
        throw CustomException('Valid transaction type (credit/debit) is required', 400);
    }

    if (!amount || amount <= 0) {
        throw CustomException('Valid amount is required', 400);
    }

    // Validate account exists and belongs to user
    const account = await BankAccount.findById(accountId);
    if (!account || account.lawyerId.toString() !== lawyerId) {
        throw CustomException('Account not found or access denied', 404);
    }

    // Get current balance for balance tracking
    const currentBalance = account.balance;
    const newBalance = type === 'credit'
        ? currentBalance + amount
        : currentBalance - amount;

    const transaction = await BankTransaction.create({
        accountId,
        date: date || new Date(),
        type,
        amount,
        balance: newBalance,
        description,
        reference,
        category,
        payee,
        importSource: 'manual',
        lawyerId
    });

    // Update account balance
    await BankAccount.updateBalance(accountId, amount, type === 'credit' ? 'add' : 'subtract');

    await BillingActivity.logActivity({
        activityType: 'bank_transaction_created',
        userId: lawyerId,
        relatedModel: 'BankTransaction',
        relatedId: transaction._id,
        description: `Transaction ${transaction.transactionId} created: ${type} ${amount}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    return res.status(201).json({
        success: true,
        message: 'Transaction created successfully',
        transaction
    });
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

    if (accountId) filters.accountId = accountId;
    if (type) filters.type = type;
    if (matched !== undefined) filters.matched = matched === 'true';
    if (isReconciled !== undefined) filters.isReconciled = isReconciled === 'true';

    if (startDate || endDate) {
        filters.date = {};
        if (startDate) filters.date.$gte = new Date(startDate);
        if (endDate) filters.date.$lte = new Date(endDate);
    }

    if (search) {
        filters.$or = [
            { description: { $regex: search, $options: 'i' } },
            { payee: { $regex: search, $options: 'i' } },
            { reference: { $regex: search, $options: 'i' } }
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

    const transaction = await BankTransaction.findById(id)
        .populate('accountId', 'name bankName accountNumber');

    if (!transaction) {
        throw CustomException('Transaction not found', 404);
    }

    if (transaction.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this transaction', 403);
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

    // Validate account exists and belongs to user
    const account = await BankAccount.findById(accountId);
    if (!account || account.lawyerId.toString() !== lawyerId) {
        throw CustomException('Account not found or access denied', 404);
    }

    if (!req.file) {
        throw CustomException('File is required', 400);
    }

    // Parse the file based on type
    const fileContent = req.file.buffer.toString('utf-8');
    const fileType = req.file.originalname.split('.').pop().toLowerCase();

    let parsedTransactions = [];
    const batchId = `IMP-${Date.now()}`;

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

    const results = await BankTransaction.importTransactions(
        accountId,
        lawyerId,
        parsedTransactions,
        fileType,
        batchId
    );

    await BillingActivity.logActivity({
        activityType: 'bank_transactions_imported',
        userId: lawyerId,
        relatedModel: 'BankAccount',
        relatedId: accountId,
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
    const { type, recordId } = req.body;
    const lawyerId = req.userID;

    const transaction = await BankTransaction.findById(transactionId);

    if (!transaction) {
        throw CustomException('Transaction not found', 404);
    }

    if (transaction.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this transaction', 403);
    }

    if (transaction.matched) {
        throw CustomException('Transaction already matched', 400);
    }

    if (!type || !['Invoice', 'Expense', 'Payment', 'BankTransfer'].includes(type)) {
        throw CustomException('Valid match type required (Invoice, Expense, Payment, BankTransfer)', 400);
    }

    if (!recordId) {
        throw CustomException('Record ID is required', 400);
    }

    const updatedTransaction = await BankTransaction.matchTransaction(transactionId, type, recordId);

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

    const transaction = await BankTransaction.findById(transactionId);

    if (!transaction) {
        throw CustomException('Transaction not found', 404);
    }

    if (transaction.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this transaction', 403);
    }

    if (!transaction.matched) {
        throw CustomException('Transaction is not matched', 400);
    }

    const updatedTransaction = await BankTransaction.unmatchTransaction(transactionId);

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
