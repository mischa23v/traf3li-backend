const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    descriptionAr: {
        type: String,
        trim: true,
        maxlength: 500
    },
    quantity: {
        type: Number,
        required: true,
        min: 0.01,
        default: 1
    },
    unitPrice: {
        type: Number,
        required: true,
        min: 0
    },
    taxRate: {
        type: Number,
        default: 0.15
    },
    taxAmount: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        default: 0
    },
    categoryId: {
        type: String
    },
    // Job costing: Case ID for this line item
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case'
    },
    // GL account for this expense line
    expenseAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    }
}, { _id: true });

const attachmentSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: true
    },
    fileUrl: {
        type: String,
        required: true
    },
    fileType: String,
    fileSize: Number,
    uploadedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const billHistorySchema = new mongoose.Schema({
    action: {
        type: String,
        enum: ['created', 'updated', 'received', 'paid', 'partial_paid', 'cancelled', 'attachment_added', 'attachment_removed'],
        required: true
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    performedAt: {
        type: Date,
        default: Date.now
    },
    details: mongoose.Schema.Types.Mixed
}, { _id: true });

const recurringConfigSchema = new mongoose.Schema({
    frequency: {
        type: String,
        enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
        required: true
    },
    interval: {
        type: Number,
        default: 1
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: Date,
    nextBillDate: Date,
    autoGenerate: {
        type: Boolean,
        default: true
    },
    autoSend: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { _id: false });

const billSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },

    billNumber: {
        type: String,
        unique: true,
        index: true
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true,
        index: true
    },
    // Accounting: Default A/P account
    payableAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    },
    // GL entries for this bill
    glEntries: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GeneralLedger'
    }],
    items: [billItemSchema],
    subtotal: {
        type: Number,
        default: 0
    },
    taxRate: {
        type: Number,
        default: 0.15
    },
    taxAmount: {
        type: Number,
        default: 0
    },
    discountType: {
        type: String,
        enum: ['fixed', 'percentage', null],
        default: null
    },
    discountValue: {
        type: Number,
        default: 0
    },
    discountAmount: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        required: true,
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
    currency: {
        type: String,
        default: 'SAR'
    },
    exchangeRate: {
        type: Number,
        default: 1
    },
    billDate: {
        type: Date,
        required: true,
        index: true
    },
    dueDate: {
        type: Date,
        required: true,
        index: true
    },
    paidDate: Date,
    status: {
        type: String,
        enum: ['draft', 'received', 'pending', 'partial', 'paid', 'overdue', 'cancelled'],
        default: 'draft',
        index: true
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        index: true
    },
    categoryId: {
        type: String
    },
    attachments: [attachmentSchema],
    isRecurring: {
        type: Boolean,
        default: false
    },
    recurringConfig: recurringConfigSchema,
    parentBillId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bill'
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 2000
    },
    internalNotes: {
        type: String,
        trim: true,
        maxlength: 2000
    },
    reference: {
        type: String,
        trim: true
    },
    history: [billHistorySchema],
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
billSchema.index({ lawyerId: 1, status: 1 });
billSchema.index({ lawyerId: 1, billDate: -1 });
billSchema.index({ lawyerId: 1, dueDate: 1 });
billSchema.index({ lawyerId: 1, vendorId: 1 });
billSchema.index({ vendorId: 1, billDate: -1 });
billSchema.index({ isRecurring: 1, 'recurringConfig.nextBillDate': 1 });

// Pre-save hook
billSchema.pre('save', async function(next) {
    // Generate bill number
    if (!this.billNumber) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const count = await this.constructor.countDocuments({
            createdAt: {
                $gte: new Date(year, date.getMonth(), 1),
                $lt: new Date(year, date.getMonth() + 1, 1)
            }
        });
        this.billNumber = `BILL-${year}${month}-${String(count + 1).padStart(4, '0')}`;
    }

    // Calculate item totals
    let subtotal = 0;
    for (const item of this.items) {
        const itemSubtotal = item.quantity * item.unitPrice;
        item.taxAmount = itemSubtotal * item.taxRate;
        item.total = itemSubtotal + item.taxAmount - item.discount;
        subtotal += itemSubtotal;
    }
    this.subtotal = subtotal;

    // Calculate tax
    this.taxAmount = subtotal * this.taxRate;

    // Calculate discount
    if (this.discountType === 'percentage') {
        this.discountAmount = subtotal * (this.discountValue / 100);
    } else if (this.discountType === 'fixed') {
        this.discountAmount = this.discountValue;
    } else {
        this.discountAmount = 0;
    }

    // Calculate total
    this.totalAmount = subtotal + this.taxAmount - this.discountAmount;
    this.balanceDue = this.totalAmount - this.amountPaid;

    // Update status based on payment
    if (this.status !== 'cancelled') {
        if (this.balanceDue <= 0) {
            this.status = 'paid';
            if (!this.paidDate) this.paidDate = new Date();
        } else if (this.amountPaid > 0) {
            this.status = 'partial';
        } else if (this.status !== 'draft' && new Date() > this.dueDate) {
            this.status = 'overdue';
        }
    }

    next();
});

// Static method: Get bills summary
billSchema.statics.getBillsSummary = async function(lawyerId, filters = {}) {
    const matchStage = { lawyerId: new mongoose.Types.ObjectId(lawyerId) };

    if (filters.startDate) matchStage.billDate = { $gte: new Date(filters.startDate) };
    if (filters.endDate) {
        matchStage.billDate = matchStage.billDate || {};
        matchStage.billDate.$lte = new Date(filters.endDate);
    }
    if (filters.vendorId) matchStage.vendorId = new mongoose.Types.ObjectId(filters.vendorId);

    const summary = await this.aggregate([
        { $match: matchStage },
        {
            $facet: {
                totals: [
                    {
                        $group: {
                            _id: null,
                            totalBills: { $sum: 1 },
                            totalAmount: { $sum: '$totalAmount' },
                            totalPaid: { $sum: '$amountPaid' },
                            totalOutstanding: { $sum: '$balanceDue' }
                        }
                    }
                ],
                overdue: [
                    {
                        $match: { status: 'overdue' }
                    },
                    {
                        $group: {
                            _id: null,
                            totalOverdue: { $sum: '$balanceDue' }
                        }
                    }
                ],
                byStatus: [
                    {
                        $group: {
                            _id: '$status',
                            count: { $sum: 1 },
                            amount: { $sum: '$totalAmount' }
                        }
                    },
                    {
                        $project: {
                            status: '$_id',
                            count: 1,
                            amount: 1,
                            _id: 0
                        }
                    }
                ],
                byCategory: [
                    {
                        $match: { categoryId: { $ne: null } }
                    },
                    {
                        $group: {
                            _id: '$categoryId',
                            amount: { $sum: '$totalAmount' }
                        }
                    },
                    {
                        $project: {
                            categoryId: '$_id',
                            amount: 1,
                            _id: 0
                        }
                    }
                ]
            }
        }
    ]);

    const result = summary[0];
    return {
        totalBills: result.totals[0]?.totalBills || 0,
        totalAmount: result.totals[0]?.totalAmount || 0,
        totalPaid: result.totals[0]?.totalPaid || 0,
        totalOutstanding: result.totals[0]?.totalOutstanding || 0,
        totalOverdue: result.overdue[0]?.totalOverdue || 0,
        byStatus: result.byStatus,
        byCategory: result.byCategory
    };
};

// Static method: Get aging report
billSchema.statics.getAgingReport = async function(lawyerId, vendorId = null) {
    const now = new Date();
    const matchStage = {
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        status: { $in: ['pending', 'partial', 'overdue'] }
    };

    if (vendorId) {
        matchStage.vendorId = new mongoose.Types.ObjectId(vendorId);
    }

    const bills = await this.find(matchStage)
        .populate('vendorId', 'name vendorId')
        .lean();

    const vendorAging = {};
    let summary = {
        total: 0,
        current: 0,
        days1to30: 0,
        days31to60: 0,
        days61to90: 0,
        days90plus: 0
    };

    for (const bill of bills) {
        const daysPastDue = Math.floor((now - bill.dueDate) / (1000 * 60 * 60 * 24));
        const amount = bill.balanceDue;

        // Initialize vendor if not exists
        const vId = bill.vendorId?._id?.toString() || 'unknown';
        if (!vendorAging[vId]) {
            vendorAging[vId] = {
                vendorId: vId,
                vendorName: bill.vendorId?.name || 'Unknown',
                current: 0,
                days1to30: 0,
                days31to60: 0,
                days61to90: 0,
                days90plus: 0,
                total: 0
            };
        }

        // Categorize by age
        if (daysPastDue <= 0) {
            vendorAging[vId].current += amount;
            summary.current += amount;
        } else if (daysPastDue <= 30) {
            vendorAging[vId].days1to30 += amount;
            summary.days1to30 += amount;
        } else if (daysPastDue <= 60) {
            vendorAging[vId].days31to60 += amount;
            summary.days31to60 += amount;
        } else if (daysPastDue <= 90) {
            vendorAging[vId].days61to90 += amount;
            summary.days61to90 += amount;
        } else {
            vendorAging[vId].days90plus += amount;
            summary.days90plus += amount;
        }

        vendorAging[vId].total += amount;
        summary.total += amount;
    }

    return {
        summary,
        vendors: Object.values(vendorAging),
        generatedAt: new Date()
    };
};

// Static method: Get overdue bills
billSchema.statics.getOverdueBills = async function(lawyerId) {
    return await this.find({
        lawyerId,
        status: { $in: ['pending', 'partial'] },
        dueDate: { $lt: new Date() }
    })
        .populate('vendorId', 'name vendorId')
        .sort({ dueDate: 1 });
};

// Static method: Generate next recurring bill
billSchema.statics.generateRecurringBill = async function(parentBillId) {
    const parentBill = await this.findById(parentBillId);
    if (!parentBill || !parentBill.isRecurring || !parentBill.recurringConfig?.isActive) {
        throw new Error('Invalid recurring bill');
    }

    const config = parentBill.recurringConfig;
    if (config.endDate && new Date() > config.endDate) {
        throw new Error('Recurring schedule has ended');
    }

    // Calculate next dates
    const billDate = new Date(config.nextBillDate || new Date());
    const dueDate = new Date(billDate);
    dueDate.setDate(dueDate.getDate() + (parentBill.dueDate - parentBill.billDate) / (1000 * 60 * 60 * 24));

    // Create new bill
    const newBill = new this({
        vendorId: parentBill.vendorId,
        items: parentBill.items,
        taxRate: parentBill.taxRate,
        discountType: parentBill.discountType,
        discountValue: parentBill.discountValue,
        currency: parentBill.currency,
        billDate,
        dueDate,
        status: 'pending',
        caseId: parentBill.caseId,
        categoryId: parentBill.categoryId,
        notes: parentBill.notes,
        parentBillId: parentBill._id,
        lawyerId: parentBill.lawyerId,
        history: [{ action: 'created', performedAt: new Date(), details: { recurring: true, parentBillId: parentBill._id } }]
    });

    await newBill.save();

    // Update next bill date on parent
    const nextDate = new Date(billDate);
    switch (config.frequency) {
        case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7 * config.interval);
            break;
        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + config.interval);
            break;
        case 'quarterly':
            nextDate.setMonth(nextDate.getMonth() + 3 * config.interval);
            break;
        case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + config.interval);
            break;
    }

    parentBill.recurringConfig.nextBillDate = nextDate;
    await parentBill.save();

    return newBill;
};

/**
 * Post bill to General Ledger
 * Creates GL entries for each line item:
 * DR: Expense Account (per line)
 * CR: Accounts Payable
 * @param {Session} session - MongoDB session for transactions
 */
billSchema.methods.postToGL = async function(session = null) {
    const GeneralLedger = mongoose.model('GeneralLedger');
    const Account = mongoose.model('Account');

    // Check if already posted
    if (this.glEntries && this.glEntries.length > 0) {
        throw new Error('Bill already posted to GL');
    }

    // Get A/P account (use default if not set)
    let payableAccountId = this.payableAccountId;
    if (!payableAccountId) {
        const apAccount = await Account.findOne({ code: '2101' }); // Accounts Payable
        if (!apAccount) throw new Error('Accounts Payable account not found');
        payableAccountId = apAccount._id;
        this.payableAccountId = payableAccountId;
    }

    // Get default expense account
    const defaultExpenseAccount = await Account.findOne({ code: '5200' }); // Operating Expenses
    if (!defaultExpenseAccount) throw new Error('Default Expense account not found');

    const { toHalalas } = require('../utils/currency');
    const glEntries = [];

    // Create GL entry for each line item
    for (const item of this.items) {
        // Get expense account for this line (use default if not set)
        const expenseAccountId = item.expenseAccountId || defaultExpenseAccount._id;

        // Convert amount to halalas if needed
        const amount = Number.isInteger(item.total) ? item.total : toHalalas(item.total);

        if (amount > 0) {
            const glEntry = await GeneralLedger.postTransaction({
                firmId: this.firmId,  // Multi-tenancy: pass firmId to GL
                transactionDate: this.billDate || new Date(),
                description: `Bill ${this.billNumber} - ${item.description}`,
                descriptionAr: item.descriptionAr || `فاتورة ${this.billNumber}`,
                debitAccountId: expenseAccountId,
                creditAccountId: payableAccountId,
                amount,
                referenceId: this._id,
                referenceModel: 'Bill',
                referenceNumber: this.billNumber,
                caseId: item.caseId || this.caseId,
                lawyerId: this.lawyerId,
                meta: {
                    vendorId: this.vendorId,
                    itemDescription: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice
                },
                createdBy: this.lawyerId
            }, session);

            glEntries.push(glEntry._id);
        }
    }

    this.glEntries = glEntries;

    const options = session ? { session } : {};
    await this.save(options);

    return glEntries;
};

/**
 * Record payment for this bill
 * DR: Accounts Payable
 * CR: Bank Account
 * @param {Object} paymentData - Payment details
 * @param {Session} session - MongoDB session for transactions
 */
billSchema.methods.recordPayment = async function(paymentData, session = null) {
    const GeneralLedger = mongoose.model('GeneralLedger');
    const Account = mongoose.model('Account');
    const BillPayment = mongoose.model('BillPayment');

    const { amount, paymentDate, bankAccountId, paymentMethod, userId } = paymentData;

    // Get A/P account
    let payableAccountId = this.payableAccountId;
    if (!payableAccountId) {
        const apAccount = await Account.findOne({ code: '2101' });
        if (!apAccount) throw new Error('Accounts Payable account not found');
        payableAccountId = apAccount._id;
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

    // Create bill payment record
    const billPayment = new BillPayment({
        billId: this._id,
        lawyerId: this.lawyerId,
        amount: amountHalalas,
        paymentDate: paymentDate || new Date(),
        paymentMethod: paymentMethod || 'bank_transfer',
        bankAccountId: bankAcctId,
        createdBy: userId
    });

    const options = session ? { session } : {};
    await billPayment.save(options);

    // Post payment to GL: DR A/P, CR Bank
    const glEntry = await GeneralLedger.postTransaction({
        firmId: this.firmId,  // Multi-tenancy: pass firmId to GL
        transactionDate: paymentDate || new Date(),
        description: `Payment for Bill ${this.billNumber}`,
        descriptionAr: `دفعة للفاتورة ${this.billNumber}`,
        debitAccountId: payableAccountId,
        creditAccountId: bankAcctId,
        amount: amountHalalas,
        referenceId: billPayment._id,
        referenceModel: 'BillPayment',
        referenceNumber: billPayment.paymentNumber,
        caseId: this.caseId,
        lawyerId: this.lawyerId,
        meta: {
            billId: this._id,
            billNumber: this.billNumber,
            vendorId: this.vendorId
        },
        createdBy: userId
    }, session);

    // Update bill payment tracking
    this.amountPaid = addAmounts(this.amountPaid || 0, amountHalalas);
    this.balanceDue = this.totalAmount - this.amountPaid;

    // Update bill status
    if (this.balanceDue <= 0) {
        this.status = 'paid';
        this.paidDate = new Date();
    } else if (this.amountPaid > 0) {
        this.status = 'partial';
    }

    // Add to history
    this.history.push({
        action: 'paid',
        performedBy: userId,
        performedAt: new Date(),
        details: { amount: amountHalalas, paymentMethod }
    });

    await this.save(options);

    return { billPayment, glEntry };
};

module.exports = mongoose.model('Bill', billSchema);
