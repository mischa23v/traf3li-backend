const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Bill of Materials (BOM) Model
 * Defines the list of raw materials, sub-assemblies, components, and operations
 * required to manufacture a finished product.
 */

// ============ SUB-SCHEMAS ============

const BOMItemSchema = new Schema({
    itemId: {
        type: Schema.Types.ObjectId,
        ref: 'Item',
        required: true
    },
    itemCode: {
        type: String,
        required: true
    },
    itemName: {
        type: String,
        required: true
    },
    qty: {
        type: Number,
        required: true,
        min: 0
    },
    uom: {
        type: String,
        default: 'Unit'
    },
    rate: {
        type: Number,
        default: 0,
        min: 0
    },
    amount: {
        type: Number,
        default: 0
    },
    sourceWarehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse'
    },
    includeInManufacturing: {
        type: Boolean,
        default: true
    }
}, { _id: true });

const BOMOperationSchema = new Schema({
    operation: {
        type: String,
        required: true
    },
    operationAr: String,
    workstation: {
        type: Schema.Types.ObjectId,
        ref: 'Workstation'
    },
    timeInMins: {
        type: Number,
        default: 0,
        min: 0
    },
    operatingCost: {
        type: Number,
        default: 0,
        min: 0
    },
    description: String,
    sequence: {
        type: Number,
        default: 0
    }
}, { _id: true });

// ============ MAIN BOM SCHEMA ============

const bomSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },

    // Auto-generated BOM ID (Format: BOM-YYYYMMDD-XXXX)
    bomId: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },

    bomNumber: {
        type: String,
        trim: true
    },

    // Item to manufacture
    itemId: {
        type: Schema.Types.ObjectId,
        ref: 'Item',
        required: true,
        index: true
    },
    itemCode: {
        type: String,
        required: true
    },
    itemName: {
        type: String,
        required: true
    },

    // BOM Type
    bomType: {
        type: String,
        enum: ['standard', 'template', 'subcontract'],
        default: 'standard'
    },

    // Quantity this BOM produces
    quantity: {
        type: Number,
        required: true,
        default: 1,
        min: 0
    },
    uom: {
        type: String,
        default: 'Unit'
    },

    // Status flags
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    isDefault: {
        type: Boolean,
        default: false
    },

    // Materials and components required
    items: [BOMItemSchema],

    // Manufacturing operations/routing
    operations: [BOMOperationSchema],

    // Reference to routing template
    routingId: {
        type: Schema.Types.ObjectId,
        ref: 'Routing'
    },

    // Calculated total cost
    totalCost: {
        type: Number,
        default: 0
    },

    remarks: {
        type: String,
        maxlength: 1000
    },

    // Ownership
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
bomSchema.index({ firmId: 1, isActive: 1 });
bomSchema.index({ firmId: 1, itemId: 1 });
bomSchema.index({ bomId: 1 });
bomSchema.index({ itemCode: 1 });
bomSchema.index({ isDefault: 1, itemId: 1 });

// ============ VIRTUALS ============

// Calculate total material cost
bomSchema.virtual('totalMaterialCost').get(function() {
    if (!this.items || this.items.length === 0) return 0;
    return this.items.reduce((sum, item) => sum + (item.amount || 0), 0);
});

// Calculate total operating cost
bomSchema.virtual('totalOperatingCost').get(function() {
    if (!this.operations || this.operations.length === 0) return 0;
    return this.operations.reduce((sum, op) => sum + (op.operatingCost || 0), 0);
});

// ============ PRE-SAVE MIDDLEWARE ============

bomSchema.pre('save', async function(next) {
    // Auto-generate BOM ID if not provided
    if (this.isNew && !this.bomId) {
        const Counter = require('./counter.model');
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        const counterId = this.firmId
            ? `bom_${this.firmId}_${year}${month}${day}`
            : `bom_global_${year}${month}${day}`;

        const seq = await Counter.getNextSequence(counterId);
        this.bomId = `BOM-${year}${month}${day}-${String(seq).padStart(4, '0')}`;
    }

    // Auto-generate bomNumber if not provided
    if (!this.bomNumber) {
        this.bomNumber = this.bomId;
    }

    // Calculate item amounts
    this.items.forEach(item => {
        item.amount = (item.qty || 0) * (item.rate || 0);
    });

    // Calculate total cost
    this.totalCost = this.totalMaterialCost + this.totalOperatingCost;

    next();
});

// ============ STATIC METHODS ============

/**
 * Get BOM for an item
 */
bomSchema.statics.getBOMForItem = async function(itemId, firmId = null) {
    const query = { itemId, isActive: true };
    if (firmId) query.firmId = firmId;

    // Try to find default BOM first
    let bom = await this.findOne({ ...query, isDefault: true })
        .populate('items.itemId', 'itemCode itemName')
        .populate('operations.workstation', 'name nameAr');

    // If no default, get the first active BOM
    if (!bom) {
        bom = await this.findOne(query)
            .populate('items.itemId', 'itemCode itemName')
            .populate('operations.workstation', 'name nameAr');
    }

    return bom;
};

/**
 * Explode BOM (get all materials needed for a quantity)
 */
bomSchema.statics.explodeBOM = async function(bomId, quantity = 1) {
    const bom = await this.findById(bomId).populate('items.itemId');
    if (!bom) throw new Error('BOM not found');

    const exploded = bom.items.map(item => ({
        itemId: item.itemId,
        itemCode: item.itemCode,
        itemName: item.itemName,
        requiredQty: (item.qty || 0) * quantity,
        uom: item.uom,
        rate: item.rate,
        amount: (item.qty || 0) * quantity * (item.rate || 0),
        sourceWarehouse: item.sourceWarehouse
    }));

    return {
        bomId: bom.bomId,
        itemName: bom.itemName,
        quantity,
        materials: exploded,
        totalMaterialCost: exploded.reduce((sum, m) => sum + m.amount, 0)
    };
};

module.exports = mongoose.model('BOM', bomSchema);
