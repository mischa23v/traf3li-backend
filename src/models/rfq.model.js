const mongoose = require('mongoose');

// RFQ Item sub-schema
const rfqItemSchema = new mongoose.Schema({
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item'
    },
    itemCode: {
        type: String,
        trim: true
    },
    itemName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 300
    },
    qty: {
        type: Number,
        required: true,
        min: 0.01
    },
    uom: {
        type: String,
        trim: true,
        default: 'Unit'
    },
    requiredDate: {
        type: Date
    }
}, { _id: true });

// RFQ Supplier sub-schema
const rfqSupplierSchema = new mongoose.Schema({
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true
    },
    supplierName: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    sendEmail: {
        type: Boolean,
        default: false
    },
    quotationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SupplierQuotation'
    }
}, { _id: true });

const rfqSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },

    // Auto-generated ID
    rfqId: {
        type: String,
        unique: true,
        index: true
    },

    // RFQ Number
    rfqNumber: {
        type: String,
        unique: true,
        index: true
    },

    // Items
    items: [rfqItemSchema],

    // Suppliers
    suppliers: [rfqSupplierSchema],

    // Dates
    transactionDate: {
        type: Date,
        default: Date.now,
        index: true
    },
    validTill: {
        type: Date
    },

    // Message for Supplier
    messageForSupplier: {
        type: String,
        trim: true,
        maxlength: 2000
    },

    // Status
    status: {
        type: String,
        enum: ['draft', 'submitted', 'quoted', 'ordered', 'cancelled'],
        default: 'draft',
        index: true
    },
    docStatus: {
        type: Number,
        enum: [0, 1, 2],  // 0 = Draft, 1 = Submitted, 2 = Cancelled
        default: 0
    },

    // References
    materialRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MaterialRequest',
        index: true
    },

    // Additional Information
    company: {
        type: String,
        trim: true
    },

    // User Tracking
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
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
rfqSchema.index({ lawyerId: 1, status: 1 });
rfqSchema.index({ firmId: 1, status: 1 });
rfqSchema.index({ firmId: 1, lawyerId: 1 });
rfqSchema.index({ transactionDate: -1 });
rfqSchema.index({ materialRequestId: 1 });

// Pre-save hook to generate RFQ ID
rfqSchema.pre('save', async function(next) {
    // Generate RFQ ID if new
    if (!this.rfqId && this.isNew) {
        const Counter = require('./counter.model');
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        const counterId = this.firmId
            ? `rfq_${this.firmId}_${year}`
            : `rfq_global_${year}`;

        const seq = await Counter.getNextSequence(counterId);
        this.rfqId = `RFQ-${year}${month}${day}-${String(seq).padStart(4, '0')}`;

        // Set rfqNumber same as rfqId if not provided
        if (!this.rfqNumber) {
            this.rfqNumber = this.rfqId;
        }
    }

    // Update status based on quotations received
    if (this.status === 'submitted') {
        const hasQuotations = this.suppliers.some(supplier => supplier.quotationId);
        if (hasQuotations) {
            this.status = 'quoted';
        }
    }

    next();
});

// Static method: Get RFQs pending quotations
rfqSchema.statics.getPendingQuotations = async function(lawyerId) {
    return await this.find({
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        status: { $in: ['submitted', 'quoted'] }
    }).sort({ transactionDate: -1 });
};

module.exports = mongoose.model('RFQ', rfqSchema);
