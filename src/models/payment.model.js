const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// PAYMENT ENUMS
// ═══════════════════════════════════════════════════════════════
const PAYMENT_TYPES = [
    'customer_payment',
    'vendor_payment',
    'refund',
    'transfer',
    'advance',
    'retainer'
];

const PAYMENT_METHODS = [
    'cash',
    'bank_transfer',
    'sarie',           // SARIE (Saudi fast transfer)
    'check',
    'credit_card',
    'debit_card',
    'mada',
    'tabby',           // BNPL service
    'tamara',          // BNPL service
    'stc_pay',
    'apple_pay',
    // Legacy
    'online_gateway'
];

const PAYMENT_STATUSES = [
    'pending',
    'completed',
    'failed',
    'cancelled',
    'refunded',
    'reconciled'
];

const CHECK_STATUSES = [
    'received',
    'deposited',
    'cleared',
    'bounced',
    'cancelled'
];

const REFUND_REASONS = [
    'duplicate',
    'overpayment',
    'service_cancelled',
    'client_request',
    'error',
    'other'
];

const CARD_TYPES = [
    'visa',
    'mastercard',
    'amex',
    'mada'
];

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

    // ═══════════════════════════════════════════════════════════════
    // BASIC INFO
    // ═══════════════════════════════════════════════════════════════
    paymentNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    paymentType: {
        type: String,
        enum: PAYMENT_TYPES,
        default: 'customer_payment',
        index: true
    },
    paymentDate: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    },
    referenceNumber: {
        type: String,
        trim: true,
        index: true
    },
    status: {
        type: String,
        enum: PAYMENT_STATUSES,
        default: 'pending',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // AMOUNT
    // ═══════════════════════════════════════════════════════════════
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'SAR'
    },
    exchangeRate: {
        type: Number,
        default: 1,
        min: 0
    },
    amountInBaseCurrency: {
        type: Number,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // PARTIES
    // ═══════════════════════════════════════════════════════════════
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        index: true
    },
    // Legacy clientId alias
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        index: true
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // PAYMENT METHOD
    // ═══════════════════════════════════════════════════════════════
    paymentMethod: {
        type: String,
        enum: PAYMENT_METHODS,
        required: true
    },
    bankAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    },

    // ═══════════════════════════════════════════════════════════════
    // CHECK DETAILS
    // ═══════════════════════════════════════════════════════════════
    checkDetails: {
        checkNumber: String,
        checkDate: Date,
        bank: String,
        branch: String,
        status: {
            type: String,
            enum: CHECK_STATUSES,
            default: 'received'
        },
        depositDate: Date,
        clearanceDate: Date,
        bounceReason: String
    },
    // Legacy fields for backwards compatibility
    checkNumber: String,
    checkDate: Date,
    bankName: String,

    // ═══════════════════════════════════════════════════════════════
    // CARD DETAILS
    // ═══════════════════════════════════════════════════════════════
    cardDetails: {
        lastFour: String,
        cardType: {
            type: String,
            enum: CARD_TYPES
        },
        authCode: String,
        transactionId: String,
        terminalId: String
    },

    // ═══════════════════════════════════════════════════════════════
    // GATEWAY DETAILS
    // ═══════════════════════════════════════════════════════════════
    gatewayProvider: {
        type: String,
        enum: ['stripe', 'paypal', 'hyperpay', 'moyasar', 'tap', 'other']
    },
    transactionId: String,
    gatewayResponse: mongoose.Schema.Types.Mixed,

    // ═══════════════════════════════════════════════════════════════
    // INVOICE APPLICATIONS
    // ═══════════════════════════════════════════════════════════════
    invoiceApplications: [{
        invoiceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Invoice'
        },
        amount: Number,
        appliedAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Legacy allocations field
    allocations: [{
        invoiceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Invoice'
        },
        amount: Number,
        allocatedAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Legacy single invoiceId
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
    totalApplied: {
        type: Number,
        default: 0
    },
    unappliedAmount: {
        type: Number,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // FEES
    // ═══════════════════════════════════════════════════════════════
    fees: {
        bankFees: {
            type: Number,
            default: 0
        },
        processingFees: {
            type: Number,
            default: 0
        },
        otherFees: {
            type: Number,
            default: 0
        },
        totalFees: {
            type: Number,
            default: 0
        },
        paidBy: {
            type: String,
            enum: ['office', 'client'],
            default: 'office'
        }
    },
    netAmount: {
        type: Number,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // OVERPAYMENT/UNDERPAYMENT
    // ═══════════════════════════════════════════════════════════════
    overpaymentAction: {
        type: String,
        enum: ['credit', 'refund', 'hold']
    },
    underpaymentAction: {
        type: String,
        enum: ['write_off', 'leave_open', 'credit']
    },
    writeOffReason: String,
    creditNoteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CreditNote'
    },

    // ═══════════════════════════════════════════════════════════════
    // REFUND DETAILS
    // ═══════════════════════════════════════════════════════════════
    isRefund: {
        type: Boolean,
        default: false
    },
    refundDetails: {
        originalPaymentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Payment'
        },
        reason: {
            type: String,
            enum: REFUND_REASONS
        },
        method: {
            type: String,
            enum: ['original', 'cash', 'bank_transfer']
        }
    },
    // Legacy refund fields
    originalPaymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment'
    },
    refundReason: String,
    refundDate: Date,

    // ═══════════════════════════════════════════════════════════════
    // RECONCILIATION
    // ═══════════════════════════════════════════════════════════════
    reconciliation: {
        isReconciled: {
            type: Boolean,
            default: false
        },
        reconciledDate: Date,
        reconciledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        bankStatementRef: String
    },

    // ═══════════════════════════════════════════════════════════════
    // ORGANIZATION
    // ═══════════════════════════════════════════════════════════════
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    },
    locationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location'
    },
    receivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // ═══════════════════════════════════════════════════════════════
    // NOTES
    // ═══════════════════════════════════════════════════════════════
    customerNotes: {
        type: String,
        maxlength: 500
    },
    internalNotes: {
        type: String,
        maxlength: 1000
    },
    memo: {
        type: String,
        maxlength: 500
    },
    // Legacy notes field
    notes: {
        type: String,
        maxlength: 1000
    },

    // ═══════════════════════════════════════════════════════════════
    // ATTACHMENTS
    // ═══════════════════════════════════════════════════════════════
    attachments: [{
        filename: String,
        url: String,
        size: Number,
        mimeType: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // ═══════════════════════════════════════════════════════════════
    // EMAIL/RECEIPT
    // ═══════════════════════════════════════════════════════════════
    receiptUrl: String,
    receiptSent: {
        type: Boolean,
        default: false
    },
    receiptSentAt: Date,
    receiptSentTo: String,
    emailTemplate: String,

    // ═══════════════════════════════════════════════════════════════
    // FAILURE TRACKING
    // ═══════════════════════════════════════════════════════════════
    failureReason: String,
    failureDate: Date,
    retryCount: {
        type: Number,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // ACCOUNTING
    // ═══════════════════════════════════════════════════════════════
    receivableAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    },
    glEntryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GeneralLedger'
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
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

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
paymentSchema.index({ paymentNumber: 1 });
paymentSchema.index({ firmId: 1, paymentDate: -1 });
paymentSchema.index({ clientId: 1, paymentDate: -1 });
paymentSchema.index({ customerId: 1, paymentDate: -1 });
paymentSchema.index({ vendorId: 1, paymentDate: -1 });
paymentSchema.index({ lawyerId: 1, status: 1 });
paymentSchema.index({ invoiceId: 1 });
paymentSchema.index({ paymentType: 1, status: 1 });
paymentSchema.index({ 'reconciliation.isReconciled': 1 });
paymentSchema.index({ 'checkDetails.status': 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
paymentSchema.pre('save', async function(next) {
    // Auto-generate payment number
    if (this.isNew && !this.paymentNumber) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const count = await this.constructor.countDocuments({
            paymentNumber: new RegExp(`^PAY-${year}${month}`)
        });
        this.paymentNumber = `PAY-${year}${month}-${String(count + 1).padStart(4, '0')}`;
    }

    // Sync customerId with clientId
    if (this.clientId && !this.customerId) {
        this.customerId = this.clientId;
    }
    if (this.customerId && !this.clientId) {
        this.clientId = this.customerId;
    }

    // Calculate amountInBaseCurrency
    this.amountInBaseCurrency = this.amount * (this.exchangeRate || 1);

    // Calculate total fees
    if (this.fees) {
        this.fees.totalFees = (this.fees.bankFees || 0) +
                              (this.fees.processingFees || 0) +
                              (this.fees.otherFees || 0);
    }

    // Calculate netAmount
    if (this.fees && this.fees.paidBy === 'office') {
        this.netAmount = this.amount - (this.fees.totalFees || 0);
    } else {
        this.netAmount = this.amount;
    }

    // Calculate totalApplied from invoiceApplications
    if (this.invoiceApplications && this.invoiceApplications.length > 0) {
        this.totalApplied = this.invoiceApplications.reduce((sum, app) => sum + (app.amount || 0), 0);
    } else if (this.allocations && this.allocations.length > 0) {
        this.totalApplied = this.allocations.reduce((sum, app) => sum + (app.amount || 0), 0);
    }

    // Calculate unappliedAmount
    this.unappliedAmount = this.amount - this.totalApplied;

    // Sync checkDetails with legacy fields
    if (this.checkNumber && !this.checkDetails) {
        this.checkDetails = {
            checkNumber: this.checkNumber,
            checkDate: this.checkDate,
            bank: this.bankName
        };
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get payment statistics
 */
paymentSchema.statics.getPaymentStats = async function(filters = {}) {
    const matchStage = {};

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
    if (filters.lawyerId) matchStage.lawyerId = new mongoose.Types.ObjectId(filters.lawyerId);
    if (filters.customerId) matchStage.customerId = new mongoose.Types.ObjectId(filters.customerId);
    if (filters.startDate || filters.endDate) {
        matchStage.paymentDate = {};
        if (filters.startDate) matchStage.paymentDate.$gte = new Date(filters.startDate);
        if (filters.endDate) matchStage.paymentDate.$lte = new Date(filters.endDate);
    }

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalPayments: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                totalApplied: { $sum: '$totalApplied' },
                totalUnapplied: { $sum: '$unappliedAmount' },
                totalFees: { $sum: '$fees.totalFees' },
                completedAmount: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
                },
                pendingAmount: {
                    $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] }
                },
                refundedAmount: {
                    $sum: { $cond: [{ $eq: ['$isRefund', true] }, '$amount', 0] }
                }
            }
        }
    ]);

    return stats[0] || {
        totalPayments: 0,
        totalAmount: 0,
        totalApplied: 0,
        totalUnapplied: 0,
        totalFees: 0,
        completedAmount: 0,
        pendingAmount: 0,
        refundedAmount: 0
    };
};

/**
 * Get payments by method
 */
paymentSchema.statics.getPaymentsByMethod = async function(filters = {}) {
    const matchStage = { status: 'completed' };

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
    if (filters.lawyerId) matchStage.lawyerId = new mongoose.Types.ObjectId(filters.lawyerId);

    return await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$paymentMethod',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' }
            }
        },
        { $sort: { totalAmount: -1 } }
    ]);
};

/**
 * Get unreconciled payments
 */
paymentSchema.statics.getUnreconciledPayments = async function(filters = {}) {
    const matchStage = {
        status: 'completed',
        'reconciliation.isReconciled': { $ne: true }
    };

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
    if (filters.paymentMethod) matchStage.paymentMethod = filters.paymentMethod;

    return await this.find(matchStage)
        .populate('customerId', 'firstName lastName companyName')
        .populate('invoiceId', 'invoiceNumber')
        .sort({ paymentDate: -1 });
};

/**
 * Get pending checks
 */
paymentSchema.statics.getPendingChecks = async function(filters = {}) {
    const matchStage = {
        paymentMethod: 'check',
        'checkDetails.status': { $in: ['received', 'deposited'] }
    };

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);

    return await this.find(matchStage)
        .populate('customerId', 'firstName lastName companyName')
        .sort({ 'checkDetails.checkDate': 1 });
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Apply payment to invoices
 * @param {Array} applications - Array of { invoiceId, amount }
 */
paymentSchema.methods.applyToInvoices = async function(applications) {
    const Invoice = mongoose.model('Invoice');

    for (const app of applications) {
        const invoice = await Invoice.findById(app.invoiceId);
        if (!invoice) {
            throw new Error(`Invoice ${app.invoiceId} not found`);
        }

        // Update invoice
        invoice.amountPaid = (invoice.amountPaid || 0) + app.amount;
        invoice.balanceDue = invoice.totalAmount - invoice.amountPaid;

        if (invoice.balanceDue <= 0) {
            invoice.status = 'paid';
            invoice.paidDate = new Date();
        } else if (invoice.amountPaid > 0) {
            invoice.status = 'partial';
        }

        // Add to payment history
        if (!invoice.paymentHistory) {
            invoice.paymentHistory = [];
        }
        invoice.paymentHistory.push({
            paymentId: this._id,
            amount: app.amount,
            date: this.paymentDate,
            method: this.paymentMethod
        });

        await invoice.save();

        // Add to invoiceApplications
        this.invoiceApplications.push({
            invoiceId: app.invoiceId,
            amount: app.amount,
            appliedAt: new Date()
        });
    }

    // Recalculate totals
    this.totalApplied = this.invoiceApplications.reduce((sum, app) => sum + app.amount, 0);
    this.unappliedAmount = this.amount - this.totalApplied;

    await this.save();

    return this;
};

/**
 * Unapply payment from an invoice
 * @param {ObjectId} invoiceId - Invoice to unapply from
 */
paymentSchema.methods.unapplyFromInvoice = async function(invoiceId) {
    const Invoice = mongoose.model('Invoice');

    const appIndex = this.invoiceApplications.findIndex(
        app => app.invoiceId.toString() === invoiceId.toString()
    );

    if (appIndex === -1) {
        throw new Error('Payment not applied to this invoice');
    }

    const application = this.invoiceApplications[appIndex];
    const invoice = await Invoice.findById(invoiceId);

    if (invoice) {
        // Reverse the application
        invoice.amountPaid = Math.max(0, (invoice.amountPaid || 0) - application.amount);
        invoice.balanceDue = invoice.totalAmount - invoice.amountPaid;

        if (invoice.balanceDue >= invoice.totalAmount) {
            invoice.status = 'sent';
        } else if (invoice.balanceDue > 0) {
            invoice.status = 'partial';
        }

        // Remove from payment history
        if (invoice.paymentHistory) {
            invoice.paymentHistory = invoice.paymentHistory.filter(
                ph => ph.paymentId.toString() !== this._id.toString()
            );
        }

        await invoice.save();
    }

    // Remove from invoiceApplications
    this.invoiceApplications.splice(appIndex, 1);

    // Recalculate totals
    this.totalApplied = this.invoiceApplications.reduce((sum, app) => sum + app.amount, 0);
    this.unappliedAmount = this.amount - this.totalApplied;

    await this.save();

    return this;
};

/**
 * Reconcile payment
 * @param {ObjectId} userId - User performing reconciliation
 * @param {String} bankStatementRef - Bank statement reference
 */
paymentSchema.methods.reconcile = async function(userId, bankStatementRef = null) {
    if (this.reconciliation && this.reconciliation.isReconciled) {
        throw new Error('Payment already reconciled');
    }

    if (this.status !== 'completed') {
        throw new Error('Only completed payments can be reconciled');
    }

    this.reconciliation = {
        isReconciled: true,
        reconciledDate: new Date(),
        reconciledBy: userId,
        bankStatementRef
    };
    this.status = 'reconciled';

    await this.save();

    return this;
};

/**
 * Update check status
 * @param {String} newStatus - New check status
 * @param {Object} details - Additional details (bounceReason, depositDate, etc.)
 */
paymentSchema.methods.updateCheckStatus = async function(newStatus, details = {}) {
    if (this.paymentMethod !== 'check') {
        throw new Error('Only check payments have check status');
    }

    if (!this.checkDetails) {
        this.checkDetails = {};
    }

    this.checkDetails.status = newStatus;

    if (newStatus === 'deposited') {
        this.checkDetails.depositDate = details.depositDate || new Date();
    }

    if (newStatus === 'cleared') {
        this.checkDetails.clearanceDate = details.clearanceDate || new Date();
        this.status = 'completed';
    }

    if (newStatus === 'bounced') {
        this.checkDetails.bounceReason = details.bounceReason;
        this.status = 'failed';
        this.failureReason = `Check bounced: ${details.bounceReason}`;
        this.failureDate = new Date();
    }

    if (newStatus === 'cancelled') {
        this.status = 'cancelled';
    }

    await this.save();

    return this;
};

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
        clientId: this.customerId || this.clientId,
        lawyerId: this.lawyerId,
        meta: {
            invoiceId: this.invoiceId,
            paymentMethod: this.paymentMethod,
            paymentType: this.paymentType,
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
    this.refundDetails = {
        originalPaymentId: this._id,
        reason: reason
    };

    const options = session ? { session } : {};
    await this.save(options);

    return { voidedEntry, reversingEntry };
};

/**
 * Handle overpayment
 * @param {String} action - 'credit', 'refund', or 'hold'
 */
paymentSchema.methods.handleOverpayment = async function(action) {
    if (this.unappliedAmount <= 0) {
        throw new Error('No overpayment to handle');
    }

    this.overpaymentAction = action;

    switch (action) {
        case 'credit':
            // Create client credit (implementation depends on ClientCredit model)
            // This would typically create a credit note
            break;

        case 'refund':
            // Mark for refund processing
            // Actual refund would be created separately
            break;

        case 'hold':
            // Just keep the unapplied amount
            break;
    }

    await this.save();

    return this;
};

// Export constants for use in controllers
paymentSchema.statics.PAYMENT_TYPES = PAYMENT_TYPES;
paymentSchema.statics.PAYMENT_METHODS = PAYMENT_METHODS;
paymentSchema.statics.PAYMENT_STATUSES = PAYMENT_STATUSES;
paymentSchema.statics.CHECK_STATUSES = CHECK_STATUSES;
paymentSchema.statics.REFUND_REASONS = REFUND_REASONS;
paymentSchema.statics.CARD_TYPES = CARD_TYPES;

module.exports = mongoose.model('Payment', paymentSchema);
