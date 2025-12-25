const mongoose = require('mongoose');

const buyingSettingsSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        unique: true,
        required: true,
        index: true
    },

    // Default Settings
    defaultPurchaseUom: {
        type: String,
        trim: true,
        default: 'Unit'
    },

    // Approval Settings
    purchaseOrderApprovalRequired: {
        type: Boolean,
        default: false
    },

    // Automation Settings
    autoCreatePurchaseReceipt: {
        type: Boolean,
        default: false
    },

    // Payment Settings
    defaultPaymentTerms: {
        type: String,
        trim: true,
        default: 'Net 30'
    },

    // Inventory Settings
    maintainStockLedger: {
        type: Boolean,
        default: true
    },

    // User Tracking
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
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
buyingSettingsSchema.index({ lawyerId: 1 });
buyingSettingsSchema.index({ firmId: 1 });

// Static method: Get or create settings for a firm
buyingSettingsSchema.statics.getSettings = async function(firmId, lawyerId) {
    let settings = await this.findOne({ firmId });

    if (!settings) {
        // Create default settings
        settings = new this({
            firmId,
            lawyerId,
            createdBy: lawyerId
        });
        await settings.save();
    }

    return settings;
};

module.exports = mongoose.model('BuyingSettings', buyingSettingsSchema);
