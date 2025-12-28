const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Serial Number Model - Serial Number Tracking
 *
 * Tracks individual items by serial number for warranty,
 * maintenance, and asset management.
 */

const serialNumberSchema = new Schema({
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
    serialNumberId: {
        type: String,
        unique: true,
        index: true
    },
    serialNo: {
        type: String,
        required: [true, 'Serial number is required'],
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

    // ============ LOCATION ============
    warehouseId: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
        index: true
    },

    // ============ STATUS ============
    status: {
        type: String,
        enum: ['available', 'delivered', 'reserved', 'maintenance', 'scrapped'],
        default: 'available',
        index: true
    },

    // ============ WARRANTY ============
    purchaseDate: {
        type: Date
    },
    warrantyExpiry: {
        type: Date,
        index: true
    },

    // ============ ASSET REFERENCE ============
    assetId: {
        type: Schema.Types.ObjectId,
        ref: 'Asset'
    },

    // ============ CUSTOMER/ORDER ============
    customerId: {
        type: Schema.Types.ObjectId,
        ref: 'Client'
    },
    salesOrderId: {
        type: Schema.Types.ObjectId,
        ref: 'SalesOrder'
    },
    deliveryDate: {
        type: Date
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
serialNumberSchema.index({ firmId: 1, serialNo: 1 }, { unique: true });
serialNumberSchema.index({ firmId: 1, itemId: 1, status: 1 });
serialNumberSchema.index({ warehouseId: 1, status: 1 });
serialNumberSchema.index({ warrantyExpiry: 1 });

// ============ VIRTUALS ============
serialNumberSchema.virtual('isUnderWarranty').get(function() {
    return this.warrantyExpiry && new Date() < this.warrantyExpiry;
});

serialNumberSchema.virtual('daysToWarrantyExpiry').get(function() {
    if (!this.warrantyExpiry) return null;
    const diff = this.warrantyExpiry - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// ============ STATICS ============
/**
 * Generate unique serial number ID
 */
serialNumberSchema.statics.generateSerialNumberId = async function() {
    const Counter = require('./counter.model');
    const seq = await Counter.getNextSequence('serialnumber');
    return `SN-${String(seq).padStart(10, '0')}`;
};

/**
 * Get available serial numbers for item
 */
serialNumberSchema.statics.getAvailableForItem = function(itemId, firmId = null) {
    const query = {
        itemId,
        status: 'available'
    };

    if (firmId) {
        query.firmId = firmId;
    }

    return this.find(query).sort({ serialNo: 1 });
};

/**
 * Get warranty expiring serial numbers
 */
serialNumberSchema.statics.getWarrantyExpiring = function(daysThreshold = 30, firmId = null) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const query = {
        warrantyExpiry: {
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
        .sort({ warrantyExpiry: 1 });
};

// ============ PRE-SAVE MIDDLEWARE ============
serialNumberSchema.pre('save', async function(next) {
    try {
        // Auto-generate serial number ID if not provided
        if (this.isNew && !this.serialNumberId) {
            this.serialNumberId = await this.constructor.generateSerialNumberId();
        }

        // Uppercase serial number
        if (this.serialNo) {
            this.serialNo = this.serialNo.toUpperCase();
        }

        next();
    } catch (error) {
        next(error);
    }
});

// ============ METHODS ============
/**
 * Mark as delivered
 */
serialNumberSchema.methods.deliver = async function(customerId, salesOrderId) {
    this.status = 'delivered';
    this.customerId = customerId;
    this.salesOrderId = salesOrderId;
    this.deliveryDate = new Date();
    await this.save();
    return this;
};

/**
 * Mark as available
 */
serialNumberSchema.methods.makeAvailable = async function() {
    this.status = 'available';
    this.customerId = null;
    this.salesOrderId = null;
    this.deliveryDate = null;
    await this.save();
    return this;
};

module.exports = mongoose.model('SerialNumber', serialNumberSchema);
