const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: {
        type: String,
        required: true,
        unique: true
    },
    // Accounting account references
    incomeAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    },
    receivableAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    },
    // GL entry IDs for this invoice
    glEntries: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GeneralLedger'
    }],
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        required: false
    },
    contractId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: false
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        description: String,
        quantity: { type: Number, default: 1 },
        unitPrice: Number,
        total: Number
    }],
    subtotal: {
        type: Number,
        required: true
    },
    vatRate: {
        type: Number,
        default: 15
    },
    vatAmount: {
        type: Number,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        default: null
    },
    discountValue: {
        type: Number,
        default: 0
    },
    amountPaid: {
        type: Number,
        default: 0
    },
    balanceDue: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['draft', 'pending', 'sent', 'paid', 'partial', 'overdue', 'cancelled'],
        default: 'draft'
    },
    issueDate: {
        type: Date,
        default: Date.now
    },
    dueDate: {
        type: Date,
        required: true
    },
    paidDate: {
        type: Date,
        required: false
    },
    paymentIntent: {
        type: String,
        required: false
    },
    notes: {
        type: String,
        maxlength: 500
    },
    pdfUrl: {
        type: String
    },
    history: [{
        action: {
            type: String,
            enum: ['created', 'sent', 'viewed', 'paid', 'cancelled', 'reminded']
        },
        date: {
            type: Date,
            default: Date.now
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        note: String
    }]
}, {
    versionKey: false,
    timestamps: true
});

invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ lawyerId: 1, status: 1 });
invoiceSchema.index({ clientId: 1, status: 1 });

// Virtual: Compute amountPaid from GL (payments received)
invoiceSchema.virtual('computedAmountPaid').get(async function() {
    const GeneralLedger = mongoose.model('GeneralLedger');
    const Account = mongoose.model('Account');

    // Get receivable account (either from invoice or default)
    const receivableAccountId = this.receivableAccountId;
    if (!receivableAccountId) return this.amountPaid; // Fallback to stored value

    // Sum of all credits to A/R for this invoice (payments received)
    const result = await GeneralLedger.aggregate([
        {
            $match: {
                referenceId: this._id,
                referenceModel: 'Payment',
                creditAccountId: receivableAccountId,
                status: 'posted'
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: '$amount' }
            }
        }
    ]);

    return result[0]?.total || 0;
});

/**
 * Post invoice to General Ledger
 * DR: Accounts Receivable
 * CR: Service Revenue
 * @param {Session} session - MongoDB session for transactions
 */
invoiceSchema.methods.postToGL = async function(session = null) {
    const GeneralLedger = mongoose.model('GeneralLedger');
    const Account = mongoose.model('Account');

    // Check if already posted
    if (this.glEntries && this.glEntries.length > 0) {
        throw new Error('Invoice already posted to GL');
    }

    // Get account IDs (use defaults if not set)
    let receivableAccountId = this.receivableAccountId;
    let incomeAccountId = this.incomeAccountId;

    // Get default accounts if not specified
    if (!receivableAccountId) {
        const arAccount = await Account.findOne({ code: '1110' }); // Accounts Receivable
        if (!arAccount) throw new Error('Default Accounts Receivable account not found');
        receivableAccountId = arAccount._id;
        this.receivableAccountId = receivableAccountId;
    }

    if (!incomeAccountId) {
        const incomeAccount = await Account.findOne({ code: '4100' }); // Legal Service Fees
        if (!incomeAccount) throw new Error('Default Income account not found');
        incomeAccountId = incomeAccount._id;
        this.incomeAccountId = incomeAccountId;
    }

    // Convert amount to halalas if stored as SAR
    const { toHalalas } = require('../utils/currency');
    const amount = Number.isInteger(this.totalAmount) ? this.totalAmount : toHalalas(this.totalAmount);

    // Create GL entry
    const glEntry = await GeneralLedger.postTransaction({
        transactionDate: this.issueDate || new Date(),
        description: `Invoice ${this.invoiceNumber}`,
        descriptionAr: `فاتورة ${this.invoiceNumber}`,
        debitAccountId: receivableAccountId,
        creditAccountId: incomeAccountId,
        amount,
        referenceId: this._id,
        referenceModel: 'Invoice',
        referenceNumber: this.invoiceNumber,
        caseId: this.caseId,
        clientId: this.clientId,
        lawyerId: this.lawyerId,
        meta: {
            subtotal: this.subtotal,
            vatAmount: this.vatAmount,
            totalAmount: this.totalAmount
        },
        createdBy: this.lawyerId
    }, session);

    this.glEntries = [glEntry._id];

    const options = session ? { session } : {};
    await this.save(options);

    return glEntry;
};

/**
 * Record payment for this invoice
 * DR: Bank/Cash
 * CR: Accounts Receivable
 * @param {Object} paymentData - Payment details
 * @param {Session} session - MongoDB session for transactions
 */
invoiceSchema.methods.recordPayment = async function(paymentData, session = null) {
    const GeneralLedger = mongoose.model('GeneralLedger');
    const Account = mongoose.model('Account');
    const Payment = mongoose.model('Payment');

    const { amount, paymentDate, bankAccountId, paymentMethod, userId } = paymentData;

    // Get receivable account
    let receivableAccountId = this.receivableAccountId;
    if (!receivableAccountId) {
        const arAccount = await Account.findOne({ code: '1110' });
        if (!arAccount) throw new Error('Accounts Receivable account not found');
        receivableAccountId = arAccount._id;
    }

    // Get bank account (use default if not specified)
    let bankAcctId = bankAccountId;
    if (!bankAcctId) {
        const bankAccount = await Account.findOne({ code: '1102' }); // Bank Account - Main
        if (!bankAccount) throw new Error('Default Bank account not found');
        bankAcctId = bankAccount._id;
    }

    // Convert amount to halalas if needed
    const { toHalalas, addAmounts } = require('../utils/currency');
    const amountHalalas = Number.isInteger(amount) ? amount : toHalalas(amount);

    // Create payment record
    const payment = new Payment({
        clientId: this.clientId,
        invoiceId: this._id,
        caseId: this.caseId,
        lawyerId: this.lawyerId,
        paymentDate: paymentDate || new Date(),
        amount: amountHalalas,
        paymentMethod: paymentMethod || 'bank_transfer',
        bankAccountId: bankAcctId,
        receivableAccountId: receivableAccountId,
        status: 'completed',
        createdBy: userId
    });

    const options = session ? { session } : {};
    await payment.save(options);

    // Post payment to GL
    const glEntry = await GeneralLedger.postTransaction({
        transactionDate: paymentDate || new Date(),
        description: `Payment for Invoice ${this.invoiceNumber}`,
        descriptionAr: `دفعة للفاتورة ${this.invoiceNumber}`,
        debitAccountId: bankAcctId,
        creditAccountId: receivableAccountId,
        amount: amountHalalas,
        referenceId: payment._id,
        referenceModel: 'Payment',
        referenceNumber: payment.paymentNumber,
        caseId: this.caseId,
        clientId: this.clientId,
        lawyerId: this.lawyerId,
        meta: {
            invoiceId: this._id,
            invoiceNumber: this.invoiceNumber
        },
        createdBy: userId
    }, session);

    // Update invoice payment tracking
    this.amountPaid = addAmounts(this.amountPaid || 0, amountHalalas);
    this.balanceDue = this.totalAmount - this.amountPaid;

    // Update invoice status
    if (this.balanceDue <= 0) {
        this.status = 'paid';
        this.paidDate = new Date();
    } else if (this.amountPaid > 0) {
        this.status = 'partial';
    }

    // Add to history
    this.history.push({
        action: 'paid',
        date: new Date(),
        user: userId,
        note: `Payment of ${amountHalalas} received`
    });

    await this.save(options);

    return { payment, glEntry };
};

module.exports = mongoose.model('Invoice', invoiceSchema);
