const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Warehouse Model - Warehouse/Store Management
 *
 * Manages physical and virtual storage locations with hierarchical
 * structure support and full address tracking.
 */

const warehouseSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },

    // ============ IDENTIFICATION ============
    warehouseId: {
        type: String,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'Warehouse name is required'],
        trim: true,
        maxlength: [200, 'Warehouse name cannot exceed 200 characters'],
        index: true
    },
    nameAr: {
        type: String,
        trim: true,
        maxlength: [200, 'Arabic name cannot exceed 200 characters']
    },

    // ============ TYPE & HIERARCHY ============
    warehouseType: {
        type: String,
        enum: ['warehouse', 'store', 'transit', 'virtual'],
        default: 'warehouse',
        index: true
    },
    parentWarehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
        default: null
    },
    isGroup: {
        type: Boolean,
        default: false,
        index: true
    },
    company: {
        type: String,
        trim: true
    },

    // ============ LOCATION ============
    address: {
        type: String,
        trim: true,
        maxlength: [500, 'Address cannot exceed 500 characters']
    },
    city: {
        type: String,
        trim: true
    },
    region: {
        type: String,
        trim: true
    },
    country: {
        type: String,
        trim: true,
        default: 'Saudi Arabia'
    },
    postalCode: {
        type: String,
        trim: true
    },
    latitude: {
        type: Number,
        min: -90,
        max: 90
    },
    longitude: {
        type: Number,
        min: -180,
        max: 180
    },

    // ============ CONTACT ============
    contactPerson: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Invalid email format']
    },

    // ============ SETTINGS ============
    isDefault: {
        type: Boolean,
        default: false,
        index: true
    },
    disabled: {
        type: Boolean,
        default: false,
        index: true
    },

    // ============ ACCOUNTING ============
    accountId: {
        type: Schema.Types.ObjectId,
        ref: 'Account'
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
warehouseSchema.index({ firmId: 1, name: 1 }, { unique: true });
warehouseSchema.index({ firmId: 1, warehouseType: 1, disabled: 1 });
warehouseSchema.index({ firmId: 1, isDefault: 1 });
warehouseSchema.index({ parentWarehouse: 1 });

// ============ VIRTUALS ============
warehouseSchema.virtual('displayName').get(function() {
    return this.name || this.warehouseId;
});

warehouseSchema.virtual('fullAddress').get(function() {
    const parts = [];
    if (this.address) parts.push(this.address);
    if (this.city) parts.push(this.city);
    if (this.region) parts.push(this.region);
    if (this.country) parts.push(this.country);
    if (this.postalCode) parts.push(this.postalCode);
    return parts.join(', ');
});

warehouseSchema.virtual('children', {
    ref: 'Warehouse',
    localField: '_id',
    foreignField: 'parentWarehouse'
});

// ============ STATICS ============
/**
 * Generate unique warehouse ID using atomic counter
 * Format: WH-YYYYMMDD-XXXX (e.g., WH-20250101-0001)
 */
warehouseSchema.statics.generateWarehouseId = async function(firmId = null) {
    const Counter = require('./counter.model');
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    const counterId = firmId
        ? `warehouse_${firmId}_${dateStr}`
        : `warehouse_global_${dateStr}`;

    const seq = await Counter.getNextSequence(counterId);
    return `WH-${dateStr}-${String(seq).padStart(4, '0')}`;
};

/**
 * Get default warehouse for firm
 */
warehouseSchema.statics.getDefaultWarehouse = function(firmId = null) {
    const query = { isDefault: true, disabled: false };
    if (firmId) {
        query.firmId = firmId;
    }
    return this.findOne(query);
};

/**
 * Get warehouse hierarchy
 */
warehouseSchema.statics.getHierarchy = async function(firmId = null) {
    const query = { disabled: false };
    if (firmId) {
        query.firmId = firmId;
    }

    const warehouses = await this.find(query).sort({ name: 1 }).lean();

    // Build tree structure
    const warehouseMap = {};
    const rootWarehouses = [];

    // First pass: create map
    warehouses.forEach((warehouse) => {
        warehouseMap[warehouse._id.toString()] = { ...warehouse, children: [] };
    });

    // Second pass: build tree
    warehouses.forEach((warehouse) => {
        const node = warehouseMap[warehouse._id.toString()];
        if (warehouse.parentWarehouse) {
            const parent = warehouseMap[warehouse.parentWarehouse.toString()];
            if (parent) {
                parent.children.push(node);
            } else {
                rootWarehouses.push(node);
            }
        } else {
            rootWarehouses.push(node);
        }
    });

    return rootWarehouses;
};

/**
 * Get active warehouses
 */
warehouseSchema.statics.getActiveWarehouses = function(firmId = null) {
    const query = { disabled: false, isGroup: false };
    if (firmId) {
        query.firmId = firmId;
    }
    return this.find(query).sort({ name: 1 });
};

// ============ PRE-SAVE MIDDLEWARE ============
warehouseSchema.pre('save', async function(next) {
    try {
        // Auto-generate warehouse ID if not provided
        if (this.isNew && !this.warehouseId) {
            this.warehouseId = await this.constructor.generateWarehouseId(this.firmId);
        }

        // Ensure only one default warehouse per firm
        if (this.isDefault) {
            const existingDefault = await this.constructor.findOne({
                firmId: this.firmId,
                isDefault: true,
                _id: { $ne: this._id }
            });

            if (existingDefault) {
                existingDefault.isDefault = false;
                await existingDefault.save();
            }
        }

        next();
    } catch (error) {
        next(error);
    }
});

// ============ PRE-DELETE MIDDLEWARE ============
warehouseSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
    try {
        // Check for child warehouses
        const childCount = await mongoose.model('Warehouse').countDocuments({
            parentWarehouse: this._id
        });

        if (childCount > 0) {
            const error = new Error('Cannot delete warehouse with child warehouses');
            error.statusCode = 400;
            return next(error);
        }

        // Check for stock entries
        const Bin = mongoose.model('Bin');
        const stockCount = await Bin.countDocuments({
            warehouseId: this._id,
            actualQty: { $gt: 0 }
        });

        if (stockCount > 0) {
            const error = new Error('Cannot delete warehouse with stock');
            error.statusCode = 400;
            return next(error);
        }

        next();
    } catch (error) {
        next(error);
    }
});

// ============ METHODS ============
/**
 * Get total stock value in warehouse
 */
warehouseSchema.methods.getStockValue = async function() {
    const Bin = mongoose.model('Bin');

    const result = await Bin.aggregate([
        { $match: { warehouseId: this._id } },
        { $group: { _id: null, totalValue: { $sum: '$stockValue' } } }
    ]);

    return result[0]?.totalValue || 0;
};

/**
 * Get item count in warehouse
 */
warehouseSchema.methods.getItemCount = async function() {
    const Bin = mongoose.model('Bin');

    return await Bin.countDocuments({
        warehouseId: this._id,
        actualQty: { $gt: 0 }
    });
};

module.exports = mongoose.model('Warehouse', warehouseSchema);
