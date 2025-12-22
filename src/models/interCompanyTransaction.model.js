const mongoose = require('mongoose');

const interCompanyTransactionSchema = new mongoose.Schema({
    // Source and target firms
    sourceFirmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    targetFirmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },

    transactionType: {
        type: String,
        enum: ['sale', 'purchase', 'transfer', 'loan', 'reimbursement'],
        required: true
    },

    reference: String,
    description: String,

    // Amount
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'SAR'
    },
    exchangeRate: {
        type: Number,
        default: 1
    },

    transactionDate: {
        type: Date,
        required: true,
        index: true
    },

    // Source document reference
    sourceDocumentType: String, // 'Invoice', 'Expense', 'JournalEntry'
    sourceDocumentId: mongoose.Schema.Types.ObjectId,

    // Target document reference (if auto-created)
    targetDocumentType: String,
    targetDocumentId: mongoose.Schema.Types.ObjectId,

    status: {
        type: String,
        enum: ['draft', 'pending', 'confirmed', 'reconciled', 'cancelled'],
        default: 'draft',
        index: true
    },

    // Reconciliation
    reconciledAt: Date,
    reconciledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    confirmedAt: Date
}, {
    timestamps: true,
    versionKey: false
});

// Validation
interCompanyTransactionSchema.pre('validate', function(next) {
    if (this.sourceFirmId.toString() === this.targetFirmId.toString()) {
        next(new Error('Source and target firms must be different'));
    }
    next();
});

// Indexes
interCompanyTransactionSchema.index({ sourceFirmId: 1, targetFirmId: 1 });
interCompanyTransactionSchema.index({ transactionDate: 1, status: 1 });

module.exports = mongoose.model('InterCompanyTransaction', interCompanyTransactionSchema);
