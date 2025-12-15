const mongoose = require('mongoose');

/**
 * Commission Entry Model (ERPNext Parity)
 * Tracks sales commission for invoices based on sales team assignments
 */

// Commission statuses
const COMMISSION_STATUSES = ['pending', 'approved', 'paid', 'cancelled'];

const commissionEntrySchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // COMMISSION INFO
    // ═══════════════════════════════════════════════════════════════
    commissionNumber: {
        type: String,
        unique: true,
        sparse: true,
        index: true
        // Format: COM-YYYY-XXXX
    },
    salesPersonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    salesPersonName: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // SOURCE REFERENCE
    // ═══════════════════════════════════════════════════════════════
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        required: true,
        index: true
    },
    invoiceNumber: {
        type: String,
        trim: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        index: true
    },
    clientName: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // AMOUNTS
    // ═══════════════════════════════════════════════════════════════
    invoiceAmount: {
        type: Number,
        min: 0,
        required: true
        // Base invoice amount (after discount, before tax)
    },
    commissionRate: {
        type: Number,
        min: 0,
        max: 100,
        required: true
    },
    commissionAmount: {
        type: Number,
        min: 0,
        required: true
        // Calculated: invoiceAmount * (commissionRate / 100)
    },
    currency: {
        type: String,
        default: 'SAR'
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: COMMISSION_STATUSES,
        default: 'pending',
        index: true
    },
    commissionDate: {
        type: Date,
        default: Date.now
    },

    // ═══════════════════════════════════════════════════════════════
    // APPROVAL
    // ═══════════════════════════════════════════════════════════════
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    approvalNotes: {
        type: String,
        maxlength: 500
    },

    // ═══════════════════════════════════════════════════════════════
    // PAYMENT
    // ═══════════════════════════════════════════════════════════════
    paidDate: {
        type: Date
    },
    paidBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    paymentReference: {
        type: String,
        trim: true
    },
    paymentMethod: {
        type: String,
        enum: ['bank_transfer', 'cash', 'payroll', 'check']
    },

    // ═══════════════════════════════════════════════════════════════
    // NOTES
    // ═══════════════════════════════════════════════════════════════
    notes: {
        type: String,
        maxlength: 1000
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    }
}, {
    versionKey: false,
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
commissionEntrySchema.index({ firmId: 1, salesPersonId: 1, status: 1 });
commissionEntrySchema.index({ firmId: 1, status: 1, commissionDate: -1 });
commissionEntrySchema.index({ invoiceId: 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
commissionEntrySchema.pre('save', async function(next) {
    // Generate commission number
    if (this.isNew && !this.commissionNumber) {
        const date = new Date();
        const year = date.getFullYear();
        const count = await this.constructor.countDocuments({
            commissionNumber: new RegExp(`^COM-${year}-`)
        });
        this.commissionNumber = `COM-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    // Calculate commission amount if not set
    if (this.invoiceAmount && this.commissionRate && !this.commissionAmount) {
        this.commissionAmount = Math.round(this.invoiceAmount * (this.commissionRate / 100));
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Create commission entries for invoice sales team
 */
commissionEntrySchema.statics.createFromInvoice = async function(invoice, userId) {
    if (!invoice.salesTeam || invoice.salesTeam.length === 0) {
        return [];
    }

    const entries = [];
    for (const member of invoice.salesTeam) {
        const entry = await this.create({
            firmId: invoice.firmId,
            salesPersonId: member.salesPersonId,
            salesPersonName: member.salesPersonName,
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            clientId: invoice.clientId,
            invoiceAmount: invoice.subtotal - (invoice.discountAmount || 0),
            commissionRate: member.commissionRate,
            commissionAmount: member.commissionAmount,
            status: 'pending',
            commissionDate: new Date(),
            createdBy: userId,
            lawyerId: invoice.lawyerId
        });
        entries.push(entry);
    }
    return entries;
};

/**
 * Get pending commissions for a sales person
 */
commissionEntrySchema.statics.getPendingCommissions = async function(salesPersonId) {
    return await this.find({
        salesPersonId,
        status: 'pending'
    })
    .populate('invoiceId', 'invoiceNumber issueDate totalAmount')
    .populate('clientId', 'firstName lastName companyName')
    .sort({ commissionDate: -1 });
};

/**
 * Get commission statistics for a sales person
 */
commissionEntrySchema.statics.getCommissionStats = async function(salesPersonId, startDate, endDate) {
    const matchStage = { salesPersonId: new mongoose.Types.ObjectId(salesPersonId) };
    if (startDate || endDate) {
        matchStage.commissionDate = {};
        if (startDate) matchStage.commissionDate.$gte = new Date(startDate);
        if (endDate) matchStage.commissionDate.$lte = new Date(endDate);
    }

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$commissionAmount' }
            }
        }
    ]);

    const result = {
        pending: { count: 0, amount: 0 },
        approved: { count: 0, amount: 0 },
        paid: { count: 0, amount: 0 },
        cancelled: { count: 0, amount: 0 },
        total: { count: 0, amount: 0 }
    };

    stats.forEach(s => {
        if (result[s._id]) {
            result[s._id] = { count: s.count, amount: s.totalAmount };
        }
        result.total.count += s.count;
        result.total.amount += s.totalAmount;
    });

    return result;
};

/**
 * Approve commission entries
 */
commissionEntrySchema.statics.approveCommissions = async function(entryIds, userId, notes = null) {
    return await this.updateMany(
        { _id: { $in: entryIds }, status: 'pending' },
        {
            $set: {
                status: 'approved',
                approvedBy: userId,
                approvedAt: new Date(),
                approvalNotes: notes
            }
        }
    );
};

/**
 * Mark commissions as paid
 */
commissionEntrySchema.statics.markAsPaid = async function(entryIds, userId, paymentDetails = {}) {
    return await this.updateMany(
        { _id: { $in: entryIds }, status: 'approved' },
        {
            $set: {
                status: 'paid',
                paidDate: new Date(),
                paidBy: userId,
                paymentReference: paymentDetails.paymentReference,
                paymentMethod: paymentDetails.paymentMethod
            }
        }
    );
};

// Export constants
commissionEntrySchema.statics.COMMISSION_STATUSES = COMMISSION_STATUSES;

module.exports = mongoose.model('CommissionEntry', commissionEntrySchema);
