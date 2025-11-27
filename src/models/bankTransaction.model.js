const mongoose = require('mongoose');

const bankTransactionSchema = new mongoose.Schema({
    transactionId: {
        type: String,
        unique: true,
        index: true
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankAccount',
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['credit', 'debit'],
        required: true,
        index: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0.01
    },
    balance: {
        type: Number
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    reference: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        trim: true
    },
    payee: {
        type: String,
        trim: true,
        maxlength: 200
    },
    matched: {
        type: Boolean,
        default: false,
        index: true
    },
    matchedTransactionId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'matchedType'
    },
    matchedType: {
        type: String,
        enum: ['Invoice', 'Expense', 'Payment', 'BankTransfer']
    },
    reconciliationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankReconciliation'
    },
    isReconciled: {
        type: Boolean,
        default: false,
        index: true
    },
    reconciledAt: Date,
    importBatchId: {
        type: String,
        index: true
    },
    importSource: {
        type: String,
        enum: ['manual', 'csv', 'ofx', 'qif', 'api', 'sync'],
        default: 'manual'
    },
    rawData: {
        type: mongoose.Schema.Types.Mixed
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
bankTransactionSchema.index({ accountId: 1, date: -1 });
bankTransactionSchema.index({ lawyerId: 1, date: -1 });
bankTransactionSchema.index({ lawyerId: 1, matched: 1 });
bankTransactionSchema.index({ lawyerId: 1, isReconciled: 1 });
bankTransactionSchema.index({ accountId: 1, isReconciled: 1, date: -1 });
bankTransactionSchema.index({ description: 'text', payee: 'text', reference: 'text' });

// Pre-save hook to generate transaction ID
bankTransactionSchema.pre('save', async function(next) {
    if (!this.transactionId) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const count = await this.constructor.countDocuments({
            createdAt: {
                $gte: new Date(year, date.getMonth(), 1),
                $lt: new Date(year, date.getMonth() + 1, 1)
            }
        });
        this.transactionId = `TXN-${year}${month}-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

// Note: Balance updates are handled in the controller for manual transactions.
// Imported transactions do not update balances as they are historical records.

// Static method: Match transaction with system record
bankTransactionSchema.statics.matchTransaction = async function(transactionId, matchedType, recordId) {
    return await this.findByIdAndUpdate(
        transactionId,
        {
            matched: true,
            matchedType,
            matchedTransactionId: recordId
        },
        { new: true }
    );
};

// Static method: Unmatch transaction
bankTransactionSchema.statics.unmatchTransaction = async function(transactionId) {
    return await this.findByIdAndUpdate(
        transactionId,
        {
            matched: false,
            matchedType: null,
            matchedTransactionId: null
        },
        { new: true }
    );
};

// Static method: Import transactions from parsed data
bankTransactionSchema.statics.importTransactions = async function(accountId, lawyerId, transactions, importSource, batchId) {
    const results = {
        imported: 0,
        duplicates: 0,
        errors: []
    };

    for (let i = 0; i < transactions.length; i++) {
        const txn = transactions[i];
        try {
            // Check for duplicates based on date, amount, and reference
            const existing = await this.findOne({
                accountId,
                date: txn.date,
                amount: txn.amount,
                reference: txn.reference
            });

            if (existing) {
                results.duplicates++;
                continue;
            }

            await this.create({
                accountId,
                lawyerId,
                date: txn.date,
                type: txn.type,
                amount: txn.amount,
                description: txn.description,
                reference: txn.reference,
                payee: txn.payee,
                category: txn.category,
                balance: txn.balance,
                importBatchId: batchId,
                importSource,
                rawData: txn.rawData
            });

            results.imported++;
        } catch (error) {
            results.errors.push({
                row: i + 1,
                error: error.message
            });
        }
    }

    return results;
};

// Static method: Get unreconciled transactions for an account
bankTransactionSchema.statics.getUnreconciled = async function(accountId, startDate, endDate) {
    const filters = {
        accountId: new mongoose.Types.ObjectId(accountId),
        isReconciled: false
    };

    if (startDate || endDate) {
        filters.date = {};
        if (startDate) filters.date.$gte = new Date(startDate);
        if (endDate) filters.date.$lte = new Date(endDate);
    }

    return await this.find(filters).sort({ date: -1 });
};

module.exports = mongoose.model('BankTransaction', bankTransactionSchema);
