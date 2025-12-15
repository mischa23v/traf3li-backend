const mongoose = require('mongoose');

/**
 * Payment Receipt Model
 *
 * Generates receipts for payments received from clients.
 * Supports PDF generation and bilingual content.
 */
const paymentReceiptSchema = new mongoose.Schema({
    // Multi-tenancy
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },

    // Auto-generated receipt number (RCP-YYYY-00001)
    receiptNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Related records
    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
        required: true,
        index: true
    },
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        index: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true,
        index: true
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        index: true
    },

    // Receipt details
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
        enum: ['cash', 'bank_transfer', 'credit_card', 'debit_card', 'check', 'online', 'mobile_payment', 'other'],
        default: 'bank_transfer'
    },
    paymentDate: {
        type: Date,
        required: true
    },

    // Payer information
    receivedFrom: {
        type: String,
        required: true,
        trim: true
    },
    receivedFromAr: {
        type: String,
        trim: true
    },

    // Description
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    descriptionAr: {
        type: String,
        trim: true,
        maxlength: 500
    },

    // Bank/Reference details
    bankAccount: {
        type: String,
        trim: true
    },
    bankName: {
        type: String,
        trim: true
    },
    referenceNumber: {
        type: String,
        trim: true
    },
    checkNumber: {
        type: String,
        trim: true
    },

    // PDF storage
    pdfUrl: String,
    pdfGeneratedAt: Date,

    // Email tracking
    emailSentAt: Date,
    emailSentTo: String,

    // Voiding
    status: {
        type: String,
        enum: ['active', 'void'],
        default: 'active'
    },
    voidedAt: Date,
    voidedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    voidReason: {
        type: String,
        trim: true
    },

    // Notes
    notes: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    internalNotes: {
        type: String,
        trim: true,
        maxlength: 1000
    },

    // Audit
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
paymentReceiptSchema.index({ firmId: 1, receiptNumber: 1 });
paymentReceiptSchema.index({ firmId: 1, clientId: 1, createdAt: -1 });
paymentReceiptSchema.index({ firmId: 1, paymentDate: -1 });
paymentReceiptSchema.index({ firmId: 1, status: 1 });

/**
 * Pre-save: Auto-generate receipt number
 */
paymentReceiptSchema.pre('save', async function(next) {
    if (this.isNew && !this.receiptNumber) {
        this.receiptNumber = await this.constructor.generateReceiptNumber(this.firmId);
    }
    next();
});

/**
 * Static: Generate receipt number
 */
paymentReceiptSchema.statics.generateReceiptNumber = async function(firmId) {
    const year = new Date().getFullYear();
    const prefix = `RCP-${year}-`;

    const lastReceipt = await this.findOne({
        firmId,
        receiptNumber: { $regex: `^${prefix}` }
    }).sort({ receiptNumber: -1 });

    let sequence = 1;
    if (lastReceipt) {
        const lastSequence = parseInt(lastReceipt.receiptNumber.split('-')[2], 10);
        sequence = lastSequence + 1;
    }

    return `${prefix}${String(sequence).padStart(5, '0')}`;
};

/**
 * Static: Create receipt from payment
 */
paymentReceiptSchema.statics.createFromPayment = async function(paymentId, userId, additionalData = {}) {
    const Payment = mongoose.model('Payment');
    const Client = mongoose.model('Client');

    const payment = await Payment.findById(paymentId)
        .populate('invoiceId')
        .populate('clientId');

    if (!payment) {
        throw new Error('Payment not found');
    }

    // Get client name
    let receivedFrom = 'Client';
    let receivedFromAr = 'عميل';

    if (payment.clientId) {
        const client = await Client.findById(payment.clientId);
        if (client) {
            receivedFrom = client.companyName || `${client.firstName} ${client.lastName}`;
            receivedFromAr = client.companyNameAr || client.firstNameAr || receivedFrom;
        }
    }

    const receipt = new this({
        firmId: payment.firmId,
        paymentId: payment._id,
        invoiceId: payment.invoiceId?._id || payment.invoiceId,
        clientId: payment.clientId?._id || payment.clientId,
        caseId: payment.caseId,
        amount: payment.amount,
        currency: payment.currency || 'SAR',
        paymentMethod: payment.paymentMethod,
        paymentDate: payment.paymentDate || payment.createdAt,
        receivedFrom,
        receivedFromAr,
        bankAccount: payment.bankAccount,
        referenceNumber: payment.referenceNumber,
        generatedBy: userId,
        createdBy: userId,
        ...additionalData
    });

    await receipt.save();
    return receipt;
};

/**
 * Instance: Void the receipt
 */
paymentReceiptSchema.methods.void = async function(reason, userId) {
    if (this.status === 'void') {
        throw new Error('Receipt is already voided');
    }

    this.status = 'void';
    this.voidedAt = new Date();
    this.voidedBy = userId;
    this.voidReason = reason;

    await this.save();
    return this;
};

/**
 * Instance: Mark email as sent
 */
paymentReceiptSchema.methods.markEmailSent = async function(emailAddress) {
    this.emailSentAt = new Date();
    this.emailSentTo = emailAddress;
    await this.save();
    return this;
};

/**
 * Instance: Update PDF URL
 */
paymentReceiptSchema.methods.setPdfUrl = async function(url) {
    this.pdfUrl = url;
    this.pdfGeneratedAt = new Date();
    await this.save();
    return this;
};

/**
 * Static: Get receipts for client
 */
paymentReceiptSchema.statics.getClientReceipts = async function(firmId, clientId, options = {}) {
    const { limit = 50, offset = 0, startDate, endDate } = options;

    const query = {
        firmId: new mongoose.Types.ObjectId(firmId),
        clientId: new mongoose.Types.ObjectId(clientId),
        status: 'active'
    };

    if (startDate || endDate) {
        query.paymentDate = {};
        if (startDate) query.paymentDate.$gte = new Date(startDate);
        if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    return await this.find(query)
        .populate('paymentId', 'paymentNumber amount')
        .populate('invoiceId', 'invoiceNumber totalAmount')
        .sort({ paymentDate: -1 })
        .skip(offset)
        .limit(limit);
};

/**
 * Static: Get receipt statistics
 */
paymentReceiptSchema.statics.getStats = async function(firmId, startDate, endDate) {
    const matchStage = {
        firmId: new mongoose.Types.ObjectId(firmId),
        status: 'active'
    };

    if (startDate || endDate) {
        matchStage.paymentDate = {};
        if (startDate) matchStage.paymentDate.$gte = new Date(startDate);
        if (endDate) matchStage.paymentDate.$lte = new Date(endDate);
    }

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalReceipts: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                byPaymentMethod: {
                    $push: {
                        method: '$paymentMethod',
                        amount: '$amount'
                    }
                }
            }
        }
    ]);

    if (stats.length === 0) {
        return {
            totalReceipts: 0,
            totalAmount: 0,
            byPaymentMethod: {}
        };
    }

    // Process payment method breakdown
    const methodBreakdown = {};
    stats[0].byPaymentMethod.forEach(item => {
        if (!methodBreakdown[item.method]) {
            methodBreakdown[item.method] = { count: 0, amount: 0 };
        }
        methodBreakdown[item.method].count += 1;
        methodBreakdown[item.method].amount += item.amount;
    });

    return {
        totalReceipts: stats[0].totalReceipts,
        totalAmount: stats[0].totalAmount,
        byPaymentMethod: methodBreakdown
    };
};

module.exports = mongoose.model('PaymentReceipt', paymentReceiptSchema);
