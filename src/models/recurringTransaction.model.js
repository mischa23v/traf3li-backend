/**
 * Recurring Transaction Model
 *
 * Supports recurring bills (rent, subscriptions) and invoices (retainers)
 * Creates transactions automatically based on schedule
 */

const mongoose = require('mongoose');

const recurringTransactionSchema = new mongoose.Schema({
    // Identification
    templateId: {
        type: String,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    nameAr: {
        type: String,
        trim: true,
        maxlength: 200
    },

    // Type of recurring transaction
    transactionType: {
        type: String,
        enum: ['invoice', 'bill', 'expense', 'journal_entry'],
        required: true
    },

    // Schedule configuration
    frequency: {
        type: String,
        enum: ['daily', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual'],
        required: true
    },
    dayOfMonth: {
        type: Number,
        min: 1,
        max: 31,
        default: 1 // For monthly/quarterly/annual
    },
    dayOfWeek: {
        type: Number,
        min: 0,
        max: 6 // 0 = Sunday, 6 = Saturday (for weekly/bi_weekly)
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date // Optional - null means indefinite
    },
    nextDueDate: {
        type: Date,
        required: true,
        index: true
    },

    // Execution limits
    maxOccurrences: {
        type: Number,
        min: 1
    },
    occurrencesCreated: {
        type: Number,
        default: 0
    },

    // Status
    status: {
        type: String,
        enum: ['active', 'paused', 'completed', 'cancelled'],
        default: 'active',
        index: true
    },

    // Invoice template fields
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case'
    },

    // Bill template fields
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor'
    },

    // Common financial fields
    items: [{
        description: {
            type: String,
            required: true
        },
        descriptionAr: String,
        quantity: {
            type: Number,
            default: 1
        },
        unitPrice: {
            type: Number,
            required: true // In halalas
        },
        // For bills: link to expense account
        expenseAccountId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Account'
        },
        // For invoices: link to income account
        incomeAccountId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Account'
        },
        caseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Case'
        }
    }],

    // Amount (calculated from items)
    subtotal: {
        type: Number,
        required: true // In halalas
    },
    vatRate: {
        type: Number,
        default: 15
    },
    vatAmount: {
        type: Number,
        default: 0 // In halalas
    },
    totalAmount: {
        type: Number,
        required: true // In halalas
    },

    // Payment terms
    paymentTerms: {
        type: Number,
        default: 30 // Days from creation
    },

    // Notes
    notes: {
        type: String,
        maxlength: 2000
    },
    internalNotes: {
        type: String,
        maxlength: 2000
    },

    // Auto-actions
    autoSend: {
        type: Boolean,
        default: false // For invoices: auto-send to client
    },
    autoApprove: {
        type: Boolean,
        default: false // For bills/expenses: auto-approve
    },

    // Notification settings
    notifyDaysBefore: {
        type: Number,
        default: 3 // Days before nextDueDate to notify
    },
    notifyOnCreation: {
        type: Boolean,
        default: true
    },

    // Ownership
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // History of created transactions
    generatedTransactions: [{
        transactionId: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'generatedTransactions.transactionModel'
        },
        transactionModel: {
            type: String,
            enum: ['Invoice', 'Bill', 'Expense', 'JournalEntry']
        },
        transactionNumber: String,
        generatedDate: {
            type: Date,
            default: Date.now
        },
        amount: Number,
        status: String
    }],

    // Last execution tracking
    lastGeneratedDate: {
        type: Date
    },
    lastError: {
        message: String,
        date: Date
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
recurringTransactionSchema.index({ lawyerId: 1, status: 1 });
recurringTransactionSchema.index({ nextDueDate: 1, status: 1 });
recurringTransactionSchema.index({ transactionType: 1, status: 1 });

// Pre-save hook to generate template ID
recurringTransactionSchema.pre('save', async function(next) {
    if (!this.templateId) {
        const prefix = this.transactionType === 'invoice' ? 'RCI' :
                       this.transactionType === 'bill' ? 'RCB' :
                       this.transactionType === 'expense' ? 'RCE' : 'RCJ';
        const count = await this.constructor.countDocuments({ transactionType: this.transactionType });
        this.templateId = `${prefix}-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

/**
 * Calculate next due date based on frequency
 */
recurringTransactionSchema.methods.calculateNextDueDate = function(fromDate = null) {
    const current = fromDate || this.nextDueDate || new Date();
    const next = new Date(current);

    switch (this.frequency) {
        case 'daily':
            next.setDate(next.getDate() + 1);
            break;
        case 'weekly':
            next.setDate(next.getDate() + 7);
            break;
        case 'bi_weekly':
            next.setDate(next.getDate() + 14);
            break;
        case 'monthly':
            next.setMonth(next.getMonth() + 1);
            // Handle month overflow (e.g., Jan 31 -> Feb 28)
            if (this.dayOfMonth) {
                const targetDay = Math.min(this.dayOfMonth, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate());
                next.setDate(targetDay);
            }
            break;
        case 'quarterly':
            next.setMonth(next.getMonth() + 3);
            if (this.dayOfMonth) {
                const targetDay = Math.min(this.dayOfMonth, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate());
                next.setDate(targetDay);
            }
            break;
        case 'semi_annual':
            next.setMonth(next.getMonth() + 6);
            if (this.dayOfMonth) {
                const targetDay = Math.min(this.dayOfMonth, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate());
                next.setDate(targetDay);
            }
            break;
        case 'annual':
            next.setFullYear(next.getFullYear() + 1);
            break;
    }

    return next;
};

/**
 * Generate the next transaction
 */
recurringTransactionSchema.methods.generate = async function(session = null) {
    // Check if we should generate
    if (this.status !== 'active') {
        throw new Error('Recurring transaction is not active');
    }

    if (this.endDate && new Date() > this.endDate) {
        this.status = 'completed';
        await this.save(session ? { session } : {});
        throw new Error('Recurring transaction has ended');
    }

    if (this.maxOccurrences && this.occurrencesCreated >= this.maxOccurrences) {
        this.status = 'completed';
        await this.save(session ? { session } : {});
        throw new Error('Maximum occurrences reached');
    }

    const options = session ? { session } : {};
    let transaction;
    let transactionNumber;

    try {
        switch (this.transactionType) {
            case 'invoice':
                transaction = await this._generateInvoice(session);
                transactionNumber = transaction.invoiceNumber;
                break;
            case 'bill':
                transaction = await this._generateBill(session);
                transactionNumber = transaction.billNumber;
                break;
            case 'expense':
                transaction = await this._generateExpense(session);
                transactionNumber = transaction.expenseId;
                break;
            case 'journal_entry':
                transaction = await this._generateJournalEntry(session);
                transactionNumber = transaction.entryNumber;
                break;
        }

        // Update tracking
        this.generatedTransactions.push({
            transactionId: transaction._id,
            transactionModel: this.transactionType === 'journal_entry' ? 'JournalEntry' :
                             this.transactionType.charAt(0).toUpperCase() + this.transactionType.slice(1),
            transactionNumber,
            generatedDate: new Date(),
            amount: this.totalAmount,
            status: transaction.status
        });

        this.occurrencesCreated += 1;
        this.lastGeneratedDate = new Date();
        this.nextDueDate = this.calculateNextDueDate();
        this.lastError = null;

        // Check if completed
        if (this.endDate && this.nextDueDate > this.endDate) {
            this.status = 'completed';
        }
        if (this.maxOccurrences && this.occurrencesCreated >= this.maxOccurrences) {
            this.status = 'completed';
        }

        await this.save(options);

        return transaction;
    } catch (error) {
        this.lastError = {
            message: error.message,
            date: new Date()
        };
        await this.save(options);
        throw error;
    }
};

/**
 * Generate invoice from template
 */
recurringTransactionSchema.methods._generateInvoice = async function(session = null) {
    const Invoice = mongoose.model('Invoice');

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + this.paymentTerms);

    const invoice = new Invoice({
        // invoiceNumber will be auto-generated by model's pre-save hook using atomic counter
        firmId: this.firmId, // Include firmId for multi-tenancy
        clientId: this.clientId,
        caseId: this.caseId,
        lawyerId: this.lawyerId,
        items: this.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice
        })),
        subtotal: this.subtotal,
        vatRate: this.vatRate,
        vatAmount: this.vatAmount,
        totalAmount: this.totalAmount,
        balanceDue: this.totalAmount,
        status: this.autoSend ? 'sent' : 'draft',
        issueDate: new Date(),
        dueDate,
        notes: this.notes,
        history: [{
            action: 'created',
            date: new Date(),
            user: this.createdBy,
            note: `Generated from recurring template ${this.templateId}`
        }]
    });

    const options = session ? { session } : {};
    await invoice.save(options);

    return invoice;
};

/**
 * Generate bill from template
 */
recurringTransactionSchema.methods._generateBill = async function(session = null) {
    const Bill = mongoose.model('Bill');

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + this.paymentTerms);

    // Generate bill number
    const count = await Bill.countDocuments();
    const now = new Date();
    const billNumber = `BILL-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(count + 1).padStart(4, '0')}`;

    const bill = new Bill({
        billNumber,
        vendorId: this.vendorId,
        lawyerId: this.lawyerId,
        lines: this.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitCost: item.unitPrice,
            totalCost: item.quantity * item.unitPrice,
            expenseAccountId: item.expenseAccountId,
            caseId: item.caseId || this.caseId
        })),
        subtotal: this.subtotal,
        vatRate: this.vatRate,
        vatAmount: this.vatAmount,
        totalAmount: this.totalAmount,
        balanceDue: this.totalAmount,
        status: this.autoApprove ? 'approved' : 'pending',
        billDate: new Date(),
        dueDate,
        notes: this.notes
    });

    const options = session ? { session } : {};
    await bill.save(options);

    return bill;
};

/**
 * Generate expense from template
 */
recurringTransactionSchema.methods._generateExpense = async function(session = null) {
    const Expense = mongoose.model('Expense');

    const expense = new Expense({
        lawyerId: this.lawyerId,
        caseId: this.caseId,
        clientId: this.clientId,
        category: 'other',
        description: this.name,
        amount: this.totalAmount,
        date: new Date(),
        status: this.autoApprove ? 'approved' : 'pending',
        notes: this.notes
    });

    const options = session ? { session } : {};
    await expense.save(options);

    return expense;
};

/**
 * Generate journal entry from template
 */
recurringTransactionSchema.methods._generateJournalEntry = async function(session = null) {
    const JournalEntry = mongoose.model('JournalEntry');

    const journalEntry = new JournalEntry({
        description: this.name,
        descriptionAr: this.nameAr,
        transactionDate: new Date(),
        lines: this.items.map(item => ({
            accountId: item.expenseAccountId || item.incomeAccountId,
            debit: item.unitPrice > 0 ? item.unitPrice : 0,
            credit: item.unitPrice < 0 ? Math.abs(item.unitPrice) : 0,
            description: item.description
        })),
        status: 'draft',
        lawyerId: this.lawyerId,
        createdBy: this.createdBy,
        notes: this.notes
    });

    const options = session ? { session } : {};
    await journalEntry.save(options);

    return journalEntry;
};

/**
 * Static: Get due recurring transactions
 */
recurringTransactionSchema.statics.getDueTransactions = async function(asOfDate = new Date()) {
    return this.find({
        status: 'active',
        nextDueDate: { $lte: asOfDate }
    }).sort({ nextDueDate: 1 });
};

/**
 * Static: Process all due recurring transactions
 */
recurringTransactionSchema.statics.processAllDue = async function(asOfDate = new Date()) {
    const dueTransactions = await this.getDueTransactions(asOfDate);
    const results = {
        processed: 0,
        errors: 0,
        transactions: []
    };

    for (const recurring of dueTransactions) {
        try {
            const transaction = await recurring.generate();
            results.processed++;
            results.transactions.push({
                templateId: recurring.templateId,
                transactionId: transaction._id,
                success: true
            });
        } catch (error) {
            results.errors++;
            results.transactions.push({
                templateId: recurring.templateId,
                error: error.message,
                success: false
            });
        }
    }

    return results;
};

module.exports = mongoose.model('RecurringTransaction', recurringTransactionSchema);
