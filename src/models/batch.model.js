const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Batch Model - Batch/Lot Tracking
 *
 * Tracks inventory batches for items with batch tracking enabled.
 * Used for expiry date management, quality control, and traceability.
 */

const batchSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ============ IDENTIFICATION ============
    batchId: {
        type: String,
        unique: true,
        index: true
    },
    batchNo: {
        type: String,
        required: [true, 'Batch number is required'],
        trim: true,
        uppercase: true,
        index: true
    },

    // ============ ITEM ============
    itemId: {
        type: Schema.Types.ObjectId,
        ref: 'Item',
        required: true,
        index: true
    },
    itemCode: {
        type: String,
        required: true,
        trim: true,
        index: true
    },

    // ============ DATES ============
    expiryDate: {
        type: Date,
        index: true
    },
    manufactureDate: {
        type: Date
    },

    // ============ REFERENCE ============
    supplier: {
        type: Schema.Types.ObjectId,
        ref: 'Vendor'
    },
    reference: {
        type: String,
        trim: true
    },

    // ============ QUANTITY ============
    qty: {
        type: Number,
        default: 0,
        min: 0
    },

    // ============ STATUS ============
    status: {
        type: String,
        enum: ['active', 'expired', 'depleted', 'quarantine'],
        default: 'active',
        index: true
    },

    // ============ AUDIT ============
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }

}, {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ============ INDEXES ============
batchSchema.index({ firmId: 1, batchNo: 1, itemId: 1 }, { unique: true });
batchSchema.index({ firmId: 1, itemId: 1, status: 1 });
batchSchema.index({ expiryDate: 1, status: 1 });

// ============ VIRTUALS ============
batchSchema.virtual('isExpired').get(function() {
    return this.expiryDate && new Date() > this.expiryDate;
});

batchSchema.virtual('daysToExpiry').get(function() {
    if (!this.expiryDate) return null;
    const diff = this.expiryDate - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// ============ STATICS ============
/**
 * Generate unique batch ID
 * Format: BATCH-YYYYMMDD-XXXX (e.g., BATCH-20250101-0001)
 */
batchSchema.statics.generateBatchId = async function(firmId = null) {
    const Counter = require('./counter.model');
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    const counterId = firmId
        ? `batch_${firmId}_${dateStr}`
        : `batch_global_${dateStr}`;

    const seq = await Counter.getNextSequence(counterId);
    return `BATCH-${dateStr}-${String(seq).padStart(4, '0')}`;
};

/**
 * Get expiring batches
 */
batchSchema.statics.getExpiringBatches = function(daysThreshold = 30, firmId = null) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const query = {
        status: 'active',
        expiryDate: {
            $exists: true,
            $lte: thresholdDate,
            $gte: new Date()
        }
    };

    if (firmId) {
        query.firmId = firmId;
    }

    return this.find(query)
        .populate('itemId', 'itemCode name')
        .sort({ expiryDate: 1 });
};

/**
 * Get expired batches
 */
batchSchema.statics.getExpiredBatches = function(firmId = null) {
    const query = {
        expiryDate: {
            $exists: true,
            $lt: new Date()
        },
        status: { $ne: 'expired' }
    };

    if (firmId) {
        query.firmId = firmId;
    }

    return this.find(query)
        .populate('itemId', 'itemCode name');
};

// ============ PRE-SAVE MIDDLEWARE ============
batchSchema.pre('save', async function(next) {
    try {
        // Auto-generate batch ID if not provided
        if (this.isNew && !this.batchId) {
            this.batchId = await this.constructor.generateBatchId(this.firmId);
        }

        // Uppercase batch number
        if (this.batchNo) {
            this.batchNo = this.batchNo.toUpperCase();
        }

        // Auto-update status based on expiry
        if (this.expiryDate && new Date() > this.expiryDate && this.status === 'active') {
            this.status = 'expired';
        }

        // Auto-update status based on quantity
        if (this.qty <= 0 && this.status === 'active') {
            this.status = 'depleted';
        }

        next();
    } catch (error) {
        next(error);
    }
});

// ============ METHODS ============
/**
 * Check if batch is usable
 */
batchSchema.methods.isUsable = function() {
    return this.status === 'active' && this.qty > 0 && !this.isExpired;
};

module.exports = mongoose.model('Batch', batchSchema);
