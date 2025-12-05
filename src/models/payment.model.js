const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },

    paymentNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    // Accounting account references
    bankAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    },
    receivableAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    },
    // GL entry ID for this payment
    glEntryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GeneralLedger'
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        index: true
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    paymentDate: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'SAR'
    },
    paymentMethod: {
        type: String,
        enum: ['credit_card', 'debit_card', 'bank_transfer', 'cash', 'check', 'online_gateway'],
        required: true
    },
    gatewayProvider: {
        type: String,
        enum: ['stripe', 'paypal', 'hyperpay', 'moyasar', 'other']
    },
    transactionId: String,
    gatewayResponse: mongoose.Schema.Types.Mixed,
    checkNumber: String,
    checkDate: Date,
    bankName: String,
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
        default: 'pending',
        index: true
    },
    allocations: [{
        invoiceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Invoice'
        },
        amount: Number
    }],
    isRefund: {
        type: Boolean,
        default: false
    },
    originalPaymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment'
    },
    refundReason: String,
    refundDate: Date,
    failureReason: String,
    failureDate: Date,
    retryCount: {
        type: Number,
        default: 0
    },
    receiptUrl: String,
    receiptSent: {
        type: Boolean,
        default: false
    },
    receiptSentAt: Date,
    notes: String,
    internalNotes: String,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
paymentSchema.index({ paymentNumber: 1 });
paymentSchema.index({ clientId: 1, paymentDate: -1 });
paymentSchema.index({ lawyerId: 1, status: 1 });
paymentSchema.index({ invoiceId: 1 });

// Auto-generate payment number
paymentSchema.pre('save', async function(next) {
    if (this.isNew && !this.paymentNumber) {
        const year = new Date().getFullYear();
        const count = await this.constructor.countDocuments({
            paymentNumber: new RegExp(`^PAY-${year}`)
        });
        this.paymentNumber = `PAY-${year}-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

/**
 * Post payment to General Ledger
 * DR: Bank/Cash Account
 * CR: Accounts Receivable
 * @param {Session} session - MongoDB session for transactions
 */
paymentSchema.methods.postToGL = async function(session = null) {
    const GeneralLedger = mongoose.model('GeneralLedger');
    const Account = mongoose.model('Account');

    // Check if already posted
    if (this.glEntryId) {
        throw new Error('Payment already posted to GL');
    }

    // Get bank account (use default if not set)
    let bankAcctId = this.bankAccountId;
    if (!bankAcctId) {
        const bankAccount = await Account.findOne({ code: '1102' }); // Bank Account - Main
        if (!bankAccount) throw new Error('Default Bank account not found');
        bankAcctId = bankAccount._id;
        this.bankAccountId = bankAcctId;
    }

    // Get receivable account (use default if not set)
    let receivableAcctId = this.receivableAccountId;
    if (!receivableAcctId) {
        const arAccount = await Account.findOne({ code: '1110' }); // Accounts Receivable
        if (!arAccount) throw new Error('Accounts Receivable account not found');
        receivableAcctId = arAccount._id;
        this.receivableAccountId = receivableAcctId;
    }

    // Convert amount to halalas if needed
    const { toHalalas } = require('../utils/currency');
    const amount = Number.isInteger(this.amount) ? this.amount : toHalalas(this.amount);

    // Create GL entry: DR Bank, CR A/R
    const glEntry = await GeneralLedger.postTransaction({
        transactionDate: this.paymentDate || new Date(),
        description: `Payment ${this.paymentNumber}`,
        descriptionAr: `دفعة ${this.paymentNumber}`,
        debitAccountId: bankAcctId,
        creditAccountId: receivableAcctId,
        amount,
        referenceId: this._id,
        referenceModel: 'Payment',
        referenceNumber: this.paymentNumber,
        caseId: this.caseId,
        clientId: this.clientId,
        lawyerId: this.lawyerId,
        meta: {
            invoiceId: this.invoiceId,
            paymentMethod: this.paymentMethod,
            transactionId: this.transactionId
        },
        createdBy: this.createdBy
    }, session);

    this.glEntryId = glEntry._id;

    const options = session ? { session } : {};
    await this.save(options);

    return glEntry;
};

/**
 * Process refund - creates reversing GL entry
 * @param {String} reason - Refund reason
 * @param {ObjectId} userId - User processing the refund
 * @param {Session} session - MongoDB session for transactions
 */
paymentSchema.methods.processRefund = async function(reason, userId, session = null) {
    const GeneralLedger = mongoose.model('GeneralLedger');

    if (!this.glEntryId) {
        throw new Error('Payment has no GL entry to refund');
    }

    if (this.status === 'refunded') {
        throw new Error('Payment already refunded');
    }

    // Void the original GL entry
    const { voidedEntry, reversingEntry } = await GeneralLedger.voidTransaction(
        this.glEntryId,
        reason || 'Payment refund',
        userId,
        session
    );

    // Update payment status
    this.status = 'refunded';
    this.refundReason = reason;
    this.refundDate = new Date();
    this.isRefund = true;

    const options = session ? { session } : {};
    await this.save(options);

    return { voidedEntry, reversingEntry };
};

module.exports = mongoose.model('Payment', paymentSchema);
