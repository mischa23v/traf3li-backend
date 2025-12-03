const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    paymentNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
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

module.exports = mongoose.model('Payment', paymentSchema);
