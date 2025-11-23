const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: {
        type: String,
        required: true,
        unique: true
    },
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
    total: {
        type: Number,
        required: true
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
        enum: ['draft', 'pending', 'sent', 'paid', 'overdue', 'cancelled'],
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

module.exports = mongoose.model('Invoice', invoiceSchema);
