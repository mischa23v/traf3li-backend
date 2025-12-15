/**
 * Debit Note Model
 *
 * Debit notes are issued to vendors/suppliers to reduce the amount owed to them.
 * Used for returns, damaged goods, pricing errors, etc.
 */

const mongoose = require('mongoose');

const debitNoteItemSchema = new mongoose.Schema({
    description: { type: String, required: true, trim: true },
    descriptionAr: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 0.01 },
    unitPrice: { type: Number, required: true, min: 0 }, // In halalas
    taxRate: { type: Number, default: 15, min: 0, max: 100 },
    taxAmount: { type: Number, default: 0 }, // In halalas
    total: { type: Number, required: true } // In halalas
}, { _id: true });

const debitNoteSchema = new mongoose.Schema({
    // Multi-tenancy
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // Debit Note Number
    debitNoteNumber: {
        type: String,
        required: true,
        index: true
    },

    // Reference to Original Bill
    billId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bill',
        required: true,
        index: true
    },
    billNumber: { type: String },

    // Vendor Information
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true,
        index: true
    },
    vendorName: { type: String },
    vendorNameAr: { type: String },
    vendorVatNumber: { type: String },

    // Debit Note Details
    debitNoteDate: { type: Date, default: Date.now, index: true },
    isPartial: { type: Boolean, default: false },

    // Reason
    reasonType: {
        type: String,
        enum: [
            'goods_returned',
            'damaged_goods',
            'pricing_error',
            'quality_issue',
            'overcharge',
            'duplicate_billing',
            'service_not_rendered',
            'contract_termination',
            'other'
        ],
        required: true
    },
    reason: { type: String, trim: true },
    reasonAr: { type: String, trim: true },

    // Line Items
    items: {
        type: [debitNoteItemSchema],
        validate: {
            validator: function(items) {
                return items && items.length > 0;
            },
            message: 'Debit note must have at least one item'
        }
    },

    // Financial Amounts (all in halalas)
    subtotal: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },

    // Status
    status: {
        type: String,
        enum: ['draft', 'pending', 'approved', 'applied', 'rejected', 'cancelled'],
        default: 'draft',
        index: true
    },

    // GL Entry Reference
    glEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'GeneralLedger' },
    journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },

    // Approval Workflow
    submittedAt: { type: Date },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvalNotes: { type: String },
    rejectedAt: { type: Date },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String },

    // Application Details
    appliedAt: { type: Date },
    appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    appliedToBills: [{
        billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' },
        amount: { type: Number },
        appliedAt: { type: Date }
    }],

    // Cancellation
    cancelledAt: { type: Date },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancellationReason: { type: String },

    // Additional Information
    notes: { type: String, trim: true },
    notesAr: { type: String, trim: true },
    internalNotes: { type: String, trim: true },
    attachments: [{
        name: { type: String },
        url: { type: String },
        uploadedAt: { type: Date, default: Date.now }
    }],

    // History/Audit Log
    history: [{
        action: { type: String, required: true },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        performedAt: { type: Date, default: Date.now },
        details: { type: mongoose.Schema.Types.Mixed }
    }],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true,
    versionKey: false
});

// Indexes
debitNoteSchema.index({ firmId: 1, debitNoteNumber: 1 }, { unique: true });
debitNoteSchema.index({ firmId: 1, status: 1 });
debitNoteSchema.index({ firmId: 1, vendorId: 1 });
debitNoteSchema.index({ firmId: 1, debitNoteDate: -1 });
debitNoteSchema.index({ lawyerId: 1, debitNoteNumber: 1 }, { unique: true, sparse: true });

/**
 * Generate debit note number
 */
debitNoteSchema.statics.generateNumber = async function(firmId, lawyerId) {
    const year = new Date().getFullYear();
    const query = firmId ? { firmId } : { lawyerId };

    const lastDN = await this.findOne({
        ...query,
        debitNoteNumber: { $regex: `^DN-${year}-` }
    }).sort({ debitNoteNumber: -1 });

    let sequence = 1;
    if (lastDN) {
        const match = lastDN.debitNoteNumber.match(/DN-\d{4}-(\d+)/);
        if (match) {
            sequence = parseInt(match[1], 10) + 1;
        }
    }

    return `DN-${year}-${String(sequence).padStart(4, '0')}`;
};

/**
 * Calculate totals
 */
debitNoteSchema.methods.calculateTotals = function() {
    let subtotal = 0;
    let taxAmount = 0;

    this.items.forEach(item => {
        const lineTotal = item.quantity * item.unitPrice;
        const lineTax = Math.round((lineTotal * (item.taxRate || 15)) / 100);

        item.taxAmount = lineTax;
        item.total = lineTotal + lineTax;

        subtotal += lineTotal;
        taxAmount += lineTax;
    });

    this.subtotal = subtotal;
    this.taxAmount = taxAmount;
    this.total = subtotal + taxAmount;

    return this;
};

/**
 * Submit for approval
 */
debitNoteSchema.methods.submit = async function(userId) {
    if (this.status !== 'draft') {
        throw new Error('Only draft debit notes can be submitted');
    }

    this.status = 'pending';
    this.submittedAt = new Date();
    this.submittedBy = userId;
    this.history.push({
        action: 'submitted',
        performedBy: userId
    });

    await this.save();
    return this;
};

/**
 * Approve debit note
 */
debitNoteSchema.methods.approve = async function(userId, notes) {
    if (this.status !== 'pending') {
        throw new Error('Only pending debit notes can be approved');
    }

    this.status = 'approved';
    this.approvedAt = new Date();
    this.approvedBy = userId;
    this.approvalNotes = notes;
    this.history.push({
        action: 'approved',
        performedBy: userId,
        details: { notes }
    });

    await this.save();
    return this;
};

/**
 * Reject debit note
 */
debitNoteSchema.methods.reject = async function(userId, reason) {
    if (this.status !== 'pending') {
        throw new Error('Only pending debit notes can be rejected');
    }

    this.status = 'rejected';
    this.rejectedAt = new Date();
    this.rejectedBy = userId;
    this.rejectionReason = reason;
    this.history.push({
        action: 'rejected',
        performedBy: userId,
        details: { reason }
    });

    await this.save();
    return this;
};

/**
 * Apply debit note to bill
 */
debitNoteSchema.methods.apply = async function(userId, session = null) {
    if (this.status !== 'approved') {
        throw new Error('Only approved debit notes can be applied');
    }

    const Bill = mongoose.model('Bill');
    const options = session ? { session } : {};

    // Update original bill balance
    const bill = await Bill.findById(this.billId);
    if (bill) {
        bill.debitNotesTotal = (bill.debitNotesTotal || 0) + this.total;
        bill.balanceDue = Math.max(0, (bill.balanceDue || bill.totalAmount) - this.total);

        if (bill.balanceDue <= 0) {
            bill.status = 'paid';
        }
        await bill.save(options);

        this.appliedToBills.push({
            billId: bill._id,
            amount: this.total,
            appliedAt: new Date()
        });
    }

    this.status = 'applied';
    this.appliedAt = new Date();
    this.appliedBy = userId;
    this.history.push({
        action: 'applied',
        performedBy: userId,
        details: { billId: this.billId, amount: this.total }
    });

    await this.save(options);
    return this;
};

/**
 * Cancel debit note
 */
debitNoteSchema.methods.cancel = async function(userId, reason) {
    if (['applied', 'cancelled'].includes(this.status)) {
        throw new Error('Applied or cancelled debit notes cannot be cancelled');
    }

    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.cancelledBy = userId;
    this.cancellationReason = reason;
    this.history.push({
        action: 'cancelled',
        performedBy: userId,
        details: { reason }
    });

    await this.save();
    return this;
};

module.exports = mongoose.model('DebitNote', debitNoteSchema);
