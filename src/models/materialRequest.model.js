const mongoose = require('mongoose');

// Material Request Item sub-schema
const materialRequestItemSchema = new mongoose.Schema({
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
    warehouse: {
        type: String,
        trim: true
    },
    requiredDate: {
        type: Date
    },
    orderedQty: {
        type: Number,
        default: 0,
        min: 0
    },
    receivedQty: {
        type: Number,
        default: 0,
        min: 0
    }
}, { _id: true });

const materialRequestSchema = new mongoose.Schema({
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
    materialRequestId: {
        type: String,
        unique: true,
        index: true
    },

    // MR Number
    mrNumber: {
        type: String,
        unique: true,
        index: true
    },

    // Request Type
    requestType: {
        type: String,
        enum: ['purchase', 'transfer', 'material_issue', 'manufacture'],
        required: true,
        default: 'purchase'
    },

    // Purpose
    purpose: {
        type: String,
        trim: true,
        maxlength: 500
    },

    // Items
    items: [materialRequestItemSchema],

    // Dates
    transactionDate: {
        type: Date,
        default: Date.now,
        index: true
    },
    requiredDate: {
        type: Date
    },

    // Totals
    totalQty: {
        type: Number,
        default: 0
    },

    // Status
    status: {
        type: String,
        enum: ['draft', 'submitted', 'ordered', 'transferred', 'issued', 'cancelled'],
        default: 'draft',
        index: true
    },
    docStatus: {
        type: Number,
        enum: [0, 1, 2],  // 0 = Draft, 1 = Submitted, 2 = Cancelled
        default: 0
    },

    // Additional Information
    remarks: {
        type: String,
        trim: true,
        maxlength: 2000
    },
    company: {
        type: String,
        trim: true
    },

    // User Tracking
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
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
materialRequestSchema.index({ lawyerId: 1, status: 1 });
materialRequestSchema.index({ firmId: 1, status: 1 });
materialRequestSchema.index({ firmId: 1, lawyerId: 1 });
materialRequestSchema.index({ requestType: 1, status: 1 });
materialRequestSchema.index({ transactionDate: -1 });

// Pre-save hook to generate MR ID and calculate totals
materialRequestSchema.pre('save', async function(next) {
    // Generate MR ID if new
    if (!this.materialRequestId && this.isNew) {
        const Counter = require('./counter.model');
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        const counterId = this.firmId
            ? `material_request_${this.firmId}_${year}`
            : `material_request_global_${year}`;

        const seq = await Counter.getNextSequence(counterId);
        this.materialRequestId = `MR-${year}${month}${day}-${String(seq).padStart(4, '0')}`;

        // Set mrNumber same as materialRequestId if not provided
        if (!this.mrNumber) {
            this.mrNumber = this.materialRequestId;
        }
    }

    // Calculate total quantity
    let totalQty = 0;
    for (const item of this.items) {
        totalQty += item.qty;
    }
    this.totalQty = totalQty;

    // Update status based on fulfillment
    if (this.status === 'submitted' && this.requestType === 'purchase') {
        const allOrdered = this.items.every(item => (item.orderedQty || 0) >= item.qty);
        if (allOrdered) {
            this.status = 'ordered';
        }
    }

    next();
});

// Static method: Get pending material requests
materialRequestSchema.statics.getPendingRequests = async function(lawyerId) {
    return await this.find({
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        status: { $in: ['submitted', 'ordered'] }
    }).sort({ transactionDate: -1 });
};

module.exports = mongoose.model('MaterialRequest', materialRequestSchema);
