const mongoose = require('mongoose');
const { Schema } = mongoose;

// ============ LINE ITEM SCHEMA ============
const LineItemSchema = new Schema({
    type: {
        type: String,
        enum: ['time', 'expense', 'flat_fee', 'product', 'discount', 'subtotal', 'comment'],
        default: 'time'
    },
    date: Date,
    description: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        default: 1,
        min: 0
    },
    unitPrice: {
        type: Number,
        default: 0,
        min: 0
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        default: 'percentage'
    },
    discountValue: {
        type: Number,
        default: 0,
        min: 0
    },
    lineTotal: {
        type: Number,
        default: 0
    },
    taxable: {
        type: Boolean,
        default: true
    },
    // For firms with multiple attorneys
    attorneyId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    // UTBMS Activity Codes
    activityCode: {
        type: String,
        enum: ['L110', 'L120', 'L130', 'L140', 'L210', 'L220', 'L230', 'L240']
    },
    // Linked records
    timeEntryId: {
        type: Schema.Types.ObjectId,
        ref: 'TimeEntry'
    },
    expenseId: {
        type: Schema.Types.ObjectId,
        ref: 'Expense'
    }
}, { _id: true });

// ============ INSTALLMENT SCHEMA ============
const InstallmentSchema = new Schema({
    dueDate: {
        type: Date,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'overdue'],
        default: 'pending'
    },
    paidAt: Date,
    paidAmount: {
        type: Number,
        default: 0
    }
});

// ============ APPROVAL SCHEMA ============
const ApprovalSchema = new Schema({
    approverId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    date: Date,
    notes: String
});

// ============ ADDRESS SCHEMA (for shipping) ============
const AddressSchema = new Schema({
    line1: { type: String, maxlength: 500 },
    line2: { type: String, maxlength: 500 },
    city: { type: String, maxlength: 100 },
    postalCode: { type: String, maxlength: 20 },
    country: { type: String, default: 'SA', maxlength: 2 }
}, { _id: false });

// ============ SALES TEAM SCHEMA (ERPNext: sales_team) ============
const SalesTeamSchema = new Schema({
    salesPersonId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    commissionRate: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    commissionAmount: {
        type: Number,
        min: 0,
        default: 0
    }
}, { _id: false });

// ============ ADVANCE ALLOCATION SCHEMA (ERPNext: advances) ============
const AdvanceAllocationSchema = new Schema({
    advancePaymentId: {
        type: Schema.Types.ObjectId,
        ref: 'Payment',
        required: true
    },
    referenceNumber: {
        type: String,
        required: true
    },
    allocatedAmount: {
        type: Number,
        min: 0,
        required: true
    }
}, { _id: false });

// ============ MAIN INVOICE SCHEMA ============
const invoiceSchema = new Schema({
    // ============ FIRM (Multi-Tenancy) ============
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },

    // ============ HEADER ============
    invoiceNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    status: {
        type: String,
        enum: ['draft', 'pending_approval', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'void', 'written_off', 'cancelled'],
        default: 'draft',
        index: true
    },

    // ============ CLIENT & CASE ============
    clientId: {
        type: Schema.Types.ObjectId,
        ref: 'Client',
        required: true,
        index: true
    },
    clientType: {
        type: String,
        enum: ['individual', 'corporate', 'government'],
        default: 'individual'
    },

    // ============ CONTACT PERSON (ERPNext: contact_person, contact_display, contact_email, contact_mobile) ============
    contactPersonName: {
        type: String,
        trim: true,
        maxlength: 200
    },
    contactEmail: {
        type: String,
        trim: true,
        lowercase: true,
        validate: {
            validator: (v) => !v || /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v),
            message: 'Invalid email format'
        }
    },
    contactMobile: {
        type: String,
        trim: true,
        validate: {
            validator: (v) => !v || /^\+?[0-9]{10,15}$/.test(v),
            message: 'Invalid mobile number'
        }
    },

    // ============ SHIPPING ADDRESS (ERPNext: shipping_address_name, shipping_address) ============
    shippingAddress: {
        type: AddressSchema,
        default: null
    },
    useShippingAddress: {
        type: Boolean,
        default: false
    },

    caseId: {
        type: Schema.Types.ObjectId,
        ref: 'Case',
        index: true
    },
    contractId: {
        type: Schema.Types.ObjectId,
        ref: 'Order'
    },

    // ============ LAWYER/FIRM ============
    lawyerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    responsibleAttorneyId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    // ============ DATES ============
    issueDate: {
        type: Date,
        default: Date.now
    },
    dueDate: {
        type: Date,
        required: true,
        index: true
    },
    paymentTerms: {
        type: String,
        enum: ['due_on_receipt', 'net_7', 'net_15', 'net_30', 'net_45', 'net_60', 'net_90', 'eom', 'custom'],
        default: 'net_30'
    },
    currency: {
        type: String,
        default: 'SAR'
    },

    // ============ ORGANIZATION (Firms) ============
    firmSize: {
        type: String,
        enum: ['solo', 'small', 'medium', 'large'],
        default: 'solo'
    },
    departmentId: {
        type: String,
        enum: ['commercial', 'criminal', 'corporate', 'real_estate', 'labor', 'family']
    },
    locationId: {
        type: String,
        enum: ['riyadh', 'jeddah', 'dammam', 'makkah', 'madinah']
    },
    billingArrangement: {
        type: String,
        enum: ['hourly', 'flat_fee', 'contingency', 'blended', 'monthly_retainer', 'percentage'],
        default: 'hourly'
    },
    customerPONumber: String,
    matterNumber: String,

    // ============ LINE ITEMS ============
    items: [LineItemSchema],

    // ============ TOTALS ============
    subtotal: {
        type: Number,
        default: 0
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        default: 'percentage'
    },
    discountValue: {
        type: Number,
        default: 0
    },
    discountAmount: {
        type: Number,
        default: 0
    },
    taxableAmount: {
        type: Number,
        default: 0
    },
    vatRate: {
        type: Number,
        default: 15  // 15% Saudi VAT (stored as percentage)
    },
    vatAmount: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        default: 0
    },

    // ============ SALES TEAM (ERPNext: sales_team child table) ============
    salesTeam: {
        type: [SalesTeamSchema],
        default: []
    },

    // ============ ADVANCE PAYMENTS (ERPNext: advances child table) ============
    advances: {
        type: [AdvanceAllocationSchema],
        default: []
    },
    totalAdvanceAllocated: {
        type: Number,
        min: 0,
        default: 0
    },

    // ============ PAYMENTS ============
    depositAmount: {
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
    paidDate: Date,

    // ============ RETAINER ============
    applyFromRetainer: {
        type: Number,
        default: 0
    },
    retainerTransactionId: {
        type: Schema.Types.ObjectId,
        ref: 'Retainer'
    },

    // ============ NOTES ============
    notes: {
        type: String,
        maxlength: 500
    },
    customerNotes: String,
    internalNotes: String,
    termsAndConditions: String,
    termsTemplate: {
        type: String,
        enum: ['standard', 'corporate', 'government', 'custom'],
        default: 'standard'
    },

    // ============ ZATCA E-INVOICE ============
    zatca: {
        invoiceType: {
            type: String,
            enum: ['388', '386', '383', '381'],  // Tax Invoice | Prepayment | Debit | Credit
            default: '388'
        },
        invoiceSubtype: {
            type: String,
            enum: ['0100000', '0200000'],  // B2B | B2C
            default: '0200000'
        },
        invoiceUUID: String,
        invoiceHash: String,
        previousInvoiceHash: String,
        qrCode: String,
        xmlInvoice: String,
        cryptographicStamp: String,
        status: {
            type: String,
            enum: ['draft', 'pending', 'cleared', 'reported', 'rejected'],
            default: 'draft'
        },
        clearanceDate: Date,
        rejectionReason: String,
        // Seller (Office) Info
        sellerVATNumber: String,
        sellerCR: String,
        sellerAddress: {
            street: String,
            buildingNumber: String,
            city: String,
            postalCode: String,
            province: String,
            country: { type: String, default: 'SA' }
        },
        // Buyer (Client) Info
        buyerVATNumber: String,
        buyerCR: String,
        buyerAddress: {
            street: String,
            buildingNumber: String,
            city: String,
            postalCode: String,
            province: String,
            country: { type: String, default: 'SA' }
        }
    },

    // ============ WIP & BUDGET (Firms) ============
    wip: {
        wipAmount: { type: Number, default: 0 },
        writeOffAmount: { type: Number, default: 0 },
        writeDownAmount: { type: Number, default: 0 },
        adjustmentReason: {
            type: String,
            enum: ['client_relationship', 'collection_risk', 'quality_issue', 'competitive_pricing', 'pro_bono']
        }
    },
    budget: {
        projectBudget: Number,
        budgetConsumed: Number,
        percentComplete: { type: Number, min: 0, max: 100 }
    },

    // ============ PAYMENT PLAN ============
    paymentPlan: {
        enabled: { type: Boolean, default: false },
        installments: { type: Number, enum: [2, 3, 4, 6, 12] },
        frequency: {
            type: String,
            enum: ['weekly', 'biweekly', 'monthly']
        },
        schedule: [InstallmentSchema]
    },

    // ============ PAYMENT SETTINGS ============
    bankAccountId: {
        type: Schema.Types.ObjectId,
        ref: 'BankAccount'
    },
    paymentInstructions: String,
    enableOnlinePayment: { type: Boolean, default: false },
    paymentLink: String,
    qrCodePayment: String,
    paymentIntent: String,  // Stripe payment intent

    // ============ LATE FEES ============
    lateFees: {
        enabled: { type: Boolean, default: false },
        type: {
            type: String,
            enum: ['daily_percentage', 'monthly_percentage', 'fixed']
        },
        rate: Number,
        gracePeriod: { type: Number, default: 0 },  // Days
        accumulatedFees: { type: Number, default: 0 }
    },

    // ============ APPROVAL WORKFLOW ============
    approval: {
        required: { type: Boolean, default: false },
        chain: [ApprovalSchema],
        currentApprover: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        approvedAt: Date,
        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }
    },

    // ============ EMAIL ============
    email: {
        template: {
            type: String,
            enum: ['standard', 'reminder', 'final_notice', 'thank_you'],
            default: 'standard'
        },
        subject: String,
        body: String,
        ccRecipients: [String],
        autoSendOnApproval: { type: Boolean, default: false },
        sentAt: Date,
        openedAt: Date,
        lastReminderAt: Date,
        reminderCount: { type: Number, default: 0 }
    },

    // ============ ATTACHMENTS ============
    attachments: [{
        filename: String,
        url: String,
        type: String,
        size: Number,
        uploadedAt: { type: Date, default: Date.now }
    }],

    // ============ ACCOUNTING (GL Integration) ============
    incomeAccountId: {
        type: Schema.Types.ObjectId,
        ref: 'Account'
    },
    receivableAccountId: {
        type: Schema.Types.ObjectId,
        ref: 'Account'
    },
    glEntries: [{
        type: Schema.Types.ObjectId,
        ref: 'GeneralLedger'
    }],
    accounting: {
        revenueAccountId: String,
        arAccountId: String,
        costCenter: String,
        profitCenter: String,
        revenueRecognitionMethod: {
            type: String,
            enum: ['immediate', 'percentage_completion', 'milestone', 'deferred']
        },
        revenueStartDate: Date,
        revenueEndDate: Date,
        journalEntryId: {
            type: Schema.Types.ObjectId,
            ref: 'JournalEntry'
        }
    },

    // ============ PDF ============
    pdfUrl: String,

    // ============ AUDIT & HISTORY ============
    history: [{
        action: {
            type: String,
            enum: ['created', 'updated', 'sent', 'viewed', 'paid', 'partial_payment', 'cancelled', 'voided', 'reminded', 'approved', 'rejected', 'payment_received']
        },
        date: {
            type: Date,
            default: Date.now
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        note: String
    }],

    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    sentAt: Date,
    viewedAt: Date,
    voidedAt: Date,
    voidReason: String

}, {
    versionKey: false,
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ============ INDEXES ============
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ lawyerId: 1, status: 1 });
invoiceSchema.index({ clientId: 1, status: 1 });
invoiceSchema.index({ dueDate: 1, status: 1 });
invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ 'zatca.status': 1 });
invoiceSchema.index({ responsibleAttorneyId: 1 });
// Compound indexes for multi-tenant dashboard queries
invoiceSchema.index({ firmId: 1, status: 1, dueDate: -1 });
invoiceSchema.index({ firmId: 1, status: 1, createdAt: -1 });
invoiceSchema.index({ firmId: 1, lawyerId: 1, status: 1 });

// ============ VIRTUALS ============
invoiceSchema.virtual('isOverdue').get(function() {
    return this.status !== 'paid' &&
        this.status !== 'void' &&
        this.status !== 'cancelled' &&
        new Date() > this.dueDate;
});

invoiceSchema.virtual('daysOverdue').get(function() {
    if (!this.isOverdue) return 0;
    const diff = new Date() - this.dueDate;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
});

invoiceSchema.virtual('client', {
    ref: 'User',
    localField: 'clientId',
    foreignField: '_id',
    justOne: true
});

// Virtual: Compute amountPaid from GL (payments received)
invoiceSchema.virtual('computedAmountPaid').get(async function() {
    const GeneralLedger = mongoose.model('GeneralLedger');

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

// ============ STATICS ============
invoiceSchema.statics.generateInvoiceNumber = async function() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    // Find the last invoice of this month
    const lastInvoice = await this.findOne({
        invoiceNumber: new RegExp(`^INV-${year}${month}-`)
    }).sort({ invoiceNumber: -1 });

    let sequence = 1;
    if (lastInvoice) {
        const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
        sequence = lastSequence + 1;
    }

    return `INV-${year}${month}-${String(sequence).padStart(4, '0')}`;
};

invoiceSchema.statics.getOverdueInvoices = function(lawyerId = null) {
    const query = {
        status: { $in: ['sent', 'viewed', 'partial'] },
        dueDate: { $lt: new Date() }
    };
    if (lawyerId) query.lawyerId = lawyerId;
    return this.find(query);
};

invoiceSchema.statics.getClientBalance = async function(clientId) {
    const result = await this.aggregate([
        { $match: { clientId: new mongoose.Types.ObjectId(clientId), status: { $nin: ['void', 'draft', 'cancelled'] } } },
        { $group: { _id: null, totalDue: { $sum: '$balanceDue' } } }
    ]);
    return result[0]?.totalDue || 0;
};

// ============ PRE-SAVE MIDDLEWARE ============
invoiceSchema.pre('save', async function(next) {
    const { toHalalas, addAmounts, subtractAmounts, calculatePercentage } = require('../utils/currency');

    const normalizeHalalas = (value = 0) => Number.isInteger(value) ? value : toHalalas(value);
    const multiplyToHalalas = (quantity = 0, unitPrice = 0) => toHalalas((quantity || 0) * (unitPrice || 0));

    // Auto-generate invoice number if not provided
    if (this.isNew && !this.invoiceNumber) {
        this.invoiceNumber = await this.constructor.generateInvoiceNumber();
    }

    // Normalize incoming numeric fields to halalas so all arithmetic stays in smallest unit
    this.depositAmount = normalizeHalalas(this.depositAmount);
    this.amountPaid = normalizeHalalas(this.amountPaid);
    this.applyFromRetainer = normalizeHalalas(this.applyFromRetainer);

    // Normalize line items ahead of calculation
    this.items = (this.items || []).map(item => {
        const normalizedItem = item?.toObject ? item.toObject() : item;
        return {
            ...normalizedItem,
            quantity: normalizedItem.quantity || 0,
            unitPrice: normalizeHalalas(normalizedItem.unitPrice),
            discountValue: normalizeHalalas(normalizedItem.discountValue)
        };
    });

    // Calculate totals
    this.calculateTotals({ addAmounts, subtractAmounts, calculatePercentage, multiplyToHalalas, normalizeHalalas });

    // Update status if overdue
    if (this.isOverdue && this.status === 'sent') {
        this.status = 'overdue';
    }

    next();
});

// ============ METHODS ============
invoiceSchema.methods.calculateTotals = function({ addAmounts, subtractAmounts, calculatePercentage, multiplyToHalalas, normalizeHalalas } = {}) {
    const currencyUtils = require('../utils/currency');
    const add = addAmounts || currencyUtils.addAmounts;
    const subtract = subtractAmounts || currencyUtils.subtractAmounts;
    const percentage = calculatePercentage || currencyUtils.calculatePercentage;
    const multiply = multiplyToHalalas || ((qty, price) => currencyUtils.toHalalas((qty || 0) * (price || 0)));
    const normalize = normalizeHalalas || (value => Number.isInteger(value) ? value : currencyUtils.toHalalas(value));

    // Calculate subtotal from line items
    this.subtotal = this.items.reduce((sum, item) => {
        if (item.type === 'discount' || item.type === 'comment' || item.type === 'subtotal') {
            return sum;
        }
        return add(sum, multiply(item.quantity, item.unitPrice));
    }, 0);

    // Calculate item-level discounts
    const itemDiscounts = this.items.reduce((sum, item) => {
        if (!item.discountValue || item.type === 'comment' || item.type === 'subtotal') return sum;
        const lineSubtotal = multiply(item.quantity, item.unitPrice);
        if (item.discountType === 'percentage') {
            return add(sum, percentage(lineSubtotal, item.discountValue));
        }
        return add(sum, normalize(item.discountValue));
    }, 0);

    // Calculate discount items (type === 'discount')
    const discountItems = this.items.reduce((sum, item) => {
        if (item.type !== 'discount') return sum;
        return add(sum, normalize(Math.abs(item.unitPrice)));
    }, 0);

    // Calculate invoice-level discount
    let invoiceDiscount = 0;
    const afterItemDiscounts = subtract(subtract(this.subtotal, itemDiscounts), discountItems);
    if (this.discountType === 'percentage') {
        invoiceDiscount = percentage(afterItemDiscounts, this.discountValue || 0);
    } else {
        invoiceDiscount = normalize(this.discountValue || 0);
    }

    this.discountAmount = add(add(itemDiscounts, discountItems), invoiceDiscount);
    this.taxableAmount = subtract(this.subtotal, this.discountAmount);
    this.vatAmount = percentage(this.taxableAmount, this.vatRate || 0);
    this.totalAmount = add(this.taxableAmount, this.vatAmount);

    // Calculate balance due (including advance payments)
    const advanceTotal = this.totalAdvanceAllocated || 0;
    this.balanceDue = subtract(subtract(subtract(subtract(this.totalAmount, this.depositAmount), this.amountPaid), this.applyFromRetainer), advanceTotal);

    // Calculate sales team commissions (commission on subtotal after discount, before tax)
    if (this.salesTeam && this.salesTeam.length > 0) {
        for (const member of this.salesTeam) {
            member.commissionAmount = Math.round(this.taxableAmount * (member.commissionRate / 100));
        }
    }

    // Recalculate line totals
    this.items.forEach(item => {
        if (item.type === 'comment' || item.type === 'subtotal') {
            item.lineTotal = 0;
            return;
        }
        if (item.type === 'discount') {
            item.lineTotal = -Math.abs(normalize(item.unitPrice));
            return;
        }
        let lineTotal = multiply(item.quantity, item.unitPrice);
        if (item.discountValue) {
            if (item.discountType === 'percentage') {
                lineTotal = subtract(lineTotal, percentage(lineTotal, item.discountValue));
            } else {
                lineTotal = subtract(lineTotal, normalize(item.discountValue));
            }
        }
        item.lineTotal = lineTotal;
    });
};

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
        firmId: this.firmId,  // Multi-tenancy: pass firmId to GL
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
    const { toHalalas, addAmounts, subtractAmounts } = require('../utils/currency');
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
        firmId: this.firmId,  // Multi-tenancy: pass firmId to GL
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
    this.balanceDue = subtractAmounts ? subtractAmounts(this.totalAmount, this.amountPaid) : (this.totalAmount - this.amountPaid);

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

/**
 * Void the invoice
 * @param {String} reason - Reason for voiding
 * @param {ObjectId} userId - User performing the action
 */
invoiceSchema.methods.voidInvoice = async function(reason, userId) {
    if (this.status === 'void') {
        throw new Error('Invoice is already voided');
    }

    if (this.amountPaid > 0) {
        throw new Error('Cannot void invoice with payments. Create a credit note instead.');
    }

    this.status = 'void';
    this.voidedAt = new Date();
    this.voidReason = reason;
    this.updatedBy = userId;

    this.history.push({
        action: 'voided',
        date: new Date(),
        user: userId,
        note: reason
    });

    await this.save();
    return this;
};

/**
 * Apply retainer to invoice
 * @param {Number} amount - Amount to apply from retainer
 * @param {ObjectId} retainerId - Retainer ID
 * @param {ObjectId} userId - User performing the action
 */
invoiceSchema.methods.applyRetainer = async function(amount, retainerId, userId) {
    const Retainer = mongoose.model('Retainer');
    const { toHalalas, addAmounts, subtractAmounts } = require('../utils/currency');

    const amountHalalas = Number.isInteger(amount) ? amount : toHalalas(amount);

    const retainer = await Retainer.findById(retainerId);
    if (!retainer) {
        throw new Error('Retainer not found');
    }

    if (retainer.currentBalance < amountHalalas) {
        throw new Error('Insufficient retainer balance');
    }

    // Consume from retainer
    await retainer.consume(amountHalalas, this._id, `Applied to invoice ${this.invoiceNumber}`);

    // Update invoice
    this.applyFromRetainer = addAmounts(this.applyFromRetainer || 0, amountHalalas);
    this.retainerTransactionId = retainerId;
    this.balanceDue = subtractAmounts(
        subtractAmounts(subtractAmounts(this.totalAmount, this.depositAmount), this.amountPaid),
        this.applyFromRetainer
    );

    if (this.balanceDue <= 0) {
        this.status = 'paid';
        this.paidDate = new Date();
    }

    this.history.push({
        action: 'paid',
        date: new Date(),
        user: userId,
        note: `Retainer applied: ${amountHalalas}`
    });

    await this.save();
    return this;
};

/**
 * Apply advance payments to invoice
 * Updates the advance payment's allocated amount
 * @param {Array} advanceAllocations - Array of { advancePaymentId, referenceNumber, allocatedAmount }
 * @param {ObjectId} userId - User performing the action
 */
invoiceSchema.methods.applyAdvancePayments = async function(advanceAllocations, userId) {
    const Payment = mongoose.model('Payment');
    const mongoose = require('mongoose');
    const session = await mongoose.startSession();
    session.startTransaction();

    const { toHalalas, addAmounts, subtractAmounts } = require('../utils/currency');

    try {
        let totalAllocated = 0;
        const newAdvances = [];

        for (const allocation of advanceAllocations) {
            const amountHalalas = Number.isInteger(allocation.allocatedAmount)
                ? allocation.allocatedAmount
                : toHalalas(allocation.allocatedAmount);

            // Get the advance payment
            const payment = await Payment.findById(allocation.advancePaymentId).session(session);

            if (!payment) {
                throw new Error(`Advance payment ${allocation.advancePaymentId} not found`);
            }

            // Check if enough unallocated amount
            const currentAllocated = payment.allocatedAmount || 0;
            const available = payment.amount - currentAllocated;

            if (amountHalalas > available) {
                throw new Error(`Cannot allocate ${amountHalalas}. Only ${available} available from payment ${payment.paymentNumber}`);
            }

            // Update the advance payment's allocated amount
            payment.allocatedAmount = addAmounts(currentAllocated, amountHalalas);
            await payment.save({ session });

            // Add to invoice advances
            newAdvances.push({
                advancePaymentId: allocation.advancePaymentId,
                referenceNumber: allocation.referenceNumber || payment.paymentNumber,
                allocatedAmount: amountHalalas
            });

            totalAllocated = addAmounts(totalAllocated, amountHalalas);
        }

        // Update invoice
        this.advances = [...(this.advances || []), ...newAdvances];
        this.totalAdvanceAllocated = addAmounts(this.totalAdvanceAllocated || 0, totalAllocated);
        this.balanceDue = subtractAmounts(
            subtractAmounts(subtractAmounts(subtractAmounts(this.totalAmount, this.depositAmount), this.amountPaid), this.applyFromRetainer),
            this.totalAdvanceAllocated
        );

        // Update status based on balance
        if (this.balanceDue <= 0) {
            this.status = 'paid';
            this.paidDate = new Date();
        }

        // Add to history
        this.history.push({
            action: 'payment_received',
            date: new Date(),
            user: userId,
            note: `Advance payments applied: ${totalAllocated}`
        });

        await this.save({ session });
        await session.commitTransaction();

        return this;

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

/**
 * Get available advance payments for a client
 * @param {ObjectId} clientId - Client ID
 * @returns {Array} Available advance payments
 */
invoiceSchema.statics.getAvailableAdvances = async function(clientId) {
    const Payment = mongoose.model('Payment');

    const advances = await Payment.find({
        $or: [
            { customerId: clientId },
            { clientId: clientId }
        ],
        paymentType: { $in: ['advance', 'retainer'] },
        status: 'completed',
        $expr: { $gt: ['$amount', { $ifNull: ['$allocatedAmount', 0] }] }
    }).select('_id paymentNumber paymentDate amount allocatedAmount');

    return advances.map(adv => ({
        id: adv._id,
        referenceNumber: adv.paymentNumber,
        paymentDate: adv.paymentDate,
        amount: adv.amount,
        allocatedAmount: adv.allocatedAmount || 0,
        availableAmount: adv.amount - (adv.allocatedAmount || 0)
    }));
};

module.exports = mongoose.model('Invoice', invoiceSchema);
