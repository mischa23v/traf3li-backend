const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * UOM Model - Unit of Measure
 *
 * Defines units of measurement for inventory items (kg, pcs, liters, etc.)
 */

const uomSchema = new Schema({
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
    name: {
        type: String,
        required: [true, 'UOM name is required'],
        trim: true,
        uppercase: true,
        maxlength: [50, 'Name cannot exceed 50 characters'],
        index: true
    },
    nameAr: {
        type: String,
        trim: true,
        maxlength: [50, 'Arabic name cannot exceed 50 characters']
    },

    // ============ SETTINGS ============
    mustBeWholeNumber: {
        type: Boolean,
        default: false
    },
    enabled: {
        type: Boolean,
        default: true,
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
uomSchema.index({ firmId: 1, name: 1 }, { unique: true });
uomSchema.index({ enabled: 1 });

// ============ STATICS ============
/**
 * Get active UOMs
 */
uomSchema.statics.getActiveUOMs = function(firmId = null) {
    const query = { enabled: true };
    if (firmId) {
        query.firmId = firmId;
    }
    return this.find(query).sort({ name: 1 });
};

/**
 * Find by name
 */
uomSchema.statics.findByName = function(name, firmId = null) {
    const query = { name: name.toUpperCase() };
    if (firmId) {
        query.firmId = firmId;
    }
    return this.findOne(query);
};

// ============ PRE-SAVE MIDDLEWARE ============
uomSchema.pre('save', function(next) {
    // Uppercase name
    if (this.name) {
        this.name = this.name.toUpperCase();
    }
    next();
});

// ============ PRE-DELETE MIDDLEWARE ============
uomSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
    try {
        // Check if UOM is used by any items
        const Item = mongoose.model('Item');
        const itemCount = await Item.countDocuments({
            $or: [
                { stockUom: this.name },
                { purchaseUom: this.name },
                { salesUom: this.name }
            ]
        });

        if (itemCount > 0) {
            const error = new Error('Cannot delete UOM that is in use');
            error.statusCode = 400;
            return next(error);
        }

        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('UOM', uomSchema);
